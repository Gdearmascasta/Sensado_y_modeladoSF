import cv2
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit
import os
import sys
import glob

# ─────────────────────────────────────────────
# Ecuación de caída libre: y(t) = y0 + v0*t + 0.5*g*t²
# ─────────────────────────────────────────────
def free_fall(t, y0, v0, g):
    return y0 + v0 * t + 0.5 * g * t**2


# ─────────────────────────────────────────────
# Callbacks para clicks del mouse
# ─────────────────────────────────────────────
ref_points = []
def click_reference(event, x, y, flags, param):
    """Callback para seleccionar dos puntos de referencia (regla)."""
    global ref_points
    if event == cv2.EVENT_LBUTTONDOWN:
        ref_points.append((x, y))
        print(f"   📍 Punto {len(ref_points)}: ({x}, {y})")


def detect_ball(frame, lower_hsv, upper_hsv, min_area=100):
    """
    Detecta la bola roja/naranja en un frame usando filtro HSV.
    Retorna (cx, cy) del centro de masa, o None si no la encuentra.
    """
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # Crear máscara para el color de la bola
    mask = cv2.inRange(hsv, lower_hsv, upper_hsv)
    
    # Limpiar la máscara con operaciones morfológicas
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Buscar contornos
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None, mask
    
    # Tomar el contorno más grande (la bola)
    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    
    if area < min_area:
        return None, mask
    
    # Centro de masa
    M = cv2.moments(largest)
    if M["m00"] == 0:
        return None, mask
    
    cx = int(M["m10"] / M["m00"])
    cy = int(M["m01"] / M["m00"])
    
    return (cx, cy), mask


def select_video(videos_dir):
    """Permite al usuario seleccionar un video de la carpeta."""
    videos = sorted(glob.glob(os.path.join(videos_dir, "*.MOV")) + 
                    glob.glob(os.path.join(videos_dir, "*.mov")) +
                    glob.glob(os.path.join(videos_dir, "*.mp4")) +
                    glob.glob(os.path.join(videos_dir, "*.MP4")))
    
    if not videos:
        print("[!] No se encontraron videos en la carpeta.")
        return None
    
    print("\n📹 Videos disponibles:")
    for i, v in enumerate(videos):
        name = os.path.basename(v)
        size_mb = os.path.getsize(v) / (1024 * 1024)
        print(f"   [{i+1}] {name}  ({size_mb:.1f} MB)")
    
    try:
        choice = int(input("\n¿Cuál video quieres analizar? (número): ")) - 1
        if 0 <= choice < len(videos):
            return videos[choice]
    except ValueError:
        pass
    
    print("[!] Selección inválida, usando el primer video.")
    return videos[0]


