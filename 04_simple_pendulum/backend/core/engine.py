import cv2
import json
import numpy as np
from scipy.signal import find_peaks
from scipy.fft import fft, fftfreq

def detect_mass(frame, lower_hsv, upper_hsv, min_area=100):
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

def process_video_stream(video_path, length, hsv_lower, hsv_upper, start=0, end=0):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    end = total_frames if end <= 0 else end
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    
    times = []
    x_positions = []
    
    frame_idx = start
    while frame_idx < end:
        ret, frame = cap.read()
        if not ret:
            break
            
        center, _ = detect_mass(frame, hsv_lower, hsv_upper)
        if center:
            t = frame_idx / fps
            times.append(t)
            x_positions.append(center[0])
            yield json.dumps({"type": "progress", "frame": frame_idx, "detected": True, "x": center[0], "y": center[1], "t": t}) + "\n"
        else:
            yield json.dumps({"type": "progress", "frame": frame_idx, "detected": False}) + "\n"
                
        frame_idx += 1
        
    cap.release()
    
    if len(times) < 15:
        yield json.dumps({"type": "error", "message": "No se encontraron suficientes puntos para el análisis del péndulo."}) + "\n"
        return
        
    times = np.array(times)
    x_positions = np.array(x_positions, dtype=float)
    
    # Analyze period using FFT on X positions
    N = len(x_positions)
    dt = 1.0 / fps if fps > 0 else np.mean(np.diff(times))
    
    x_centered = x_positions - np.mean(x_positions)
    window = np.hanning(N)
    x_windowed = x_centered * window
    
    yf = fft(x_windowed)
    xf = fftfreq(N, dt)
    
    positive_mask = xf > 0
    freqs = xf[positive_mask]
    power_spectrum = 2.0 / N * np.abs(yf[positive_mask])
    
    if len(power_spectrum) > 0:
        dominant_idx = np.argmax(power_spectrum)
        f0 = freqs[dominant_idx]
        T_fft = 1.0 / f0 if f0 > 0 else 0
    else:
        T_fft = 0
        
    # Peak detection for time-domain period estimation
    peak_indices, _ = find_peaks(x_centered, prominence=np.std(x_centered)*0.5, distance=int(fps*0.5))
    peak_times = times[peak_indices]
    
    if len(peak_times) >= 2:
        T_peaks = np.mean(np.diff(peak_times))
    else:
        T_peaks = T_fft
        
    # Calculate gravity using theoretical formula T = 2 * pi * sqrt(L/g)
    # g = 4 * pi^2 * L / T^2
    avg_T = T_fft if T_fft > 0 else T_peaks
    g_est = 4 * (np.pi**2) * length / (avg_T**2) if avg_T > 0 else 0
    
    res = {
        "avg_T": float(avg_T),
        "f0": float(f0) if f0 > 0 else 0,
        "g_est": float(g_est),
        "peak_times": [float(t) for t in peak_times],
        "points": len(times),
        "x_positions": [round(float(x), 4) for x in x_positions],
        "times": [round(float(t), 4) for t in times],
        "freqs": [round(float(f), 4) for f in freqs[:50]],  # send top 50 freqs for plotting
        "power": [round(float(p), 4) for p in power_spectrum[:50]]
    }
    
    yield json.dumps({"type": "result", "data": res}) + "\n"
