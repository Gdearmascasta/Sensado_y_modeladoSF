import cv2
import json
import numpy as np
from scipy.signal import find_peaks

def detect_ball(frame, lower_hsv, upper_hsv, min_area=50):
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

def process_video_stream(video_path, hsv_lower, hsv_upper, start=0, end=0):
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
    
    if len(times) < 10:
        yield json.dumps({"type": "error", "message": "No se encontraron suficientes puntos para analizar el rebote."}) + "\n"
        return
        
    times = np.array(times)
    y_pixels = np.array(y_pixels_list)
    
    # Calculate restitution
    y_floor = np.percentile(y_pixels, 98) # ignorar posibles atípicos
    heights = y_floor - y_pixels
    
    peaks_indices, _ = find_peaks(heights, prominence=20, distance=5)
    
    if len(peaks_indices) < 2:
        yield json.dumps({"type": "error", "message": "No se encontraron suficientes rebotes para calcular el coeficiente de restitución."}) + "\n"
        return

    peak_times = times[peaks_indices]
    peak_heights = heights[peaks_indices]
    
    coefficients = []
    for i in range(len(peak_heights) - 1):
        h_n = peak_heights[i]
        h_next = peak_heights[i+1]
        
        if h_next < h_n and h_n > 0: 
            e = np.sqrt(h_next / h_n)
            coefficients.append(e)

    avg_e = np.mean(coefficients) if coefficients else 0
    std_e = np.std(coefficients) if coefficients else 0
    
    res = {
        "e_avg": float(avg_e),
        "e_std": float(std_e),
        "e_values": [float(c) for c in coefficients],
        "peak_heights": [float(h) for h in peak_heights],
        "peak_times": [float(t) for t in peak_times],
        "points": len(times),
        "y_pixels": [round(float(m), 4) for m in y_pixels],
        "heights": [round(float(h), 4) for h in heights],
        "times": [round(float(t), 4) for t in times]
    }
    yield json.dumps({"type": "result", "data": res}) + "\n"
