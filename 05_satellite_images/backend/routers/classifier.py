"""
routers/classifier.py
---------------------
Endpoints para ajuste de umbrales, entrenamiento del clasificador y predicción.

  POST /thresholds/preview
      Valida los seis umbrales y devuelve el conteo de píxeles por clase.

  POST /train
      Entrena el clasificador Random Forest y devuelve un Progress_Stream NDJSON.

  POST /predict
      Aplica el clasificador a todos los píxeles y devuelve un Progress_Stream NDJSON.

Requisitos cubiertos: 5.3, 5.4, 5.5, 5.6, 5.7, 6.1–6.6, 7.1–7.5
"""

from __future__ import annotations

import concurrent.futures
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.classifier import ThresholdRules, predict_stream, preview_thresholds, train_stream
from session_store import get_session

router = APIRouter()

# Nombres de los seis campos de umbral (para mensajes de error)
_THRESHOLD_FIELDS = [
    "ndvi_veg_min",
    "bsi_veg_max",
    "ndwi_water_min",
    "ndvi_water_max",
    "bsi_mining_min",
    "ndvi_mining_max",
]


# ---------------------------------------------------------------------------
# Helpers de validación de umbrales
# ---------------------------------------------------------------------------

def _validate_thresholds(
    ndvi_veg_min: float,
    bsi_veg_max: float,
    ndwi_water_min: float,
    ndvi_water_max: float,
    bsi_mining_min: float,
    ndvi_mining_max: float,
) -> None:
    """Valida que los seis umbrales estén en [-1.0, 1.0] con ≤ 2 decimales.

    Raises:
        HTTPException(400): si algún umbral es inválido (Req 5.4).
    """
    values = {
        "ndvi_veg_min": ndvi_veg_min,
        "bsi_veg_max": bsi_veg_max,
        "ndwi_water_min": ndwi_water_min,
        "ndvi_water_max": ndvi_water_max,
        "bsi_mining_min": bsi_mining_min,
        "ndvi_mining_max": ndvi_mining_max,
    }
    errors: list[str] = []
    for field_name, value in values.items():
        if value < -1.0 or value > 1.0:
            errors.append(
                f"'{field_name}' = {value} está fuera del rango permitido [-1.0, 1.0]."
            )
        elif round(value, 2) != value:
            errors.append(
                f"'{field_name}' = {value} excede la precisión máxima de 2 decimales."
            )
    if errors:
        raise HTTPException(
            status_code=400,
            detail=(
                "Umbrales inválidos: " + " | ".join(errors) +
                " Todos los umbrales deben estar en [-1.0, 1.0] con ≤ 2 decimales."
            ),
        )


def _build_rules(
    ndvi_veg_min: float,
    bsi_veg_max: float,
    ndwi_water_min: float,
    ndvi_water_max: float,
    bsi_mining_min: float,
    ndvi_mining_max: float,
) -> ThresholdRules:
    """Construye un objeto ThresholdRules a partir de los valores del request."""
    return ThresholdRules(
        ndvi_veg_min=ndvi_veg_min,
        bsi_veg_max=bsi_veg_max,
        ndwi_water_min=ndwi_water_min,
        ndvi_water_max=ndvi_water_max,
        bsi_mining_min=bsi_mining_min,
        ndvi_mining_max=ndvi_mining_max,
    )


# ---------------------------------------------------------------------------
# Modelos Pydantic
# ---------------------------------------------------------------------------

class ThresholdPreviewRequest(BaseModel):
    """Body del endpoint POST /thresholds/preview."""

    session_id: str
    ndvi_veg_min: float
    bsi_veg_max: float
    ndwi_water_min: float
    ndvi_water_max: float
    bsi_mining_min: float
    ndvi_mining_max: float


class TrainRequest(BaseModel):
    """Body del endpoint POST /train."""

    session_id: str
    ndvi_veg_min: float
    bsi_veg_max: float
    ndwi_water_min: float
    ndvi_water_max: float
    bsi_mining_min: float
    ndvi_mining_max: float


class PredictRequest(BaseModel):
    """Body del endpoint POST /predict."""

    session_id: str


# ---------------------------------------------------------------------------
# POST /thresholds/preview
# ---------------------------------------------------------------------------

