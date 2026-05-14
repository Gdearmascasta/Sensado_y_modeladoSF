# core/classifier.py
# Pseudo-etiquetado, entrenamiento del clasificador Random Forest y predicción.
# Requisitos: 5.1–5.7, 6.1–6.6, 7.1–7.5

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING, Generator

import numpy as np
from fastapi import HTTPException
from sklearn.ensemble import RandomForestClassifier

from core.indices import SENTINEL_VALUE, compute_indices
from session_store import get_session

if TYPE_CHECKING:
    from session_store import SessionData


# ---------------------------------------------------------------------------
# ThresholdRules — valores por defecto del notebook actividad.ipynb
# ---------------------------------------------------------------------------

@dataclass
class ThresholdRules:
    """Umbrales de pseudo-etiquetado para las tres clases de cobertura.

    Valores por defecto tomados directamente del notebook ``actividad.ipynb``.

    Reglas de clasificación:
    - Vegetación : NDVI > ndvi_veg_min  AND BSI  < bsi_veg_max
    - Agua        : NDWI > ndwi_water_min AND NDVI < ndvi_water_max
    - Minería     : BSI  > bsi_mining_min AND NDVI < ndvi_mining_max
    """

    ndvi_veg_min: float = 0.60
    bsi_veg_max: float = -0.10
    ndwi_water_min: float = 0.10
    ndvi_water_max: float = 0.10
    bsi_mining_min: float = 0.12
    ndvi_mining_max: float = 0.25


# ---------------------------------------------------------------------------
# Helpers de pseudo-etiquetado
# ---------------------------------------------------------------------------

def _valid_mask(ndvi: np.ndarray, bsi: np.ndarray, ndwi: np.ndarray) -> np.ndarray:
    """Máscara booleana de píxeles válidos (finitos y distintos de SENTINEL_VALUE).

    Un píxel es válido si todos sus índices son finitos y ninguno es igual a
    ``SENTINEL_VALUE``.
    """
    def _finite(arr: np.ndarray) -> np.ndarray:
        return np.isfinite(arr) & (arr != SENTINEL_VALUE)

    return _finite(ndvi) & _finite(bsi) & _finite(ndwi)


