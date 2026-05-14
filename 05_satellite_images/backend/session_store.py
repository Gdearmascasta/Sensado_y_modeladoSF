from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional
import uuid

import numpy as np
from sklearn.ensemble import RandomForestClassifier


@dataclass
class SessionData:
    scene_id: str
    scene_datetime: str
    cloud_cover: float
    bbox: list[float]                          # [lon_min, lat_min, lon_max, lat_max]
    item: Optional[Any] = None                 # pystac.Item firmado para descarga
    crs: Optional[object] = None
    transform: Optional[object] = None        # affine transform de la ventana
    bands: dict = field(default_factory=dict)  # {"B02": np.ndarray, ...}
    indices: dict = field(default_factory=dict)  # {"ndvi": np.ndarray, ...}
    classifier: Optional[RandomForestClassifier] = None
    classifier_id: Optional[str] = None
    class_map: Optional[np.ndarray] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    def is_expired(self) -> bool:
        """Returns True if the session has exceeded the 60-minute TTL."""
        return datetime.utcnow() > self.created_at + timedelta(minutes=60)


# Almacén global en memoria
_store: dict[str, SessionData] = {}


def create_session(data: SessionData) -> str:
    """Store a new SessionData and return its UUID string identifier."""
    sid = str(uuid.uuid4())
    _store[sid] = data
    return sid


def get_session(sid: str) -> Optional[SessionData]:
    """
    Retrieve a session by its identifier.

    Returns None (and removes the entry) if the session has expired or does
    not exist.
    """
    s = _store.get(sid)
    if s is None:
        return None
    if s.is_expired():
        del _store[sid]
        return None
    return s


def cleanup_expired() -> int:
    """
    Remove all expired sessions from the in-memory store.

    Returns the number of sessions that were removed.
    """
    expired_keys = [sid for sid, session in _store.items() if session.is_expired()]
    for sid in expired_keys:
        del _store[sid]
    return len(expired_keys)
