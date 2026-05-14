# core/export.py
# Renderizado del mapa clasificado (PNG) y exportación GeoTIFF.
# Requisitos: 7.6, 8.1, 8.2

from __future__ import annotations

import io
from typing import TYPE_CHECKING

import matplotlib
matplotlib.use("Agg")  # non-interactive backend, safe for server use
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import ListedColormap
import numpy as np
import rasterio
from rasterio.io import MemoryFile

if TYPE_CHECKING:
    from session_store import SessionData

# ---------------------------------------------------------------------------
# Color mapping
# Class labels: 0 = Vegetación, 1 = Agua, 2 = Minería/Suelo expuesto, -1 = No clasificado
# Colormap index:  0 → green, 1 → blue, 2 → saddlebrown, 3 → black
# ---------------------------------------------------------------------------
CLASS_COLORS = ["green", "blue", "saddlebrown", "black"]

_CMAP = ListedColormap(CLASS_COLORS)

_LEGEND_LABELS = [
    ("green",       "Vegetación"),
    ("blue",        "Agua"),
    ("saddlebrown", "Minería/Suelo expuesto"),
    ("black",       "No clasificado"),
]


def _class_map_to_index(class_map: np.ndarray) -> np.ndarray:
    """
    Convert class labels {-1, 0, 1, 2} to colormap indices {0, 1, 2, 3}.

    Mapping:
        0  → 0  (green  – Vegetación)
        1  → 1  (blue   – Agua)
        2  → 2  (saddlebrown – Minería)
       -1  → 3  (black  – No clasificado)
    """
    index = np.where(class_map == -1, 3, class_map).astype(np.uint8)
    return index


def render_classified_map(session: "SessionData") -> bytes:
    """
    Render the session's class_map as a PNG image with a visible legend.

    Uses a ListedColormap with CLASS_COLORS and adds a legend for all four
    classes (Vegetación, Agua, Minería/Suelo expuesto, No clasificado).

    Returns:
        PNG image as bytes.

    Raises:
        ValueError: if session.class_map is None.
    """
    if session.class_map is None:
        raise ValueError(
            "La sesión no contiene un class_map. "
            "Ejecute la predicción antes de renderizar el mapa."
        )

    index_map = _class_map_to_index(session.class_map)

    fig, ax = plt.subplots(figsize=(8, 6), dpi=100)
    ax.imshow(index_map, cmap=_CMAP, vmin=0, vmax=3, interpolation="nearest")
    ax.axis("off")

    # Build legend patches
    patches = [
        mpatches.Patch(color=color, label=label)
        for color, label in _LEGEND_LABELS
    ]
    ax.legend(
        handles=patches,
        loc="lower right",
        fontsize=9,
        framealpha=0.85,
        edgecolor="gray",
    )

    ax.set_title("Mapa de Clasificación", fontsize=12, pad=8)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def export_geotiff(session: "SessionData") -> bytes:
    """
    Export the session's class_map as a single-band int16 GeoTIFF.

    Uses the CRS and affine transform stored in the session (from the
    windowed read of the Sentinel-2 scene).  nodata is set to -1.

    Returns:
        GeoTIFF file contents as bytes.

    Raises:
        ValueError: if session.class_map is None.
    """
    if session.class_map is None:
        raise ValueError(
            "La sesión no contiene un class_map. "
            "Ejecute la predicción antes de exportar el GeoTIFF."
        )

    class_map = session.class_map.astype(np.int16)
    height, width = class_map.shape

    with MemoryFile() as mem_file:
        with mem_file.open(
            driver="GTiff",
            height=height,
            width=width,
            count=1,
            dtype=rasterio.int16,
            crs=session.crs,
            transform=session.transform,
            nodata=-1,
        ) as dataset:
            dataset.write(class_map, 1)

        return mem_file.read()
