"""
Módulo de detección: detecta la bola usando filtro HSV y operaciones morfológicas.
"""

import cv2
import numpy as np


def detect_ball(frame, lower_hsv, upper_hsv, min_area=100):
    """
    Detecta la bola en un frame usando filtrado HSV.
    
    Args:
        frame: Frame BGR de OpenCV.
        lower_hsv: Tupla/array con los valores mínimos HSV.
        upper_hsv: Tupla/array con los valores máximos HSV.
        min_area: Área mínima del contorno para ser considerado.
    
    Returns:
        (center, mask) donde center es (cx, cy) o None.
    """
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array(lower_hsv), np.array(upper_hsv))

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None, mask

    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)

    if area < min_area:
        return None, mask

    M = cv2.moments(largest)
    if M["m00"] == 0:
        return None, mask

    cx = int(M["m10"] / M["m00"])
    cy = int(M["m01"] / M["m00"])

    return (cx, cy), mask
