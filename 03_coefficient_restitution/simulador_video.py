import cv2
import numpy as np
import os

# Configuraciones del video
width = 640
height = 480
fps = 30
duration = 7  # segundos

# Directorio base y ruta de salida
base_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(base_dir, "video.mp4")

# Definir el codec y crear el objeto VideoWriter
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

# Parámetros físicos (Pixels y segundos)
g = 9.8 * 150  # Gravedad escalada a pixeles
e = 0.75       # Coeficiente de restitución
radius = 20

# Condiciones iniciales
x_pos = 100
y_pos = radius + 10
v_x = 75.0     # Velocidad horizontal constante
v_y = 0.0      # Velocidad vertical inicial
dt = 1.0 / fps

for _ in range(fps * duration):
    # Actualizar física (Velocidad y Posición)
    v_y += g * dt
    y_pos += v_y * dt
    x_pos += v_x * dt
    
    # Detección de colisión con el suelo (borde inferior)
    floor_y = height - radius
    if y_pos > floor_y:
        y_pos = floor_y
        v_y = -v_y * e # Aplicar rebote (inversión de V con pérdida e)
    
    # Detección de colisión con las paredes (bordes laterales)
    if x_pos > width - radius:
        x_pos = width - radius
        v_x = -v_x  # Rebote lateral elástico
    elif x_pos < radius:
        x_pos = radius
        v_x = -v_x
        
    # Crear un frame con fondo blanco
    frame = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Dibujar un rectangulo base que actue de "suelo" visual
    cv2.rectangle(frame, (0, height - 10), (width, height), (50, 50, 50), -1)
    
    # Dibujar la pelota (Rojo en BGR es 0, 0, 255)
    cv2.circle(frame, (int(x_pos), int(y_pos)), radius, (0, 0, 255), -1)
    
    out.write(frame)

out.release()
print(f"Video de simulación '{output_path}' creado exitosamente con e={e}.")
