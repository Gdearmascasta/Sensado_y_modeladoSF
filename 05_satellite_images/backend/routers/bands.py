"""
routers/bands.py
----------------
Endpoints para descarga de bandas y generación del True Color Preview.

  POST /download
      Inicia la descarga de las cinco bandas del Band_Set para la sesión
      indicada y devuelve un Progress_Stream NDJSON.

  GET /preview/truecolor?session_id=...
      Devuelve el True Color Preview (PNG) de la sesión indicada.

Requisitos cubiertos: 3.3, 3.4, 3.6, 3.7
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from core.bands import download_bands_stream, generate_true_color
from session_store import get_session

router = APIRouter()


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class DownloadRequest(BaseModel):
    """Body del endpoint POST /download."""

    session_id: str


# ---------------------------------------------------------------------------
# POST /download
# ---------------------------------------------------------------------------

@router.post("/download")
def download(request: DownloadRequest) -> StreamingResponse:
    """Descarga las bandas del Band_Set para la sesión indicada.

    Devuelve un ``StreamingResponse`` con ``media_type="application/x-ndjson"``
    que emite líneas JSON de progreso mientras se descargan y remuestrean las
    cinco bandas Sentinel-2.

    Parameters
    ----------
    request : DownloadRequest
        Body JSON con ``session_id``.

    Returns
    -------
    StreamingResponse
        Stream NDJSON con líneas ``{stage, progress, message}`` y una línea
        final ``stage="done"`` o ``stage="error"``.

    Raises
    ------
    HTTPException(404)
        Si la sesión no existe o ha expirado (Req 3.6).
    HTTPException(409)
        Si la sesión no tiene un item STAC almacenado (no se puede descargar).
    """
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Sesión '{request.session_id}' no encontrada o expirada. "
                "Realice una nueva búsqueda para obtener un identificador de sesión válido."
            ),
        )

    if session.item is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "La sesión no contiene un item STAC. "
                "Realice una nueva búsqueda para obtener la escena."
            ),
        )

    return StreamingResponse(
        download_bands_stream(request.session_id, session.item),
        media_type="application/x-ndjson",
    )


# ---------------------------------------------------------------------------
# GET /preview/truecolor
# ---------------------------------------------------------------------------

@router.get("/preview/truecolor")
def preview_truecolor(
    session_id: str = Query(..., description="Identificador de la sesión activa."),
) -> Response:
    """Devuelve el True Color Preview (PNG) de la sesión indicada.

    Genera la imagen a partir de las bandas B04, B03 y B02 normalizadas por
    percentiles (2, 98) y la devuelve como ``image/png``.

    Parameters
    ----------
    session_id : str
        Identificador de la sesión (query param).

    Returns
    -------
    Response
        Imagen PNG con ``media_type="image/png"``.

    Raises
    ------
    HTTPException(404)
        Si la sesión no existe o ha expirado (Req 3.7).
    HTTPException(409)
        Si las bandas aún no han sido descargadas (Req 3.7).
    """
    session = get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Sesión '{session_id}' no encontrada o expirada. "
                "Realice una nueva búsqueda para obtener un identificador de sesión válido."
            ),
        )

    # Verificar que las bandas necesarias para el preview están disponibles
    required_bands = {"B02", "B03", "B04"}
    if not required_bands.issubset(session.bands.keys()):
        missing = required_bands - set(session.bands.keys())
        raise HTTPException(
            status_code=409,
            detail=(
                f"Las bandas {sorted(missing)} aún no han sido descargadas. "
                "Ejecute POST /download antes de solicitar el preview."
            ),
        )

    try:
        png_bytes = generate_true_color(session)
    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    return Response(content=png_bytes, media_type="image/png")
