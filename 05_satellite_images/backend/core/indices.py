# core/indices.py
# Cálculo de índices espectrales NDVI, BSI, NDWI y renderizado de Index_Layer.
# Requisitos: 4.1, 4.2, 4.3

from __future__ import annotations

import io
from typing import TYPE_CHECKING

import matplotlib
matplotlib.use("Agg")  # backend sin pantalla
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np

if TYPE_CHECKING:
    from session_store import SessionData

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

SENTINEL_VALUE: float = -9999.0  # valor fuera de rango para NaN/Inf

COLORMAPS: dict[str, str] = {
    "ndvi": "RdYlGn",
    "bsi":  "YlOrBr",
    "ndwi": "Blues",
}


# ---------------------------------------------------------------------------
# Helpers de cálculo (expuestos para PBT)
# ---------------------------------------------------------------------------

def compute_ndvi(b08: np.ndarray, b04: np.ndarray) -> np.ndarray:
    """NDVI = (B08 − B04) / (B08 + B04).

    Division by zero produces NaN (via numpy's float division).
    """
    b08 = b08.astype(np.float32)
    b04 = b04.astype(np.float32)
    with np.errstate(divide="ignore", invalid="ignore"):
        result = (b08 - b04) / (b08 + b04)
    return result.astype(np.float32)


def compute_bsi(
    b11: np.ndarray,
    b04: np.ndarray,
    b08: np.ndarray,
    b02: np.ndarray,
) -> np.ndarray:
    """BSI = ((B11 + B04) − (B08 + B02)) / ((B11 + B04) + (B08 + B02))."""
    b11 = b11.astype(np.float32)
    b04 = b04.astype(np.float32)
    b08 = b08.astype(np.float32)
    b02 = b02.astype(np.float32)
    with np.errstate(divide="ignore", invalid="ignore"):
        numerator = (b11 + b04) - (b08 + b02)
        denominator = (b11 + b04) + (b08 + b02)
        result = numerator / denominator
    return result.astype(np.float32)


def compute_ndwi(b03: np.ndarray, b08: np.ndarray) -> np.ndarray:
    """NDWI = (B03 − B08) / (B03 + B08)."""
    b03 = b03.astype(np.float32)
    b08 = b08.astype(np.float32)
    with np.errstate(divide="ignore", invalid="ignore"):
        result = (b03 - b08) / (b03 + b08)
    return result.astype(np.float32)


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def compute_indices(session: "SessionData") -> None:
    """Calcula NDVI, BSI y NDWI a partir de las bandas de la sesión.

    Los resultados se almacenan en ``session.indices`` como arreglos
    ``numpy.float32``.  Los valores NaN/Inf se mantienen en los arreglos
    internos; el reemplazo por ``SENTINEL_VALUE`` sólo ocurre al serializar
    (en ``render_index_layer``).

    Requisitos: 4.1
    """
    bands = session.bands
    session.indices["ndvi"] = compute_ndvi(bands["B08"], bands["B04"])
    session.indices["bsi"] = compute_bsi(
        bands["B11"], bands["B04"], bands["B08"], bands["B02"]
    )
    session.indices["ndwi"] = compute_ndwi(bands["B03"], bands["B08"])


def render_index_layer(session: "SessionData", name: str) -> bytes:
    """Genera un PNG del índice ``name`` con colormap Matplotlib y colorbar.

    * Reemplaza NaN/Inf por ``SENTINEL_VALUE`` antes de renderizar.
    * Usa los colormaps definidos en ``COLORMAPS``.
    * Incluye una barra de escala (colorbar) con el rango de valores válidos.

    Retorna los bytes del PNG.

    Requisitos: 4.2, 4.3
    """
    data: np.ndarray = session.indices[name].copy()

    # Reemplazar NaN e Inf por SENTINEL_VALUE (serialización segura)
    invalid_mask = ~np.isfinite(data)
    data[invalid_mask] = SENTINEL_VALUE

    # Calcular rango de valores válidos para la barra de escala
    valid_data = data[data != SENTINEL_VALUE]
    if valid_data.size > 0:
        vmin = float(np.nanmin(valid_data))
        vmax = float(np.nanmax(valid_data))
    else:
        vmin, vmax = -1.0, 1.0

    # Crear máscara para píxeles con SENTINEL_VALUE (se muestran en gris)
    masked_data = np.ma.masked_where(data == SENTINEL_VALUE, data)

    cmap = plt.get_cmap(COLORMAPS[name]).copy()
    cmap.set_bad(color="lightgray")  # color para píxeles enmascarados

    fig, ax = plt.subplots(figsize=(6, 5), tight_layout=True)
    im = ax.imshow(masked_data, cmap=cmap, vmin=vmin, vmax=vmax)
    ax.axis("off")
    ax.set_title(name.upper(), fontsize=12, fontweight="bold")

    # Barra de escala (colorbar)
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label(f"{name.upper()} [{vmin:.3f} – {vmax:.3f}]", fontsize=9)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=100, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()