@router.post("/thresholds/preview")
def thresholds_preview(request: ThresholdPreviewRequest) -> dict:
    """Previsualiza el conteo de píxeles por clase con los umbrales dados.

    Valida los seis umbrales (rango [-1.0, 1.0], ≤ 2 decimales), verifica que
    la sesión exista y ejecuta ``preview_thresholds`` con un timeout de 3 s.

    Parameters
    ----------
    request : ThresholdPreviewRequest
        Body JSON con ``session_id`` y los seis umbrales.

    Returns
    -------
    dict
        ``{total_valid, vegetation, water, mining}``

    Raises
    ------
    HTTPException(400)
        Si algún umbral está fuera de [-1.0, 1.0] o tiene más de 2 decimales
        (Req 5.4).
    HTTPException(404)
        Si la sesión no existe o ha expirado (Req 5.5).
    HTTPException(422)
        Si ninguna clase obtiene al menos un píxel etiquetado (Req 5.7).
    HTTPException(504)
        Si ``preview_thresholds`` supera 3 segundos de ejecución (Req 5.6).
    """
    # Validar umbrales — HTTP 400 (Req 5.4)
    _validate_thresholds(
        request.ndvi_veg_min,
        request.bsi_veg_max,
        request.ndwi_water_min,
        request.ndvi_water_max,
        request.bsi_mining_min,
        request.ndvi_mining_max,
    )

    # Validar sesión — HTTP 404 (Req 5.5)
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Sesión '{request.session_id}' no encontrada o expirada. "
                "Realice una nueva búsqueda para obtener un identificador de sesión válido."
            ),
        )

    # Construir ThresholdRules
    rules = _build_rules(
        request.ndvi_veg_min,
        request.bsi_veg_max,
        request.ndwi_water_min,
        request.ndvi_water_max,
        request.bsi_mining_min,
        request.ndvi_mining_max,
    )

    # Ejecutar preview_thresholds con timeout de 3 s (Req 5.6)
    TIMEOUT_SECONDS = 3.0
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(preview_thresholds, session, rules)
        try:
            result = future.result(timeout=TIMEOUT_SECONDS)
        except concurrent.futures.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail=(
                    f"La previsualización de umbrales superó el tiempo máximo de "
                    f"{int(TIMEOUT_SECONDS)} segundos. El estado de la sesión no ha "
                    "sido modificado. Intente con umbrales que reduzcan el área de cómputo."
                ),
            )
        except HTTPException:
            # Re-lanzar HTTPException (p.ej. 422 de preview_thresholds — Req 5.7)
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Error interno durante la previsualización: {exc}",
            ) from exc

    return result


# ---------------------------------------------------------------------------
# POST /train
# ---------------------------------------------------------------------------

@router.post("/train")
def train(request: TrainRequest) -> StreamingResponse:
    """Entrena el clasificador Random Forest y emite un Progress_Stream NDJSON.

    Valida la sesión y los umbrales antes de iniciar el streaming.

    Parameters
    ----------
    request : TrainRequest
        Body JSON con ``session_id`` y los seis umbrales.

    Returns
    -------
    StreamingResponse
        Stream NDJSON con líneas ``{stage, progress, message}`` y una línea
        final ``stage="done"`` (con ``classifier_id`` y ``oob_score``) o
        ``stage="error"``.

    Raises
    ------
    HTTPException(400)
        Si algún umbral está fuera de [-1.0, 1.0] o tiene más de 2 decimales
        (Req 6.5).
    HTTPException(404)
        Si la sesión no existe o ha expirado (Req 6.5).
    """
    # Validar umbrales — HTTP 400 (Req 6.5)
    _validate_thresholds(
        request.ndvi_veg_min,
        request.bsi_veg_max,
        request.ndwi_water_min,
        request.ndvi_water_max,
        request.bsi_mining_min,
        request.ndvi_mining_max,
    )

    # Validar sesión — HTTP 404 (Req 6.5)
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Sesión '{request.session_id}' no encontrada o expirada. "
                "Realice una nueva búsqueda para obtener un identificador de sesión válido."
            ),
        )

    # Construir ThresholdRules
    rules = _build_rules(
        request.ndvi_veg_min,
        request.bsi_veg_max,
        request.ndwi_water_min,
        request.ndvi_water_max,
        request.bsi_mining_min,
        request.ndvi_mining_max,
    )

    return StreamingResponse(
        train_stream(request.session_id, rules),
        media_type="application/x-ndjson",
    )


# ---------------------------------------------------------------------------
# POST /predict
# ---------------------------------------------------------------------------

@router.post("/predict")
def predict(request: PredictRequest) -> StreamingResponse:
    """Aplica el clasificador a todos los píxeles y emite un Progress_Stream NDJSON.

    Parameters
    ----------
    request : PredictRequest
        Body JSON con ``session_id``.

    Returns
    -------
    StreamingResponse
        Stream NDJSON con líneas de progreso y una línea final ``stage="done"``
        (con ``map_id``) o ``stage="error"``.

    Raises
    ------
    HTTPException(404)
        Si la sesión no existe o ha expirado (Req 7.3).
    HTTPException(409)
        Si la sesión no contiene un clasificador entrenado (Req 7.4).
    """
    # Validar sesión — HTTP 404 (Req 7.3)
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Sesión '{request.session_id}' no encontrada o expirada. "
                "Realice una nueva búsqueda para obtener un identificador de sesión válido."
            ),
        )

    # Verificar que hay clasificador entrenado — HTTP 409 (Req 7.4)
    if session.classifier is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "La sesión no contiene un clasificador entrenado. "
                "Ejecute POST /train antes de solicitar la predicción."
            ),
        )

    return StreamingResponse(
        predict_stream(request.session_id),
        media_type="application/x-ndjson",
    )
