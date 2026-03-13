"""
Módulo de física: ecuación de caída libre, ajuste de curva y filtrado de datos.
"""

import numpy as np
from scipy.optimize import curve_fit
from gravity_app.utils.constants import G_REAL, VEL_THRESHOLD, MIN_CONSECUTIVE_FALL


def free_fall(t, y0, v0, g):
    """Ecuación de caída libre: y(t) = y0 + v0*t + 0.5*g*t²"""
    return y0 + v0 * t + 0.5 * g * t ** 2


def filter_free_fall_region(times_rel, y_meters):
    """
    Detecta automáticamente la región de caída libre filtrando
    puntos donde la velocidad es consistentemente positiva.
    
    Returns:
        (times_filtered, y_filtered, info_message)
    """
    if len(times_rel) <= 3:
        return times_rel, y_meters, "Datos insuficientes para filtrar."

    dy = np.diff(y_meters)
    dt = np.diff(times_rel)
    velocities = dy / dt

    falling_mask = velocities > VEL_THRESHOLD

    fall_start_idx = None
    consecutive = 0
    for idx_v, is_falling in enumerate(falling_mask):
        if is_falling:
            consecutive += 1
            if consecutive >= MIN_CONSECUTIVE_FALL and fall_start_idx is None:
                fall_start_idx = idx_v - (MIN_CONSECUTIVE_FALL - 1)
        else:
            consecutive = 0

    if fall_start_idx is not None and fall_start_idx >= 0:
        times_filtered = times_rel[fall_start_idx:]
        y_filtered = y_meters[fall_start_idx:]
        times_filtered = times_filtered - times_filtered[0]
        msg = f"Caída detectada: {len(times_filtered)} puntos de datos"
        return times_filtered, y_filtered, msg
    else:
        return times_rel, y_meters, "No se detectó una caída clara. Usando todos los datos."


def fit_gravity(times_rel, y_meters):
    """
    Ajusta la ecuación de caída libre a los datos experimentales.
    
    Returns:
        dict con keys: y0, v0, g, y0_err, v0_err, g_err, r_squared, error_pct, n_points,
                       t_fit, y_fit, residuals, times_rel, y_meters
    Raises:
        ValueError si los datos son insuficientes o el ajuste falla.
    """
    if len(times_rel) < 3:
        raise ValueError("Se necesitan al menos 3 puntos para ajustar.")

    popt, pcov = curve_fit(
        free_fall, times_rel, y_meters,
        p0=[y_meters[0], 0.0, 9.8],
        maxfev=10000
    )
    y0_fit, v0_fit, g_fit = popt
    perr = np.sqrt(np.diag(pcov))
    y0_err, v0_err, g_err = perr

    y_pred = free_fall(times_rel, *popt)
    ss_res = np.sum((y_meters - y_pred) ** 2)
    ss_tot = np.sum((y_meters - np.mean(y_meters)) ** 2)
    r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0

    error_pct = abs(g_fit - G_REAL) / G_REAL * 100

    t_fit = np.linspace(times_rel[0], times_rel[-1], 200)
    y_fit = free_fall(t_fit, *popt)

    residuals = y_meters - y_pred

    return {
        "y0": y0_fit, "v0": v0_fit, "g": g_fit,
        "y0_err": y0_err, "v0_err": v0_err, "g_err": g_err,
        "r_squared": r_squared, "error_pct": error_pct,
        "n_points": len(times_rel),
        "t_fit": t_fit, "y_fit": y_fit,
        "residuals": residuals,
        "times_rel": times_rel, "y_meters": y_meters,
    }
