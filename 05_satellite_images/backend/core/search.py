"""
core/search.py
--------------
Búsqueda de escenas Sentinel-2 L2A en el catálogo STAC de Planetary Computer.

Requisitos cubiertos: 2.1, 2.2, 2.3, 2.4, 2.7
"""

from __future__ import annotations

import concurrent.futures
from typing import Any

import planetary_computer
import pystac_client
from fastapi import HTTPException

_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
_COLLECTION = "sentinel-2-l2a"


def _open_client() -> pystac_client.Client:
    """Abre el cliente STAC con el modificador de firma de Planetary Computer."""
    return pystac_client.Client.open(
        _STAC_URL,
        modifier=planetary_computer.sign_inplace,
    )


def _do_search(
    bbox: list[float],
    time_range: str,
    cloud_threshold: float,
) -> list[Any]:
    """
    Ejecuta la búsqueda STAC y devuelve la lista de items encontrados.
    Esta función se ejecuta dentro de un ThreadPoolExecutor para poder
    aplicar un timeout externo.
    """
    client = _open_client()
    search = client.search(
        collections=[_COLLECTION],
        bbox=bbox,
        datetime=time_range,
        query={"eo:cloud_cover": {"lt": cloud_threshold}},
        max_items=100,
    )
    return list(search.items())


def search_scene(
    bbox: list[float],
    time_range: str,
    cloud_threshold: float,
    timeout: int = 30,
) -> dict:
    """
    Consulta el catálogo STAC de Planetary Computer y selecciona la mejor
    escena Sentinel-2 L2A disponible.

    Criterios de selección (Req 2.2, 2.3):
    - Menor ``eo:cloud_cover``.
    - En caso de empate, la fecha de adquisición más reciente.

    Parameters
    ----------
    bbox : list[float]
        Bounding box ``[lon_min, lat_min, lon_max, lat_max]`` en EPSG:4326.
    time_range : str
        Rango temporal en formato ``YYYY-MM-DD/YYYY-MM-DD``.
    cloud_threshold : float
        Porcentaje máximo de cobertura nubosa (0–100).  El filtro aplicado
        es ``eo:cloud_cover < cloud_threshold``.
    timeout : int, optional
        Tiempo máximo en segundos para la consulta STAC (por defecto 30 s).

    Returns
    -------
    dict
        ``{"id": str, "datetime": str, "cloud_cover": float, "item": pystac.Item}``

    Raises
    ------
    HTTPException(404)
        Si la búsqueda no devuelve ningún resultado (Req 2.4).
    HTTPException(502)
        Si la consulta falla por error de red, timeout o cualquier excepción
        del cliente STAC (Req 2.7).
    """
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_do_search, bbox, time_range, cloud_threshold)
            try:
                items = future.result(timeout=timeout)
            except concurrent.futures.TimeoutError:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "El catálogo STAC de Planetary Computer no respondió "
                        f"en {timeout} segundos. Inténtelo de nuevo más tarde."
                    ),
                )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Error al consultar el catálogo STAC de Planetary Computer: {exc}"
            ),
        ) from exc

    # Req 2.4 — sin resultados
    if not items:
        raise HTTPException(
            status_code=404,
            detail=(
                "No se encontraron escenas Sentinel-2 para los parámetros "
                "indicados. Amplíe el rango de fechas o el umbral de cobertura "
                "nubosa e inténtelo de nuevo."
            ),
        )

    # Req 2.2 + 2.3 — seleccionar el item con menor cloud_cover;
    # desempate por fecha más reciente (datetime descendente).
    best = min(
        items,
        key=lambda item: (
            item.properties.get("eo:cloud_cover", 100.0),
            # Negamos el timestamp para que el más reciente quede primero
            # al minimizar (menor valor = más reciente).
            -item.datetime.timestamp(),
        ),
    )

    return {
        "id": best.id,
        "datetime": best.datetime.isoformat(),
        "cloud_cover": best.properties["eo:cloud_cover"],
        "item": best,
    }
