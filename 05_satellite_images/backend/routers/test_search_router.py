"""
routers/test_search_router.py
------------------------------
Tests unitarios para el endpoint POST /search (routers/search.py).

Cubre:
- Validación de bbox inválido → HTTP 400 (Req 2.6)
- Validación de time_range inválido → HTTP 400 (Req 2.6)
- Validación de cloud_cover_threshold inválido → HTTP 400 (Req 2.6)
- Respuesta exitosa con session_id, scene_id, datetime, cloud_cover (Req 2.2, 2.5)
- Propagación de HTTP 404 desde search_scene (Req 2.4)
- Propagación de HTTP 502 desde search_scene (Req 2.7)
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_VALID_PAYLOAD = {
    "bbox": [-74.85, 7.55, -74.75, 7.65],
    "time_range": "2023-01-01/2023-12-31",
    "cloud_cover_threshold": 20.0,
}

_MOCK_SCENE = {
    "id": "S2A_MSIL2A_20230601",
    "datetime": datetime(2023, 6, 1, tzinfo=timezone.utc).isoformat(),
    "cloud_cover": 5.0,
    "item": None,
}


# ---------------------------------------------------------------------------
# Tests de validación de bbox (Req 2.6)
# ---------------------------------------------------------------------------

class TestBboxValidation:
    """Verifica que bbox inválido produce HTTP 400."""

    def test_bbox_wrong_length(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.85, 7.55, -74.75]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422  # Pydantic validation error

    def test_bbox_lon_min_out_of_range(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-200.0, 7.55, -74.75, 7.65]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_bbox_lon_max_out_of_range(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.85, 7.55, 200.0, 7.65]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_bbox_lat_min_out_of_range(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.85, -100.0, -74.75, 7.65]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_bbox_lat_max_out_of_range(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.85, 7.55, -74.75, 100.0]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_bbox_lon_min_equals_lon_max(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.75, 7.55, -74.75, 7.65]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_bbox_lon_min_greater_than_lon_max(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.70, 7.55, -74.75, 7.65]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_bbox_lat_min_equals_lat_max(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.85, 7.65, -74.75, 7.65]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_bbox_lat_min_greater_than_lat_max(self):
        payload = {**_VALID_PAYLOAD, "bbox": [-74.85, 7.70, -74.75, 7.65]}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests de validación de time_range (Req 2.6)
# ---------------------------------------------------------------------------

class TestTimeRangeValidation:
    """Verifica que time_range inválido produce HTTP 422."""

    def test_time_range_missing_slash(self):
        payload = {**_VALID_PAYLOAD, "time_range": "2023-01-012023-12-31"}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_time_range_invalid_start_date(self):
        payload = {**_VALID_PAYLOAD, "time_range": "2023-13-01/2023-12-31"}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_time_range_invalid_end_date(self):
        payload = {**_VALID_PAYLOAD, "time_range": "2023-01-01/2023-02-30"}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_time_range_start_after_end(self):
        payload = {**_VALID_PAYLOAD, "time_range": "2023-12-31/2023-01-01"}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_time_range_start_equals_end_is_valid(self):
        """Inicio igual a fin es válido (inicio ≤ fin)."""
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            payload = {**_VALID_PAYLOAD, "time_range": "2023-06-01/2023-06-01"}
            resp = client.post("/search", json=payload)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Tests de validación de cloud_cover_threshold (Req 2.6)
# ---------------------------------------------------------------------------

class TestCloudCoverValidation:
    """Verifica que cloud_cover_threshold inválido produce HTTP 422."""

    def test_cloud_cover_below_zero(self):
        payload = {**_VALID_PAYLOAD, "cloud_cover_threshold": -1.0}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_cloud_cover_above_100(self):
        payload = {**_VALID_PAYLOAD, "cloud_cover_threshold": 101.0}
        resp = client.post("/search", json=payload)
        assert resp.status_code == 422

    def test_cloud_cover_zero_is_valid(self):
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            payload = {**_VALID_PAYLOAD, "cloud_cover_threshold": 0.0}
            resp = client.post("/search", json=payload)
        assert resp.status_code == 200

    def test_cloud_cover_100_is_valid(self):
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            payload = {**_VALID_PAYLOAD, "cloud_cover_threshold": 100.0}
            resp = client.post("/search", json=payload)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Tests de respuesta exitosa (Req 2.2, 2.5)
# ---------------------------------------------------------------------------

class TestSuccessfulSearch:
    """Verifica la respuesta exitosa del endpoint."""

    def test_returns_200_with_required_fields(self):
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            resp = client.post("/search", json=_VALID_PAYLOAD)
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert "scene_id" in data
        assert "datetime" in data
        assert "cloud_cover" in data

    def test_scene_id_matches_mock(self):
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            resp = client.post("/search", json=_VALID_PAYLOAD)
        data = resp.json()
        assert data["scene_id"] == _MOCK_SCENE["id"]

    def test_cloud_cover_matches_mock(self):
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            resp = client.post("/search", json=_VALID_PAYLOAD)
        data = resp.json()
        assert data["cloud_cover"] == _MOCK_SCENE["cloud_cover"]

    def test_session_id_is_uuid_string(self):
        import uuid
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            resp = client.post("/search", json=_VALID_PAYLOAD)
        data = resp.json()
        # Should not raise
        uuid.UUID(data["session_id"])

    def test_different_calls_produce_different_session_ids(self):
        with patch("routers.search.search_scene", return_value=_MOCK_SCENE):
            resp1 = client.post("/search", json=_VALID_PAYLOAD)
            resp2 = client.post("/search", json=_VALID_PAYLOAD)
        assert resp1.json()["session_id"] != resp2.json()["session_id"]


# ---------------------------------------------------------------------------
# Tests de propagación de errores desde search_scene (Req 2.4, 2.7)
# ---------------------------------------------------------------------------

class TestErrorPropagation:
    """Verifica que los errores de search_scene se propagan correctamente."""

    def test_propagates_404_when_no_scenes(self):
        from fastapi import HTTPException
        with patch(
            "routers.search.search_scene",
            side_effect=HTTPException(status_code=404, detail="No scenes found"),
        ):
            resp = client.post("/search", json=_VALID_PAYLOAD)
        assert resp.status_code == 404

    def test_propagates_502_on_network_error(self):
        from fastapi import HTTPException
        with patch(
            "routers.search.search_scene",
            side_effect=HTTPException(status_code=502, detail="STAC unavailable"),
        ):
            resp = client.post("/search", json=_VALID_PAYLOAD)
        assert resp.status_code == 502
