from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os, shutil, cv2, base64, time
import numpy as np
import core.engine as engine

app = FastAPI(title="Gravity API Workflow")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    file_path = f"{UPLOAD_DIR}/{video.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    cap = cv2.VideoCapture(file_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    ret, frame = cap.read()
    cap.release()
    
    # Send first frame for calibration
    _, buffer = cv2.imencode('.jpg', frame)
    first_frame_b64 = base64.b64encode(buffer).decode("utf-8")
    
    return {
        "filename": video.filename,
        "fps": fps,
        "total_frames": total_frames,
        "first_frame_b64": first_frame_b64
    }

@app.get("/preview")
def preview_hsv(filename: str, frame_idx: int, hmin: int, hmax: int, smin: int, smax: int, vmin: int, vmax: int):
    file_path = f"{UPLOAD_DIR}/{filename}"
    cap = cv2.VideoCapture(file_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=400, detail="Invalid frame")
        
    lower = np.array([hmin, smin, vmin])
    upper = np.array([hmax, smax, vmax])
        
    center, mask = engine.detect_ball(frame, lower, upper)
    
    vis = frame.copy()
    if center:
        cv2.circle(vis, center, 15, (0, 255, 0), 3)
        
    _, buffer = cv2.imencode('.jpg', vis)
    return Response(content=buffer.tobytes(), media_type="image/jpeg")

@app.get("/mask")
def preview_mask(filename: str, frame_idx: int, hmin: int, hmax: int, smin: int, smax: int, vmin: int, vmax: int):
    file_path = f"{UPLOAD_DIR}/{filename}"
    cap = cv2.VideoCapture(file_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=400, detail="Invalid frame")
        
    lower = np.array([hmin, smin, vmin])
    upper = np.array([hmax, smax, vmax])
        
    center, mask = engine.detect_ball(frame, lower, upper)
    
    mask_c = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    _, buffer = cv2.imencode('.jpg', mask_c)
    return Response(content=buffer.tobytes(), media_type="image/jpeg")

@app.post("/analyze_stream")
def analyze_stream(
    filename: str = Form(...),
    start_frame: int = Form(0),
    end_frame: int = Form(0),
    real_dist: float = Form(...),
    pixels_dist: float = Form(...),
    hmin: int = Form(...), hmax: int = Form(...),
    smin: int = Form(...), smax: int = Form(...),
    vmin: int = Form(...), vmax: int = Form(...)
):
    file_path = f"{UPLOAD_DIR}/{filename}"
    lower = np.array([hmin, smin, vmin])
    upper = np.array([hmax, smax, vmax])
    ppm = pixels_dist / real_dist
    
    return StreamingResponse(
        engine.process_video_stream(file_path, ppm, lower, upper, start_frame, end_frame),
        media_type="application/x-ndjson"
    )

@app.get("/video/{filename}")
def get_video(filename: str):
    file_path = f"{UPLOAD_DIR}/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(file_path)

@app.get("/stream")
def stream_detections(filename: str, hmin: int, hmax: int, smin: int, smax: int, vmin: int, vmax: int):
    file_path = f"{UPLOAD_DIR}/{filename}"
    lower = np.array([hmin, smin, vmin])
    upper = np.array([hmax, smax, vmax])
    
    def generate():
        cap = cv2.VideoCapture(file_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        delay = 1.0 / (fps if fps > 0 else 30)
        while True:
            t0 = time.time()
            ret, frame = cap.read()
            if not ret:
                break
            center, _ = engine.detect_ball(frame, lower, upper)
            if center:
                cv2.circle(frame, center, 15, (0, 255, 0), 4)
                cv2.putText(frame, "DETECTADO", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(max(0, delay - (time.time() - t0)))
        cap.release()
    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
