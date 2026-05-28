import numpy as np
import cv2
import math
import os

def simulate_pendulum():
    # Parámetros físicos
    g = 9.81        # Aceleración de la gravedad (m/s^2)
    L = 1.0         # Longitud del péndulo (m)
    theta = math.radians(45)  # Ángulo inicial (45 grados)
    omega = 0.0     # Velocidad angular inicial (rad/s)
    mu = 0.05       # Coeficiente de fricción (amortiguamiento)

    # Parámetros de video
    fps = 30
    duration = 15   # Duración del video en segundos
    dt = 1.0 / fps
    num_frames = int(fps * duration)

    # Configuración de lienzo (canvas)
    width, height = 800, 600
    origin = (width // 2, 100)  # Punto de pivote
    scale = 400                 # Factor de escala (píxeles por metro)

    # Configuración de VideoWriter para crear un MP4
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_filename = os.path.join(script_dir, "..", "data", "pendulo_simulado.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video = cv2.VideoWriter(output_filename, fourcc, fps, (width, height))

    print(f"Generando simulación de {duration} segundos...")
    for i in range(num_frames):
        # Fondo blanco
        frame = np.ones((height, width, 3), dtype=np.uint8) * 255
        
        # Calcular coordenadas rectangulares de la masa
        x = origin[0] + int(L * math.sin(theta) * scale)
        y = origin[1] + int(L * math.cos(theta) * scale)
        
        # Dibujar elementos del péndulo
        # 1. Hilo (Gris)
        cv2.line(frame, origin, (x, y), (150, 150, 150), 4)
        
        # 2. Masa del péndulo (Rojo)
        cv2.circle(frame, (x, y), 25, (0, 0, 200), -1)
        # Borde de la masa
        cv2.circle(frame, (x, y), 25, (50, 50, 50), 2)
        
        # 3. Pivote (Negro)
        cv2.circle(frame, origin, 8, (0, 0, 0), -1)
        
        # Añadir texto con información (tiempo y ángulo)
        t = i * dt
        # Opcional: mostrar la información en el video para referencia
        # cv2.putText(frame, f"Tiempo: {t:.2f} s", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,0), 2)
        # cv2.putText(frame, f"Angulo: {math.degrees(theta):.1f} gr", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,0), 2)
        
        # Escribir el cuadro en el archivo
        video.write(frame)
        
        # Actualización de la física (Integración de Euler semi-implícito)
        # alpha = aceleración angular
        alpha = -(g / L) * math.sin(theta) - mu * omega
        omega += alpha * dt
        theta += omega * dt

    # Liberar el escritor de video
    video.release()
    print(f"¡Video generado exitosamente: {output_filename}!")

if __name__ == "__main__":
    simulate_pendulum()
