"""
core/test_search.py
-------------------
Tests unitarios para core/search.py.

Cubre:
- Selección del item con menor eo:cloud_cover (Req 2.2)
- Desempate por fecha más reciente (Req 2.3)
- HTTPException 404 cuando no hay resultados (Req 2.4)
- HTTPException 502 en error de red (Req 2.7)
- HTTPException 502 en timeout (Req 2.7)
"""

from __future__ import annotations

import concurrent.futures
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from core.search import search_scene


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_item(item_id: str, cloud_cover: float, dt: datetime) -> MagicMock:
    """Crea un mock de pystac.Item con los campos mínimos necesarios."""
    item = MagicMock()
    item.id = item_id
    item.datetime = dt
    item.properties = {"eo:cloud_cover": cloud_cover}
    return item


# ---------------------------------------------------------------------------
# Tests de selección de escena
# ---------------------------------------------------------------------------

class TestSearchSceneSelection:
    """Verifica la lógica de selección del mejor item."""

    def test_selects_item_with_lowest_cloud_cover(self):
        """Req 2.2 — se elige el item con menor eo:cloud_cover."""
        items = [
            _make_item("A", 15.0, datetime(2023, 6, 1, tzinfo=timezone.utc)),
            _make_item("B", 5.0,  datetime(2023, 6, 2, tzinfo=timezone.utc)),
            _make_item("C", 20.0, datetime(2023, 6, 3, tzinfo=timezone.utc)),
        ]
        with patch("core.search._do_search", return_value=items):
            result = search_scene([-74.85, 7.55, -74.75, 7.65], "2023-01-01/2023-12-31", 30)
        assert result["id"] == "B"
        assert result["cloud_cover"] == 5.0

    def test_tiebreak_selects_most_recent_date(self):
        """Req 2.3 — en empate de cloud_cover, se elige la fecha más reciente."""
        items = [
            _make_item("older", 10.0, datetime(2023, 3, 1, tzinfo=timezone.utc)),
            _make_item("newer", 10.0, datetime(2023, 9, 1, tzinfo=timezone.utc)),
        ]
        with patch("core.search._do_search", return_value=items):
            result = search_scene([-74.85, 7.55, -74.75, 7.65], "2023-01-01/2023-12-31", 30)
        assert result["id"] == "newer"

    def test_single_item_is_returned(self):
        """Con un único resultado, ese item debe ser devuelto."""
        items = [_make_item("only", 8.5, datetime(2023, 5, 15, tzinfo=timezone.utc))]
        with patch("core.search._do_search", return_value=items):
            result = search_scene([-74.85, 7.55, -74.75, 7.65], "2023-01-01/2023-12-31", 30)
        assert result["id"] == "only"
        assert result["cloud_cover"] == 8.5

    def test_result_contains_required_keys(self):
        """El dict devuelto debe contener id, datetime, cloud_cover e item."""
        dt = datetime(2023, 7, 4, 12, 0, 0, tzinfo=timezone.utc)
        items = [_make_item("X", 3.0, dt)]
        with patch("core.search._do_search", return_value=items):
            result = search_scene([-74.85, 7.55, -74.75, 7.65], "2023-01-01/2023-12-31", 30)
        assert set(result.keys()) == {"id", "datetime", "cloud_cover", "item"}
        assert result["datetime"] == dt.isoformat()
        assert result["item"] is items[0]


# ---------------------------------------------------------------------------
# Tests de errores
# ---------------------------------------------------------------------------

class TestSearchSceneErrors:
    """Verifica el manejo de errores."""

    def test_raises_404_when_no_results(self):
        """Req 2.4 — lista vacía → HTTPException 404."""
        with patch("core.search._do_search", return_value=[]):
            with pytest.raises(HTTPException) as exc_info:
                search_scene([-74.85, 7.55, -74.75, 7.65], "2023-01-01/2023-12-31", 30)
        assert exc_info.value.status_code == 404

    def test_raises_502_on_network_error(self):
        """Req 2.7 — excepción de red → HTTPException 502."""
        with patch("core.search._do_search", side_effect=ConnectionError("red caída")):
            with pytest.raises(HTTPException) as exc_info:
                search_scene([-74.85, 7.55, -74.75, 7.65], "2023-01-01/2023-12-31", 30)
        assert exc_info.value.status_code == 502

    def test_raises_502_on_timeout(self):
        """Req 2.7 — timeout → HTTPException 502."""
        def slow_search(*args, **kwargs):
            import time
            time.sleep(5)  # más que el timeout de 1 s usado en el test

        with patch("core.search._do_search", side_effect=slow_search):
            with pytest.raises(HTTPException) as exc_info:
                search_scene(
                    [-74.85, 7.55, -74.75, 7.65],
                    "2023-01-01/2023-12-31",
                    cloud_threshold=30,
                    timeout=1,  # timeout muy corto para el test
                )
        assert exc_info.value.status_code == 502

    def test_raises_502_on_generic_exception(self):
        """Req 2.7 — cualquier excepción del cliente STAC → HTTPException 502."""
        with patch("core.search._do_search", side_effect=RuntimeError("fallo inesperado")):
            with pytest.raises(HTTPException) as exc_info:
                search_scene([-74.85, 7.55, -74.75, 7.65], "2023-01-01/2023-12-31", 30)
        assert exc_info.value.status_code == 502