def main():
    print("=" * 55)
    print("   🚀 APP DE CÁLCULO DE GRAVEDAD POR VIDEO")
    print("   ── Detección Automática de Caída Libre ──")
    print("=" * 55)

    # ─── Identificar archivos ─────────────────────────
    base_dir = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(base_dir, "laboratories-u", "videos")

    if not os.path.isdir(videos_dir):
        print(f"[!] No se encontró la carpeta de videos: {videos_dir}")
        return

    video_path = select_video(videos_dir)
    if video_path is None:
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[!] No se pudo abrir el video: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"\n📊 Info del video:")
    print(f"   Resolución : {width}x{height}")
    print(f"   FPS        : {fps}")
    print(f"   Frames     : {total_frames}")
    print(f"   Duración   : {duration:.2f} s")

    # Leer el primer frame
    ret, first_frame = cap.read()
    if not ret:
        print("[!] No se pudo leer el primer frame.")
        cap.release()
        return

    # ─────────────────────────────────────────────
    # PASO 1: CALIBRACIÓN CON LA REGLA
    # ─────────────────────────────────────────────
    print("\n" + "─" * 55)
    print("📏 PASO 1: CALIBRACIÓN")
    print("─" * 55)
    print("1. Haz click en los DOS EXTREMOS de la regla.")
    print("2. Presiona ENTER para confirmar.")
    print("3. Presiona 'r' para resetear los puntos.")
    print("4. Presiona ESC para cancelar.\n")

    global ref_points
    ref_points = []

    # Redimensionar para visualización si es muy grande
    display_scale = 1.0
    if height > 900:
        display_scale = 800 / height

    clone = first_frame.copy()
    cv2.namedWindow("Calibracion", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Calibracion", int(width * display_scale), int(height * display_scale))
    cv2.setMouseCallback("Calibracion", click_reference)

    while True:
        temp = clone.copy()
        for i, pt in enumerate(ref_points):
            cv2.circle(temp, pt, 8, (0, 0, 255), -1)
            cv2.putText(temp, f"P{i+1}", (pt[0]+12, pt[1]-8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            if i > 0:
                cv2.line(temp, ref_points[i-1], pt, (0, 0, 255), 2)
                # Mostrar distancia en px
                dist_px = np.sqrt((ref_points[0][0]-pt[0])**2 + (ref_points[0][1]-pt[1])**2)
                mid = ((ref_points[0][0]+pt[0])//2, (ref_points[0][1]+pt[1])//2)
                cv2.putText(temp, f"{dist_px:.0f} px", mid,
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

        status = f"Puntos: {len(ref_points)}/2 | ENTER=confirmar | r=reset | ESC=salir"
        cv2.putText(temp, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 0), 2)
        cv2.imshow("Calibracion", temp)

        key = cv2.waitKey(30) & 0xFF
        if key == 13 or key == 32:  # Enter o Space
            if len(ref_points) >= 2:
                break
            else:
                print("   [!] Necesitas al menos 2 puntos.")
        elif key == ord('r'):
            ref_points = []
            print("   🔄 Puntos reseteados.")
        elif key == 27:
            cv2.destroyAllWindows()
            cap.release()
            print("[*] Cancelado.")
            return

    cv2.destroyWindow("Calibracion")

    # Calcular la distancia en pixeles
    pixels_dist = np.sqrt(
        (ref_points[0][0] - ref_points[1][0])**2 +
        (ref_points[0][1] - ref_points[1][1])**2
    )
    print(f"\n   Distancia marcada: {pixels_dist:.1f} px")

    # Pedir la medida real
    print("\n   ─── INGRESA LA MEDIDA REAL EN LA TERMINAL ───")
    try:
        real_dist = float(input("   ¿Cuántos METROS mide la referencia? (ej. 0.30 para 30cm): "))
    except ValueError:
        print("   [!] Valor inválido. Se asume 0.30 m (30 cm).")
        real_dist = 0.30

    pixels_per_meter = pixels_dist / real_dist
    print(f"   ✅ Factor: {pixels_per_meter:.1f} px/m  ({pixels_dist/real_dist*100:.1f} px/cm)")

    # ─────────────────────────────────────────────
    # PASO 2: AJUSTE DE FILTRO HSV (Color de la bola)
    # ─────────────────────────────────────────────
    print("\n" + "─" * 55)
    print("🎨 PASO 2: AJUSTE DE DETECCIÓN DE LA BOLA")
    print("─" * 55)
    print("Ajusta los sliders HSV para que se detecte SOLO la bola.")
    print("Usa el slider 'Frame' o las teclas d/a para navegar por el video.")
    print("Presiona ENTER cuando la detección sea correcta.")
    print("Presiona ESC para cancelar.\n")

    # Rango HSV inicial para bola roja/naranja
    cv2.namedWindow("Ajuste HSV", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Ajuste HSV", int(width * display_scale * 2), int(height * display_scale))
    
    # Slider para navegar frames
    current_hsv_frame = total_frames // 2  # empezar a la mitad del video
    cv2.createTrackbar("Frame", "Ajuste HSV", current_hsv_frame, total_frames - 1, lambda x: None)
    
    # Valores por defecto para detectar rojo/naranja
    cv2.createTrackbar("H min", "Ajuste HSV", 0, 180, lambda x: None)
    cv2.createTrackbar("H max", "Ajuste HSV", 25, 180, lambda x: None)
    cv2.createTrackbar("S min", "Ajuste HSV", 80, 255, lambda x: None)
    cv2.createTrackbar("S max", "Ajuste HSV", 255, 255, lambda x: None)
    cv2.createTrackbar("V min", "Ajuste HSV", 80, 255, lambda x: None)
    cv2.createTrackbar("V max", "Ajuste HSV", 255, 255, lambda x: None)

    # Leer frame inicial
    cap.set(cv2.CAP_PROP_POS_FRAMES, current_hsv_frame)
    ret, sample_frame = cap.read()
    if not ret:
        sample_frame = first_frame.copy()
    last_frame_pos = current_hsv_frame

    while True:
        # Leer posición del slider de frame
        slider_frame_pos = cv2.getTrackbarPos("Frame", "Ajuste HSV")
        if slider_frame_pos != last_frame_pos:
            cap.set(cv2.CAP_PROP_POS_FRAMES, slider_frame_pos)
            ret, new_frame = cap.read()
            if ret:
                sample_frame = new_frame
                last_frame_pos = slider_frame_pos

        h_min = cv2.getTrackbarPos("H min", "Ajuste HSV")
        h_max = cv2.getTrackbarPos("H max", "Ajuste HSV")
        s_min = cv2.getTrackbarPos("S min", "Ajuste HSV")
        s_max = cv2.getTrackbarPos("S max", "Ajuste HSV")
        v_min = cv2.getTrackbarPos("V min", "Ajuste HSV")
        v_max = cv2.getTrackbarPos("V max", "Ajuste HSV")

        lower_hsv = np.array([h_min, s_min, v_min])
        upper_hsv = np.array([h_max, s_max, v_max])

        center, mask = detect_ball(sample_frame, lower_hsv, upper_hsv)

        # Mostrar resultado
        vis = sample_frame.copy()
        frame_info = f"Frame {last_frame_pos}/{total_frames} | t={last_frame_pos/fps:.3f}s"
        if center is not None:
            cv2.circle(vis, center, 15, (0, 255, 0), 3)
            cv2.putText(vis, f"Bola: ({center[0]}, {center[1]})", (center[0]+20, center[1]),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(vis, f"BOLA DETECTADA | {frame_info}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            cv2.putText(vis, f"NO SE DETECTA | {frame_info}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        cv2.putText(vis, "d/a=navegar | ENTER=ok | ESC=salir", (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 0), 2)

        # Mostrar la máscara a la derecha
        mask_color = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
        combined = np.hstack([vis, mask_color])
        
        cv2.imshow("Ajuste HSV", combined)
        key = cv2.waitKey(30) & 0xFF

        if key == 13 or key == 32:  # Enter
            if center is not None:
                break
            else:
                print("   [!] Navega a un frame con la bola visible y ajusta los sliders.")
        elif key == ord('d'):  # Avanzar 5 frames
            new_pos = min(last_frame_pos + 5, total_frames - 1)
            cv2.setTrackbarPos("Frame", "Ajuste HSV", new_pos)
        elif key == ord('a'):  # Retroceder 5 frames
            new_pos = max(last_frame_pos - 5, 0)
            cv2.setTrackbarPos("Frame", "Ajuste HSV", new_pos)
        elif key == ord('w'):  # Avanzar 20 frames
            new_pos = min(last_frame_pos + 20, total_frames - 1)
            cv2.setTrackbarPos("Frame", "Ajuste HSV", new_pos)
        elif key == ord('q'):  # Retroceder 20 frames
            new_pos = max(last_frame_pos - 20, 0)
            cv2.setTrackbarPos("Frame", "Ajuste HSV", new_pos)
        elif key == 27:
            cv2.destroyAllWindows()
            cap.release()
            print("[*] Cancelado.")
            return

    cv2.destroyWindow("Ajuste HSV")
    print(f"   ✅ Filtro HSV: H[{h_min}-{h_max}] S[{s_min}-{s_max}] V[{v_min}-{v_max}]")

    # ─────────────────────────────────────────────
    # PASO 3: PROCESAMIENTO AUTOMÁTICO DEL VIDEO
    # ─────────────────────────────────────────────
    print("\n" + "─" * 55)
    print("⚙️  PASO 3: PROCESAMIENTO AUTOMÁTICO")
    print("─" * 55)

    # Preguntar si quiere seleccionar rango
    print("¿Quieres analizar todo el video o seleccionar un rango?")
    print("  [1] Todo el video")
    print("  [2] Seleccionar rango de frames")
    try:
        range_choice = int(input("  Opción: "))
    except ValueError:
        range_choice = 1

    start_frame = 0
    end_frame = total_frames

    if range_choice == 2:
        # Navegador de frames para seleccionar inicio y fin
        print("\n  Usa las flechas ← → para navegar. Presiona 's' para start, 'e' para end, ENTER para confirmar.")
        
        cv2.namedWindow("Seleccionar Rango", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Seleccionar Rango", int(width * display_scale), int(height * display_scale))
        
        current_pos = 0
        start_frame = 0
        end_frame = total_frames
        
        while True:
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_pos)
            ret, nav_frame = cap.read()
            if not ret:
                break
            
            vis = nav_frame.copy()
            t_current = current_pos / fps
            info = f"Frame {current_pos}/{total_frames} | t={t_current:.3f}s | Start={start_frame} | End={end_frame}"
            cv2.putText(vis, info, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 0), 2)
            cv2.putText(vis, "Flechas=navegar | s=start | e=end | ENTER=ok", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 0), 2)
            cv2.imshow("Seleccionar Rango", vis)
            
            key = cv2.waitKey(0) & 0xFF
            if key == 83 or key == 3:  # Flecha derecha
                current_pos = min(current_pos + 1, total_frames - 1)
            elif key == 81 or key == 2:  # Flecha izquierda
                current_pos = max(current_pos - 1, 0)
            elif key == ord('d'):  # Avanzar 10
                current_pos = min(current_pos + 10, total_frames - 1)
            elif key == ord('a'):  # Retroceder 10
                current_pos = max(current_pos - 10, 0)
            elif key == ord('s'):
                start_frame = current_pos
                print(f"   ▶ Start: frame {start_frame} (t={start_frame/fps:.3f}s)")
            elif key == ord('e'):
                end_frame = current_pos
                print(f"   ■ End: frame {end_frame} (t={end_frame/fps:.3f}s)")
            elif key == 13:  # Enter
                break
            elif key == 27:
                cv2.destroyAllWindows()
                cap.release()
                print("[*] Cancelado.")
                return
        
        cv2.destroyWindow("Seleccionar Rango")

    print(f"\n   Analizando frames {start_frame} → {end_frame} ({(end_frame-start_frame)/fps:.2f}s)")

    # Procesar frame por frame
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    times = []
    y_pixels_list = []
    x_pixels_list = []  # también guardar X por si acaso
    detected_frames = []

    cv2.namedWindow("Procesando", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Procesando", int(width * display_scale), int(height * display_scale))

    frame_idx = start_frame
    while frame_idx < end_frame:
        ret, frame = cap.read()
        if not ret:
            break

        center, mask = detect_ball(frame, lower_hsv, upper_hsv)

        if center is not None:
            t = frame_idx / fps
            times.append(t)
            y_pixels_list.append(center[1])
            x_pixels_list.append(center[0])
            detected_frames.append(frame_idx)

            # Visualización
            vis = frame.copy()
            cv2.circle(vis, center, 12, (0, 255, 0), 3)
            progress = (frame_idx - start_frame) / max(1, end_frame - start_frame) * 100
            cv2.putText(vis, f"Frame {frame_idx} | t={t:.3f}s | y={center[1]}px | {progress:.0f}%",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.imshow("Procesando", vis)
        
        key = cv2.waitKey(1) & 0xFF
        if key == 27:
            print("   [!] Procesamiento interrumpido por el usuario.")
            break

        frame_idx += 1

    cv2.destroyAllWindows()
    cap.release()

    print(f"   ✅ Bola detectada en {len(times)} frames")

    if len(times) < 5:
        print("[!] Pocos datos para un ajuste confiable. Se necesitan al menos 5 detecciones.")
        if len(times) < 3:
            print("[!] Datos insuficientes. Intenta ajustar los parámetros HSV.")
            return

    # ─────────────────────────────────────────────
    # PASO 4: FILTRAR SOLO LA CAÍDA
    # ─────────────────────────────────────────────
    times = np.array(times)
    y_px = np.array(y_pixels_list)
    
    # Normalizar tiempo: t=0 en el primer dato
    t0 = times[0]
    times_rel = times - t0

    # Convertir pixeles a metros (Y crece hacia abajo en imagen = cae)
    y_meters = y_px / pixels_per_meter

    # Detectar automáticamente la región de caída:
    # La derivada de y respecto a t debería ser creciente (positiva y aumentando)
    # Filtramos puntos donde la velocidad sea consistentemente positiva
    if len(times_rel) > 3:
        dy = np.diff(y_meters)
        dt = np.diff(times_rel)
        velocities = dy / dt
        
        # Encontrar donde empieza a caer significativamente
        # (velocidad consistentemente > un umbral)
        vel_threshold = 0.05  # m/s mínimo para considerar que está cayendo
        falling_mask = velocities > vel_threshold
        
        # Buscar la primera racha de al menos 3 frames consecutivos cayendo
        fall_start_idx = None
        consecutive = 0
        for idx_v, is_falling in enumerate(falling_mask):
            if is_falling:
                consecutive += 1
                if consecutive >= 3 and fall_start_idx is None:
                    fall_start_idx = idx_v - 2  # Empezar desde el inicio de la racha
            else:
                consecutive = 0
        
        if fall_start_idx is not None and fall_start_idx >= 0:
            # Recortar datos a solo la caída
            times_rel = times_rel[fall_start_idx:]
            y_meters = y_meters[fall_start_idx:]
            times_rel = times_rel - times_rel[0]  # Re-normalizar
            print(f"   📉 Caída detectada: {len(times_rel)} puntos de datos")
        else:
            print("   ⚠️  No se detectó una caída clara. Usando todos los datos.")

    # ─────────────────────────────────────────────
    # PASO 5: AJUSTE Y RESULTADOS
    # ─────────────────────────────────────────────
    print("\n" + "─" * 55)
    print("📊 PASO 4: RESULTADOS")
    print("─" * 55)

    try:
        # p0 = [y0, v0, g]
        popt, pcov = curve_fit(free_fall, times_rel, y_meters, 
                               p0=[y_meters[0], 0.0, 9.8],
                               maxfev=10000)
        y0_fit, v0_fit, g_fit = popt
        
        # Incertidumbre (desviación estándar de los parámetros)
        perr = np.sqrt(np.diag(pcov))
        y0_err, v0_err, g_err = perr

        # R² (bondad de ajuste)
        y_pred = free_fall(times_rel, *popt)
        ss_res = np.sum((y_meters - y_pred)**2)
        ss_tot = np.sum((y_meters - np.mean(y_meters))**2)
        r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0

        # Error porcentual respecto a g teórico
        g_real = 9.80665
        error_pct = abs(g_fit - g_real) / g_real * 100

        print(f"\n   ┌─────────────────────────────────────────┐")
        print(f"   │   MODELO: y = y₀ + v₀t + ½gt²           │")
        print(f"   ├─────────────────────────────────────────┤")
        print(f"   │  y₀ = {y0_fit:8.4f} ± {y0_err:.4f} m           │")
        print(f"   │  v₀ = {v0_fit:8.4f} ± {v0_err:.4f} m/s         │")
        print(f"   │                                         │")
        print(f"   │  🎯 g  = {g_fit:7.3f} ± {g_err:.3f} m/s²        │")
        print(f"   │                                         │")
        print(f"   │  R²    = {r_squared:.6f}                  │")
        print(f"   │  Error = {error_pct:.2f}% vs g_real ({g_real})   │")
        print(f"   │  Puntos= {len(times_rel):>4d}                        │")
        print(f"   └─────────────────────────────────────────┘")

        # ─── GRÁFICA ──────────────────────────────
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        fig.suptitle("Cálculo de Gravedad por Análisis de Video", fontsize=14, fontweight='bold')

        # Gráf. 1: Posición vs Tiempo
        ax1 = axes[0]
        ax1.plot(times_rel, y_meters, 'ko', markersize=3, alpha=0.5, label="Datos (detección automática)")
        t_fit = np.linspace(times_rel[0], times_rel[-1], 200)
        y_fit = free_fall(t_fit, *popt)
        ax1.plot(t_fit, y_fit, 'r-', linewidth=2.5, 
                 label=f"Ajuste: g = {g_fit:.3f} ± {g_err:.3f} m/s²")
        ax1.set_xlabel("Tiempo (s)")
        ax1.set_ylabel("Posición vertical (m) ↓")
        ax1.set_title("Posición vs Tiempo")
        ax1.legend(fontsize=9)
        ax1.grid(True, alpha=0.3)

        # Gráf. 2: Residuos
        ax2 = axes[1]
        residuals = y_meters - free_fall(times_rel, *popt)
        ax2.plot(times_rel, residuals * 100, 'b.', markersize=3, alpha=0.5)
        ax2.axhline(y=0, color='r', linestyle='--', alpha=0.5)
        ax2.set_xlabel("Tiempo (s)")
        ax2.set_ylabel("Residuos (cm)")
        ax2.set_title(f"Residuos del Ajuste (R² = {r_squared:.6f})")
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        
        # Guardar figura
        out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gravedad_resultado.png")
        plt.savefig(out_path, dpi=150, bbox_inches='tight')
        print(f"\n   💾 Gráfica guardada en: {out_path}")
        
        plt.show()

    except Exception as e:
        print(f"\n[!] Error en el ajuste de curva: {e}")
        print("    Intenta seleccionar un rango más preciso de la caída.")
        
        # Aún así graficar los datos crudos
        plt.figure(figsize=(8, 6))
        plt.plot(times_rel, y_meters, 'ko-', markersize=3)
        plt.xlabel("Tiempo (s)")
        plt.ylabel("Posición Y (m)")
        plt.title("Datos Crudos (sin ajuste)")
        plt.grid(True)
        plt.show()


if __name__ == '__main__':
    main()
