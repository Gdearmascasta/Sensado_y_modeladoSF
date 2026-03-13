"""
Módulo de video: carga de videos, extracción de frames e información.
"""

import os
import glob
import cv2
from gravity_app.utils.constants import SUPPORTED_EXTENSIONS


def find_videos(directory):
    """
    Busca archivos de video en un directorio.
    
    Returns:
        Lista de dicts con 'path', 'name', 'size_mb'.
    """
    videos = []
    for ext in SUPPORTED_EXTENSIONS:
        videos += glob.glob(os.path.join(directory, f"*{ext}"))
        videos += glob.glob(os.path.join(directory, f"*{ext.upper()}"))
    
    videos = sorted(set(videos))
    result = []
    for v in videos:
        result.append({
            "path": v,
            "name": os.path.basename(v),
            "size_mb": os.path.getsize(v) / (1024 * 1024),
        })
    return result


def get_video_info(video_path):
    """
    Obtiene información de un video.
    
    Returns:
        dict con 'fps', 'total_frames', 'duration', 'width', 'height' o None si falla.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    cap.release()

    return {
        "fps": fps,
        "total_frames": total_frames,
        "duration": duration,
        "width": width,
        "height": height,
    }


def read_frame(video_path, frame_number):
    """
    Lee un frame específico del video.
    
    Returns:
        Frame BGR o None si falla.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    cap.release()
    return frame if ret else None
