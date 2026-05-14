"""
core/bands.py
-------------
Descarga de bandas Sentinel-2 con windowed read (rasterio) y generación
del True Color Preview.

Requisitos cubiertos: 3.1, 3.2, 3.3, 3.6, 10.1, 10.2, 10.3, 10.4, 10.5
"""

from __future__ import annotations

import io
import json
import time
from typing import Generator

import numpy as np
import rasterio
import rasterio.warp
import rasterio.windows
from rasterio.enums import Resampling
from rasterio.transform import from_bounds

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from session_store import SessionData, get_session

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

# Bandas a descargar, en orden.  B04 es la referencia de grilla (índice 2).
BAND_SET = ["B02", "B03", "B04", "B08", "B11"]
_B04_INDEX = 2  # posición de B04 en BAND_SET

# Nombre del asset en el item STAC de Planetary Computer para cada banda.
_ASSET_KEYS = {
    "B02": "B02",
    "B03": "B03",
    "B04": "B04",
    "B08": "B08",
    "B11": "B11",
}

_BAND_TIMEOUT = 60   # segundos máximos por banda
_MAX_RETRIES = 2     # reintentos ante errores transitorios


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ndjson(stage: str, progress: float, message: str, **extra) -> str:
    """Serializa una línea NDJSON de progreso."""
    obj: dict = {"stage": stage, "progress": round(progress, 4), "message": message}
    obj.update(extra)
    return json.dumps(obj, ensure_ascii=False) + "\n"


def resample_to_ref(array: np.ndarray, ref_shape: tuple[int, int]) -> np.ndarray:
    """
    Remuestrea *array* 2-D a *ref_shape* (H, W) usando interpolación bilineal.

    Si *array* ya tiene la forma correcta se devuelve sin copiar.
    Esta función es la base de la Property 1 (PBT test 4.3).

    Parameters
    ----------
    array : np.ndarray
        Array 2-D de entrada (cualquier dtype).
    ref_shape : tuple[int, int]
        Forma de destino ``(H, W)``.

    Returns
    -------
    np.ndarray
        Array con shape == ref_shape y dtype float32.
    """
    if array.shape == ref_shape:
        return array.astype(np.float32)

    src_h, src_w = array.shape
    dst_h, dst_w = ref_shape

    # Construimos transformaciones afines ficticias que mapean el array
    # a un espacio normalizado [0, 1] × [0, 1] para que rasterio pueda
    # hacer el remuestreo sin necesitar un CRS real.
    src_transform = from_bounds(0, 0, 1, 1, src_w, src_h)
    dst_transform = from_bounds(0, 0, 1, 1, dst_w, dst_h)

    src = array.astype(np.float32)
    dst = np.empty((dst_h, dst_w), dtype=np.float32)

    rasterio.warp.reproject(
        source=src,
        destination=dst,
        src_transform=src_transform,
        src_crs="EPSG:4326",
        dst_transform=dst_transform,
        dst_crs="EPSG:4326",
        resampling=Resampling.bilinear,
    )
    return dst


def _read_band_windowed(
    href: str,
    bbox_lonlat: list[float],
    timeout: int = _BAND_TIMEOUT,
) -> tuple[np.ndarray, object, object]:
    """
    Abre *href* con rasterio, transforma el bbox al CRS del archivo,
    lee la ventana correspondiente y devuelve ``(array_float32, crs, transform)``.

    Parameters
    ----------
    href : str
        URL firmada del asset de la banda.
    bbox_lonlat : list[float]
        ``[lon_min, lat_min, lon_max, lat_max]`` en EPSG:4326.
    timeout : int
        Tiempo máximo en segundos (se aplica mediante GDAL_HTTP_TIMEOUT).

    Returns
    -------
    tuple
        ``(data, crs, window_transform)`` donde *data* es float32 2-D.
    """
    import os
    os.environ.setdefault("GDAL_HTTP_TIMEOUT", str(timeout))
    os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "0")  # los reintentos los manejamos nosotros

    lon_min, lat_min, lon_max, lat_max = bbox_lonlat

    with rasterio.open(href) as src:
        crs = src.crs

        # Transformar el bbox de EPSG:4326 al CRS del archivo
        xs, ys = rasterio.warp.transform(
            "EPSG:4326",
            crs,
            [lon_min, lon_max],
            [lat_min, lat_max],
        )
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)

        window = rasterio.windows.from_bounds(
            x_min, y_min, x_max, y_max,
            transform=src.transform,
        )

        data = src.read(1, window=window).astype(np.float32)
        window_transform = src.window_transform(window)

    return data, crs, window_transform


# ---------------------------------------------------------------------------
# Función principal de descarga
# ---------------------------------------------------------------------------

