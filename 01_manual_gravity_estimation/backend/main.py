from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from scipy.optimize import curve_fit

app = FastAPI(title="Manual Gravity Estimation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DataPayload(BaseModel):
    t: list[float]
    y: list[float]

def func(t, g):
    return (g / 2) * (t**2)

@app.post("/estimate")
def estimate_gravity(data: DataPayload):
    try:
        t_arr = np.array(data.t)
        y_arr = np.array(data.y)
        
        popt, pcov = curve_fit(func, t_arr, y_arr)
        g_est = popt[0]
        
        # Generate fitted curve points for plotting
        t_fit = np.linspace(min(t_arr), max(t_arr), 100)
        y_fit = func(t_fit, g_est)
        
        return {
            "g": float(g_est),
            "covariance": pcov.tolist(),
            "fit_t": t_fit.tolist(),
            "fit_y": y_fit.tolist()
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
