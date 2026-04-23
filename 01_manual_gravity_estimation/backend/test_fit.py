import numpy as np
from scipy.optimize import curve_fit
import json

def func(t, g):
    return (g / 2) * (t**2)

t_arr = np.array([0.662, 0.63, 0.568])
y_arr = np.array([2.3, 2.2, 2.1])

try:
    popt, pcov = curve_fit(func, t_arr, y_arr)
    print("popt:", popt)
    print("pcov:", pcov)
    
    # Simulate fastapi json response
    resp = {
        "g": float(popt[0]),
        "covariance": pcov.tolist(),
    }
    print("json:", json.dumps(resp))
except Exception as e:
    print("Error:", e)