def download_bands_stream(
    session_id: str,
    item,
) -> Generator[str, None, None]:
    """
    Descarga las cinco bandas del Band_Set con windowed read (rasterio),
    remuestrea a la grilla de B04 con interpolación bilineal y almacena
    los resultados en la Session.

    Emite líneas NDJSON ``{stage, progress, message}`` durante la descarga
    y una línea final ``stage="done"``.

    Parameters
    ----------
    session_id : str
        Identificador de la Session activa.
    item : pystac.Item
        Item STAC con los assets de las bandas firmados.

    Yields
    ------
    str
        Líneas NDJSON de progreso (cada una termina en ``\\n``).
    """
    session: SessionData | None = get_session(session_id)
    if session is None:
        yield _ndjson("error", 0.0, "Sesión no encontrada o expirada.",
                      error="session_not_found")
        return

    n_bands = len(BAND_SET)
    bands_data: dict[str, np.ndarray] = {}
    ref_shape: tuple[int, int] | None = None
    ref_crs = None
    ref_transform = None

    yield _ndjson("downloading", 0.0, "Iniciando descarga de bandas…")

    # Reserve the last 10 % of progress (0.9 → 1.0) for the resampling step,
    # so the overall progress sequence is always monotone non-decreasing.
    _DOWNLOAD_SHARE = 0.9

    for band_idx, band_name in enumerate(BAND_SET):
        progress_start = band_idx / n_bands * _DOWNLOAD_SHARE
        progress_end = (band_idx + 1) / n_bands * _DOWNLOAD_SHARE

        asset_key = _ASSET_KEYS[band_name]
        try:
            href = item.assets[asset_key].href
        except (KeyError, AttributeError) as exc:
            yield _ndjson(
                "error",
                progress_start,
                f"Asset '{asset_key}' no encontrado en el item STAC.",
                error=str(exc),
            )
            return

        msg = f"Descargando {band_name} ({band_idx + 1}/{n_bands})…"
        yield _ndjson("downloading", progress_start, msg)

        # Reintentos ante errores transitorios
        last_exc: Exception | None = None
        data: np.ndarray | None = None
        crs = None
        transform = None

        for attempt in range(_MAX_RETRIES + 1):
            try:
                t0 = time.monotonic()
                data, crs, transform = _read_band_windowed(
                    href, session.bbox, timeout=_BAND_TIMEOUT
                )
                elapsed = time.monotonic() - t0
                break  # éxito
            except Exception as exc:
                last_exc = exc
                if attempt < _MAX_RETRIES:
                    retry_msg = (
                        f"Error al leer {band_name} (intento {attempt + 1}/"
                        f"{_MAX_RETRIES + 1}): {exc}. Reintentando…"
                    )
                    yield _ndjson("downloading", progress_start, retry_msg)
                    time.sleep(1)  # pequeña pausa antes de reintentar

        if data is None:
            error_msg = (
                f"Fallo al descargar {band_name} tras {_MAX_RETRIES + 1} "
                f"intentos: {last_exc}"
            )
            yield _ndjson("error", progress_start, error_msg, error=str(last_exc))
            return

        # B04 es la referencia de grilla
        if band_name == "B04":
            ref_shape = data.shape
            ref_crs = crs
            ref_transform = transform

        bands_data[band_name] = data

        yield _ndjson(
            "downloading",
            progress_end,
            f"{band_name} descargada ({data.shape[0]}×{data.shape[1]} px).",
        )

    # Remuestrear todas las bandas a la grilla de B04.
    # Reservamos el 10 % final del progreso (0.9 → 1.0) para el remuestreo,
    # de modo que la secuencia de progreso sea siempre monótona no decreciente.
    if ref_shape is None:
        yield _ndjson("error", 0.9, "B04 no fue descargada; no se puede remuestrear.",
                      error="missing_b04")
        return

    yield _ndjson("resampling", 0.9, "Remuestreando bandas a la grilla de B04…")

    resampled: dict[str, np.ndarray] = {}
    for band_name, arr in bands_data.items():
        resampled[band_name] = resample_to_ref(arr, ref_shape)

    # Guardar en la sesión
    session.bands = resampled
    session.crs = ref_crs
    session.transform = ref_transform

    yield _ndjson("done", 1.0, "Descarga y remuestreo completados.",
                  scene_id=session.scene_id)


# ---------------------------------------------------------------------------
# True Color Preview
# ---------------------------------------------------------------------------

def generate_true_color(session: SessionData) -> bytes:
    """
    Genera un True Color Preview (PNG) a partir de las bandas B04, B03 y B02
    de la Session, normalizando por percentiles (2, 98) para estirar el
    contraste.

    Parameters
    ----------
    session : SessionData
        Session con las bandas ya descargadas.

    Returns
    -------
    bytes
        Imagen PNG codificada como bytes.

    Raises
    ------
    ValueError
        Si alguna de las bandas B02, B03 o B04 no está disponible en la Session.
    """
    for band in ("B04", "B03", "B02"):
        if band not in session.bands:
            raise ValueError(
                f"La banda {band} no está disponible en la sesión. "
                "Descargue las bandas antes de generar el preview."
            )

    def _normalize(arr: np.ndarray) -> np.ndarray:
        """Normaliza al rango [0, 1] usando percentiles (2, 98)."""
        p2 = float(np.nanpercentile(arr, 2))
        p98 = float(np.nanpercentile(arr, 98))
        if p98 == p2:
            return np.zeros_like(arr, dtype=np.float32)
        normed = (arr - p2) / (p98 - p2)
        return np.clip(normed, 0.0, 1.0).astype(np.float32)

    r = _normalize(session.bands["B04"])
    g = _normalize(session.bands["B03"])
    b = _normalize(session.bands["B02"])

    # Apilar en (H, W, 3)
    rgb = np.stack([r, g, b], axis=-1)

    fig, ax = plt.subplots(figsize=(8, 8), dpi=100)
    ax.imshow(rgb)
    ax.axis("off")
    plt.tight_layout(pad=0)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return buf.read()
