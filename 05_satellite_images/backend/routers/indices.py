"""
routers/indices.py
------------------
Endpoint para la visualización de índices espectrales.

  GET /index/{name}?session_id=...
      Devuelve el Index_Layer (PNG) del índice ``name`` para la sesión
      indicada.  Calcula los índices de forma perezosa si aún no están
      disponibles en la sesión.

Requisitos cubiertos: 4.3, 4.4, 4.5
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from core.indices import compute_indices, render_index_layer
from session_store import get_session

router = APIRouter()

# Conjunto de nombres de índice válidos
VALID_INDEX_NAMES: frozenset[str] = frozenset({"ndvi", "bsi", "ndwi"})


# ---------------------------------------------------------------------------
# GET /index/{name}
# ---------------------------------------------------------------------------

@router.get("/index/{name}")
def get_index(
    name: str,
    session_id: str = Query(..., description="Identificador de la sesión activa."),
) -> Response:
    """Devuelve el Index_Layer (PNG) del índice espectral ``name``.

    Si los índices aún no han sido calculados para la sesión, los calcula
    de forma perezosa antes de renderizar.

    Parameters
    ----------
    name : str
        Nombre del índice espectral.  Debe ser uno de ``ndvi``, ``bsi`` o
        ``ndwi`` (insensible a mayúsculas).
    session_id : str
        Identificador de la sesión (query param).

    Returns
    -------
    Response
        Imagen PNG con ``media_type="image/png"``.

    Raises
    ------
    HTTPException(400)
        Si ``name`` no pertenece al conjunto de índices aceptados (Req 4.4).
    HTTPException(404)
        Si la sesión no existe o ha expirado (Req 4.5).
    HTTPException(409)
        Si las bandas aún no han sido descargadas (necesarias para calcular
        los índices).
    """
    # Normalizar a minúsculas para comparación
    name_lower = name.lower()

    # Validar nombre del índice — HTTP 400 si no es válido (Req 4.4)
    if name_lower not in VALID_INDEX_NAMES:
        accepted = sorted(VALID_INDEX_NAMES)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Nombre de índice '{name}' no válido. "
                f"Los nombres aceptados son: {accepted}."
            ),
        )

    # Validar sesión — HTTP 404 si no existe o expiró (Req 4.5)
    session = get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Sesión '{session_id}' no encontrada o expirada. "
                "Realice una nueva búsqueda para obtener un identificador de sesión válido."
            ),
        )

    # Verificar que las bandas necesarias están disponibles — HTTP 409
    required_bands = {"B02", "B03", "B04", "B08", "B11"}
    if not required_bands.issubset(session.bands.keys()):
        missing = required_bands - set(session.bands.keys())
        raise HTTPException(
            status_code=409,
            detail=(
                f"Las bandas {sorted(missing)} aún no han sido descargadas. "
                "Ejecute POST /download antes de solicitar un índice espectral."
            ),
        )

    # Cálculo perezoso: calcular índices sólo si aún no están en la sesión
    if not session.indices:
        compute_indices(session)

    # Renderizar y devolver el PNG
    png_bytes = render_index_layer(session, name_lower)
    return Response(content=png_bytes, media_type="image/png")
