"""
routers/search.py
-----------------
Endpoint POST /search — búsqueda de escena Sentinel-2 y creación de sesión.

Requisitos cubiertos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator, model_validator

from core.search import search_scene
from session_store import SessionData, create_session

router = APIRouter()


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    """Body del endpoint POST /search.

    Campos
    ------
    bbox : list[float]
        Bounding box ``[lon_min, lat_min, lon_max, lat_max]`` en EPSG:4326.
    time_range : str
        Rango temporal en formato ``YYYY-MM-DD/YYYY-MM-DD``.
    cloud_cover_threshold : float
        Porcentaje máximo de cobertura nubosa, rango [0, 100].
    """

    bbox: list[float]
    time_range: str
    cloud_cover_threshold: float

    # ------------------------------------------------------------------
    # Validación de bbox (Req 2.6)
    # ------------------------------------------------------------------

    @field_validator("bbox")
    @classmethod
    def validate_bbox(cls, v: list[float]) -> list[float]:
        if len(v) != 4:
            raise ValueError(
                "bbox debe contener exactamente 4 valores: "
                "[lon_min, lat_min, lon_max, lat_max]."
            )
        lon_min, lat_min, lon_max, lat_max = v

        if not (-180.0 <= lon_min <= 180.0):
            raise ValueError(
                f"lon_min={lon_min} está fuera del rango válido [-180, 180]."
            )
        if not (-180.0 <= lon_max <= 180.0):
            raise ValueError(
                f"lon_max={lon_max} está fuera del rango válido [-180, 180]."
            )
        if not (-90.0 <= lat_min <= 90.0):
            raise ValueError(
                f"lat_min={lat_min} está fuera del rango válido [-90, 90]."
            )
        if not (-90.0 <= lat_max <= 90.0):
            raise ValueError(
                f"lat_max={lat_max} está fuera del rango válido [-90, 90]."
            )
        if lon_min >= lon_max:
            raise ValueError(
                f"lon_min ({lon_min}) debe ser estrictamente menor que "
                f"lon_max ({lon_max})."
            )
        if lat_min >= lat_max:
            raise ValueError(
                f"lat_min ({lat_min}) debe ser estrictamente menor que "
                f"lat_max ({lat_max})."
            )
        return v

    # ------------------------------------------------------------------
    # Validación de time_range (Req 2.6)
    # ------------------------------------------------------------------

    @field_validator("time_range")
    @classmethod
    def validate_time_range(cls, v: str) -> str:
        parts = v.split("/")
        if len(parts) != 2:
            raise ValueError(
                "time_range debe tener el formato 'YYYY-MM-DD/YYYY-MM-DD'."
            )
        start_str, end_str = parts
        try:
            start = date.fromisoformat(start_str)
        except ValueError:
            raise ValueError(
                f"La fecha de inicio '{start_str}' no es una fecha ISO 8601 válida "
                "(formato esperado: YYYY-MM-DD)."
            )
        try:
            end = date.fromisoformat(end_str)
        except ValueError:
            raise ValueError(
                f"La fecha de fin '{end_str}' no es una fecha ISO 8601 válida "
                "(formato esperado: YYYY-MM-DD)."
            )
        if start > end:
            raise ValueError(
                f"La fecha de inicio ({start_str}) no puede ser posterior "
                f"a la fecha de fin ({end_str})."
            )
        return v

    # ------------------------------------------------------------------
    # Validación de cloud_cover_threshold (Req 2.6)
    # ------------------------------------------------------------------

    @field_validator("cloud_cover_threshold")
    @classmethod
    def validate_cloud_cover(cls, v: float) -> float:
        if not (0.0 <= v <= 100.0):
            raise ValueError(
                f"cloud_cover_threshold={v} está fuera del rango válido [0, 100]."
            )
        return v


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/search")
async def search(request: SearchRequest) -> dict:
    """Busca la mejor escena Sentinel-2 y crea una sesión.

    Valida los parámetros de entrada (Req 2.6), consulta el catálogo STAC
    (Req 2.1), selecciona la escena con menor cobertura nubosa (Req 2.2, 2.3),
    crea una sesión con TTL de 60 minutos (Req 2.5) y devuelve los metadatos
    de la escena junto con el identificador de sesión.

    Returns
    -------
    dict
        ``{session_id, scene_id, datetime, cloud_cover}``

    Raises
    ------
    HTTPException(400)
        Si algún parámetro de entrada es inválido (Req 2.6).
    HTTPException(404)
        Si no se encontraron escenas para los parámetros dados (Req 2.4).
    HTTPException(502)
        Si la consulta al catálogo STAC falla (Req 2.7).
    """
    # Pydantic ya validó los campos; si llegamos aquí los datos son correctos.
    # search_scene lanza HTTPException(404) o HTTPException(502) según proceda.
    scene = search_scene(
        bbox=request.bbox,
        time_range=request.time_range,
        cloud_threshold=request.cloud_cover_threshold,
    )

    # Crear sesión con los metadatos de la escena (Req 2.5)
    # Almacenamos el item STAC firmado para que el router de descarga pueda
    # acceder a los assets sin necesidad de volver a consultar el catálogo.
    session_data = SessionData(
        scene_id=scene["id"],
        scene_datetime=scene["datetime"],
        cloud_cover=scene["cloud_cover"],
        bbox=request.bbox,
        item=scene.get("item"),
    )
    session_id = create_session(session_data)

    return {
        "session_id": session_id,
        "scene_id": scene["id"],
        "datetime": scene["datetime"],
        "cloud_cover": scene["cloud_cover"],
    }
