import cv2
import json
import numpy as np
from scipy.optimize import curve_fit

def free_fall(t, y0, v0, g):
    return y0 + v0 * t + 0.5 * g * t ** 2

def detect_ball(frame, lower_hsv, upper_hsv, min_area=100):
    scale = 0.5
    small = cv2.resize(frame, (0,0), fx=scale, fy=scale)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, lower_hsv, upper_hsv)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    mask_full = cv2.resize(mask, (frame.shape[1], frame.shape[0]), interpolation=cv2.INTER_NEAREST)
    if not contours:
        return None, mask_full
    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    if area < min_area * (scale ** 2):
        return None, mask_full
    M = cv2.moments(largest)
    if M["m00"] == 0:
        return None, mask_full
    cx = int(M["m10"] / (M["m00"] * scale))
    cy = int(M["m01"] / (M["m00"] * scale))
    return (cx, cy), mask_full

def process_video_stream(video_path, pixels_per_meter, hsv_lower, hsv_upper, start=0, end=0):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    end = total_frames if end <= 0 else end
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    
    times = []
    y_pixels_list = []
    
    frame_idx = start
    while frame_idx < end:
        ret, frame = cap.read()
        if not ret:
            break
            
        center, _ = detect_ball(frame, hsv_lower, hsv_upper)
        if center:
            t = frame_idx / fps
            times.append(t)
            y_pixels_list.append(center[1])
            yield json.dumps({"type": "progress", "frame": frame_idx, "detected": True, "y": center[1], "t": t}) + "\n"
        else:
            yield json.dumps({"type": "progress", "frame": frame_idx, "detected": False}) + "\n"
                
        frame_idx += 1
        
    cap.release()
    
    if len(times) < 5:
        yield json.dumps({"type": "error", "message": "No se encontraron suficientes puntos para ajustar (min: 5)."}) + "\n"
        return
        
    times = np.array(times)
    y_px = np.array(y_pixels_list)
    
    times_rel = times - times[0]
    y_meters = y_px / pixels_per_meter
    
    if len(times_rel) > 3:
        dy = np.diff(y_meters)
        dt = np.diff(times_rel)
        velocities = dy / dt
        falling_mask = velocities > 0.05
        fall_start_idx = None
        consecutive = 0
        for idx_v, is_falling in enumerate(falling_mask):
            if is_falling:
                consecutive += 1
                if consecutive >= 3 and fall_start_idx is None:
                    fall_start_idx = max(0, idx_v - 2)
            else:
                consecutive = 0
        if fall_start_idx is not None:
            times_rel = times_rel[fall_start_idx:]
            y_meters = y_meters[fall_start_idx:]
            times_rel = times_rel - times_rel[0]
            
    popt, pcov = curve_fit(free_fall, times_rel, y_meters, p0=[y_meters[0], 0.0, 9.8], maxfev=10000)
    y0_fit, v0_fit, g_fit = popt
    perr = np.sqrt(np.diag(pcov))
    y_pred = free_fall(times_rel, *popt)
    ss_res = np.sum((y_meters - y_pred)**2)
    ss_tot = np.sum((y_meters - np.mean(y_meters))**2)
    r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0
    
    res = {
        "g": float(g_fit),
        "g_err": float(perr[2]),
        "y0": float(y0_fit),
        "v0": float(v0_fit),
        "r2": float(r_squared),
        "points": len(times_rel),
        "y_meters": [round(float(m), 4) for m in y_meters],
        "times": [round(float(t), 4) for t in times_rel],
        "y_fit": [round(float(f), 4) for f in y_pred]
    }
    yield json.dumps({"type": "result", "data": res}) + "\n"