def _apply_rules(
    ndvi: np.ndarray,
    bsi: np.ndarray,
    ndwi: np.ndarray,
    rules: ThresholdRules,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Aplica las ThresholdRules y devuelve tres máscaras booleanas.

    Returns:
        (veg_mask, water_mask, mining_mask) — arrays booleanos de la misma
        shape que los índices de entrada.
    """
    veg_mask = (ndvi > rules.ndvi_veg_min) & (bsi < rules.bsi_veg_max)
    water_mask = (ndwi > rules.ndwi_water_min) & (ndvi < rules.ndvi_water_max)
    mining_mask = (bsi > rules.bsi_mining_min) & (ndvi < rules.ndvi_mining_max)
    return veg_mask, water_mask, mining_mask


# ---------------------------------------------------------------------------
# preview_thresholds
# ---------------------------------------------------------------------------

def preview_thresholds(session: "SessionData", rules: ThresholdRules) -> dict:
    """Aplica las ThresholdRules a los índices de la sesión y devuelve conteos.

    Si los índices aún no están calculados, los calcula de forma lazy a partir
    de las bandas disponibles en la sesión.

    Returns:
        dict con las claves:
        - ``total_valid``: número de píxeles con todos los índices finitos.
        - ``vegetation``: píxeles que cumplen la regla de vegetación.
        - ``water``: píxeles que cumplen la regla de agua.
        - ``mining``: píxeles que cumplen la regla de minería/suelo expuesto.

    Raises:
        HTTPException(422): si ninguna clase tiene al menos un píxel etiquetado.

    Requisitos: 5.3, 5.7
    """
    # Cálculo lazy de índices si aún no están disponibles
    if not session.indices:
        compute_indices(session)

    ndvi: np.ndarray = session.indices["ndvi"]
    bsi: np.ndarray = session.indices["bsi"]
    ndwi: np.ndarray = session.indices["ndwi"]

    # Máscara de píxeles válidos (finitos, sin SENTINEL_VALUE)
    valid = _valid_mask(ndvi, bsi, ndwi)
    total_valid = int(np.count_nonzero(valid))

    # Aplicar reglas sólo sobre píxeles válidos
    veg_mask, water_mask, mining_mask = _apply_rules(ndvi, bsi, ndwi, rules)

    # Restringir a píxeles válidos
    vegetation = int(np.count_nonzero(veg_mask & valid))
    water = int(np.count_nonzero(water_mask & valid))
    mining = int(np.count_nonzero(mining_mask & valid))

    # Requisito 5.7: al menos una clase debe tener píxeles
    if vegetation == 0 and water == 0 and mining == 0:
        raise HTTPException(
            status_code=422,
            detail=(
                "Ninguna clase obtuvo píxeles etiquetados con los umbrales "
                "proporcionados. Amplíe los umbrales antes de entrenar."
            ),
        )

    return {
        "total_valid": total_valid,
        "vegetation": vegetation,
        "water": water,
        "mining": mining,
    }


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _ndjson(obj: dict) -> str:
    """Serializa un dict como línea NDJSON (JSON + newline)."""
    return json.dumps(obj, ensure_ascii=False) + "\n"


def _build_feature_matrix(
    session: "SessionData",
) -> tuple[np.ndarray, np.ndarray]:
    """Construye la matriz de características y la máscara de píxeles válidos.

    Columnas: NDVI, BSI, NDWI, B04, B08, B11 (en ese orden).

    Returns:
        X_flat  — array (N_valid, 6) float32 con los píxeles válidos.
        valid   — array booleano (H, W) indicando qué píxeles son válidos.
    """
    # Calcular índices si aún no están disponibles
    if not session.indices:
        compute_indices(session)

    ndvi: np.ndarray = session.indices["ndvi"]
    bsi: np.ndarray = session.indices["bsi"]
    ndwi: np.ndarray = session.indices["ndwi"]
    b04: np.ndarray = session.bands["B04"]
    b08: np.ndarray = session.bands["B08"]
    b11: np.ndarray = session.bands["B11"]

    # Máscara de píxeles válidos: finitos en índices Y en bandas usadas
    def _finite(arr: np.ndarray) -> np.ndarray:
        return np.isfinite(arr) & (arr != SENTINEL_VALUE)

    valid = (
        _finite(ndvi) & _finite(bsi) & _finite(ndwi)
        & np.isfinite(b04) & np.isfinite(b08) & np.isfinite(b11)
    )

    # Apilar columnas y aplanar a (N_valid, 6)
    X_flat = np.stack(
        [ndvi[valid], bsi[valid], ndwi[valid],
         b04[valid], b08[valid], b11[valid]],
        axis=1,
    ).astype(np.float32)

    return X_flat, valid


# ---------------------------------------------------------------------------
# train_stream
# ---------------------------------------------------------------------------

def train_stream(
    session_id: str, rules: ThresholdRules
) -> Generator[str, None, None]:
    """Entrena un RandomForestClassifier y emite líneas NDJSON de progreso.

    Flujo de emisión:
    1. Línea inicial con conteo de píxeles por clase.
    2. Al menos una línea de progreso durante el ajuste.
    3. Línea final ``stage="done"`` con ``classifier_id`` y ``oob_score``.
       Si hay < 100 píxeles etiquetados, incluye campo ``warning``.

    Emite ``stage="error"`` y cierra si:
    - La sesión no existe.
    - No hay al menos un píxel por clase tras filtrar NaN/Inf.

    Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1, 10.2, 10.3, 10.4, 10.5
    """
    # ------------------------------------------------------------------
    # 1. Validar sesión
    # ------------------------------------------------------------------
    session = get_session(session_id)
    if session is None:
        yield _ndjson({
            "stage": "error",
            "progress": 0.0,
            "message": "Sesión no encontrada o expirada.",
            "error": f"session_id '{session_id}' no existe o ha expirado.",
        })
        return

    # ------------------------------------------------------------------
    # 2. Construir matriz de características
    # ------------------------------------------------------------------
    try:
        X_flat, valid = _build_feature_matrix(session)
    except Exception as exc:
        yield _ndjson({
            "stage": "error",
            "progress": 0.0,
            "message": "Error al construir la matriz de características.",
            "error": str(exc),
        })
        return

    # ------------------------------------------------------------------
    # 3. Aplicar ThresholdRules para generar etiquetas
    # ------------------------------------------------------------------
    ndvi_valid = session.indices["ndvi"][valid]
    bsi_valid = session.indices["bsi"][valid]
    ndwi_valid = session.indices["ndwi"][valid]

    veg_mask, water_mask, mining_mask = _apply_rules(
        ndvi_valid, bsi_valid, ndwi_valid, rules
    )

    # Etiquetas: 0=Veg, 1=Agua, 2=Minería; -1=sin etiqueta (se descarta)
    labels = np.full(X_flat.shape[0], -1, dtype=np.int32)
    labels[veg_mask] = 0
    labels[water_mask] = 1
    labels[mining_mask] = 2

    # Descartar píxeles sin etiqueta
    labeled_mask = labels >= 0
    X_train = X_flat[labeled_mask]
    y_train = labels[labeled_mask]

    n_veg = int(np.sum(y_train == 0))
    n_water = int(np.sum(y_train == 1))
    n_mining = int(np.sum(y_train == 2))
    total_labeled = len(y_train)

    # ------------------------------------------------------------------
    # 4. Línea inicial con conteo por clase (Req 6.3)
    # ------------------------------------------------------------------
    yield _ndjson({
        "stage": "preparing",
        "progress": 0.1,
        "message": (
            f"Píxeles etiquetados — Vegetación: {n_veg}, "
            f"Agua: {n_water}, Minería: {n_mining}. "
            f"Total: {total_labeled}."
        ),
        "vegetation": n_veg,
        "water": n_water,
        "mining": n_mining,
        "total_labeled": total_labeled,
    })

    # ------------------------------------------------------------------
    # 5. Verificar al menos un píxel por clase (Req 6.6)
    # ------------------------------------------------------------------
    missing_classes = []
    if n_veg == 0:
        missing_classes.append("Vegetación")
    if n_water == 0:
        missing_classes.append("Agua")
    if n_mining == 0:
        missing_classes.append("Minería")

    if missing_classes:
        yield _ndjson({
            "stage": "error",
            "progress": 0.1,
            "message": (
                f"No hay píxeles etiquetados para: {', '.join(missing_classes)}. "
                "Amplíe los umbrales antes de entrenar."
            ),
            "error": (
                f"Clases sin muestras: {', '.join(missing_classes)}. "
                "Se requiere al menos un píxel por clase."
            ),
        })
        return

    # ------------------------------------------------------------------
    # 6. Línea de progreso antes del entrenamiento (Req 6.3, 10.3)
    # ------------------------------------------------------------------
    yield _ndjson({
        "stage": "training",
        "progress": 0.3,
        "message": (
            f"Entrenando RandomForest con {total_labeled} muestras "
            f"({X_train.shape[1]} características)…"
        ),
    })

    # ------------------------------------------------------------------
    # 7. Entrenar el clasificador (Req 6.2)
    # ------------------------------------------------------------------
    try:
        clf = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            oob_score=True,
        )
        clf.fit(X_train, y_train)
    except Exception as exc:
        # No almacenar clasificador parcial (Req 6.5)
        yield _ndjson({
            "stage": "error",
            "progress": 0.3,
            "message": "Error durante el entrenamiento del clasificador.",
            "error": str(exc),
        })
        return

    oob_score: float = float(clf.oob_score_)

    # ------------------------------------------------------------------
    # 8. Línea de progreso post-entrenamiento
    # ------------------------------------------------------------------
    yield _ndjson({
        "stage": "training",
        "progress": 0.9,
        "message": f"Entrenamiento completado. OOB accuracy: {oob_score:.4f}.",
    })

    # ------------------------------------------------------------------
    # 9. Almacenar clasificador en la sesión (Req 6.2)
    # ------------------------------------------------------------------
    classifier_id = str(uuid.uuid4())
    session.classifier = clf
    session.classifier_id = classifier_id

    # ------------------------------------------------------------------
    # 10. Línea final (Req 6.3, 10.4)
    # ------------------------------------------------------------------
    done_line: dict = {
        "stage": "done",
        "progress": 1.0,
        "message": (
            f"Clasificador entrenado. OOB accuracy: {oob_score:.4f}. "
            f"ID: {classifier_id}."
        ),
        "classifier_id": classifier_id,
        "oob_score": oob_score,
    }

    # Advertencia si hay menos de 100 píxeles etiquetados (Req 6.4)
    if total_labeled < 100:
        done_line["warning"] = (
            f"Tamaño de entrenamiento bajo: sólo {total_labeled} píxeles "
            "etiquetados. Los resultados pueden no ser representativos."
        )

    yield _ndjson(done_line)


# ---------------------------------------------------------------------------
# predict_stream
# ---------------------------------------------------------------------------

def predict_stream(session_id: str) -> Generator[str, None, None]:
    """Aplica el clasificador a todos los píxeles y emite progreso NDJSON.

    Flujo de emisión:
    - Línea inicial de inicio.
    - Líneas de progreso cada bloque de 10 % de píxeles procesados.
    - Línea final ``stage="done"`` con ``map_id``.

    Emite ``stage="error"`` y cierra si:
    - La sesión no existe o no tiene clasificador.
    - Se supera el timeout de 120 s.
    - La matriz de características válidas tiene cero píxeles.
    - Ocurre cualquier excepción interna.

    Requisitos: 7.1, 7.2, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5
    """
    TIMEOUT_SECONDS = 120
    start_time = time.monotonic()

    # ------------------------------------------------------------------
    # 1. Validar sesión
    # ------------------------------------------------------------------
    session = get_session(session_id)
    if session is None:
        yield _ndjson({
            "stage": "error",
            "progress": 0.0,
            "message": "Sesión no encontrada o expirada.",
            "error": f"session_id '{session_id}' no existe o ha expirado.",
        })
        return

    # ------------------------------------------------------------------
    # 2. Verificar que hay clasificador entrenado (Req 7.4)
    # ------------------------------------------------------------------
    if session.classifier is None:
        yield _ndjson({
            "stage": "error",
            "progress": 0.0,
            "message": "No hay clasificador entrenado. Ejecute el entrenamiento primero.",
            "error": "session.classifier es None. Ejecute POST /train antes de POST /predict.",
        })
        return

    clf: RandomForestClassifier = session.classifier

    # ------------------------------------------------------------------
    # 3. Construir matriz de características
    # ------------------------------------------------------------------
    yield _ndjson({
        "stage": "preparing",
        "progress": 0.02,
        "message": "Construyendo matriz de características para predicción…",
    })

    try:
        X_flat, valid = _build_feature_matrix(session)
    except Exception as exc:
        yield _ndjson({
            "stage": "error",
            "progress": 0.02,
            "message": "Error al construir la matriz de características.",
            "error": str(exc),
        })
        return

    n_valid = X_flat.shape[0]

    # ------------------------------------------------------------------
    # 4. Verificar que hay píxeles válidos (Req 7.5)
    # ------------------------------------------------------------------
    if n_valid == 0:
        yield _ndjson({
            "stage": "error",
            "progress": 0.02,
            "message": "No hay píxeles válidos para predecir.",
            "error": "La matriz de características válidas contiene cero píxeles.",
        })
        return

    yield _ndjson({
        "stage": "predicting",
        "progress": 0.05,
        "message": f"Iniciando predicción sobre {n_valid} píxeles válidos…",
    })

    # ------------------------------------------------------------------
    # 5. Predecir en bloques de 10 % (Req 7.2)
    # ------------------------------------------------------------------
    n_blocks = 10
    block_size = max(1, n_valid // n_blocks)
    predictions = np.empty(n_valid, dtype=np.int16)

    try:
        for block_idx in range(n_blocks):
            # Verificar timeout (Req 7.5)
            elapsed = time.monotonic() - start_time
            if elapsed > TIMEOUT_SECONDS:
                yield _ndjson({
                    "stage": "error",
                    "progress": round(0.05 + 0.90 * block_idx / n_blocks, 4),
                    "message": f"Timeout: la predicción superó {TIMEOUT_SECONDS} s.",
                    "error": (
                        f"Timeout de {TIMEOUT_SECONDS} s superado tras {elapsed:.1f} s. "
                        "No se almacenó el class_map."
                    ),
                })
                return

            start_idx = block_idx * block_size
            # El último bloque toma todos los píxeles restantes
            end_idx = n_valid if block_idx == n_blocks - 1 else start_idx + block_size

            predictions[start_idx:end_idx] = clf.predict(
                X_flat[start_idx:end_idx]
            ).astype(np.int16)

            progress = round(0.05 + 0.90 * (block_idx + 1) / n_blocks, 4)
            pct = (block_idx + 1) * 10
            yield _ndjson({
                "stage": "predicting",
                "progress": progress,
                "message": f"Predicción: {pct}% completado ({end_idx}/{n_valid} píxeles).",
            })

    except Exception as exc:
        # No almacenar class_map parcial (Req 7.5)
        yield _ndjson({
            "stage": "error",
            "progress": 0.5,
            "message": "Error durante la predicción.",
            "error": str(exc),
        })
        return

    # ------------------------------------------------------------------
    # 6. Reconstruir class_map con shape original (Req 7.1)
    # ------------------------------------------------------------------
    # Obtener shape de referencia desde las bandas
    ref_band = next(iter(session.bands.values()))
    H, W = ref_band.shape

    class_map = np.full((H, W), -1, dtype=np.int16)
    class_map[valid] = predictions

    # ------------------------------------------------------------------
    # 7. Almacenar class_map en la sesión
    # ------------------------------------------------------------------
    map_id = str(uuid.uuid4())
    session.class_map = class_map

    # ------------------------------------------------------------------
    # 8. Línea final (Req 10.4)
    # ------------------------------------------------------------------
    elapsed_total = time.monotonic() - start_time
    yield _ndjson({
        "stage": "done",
        "progress": 1.0,
        "message": (
            f"Mapa clasificado generado en {elapsed_total:.1f} s. "
            f"Shape: {H}×{W}. ID: {map_id}."
        ),
        "map_id": map_id,
    })
