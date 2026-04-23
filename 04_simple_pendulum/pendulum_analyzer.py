# %% [markdown]
# # Análisis del Péndulo Simple — Estimación del Periodo de Oscilación
# Este notebook procesa un video de un péndulo simple para:
# 1. **Detectar** la posición de la masa en cada frame (visión por computadora).
# 2. **Reconstruir** la trayectoria angular $\theta(t)$.
# 3. **Estimar** el periodo de oscilación usando:
#    - Cruces por cero (*zero-crossing method*).
#    - Detección de picos (*peak detection*).
#    - **Transformada de Fourier (FFT)** y análisis espectral.
# 4. **Comparar** con el valor teórico $T = 2\pi\sqrt{L/g}$.
# 5. **Analizar** fuentes de error y limitaciones.
#
# ---
# ### Parámetros conocidos de la simulación
# | Parámetro | Valor |
# |---|---|
# | $g$ | 9.81 m/s² |
# | $L$ | 1.0 m |
# | $\theta_0$ | 45° |
# | $\mu$ (fricción) | 0.05 |
# | FPS | 30 |
# | Escala | 400 px/m |

# %%
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Backend no interactivo (quitar esta línea en Jupyter Notebook)
import matplotlib.pyplot as plt
from scipy.signal import find_peaks
from scipy.fft import fft, fftfreq
from scipy.optimize import curve_fit
import os

# Matplotlib estilo global
plt.rcParams.update({
    'figure.figsize': (12, 5),
    'axes.grid': True,
    'grid.alpha': 0.3,
    'font.size': 11,
})

# %% [markdown]
# ---
# ## 1. Carga del video y extracción de metadatos

# %%
# --- Ruta al video ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEO_PATH = os.path.join(BASE_DIR, "pendulo_simulado.mp4")

cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    raise FileNotFoundError(f"No se pudo abrir el video: {VIDEO_PATH}")

FPS = cap.get(cv2.CAP_PROP_FPS)
TOTAL_FRAMES = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
WIDTH = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
HEIGHT = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
DURATION = TOTAL_FRAMES / FPS

print("=" * 50)
print("  METADATOS DEL VIDEO")
print("=" * 50)
print(f"  Resolución : {WIDTH} x {HEIGHT} px")
print(f"  FPS        : {FPS}")
print(f"  Frames     : {TOTAL_FRAMES}")
print(f"  Duración   : {DURATION:.2f} s")
print("=" * 50)

# %% [markdown]
# ---
# ## 2. Detección de la masa del péndulo (frame a frame)
# La masa se dibujó como un **círculo rojo** (`BGR = (0, 0, 200)`) sobre fondo blanco.
# Usamos un filtrado en el espacio de color **HSV** para aislar la masa y encontrar
# su centroide mediante momentos de imagen.

# %%
def detect_pendulum_mass(frame, lower_hsv, upper_hsv, min_area=100):
    """
    Detecta la masa del péndulo en un frame dado un rango HSV.
    Retorna el centroide (cx, cy) o None si no se detecta.
    """
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, lower_hsv, upper_hsv)

    # Operaciones morfológicas para limpiar ruido
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < min_area:
        return None

    M = cv2.moments(largest)
    if M["m00"] == 0:
        return None

    cx = int(M["m10"] / M["m00"])
    cy = int(M["m01"] / M["m00"])
    return (cx, cy)

# %% [markdown]
# ### 2.1 Rango HSV para la masa roja
# El color en BGR es `(0, 0, 200)`. En HSV de OpenCV (H: 0–180), esto corresponde
# aproximadamente a un rojo puro con H ≈ 0 (o ≈ 180), alta saturación y valor medio.

# %%
# Rango HSV amplio para capturar la esfera roja
LOWER_HSV = np.array([0, 80, 80])
UPPER_HSV = np.array([15, 255, 255])

# %% [markdown]
# ### 2.2 Procesamiento del video completo

# %%
cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Rebobinar al inicio

times = []
x_positions = []
y_positions = []

frame_idx = 0
detections = 0

print("Procesando video frame a frame...")
while True:
    ret, frame = cap.read()
    if not ret:
        break

    center = detect_pendulum_mass(frame, LOWER_HSV, UPPER_HSV)
    if center is not None:
        t = frame_idx / FPS
        times.append(t)
        x_positions.append(center[0])
        y_positions.append(center[1])
        detections += 1

    frame_idx += 1

cap.release()

times = np.array(times)
x_positions = np.array(x_positions, dtype=float)
y_positions = np.array(y_positions, dtype=float)

print(f"✅ Detecciones exitosas: {detections}/{frame_idx} frames ({100*detections/frame_idx:.1f}%)")

# %% [markdown]
# ---
# ## 3. Reconstrucción de la trayectoria
# Conocemos el **pivote** del péndulo (centro superior del lienzo) y podemos
# reconstruir el ángulo $\theta$ a partir de las coordenadas $(x, y)$ detectadas:
# $$\theta = \arctan\!\left(\frac{x - x_{\text{pivote}}}{y - y_{\text{pivote}}}\right)$$

# %%
# Coordenadas del pivote (del script de simulación: origin = (400, 100))
PIVOT_X = WIDTH // 2   # 400
PIVOT_Y = 100

# Calcular el ángulo theta respecto al pivote
dx = x_positions - PIVOT_X
dy = y_positions - PIVOT_Y
theta_measured = np.arctan2(dx, dy)  # radianes

# %% [markdown]
# ### 3.1 Gráfica de la posición $(x, y)$ en función del tiempo

# %%
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# --- Posición X ---
axes[0].plot(times, x_positions, color="#3b82f6", linewidth=1.2)
axes[0].axhline(y=PIVOT_X, color="#94a3b8", linestyle="--", label=f"Pivote X = {PIVOT_X}")
axes[0].set_title("Posición X de la masa vs Tiempo")
axes[0].set_xlabel("Tiempo (s)")
axes[0].set_ylabel("Posición X (px)")
axes[0].legend()

# --- Posición Y ---
axes[1].plot(times, y_positions, color="#ef4444", linewidth=1.2)
axes[1].axhline(y=PIVOT_Y, color="#94a3b8", linestyle="--", label=f"Pivote Y = {PIVOT_Y}")
axes[1].set_title("Posición Y de la masa vs Tiempo")
axes[1].set_xlabel("Tiempo (s)")
axes[1].set_ylabel("Posición Y (px)")
axes[1].legend()

plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "01_posicion_xy.png"), dpi=150)
plt.show()

# %% [markdown]
# ### 3.2 Gráfica del ángulo $\theta(t)$

# %%
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(times, np.degrees(theta_measured), color="#8b5cf6", linewidth=1.2)
ax.set_title(r"Ángulo $\theta(t)$ reconstruido a partir del video")
ax.set_xlabel("Tiempo (s)")
ax.set_ylabel(r"$\theta$ (grados)")
ax.axhline(y=0, color="#94a3b8", linestyle="--", alpha=0.7)
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "02_angulo_theta.png"), dpi=150)
plt.show()

# %% [markdown]
# ---
# ## 4. Estimación del periodo de oscilación
# Utilizamos tres métodos independientes para estimar $T$:
#
# | Método | Descripción |
# |---|---|
# | **Cruces por cero** | Detecta cada vez que $\theta$ cruza $0°$ y promedia el semi-periodo. |
# | **Detección de picos** | Encuentra máximos locales sucesivos y promedia las distancias temporales. |
# | **Transformada de Fourier (FFT)** | Identifica la frecuencia fundamental en el espectro de potencia. |

# %% [markdown]
# ### 4.1 Método 1 — Cruces por cero (*Zero-Crossing*)

# %%
# Detectar cruces por cero: cuando el signo de theta cambia entre frames consecutivos
sign_changes = np.where(np.diff(np.sign(theta_measured)))[0]
zero_crossing_times = times[sign_changes]

# El periodo es el doble del intervalo medio entre cruces consecutivos (cada cruce = medio periodo)
if len(zero_crossing_times) >= 2:
    half_periods = np.diff(zero_crossing_times)
    T_zero_crossing = 2.0 * np.mean(half_periods)
    T_zc_std = 2.0 * np.std(half_periods)
    print(f"📐 Método Cruces por Cero:")
    print(f"   T = {T_zero_crossing:.4f} ± {T_zc_std:.4f} s")
    print(f"   Cruces detectados: {len(zero_crossing_times)}")
else:
    T_zero_crossing = None
    print("⚠️  No se detectaron suficientes cruces por cero.")

# %% [markdown]
# ### 4.2 Método 2 — Detección de picos (*Peak Detection*)

# %%
# Detectar máximos locales (picos positivos) en la señal de theta
peak_indices, peak_properties = find_peaks(theta_measured, prominence=0.05, distance=int(FPS * 0.5))
peak_times = times[peak_indices]
peak_values = np.degrees(theta_measured[peak_indices])

if len(peak_times) >= 2:
    periods_peaks = np.diff(peak_times)
    T_peaks = np.mean(periods_peaks)
    T_peaks_std = np.std(periods_peaks)
    print(f"\n📐 Método Detección de Picos:")
    print(f"   T = {T_peaks:.4f} ± {T_peaks_std:.4f} s")
    print(f"   Picos detectados: {len(peak_times)}")
else:
    T_peaks = None
    print("⚠️  No se detectaron suficientes picos.")

# --- Gráfica de picos detectados ---
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(times, np.degrees(theta_measured), color="#8b5cf6", linewidth=1.0, label=r"$\theta(t)$")
ax.plot(peak_times, peak_values, "v", color="#ef4444", markersize=10, label="Picos detectados")

# Anotar los picos
for i in range(len(peak_times)):
    ax.annotate(f"{peak_times[i]:.2f}s", (peak_times[i], peak_values[i] + 1.5),
                fontsize=8, ha='center', color="#ef4444")

ax.set_title("Detección de picos en la señal angular")
ax.set_xlabel("Tiempo (s)")
ax.set_ylabel(r"$\theta$ (grados)")
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "03_picos_detectados.png"), dpi=150)
plt.show()

# %% [markdown]
# ### 4.3 Método 3 — Transformada de Fourier (FFT)
# La FFT permite descomponer la señal $\theta(t)$ en sus componentes de frecuencia.
# La **frecuencia fundamental** $f_0$ corresponde al pico más prominente del espectro,
# y el periodo se obtiene como $T = 1/f_0$.
#
# Dado que el péndulo presenta **amortiguamiento** y fue liberado desde un ángulo grande ($45°$),
# es esperado observar armónicos adicionales además de la frecuencia fundamental.

# %%
N = len(theta_measured)
dt = 1.0 / FPS

# Remover la media (componente DC) para un mejor análisis espectral
theta_centered = theta_measured - np.mean(theta_measured)

# Aplicar ventana de Hanning para reducir el leakage espectral
window = np.hanning(N)
theta_windowed = theta_centered * window

# Calcular la FFT
yf = fft(theta_windowed)
xf = fftfreq(N, dt)

# Tomar solo la mitad positiva del espectro
positive_mask = xf > 0
freqs = xf[positive_mask]
power_spectrum = 2.0 / N * np.abs(yf[positive_mask])

# Encontrar la frecuencia fundamental (pico dominante)
dominant_idx = np.argmax(power_spectrum)
f0 = freqs[dominant_idx]
T_fft = 1.0 / f0

print(f"\n📐 Método FFT (Transformada de Fourier):")
print(f"   Frecuencia fundamental f₀ = {f0:.4f} Hz")
print(f"   T = 1/f₀ = {T_fft:.4f} s")

# --- Gráfica del espectro de potencia ---
fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(freqs, power_spectrum, color="#10b981", linewidth=1.2)
ax.axvline(x=f0, color="#ef4444", linestyle="--", linewidth=1.5,
           label=f"$f_0$ = {f0:.3f} Hz  →  $T$ = {T_fft:.3f} s")

# Marcar armónicos si existen
# Buscar picos secundarios en el espectro
spectral_peaks, _ = find_peaks(power_spectrum, prominence=0.001, distance=5)
for sp in spectral_peaks:
    if freqs[sp] != f0:
        ax.axvline(x=freqs[sp], color="#f59e0b", linestyle=":", alpha=0.6)
        ax.annotate(f"{freqs[sp]:.2f} Hz", (freqs[sp], power_spectrum[sp]),
                    fontsize=8, color="#f59e0b", rotation=45)

ax.set_title("Espectro de Potencia (FFT) de la señal angular $\\theta(t)$")
ax.set_xlabel("Frecuencia (Hz)")
ax.set_ylabel("Magnitud")
ax.set_xlim(0, 5)  # Limitar a frecuencias razonables
ax.legend(fontsize=12)
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "04_espectro_fft.png"), dpi=150)
plt.show()

# %% [markdown]
# ### 4.4 Reconstrucción por Series de Fourier
# Reconstruimos la señal $\theta(t)$ utilizando los **primeros $K$ armónicos**
# de la Transformada de Fourier. Esto permite visualizar cómo la descomposición
# espectral captura la dinámica del sistema y cuántos términos son necesarios.
#
# La serie de Fourier reconstruida es:
# $$\theta_{\text{rec}}(t) = \frac{a_0}{2} + \sum_{k=1}^{K} \left[ a_k \cos(2\pi f_k t) + b_k \sin(2\pi f_k t) \right]$$

# %%
# Número de armónicos a utilizar en la reconstrucción
K_harmonics_list = [1, 3, 5, 10]

fig, axes = plt.subplots(len(K_harmonics_list), 1, figsize=(14, 3.5 * len(K_harmonics_list)), sharex=True)

for idx, K in enumerate(K_harmonics_list):
    # Reconstruir usando los primeros K armónicos (frecuencias dominantes)
    # Ordenar por magnitud del espectro para tomar los más significativos
    yf_full = fft(theta_centered)
    magnitudes = np.abs(yf_full[:N // 2])
    top_k_indices = np.argsort(magnitudes)[-K:]  # índices de los K mayores

    # Construir señal filtrada: poner a cero todo excepto los K armónicos dominantes
    yf_filtered = np.zeros_like(yf_full)
    for ki in top_k_indices:
        yf_filtered[ki] = yf_full[ki]
        # Componente simétrica (frecuencias negativas)
        yf_filtered[N - ki] = yf_full[N - ki]

    # Transformada inversa
    from scipy.fft import ifft
    theta_reconstructed = np.real(ifft(yf_filtered)) + np.mean(theta_measured)

    # Calcular error RMS
    rms_error = np.sqrt(np.mean((theta_measured - theta_reconstructed) ** 2))

    # Graficar
    axes[idx].plot(times, np.degrees(theta_measured), color="#94a3b8", linewidth=0.8,
                   label="Original", alpha=0.7)
    axes[idx].plot(times, np.degrees(theta_reconstructed), color="#3b82f6", linewidth=1.5,
                   label=f"Reconstrucción (K={K})")
    axes[idx].set_ylabel(r"$\theta$ (°)")
    axes[idx].set_title(f"Reconstrucción con {K} armónico(s) — RMSE = {np.degrees(rms_error):.3f}°",
                        fontsize=11)
    axes[idx].legend(loc="upper right", fontsize=9)

axes[-1].set_xlabel("Tiempo (s)")
plt.suptitle("Reconstrucción de $\\theta(t)$ mediante Series de Fourier",
             fontsize=14, fontweight="bold", y=1.01)
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "05_reconstruccion_fourier.png"), dpi=150, bbox_inches='tight')
plt.show()

# %% [markdown]
# ---
# ## 5. Comparación con el valor teórico
# El periodo teórico del péndulo simple para oscilaciones **pequeñas** es:
# $$T_{\text{lineal}} = 2\pi\sqrt{\frac{L}{g}}$$
#
# Sin embargo, para ángulos grandes ($\theta_0 = 45°$), el periodo exacto se
# puede aproximar con la corrección de **Borda**:
# $$T_{\text{exacto}} \approx T_{\text{lineal}} \left(1 + \frac{1}{16}\theta_0^2 + \frac{11}{3072}\theta_0^4 + \cdots\right)$$

# %%
# Parámetros conocidos de la simulación
g = 9.81   # m/s²
L = 1.0    # m
theta_0 = np.radians(45)  # ángulo inicial en radianes

# Periodo teórico lineal (ángulos pequeños)
T_linear = 2 * np.pi * np.sqrt(L / g)

# Periodo corregido (Borda, hasta cuarto orden)
T_borda = T_linear * (1 + (1/16) * theta_0**2 + (11/3072) * theta_0**4)

print("=" * 55)
print("  COMPARACIÓN DE PERIODOS")
print("=" * 55)
print(f"  T (lineal, ángulos pequeños) = {T_linear:.4f} s")
print(f"  T (Borda, corrección θ₀=45°) = {T_borda:.4f} s")
print("-" * 55)

methods = {}
if T_zero_crossing is not None:
    methods["Cruces por Cero"] = (T_zero_crossing, T_zc_std)
if T_peaks is not None:
    methods["Detección de Picos"] = (T_peaks, T_peaks_std)
methods["FFT (Fourier)"] = (T_fft, 0.0)

for name, (T_est, T_std) in methods.items():
    error_lin = abs(T_est - T_linear) / T_linear * 100
    error_borda = abs(T_est - T_borda) / T_borda * 100
    print(f"  {name:22s}: T = {T_est:.4f} ± {T_std:.4f} s")
    print(f"  {'':22s}  Error vs lineal: {error_lin:.2f}%")
    print(f"  {'':22s}  Error vs Borda:  {error_borda:.2f}%")
    print()

print("=" * 55)

# --- Gráfica comparativa de barras ---
fig, ax = plt.subplots(figsize=(10, 5))

labels = list(methods.keys()) + ["T lineal", "T Borda"]
values = [m[0] for m in methods.values()] + [T_linear, T_borda]
errors = [m[1] for m in methods.values()] + [0.0, 0.0]
colors = ["#3b82f6", "#10b981", "#8b5cf6", "#94a3b8", "#f59e0b"]

bars = ax.bar(labels, values, yerr=errors, capsize=5, color=colors[:len(labels)],
              edgecolor="#334155", linewidth=0.8, alpha=0.85)

# Anotar valores
for bar, val in zip(bars, values):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
            f"{val:.4f} s", ha='center', va='bottom', fontsize=10, fontweight='bold')

ax.set_ylabel("Periodo (s)")
ax.set_title("Comparación de Periodos Estimados vs Teóricos")
ax.set_ylim(0, max(values) * 1.15)
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "06_comparacion_periodos.png"), dpi=150)
plt.show()

# %% [markdown]
# ---
# ## 6. Decaimiento de la amplitud (Amortiguamiento)
# Al incluir fricción ($\mu = 0.05$) en la simulación, la amplitud del péndulo
# decae exponencialmente. Ajustamos una envolvente exponencial:
# $$A(t) = A_0\, e^{-\gamma t}$$

# %%
# Extraer amplitudes de los picos positivos
if len(peak_times) >= 3:
    peak_amplitudes = theta_measured[peak_indices]

    # Ajuste exponencial: A(t) = A0 * exp(-gamma * t)
    def exponential_decay(t, A0, gamma):
        return A0 * np.exp(-gamma * t)

    try:
        popt, pcov = curve_fit(exponential_decay, peak_times, peak_amplitudes,
                               p0=[peak_amplitudes[0], 0.01])
        A0_fit, gamma_fit = popt
        perr = np.sqrt(np.diag(pcov))

        print(f"\n📉 Ajuste de Amortiguamiento Exponencial:")
        print(f"   A₀    = {np.degrees(A0_fit):.2f}°")
        print(f"   γ     = {gamma_fit:.4f} s⁻¹  (± {perr[1]:.4f})")
        print(f"   τ     = 1/γ = {1/gamma_fit:.2f} s  (constante de tiempo)")

        # Gráfica del decaimiento
        t_smooth = np.linspace(times[0], times[-1], 500)
        fig, ax = plt.subplots(figsize=(12, 5))
        ax.plot(times, np.degrees(theta_measured), color="#94a3b8", linewidth=0.7, alpha=0.6,
                label=r"$\theta(t)$")
        ax.plot(peak_times, np.degrees(peak_amplitudes), "o", color="#ef4444",
                markersize=7, label="Amplitud de picos")
        ax.plot(t_smooth, np.degrees(exponential_decay(t_smooth, *popt)),
                "--", color="#ef4444", linewidth=2,
                label=rf"Envolvente: $A_0 e^{{-\gamma t}}$, $\gamma$={gamma_fit:.3f}")
        ax.plot(t_smooth, -np.degrees(exponential_decay(t_smooth, *popt)),
                "--", color="#ef4444", linewidth=2, alpha=0.5)

        ax.set_title("Decaimiento de la amplitud (Amortiguamiento)")
        ax.set_xlabel("Tiempo (s)")
        ax.set_ylabel(r"$\theta$ (grados)")
        ax.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(BASE_DIR, "07_amortiguamiento.png"), dpi=150)
        plt.show()
    except RuntimeError:
        print("⚠️  No se pudo ajustar la curva de decaimiento exponencial.")
else:
    print("⚠️  Insuficientes picos para análisis de amortiguamiento.")

# %% [markdown]
# ---
# ## 7. Espectrograma (Análisis tiempo-frecuencia)
# Un espectrograma muestra cómo cambia el contenido frecuencial de la señal
# a lo largo del tiempo. Es útil para detectar si el periodo del péndulo
# cambia con la amplitud (efecto no lineal para ángulos grandes).

# %%
from scipy.signal import spectrogram

fs = FPS  # Frecuencia de muestreo

f_spec, t_spec, Sxx = spectrogram(theta_measured, fs=fs, nperseg=64, noverlap=56)

fig, ax = plt.subplots(figsize=(12, 5))
pcm = ax.pcolormesh(t_spec, f_spec, 10 * np.log10(Sxx + 1e-12), shading='gouraud', cmap='inferno')
ax.set_ylim(0, 3)
ax.set_title("Espectrograma de $\\theta(t)$ — Análisis tiempo-frecuencia")
ax.set_xlabel("Tiempo (s)")
ax.set_ylabel("Frecuencia (Hz)")
plt.colorbar(pcm, ax=ax, label="Potencia (dB)")
ax.axhline(y=f0, color="cyan", linestyle="--", alpha=0.7, label=f"$f_0$ = {f0:.3f} Hz")
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "08_espectrograma.png"), dpi=150)
plt.show()

# %% [markdown]
# ---
# ## 8. Análisis de errores y limitaciones del método
#
# ### Fuentes de error identificadas
#
# | Fuente | Descripción | Impacto estimado |
# |--------|-------------|-----------------|
# | **Discretización temporal** | El muestreo a 30 FPS impone una resolución de $\Delta t = 33.3$ ms. Los cruces por cero y los picos máximos solo se detectan entre frames consecutivos. | ± 33 ms en la estimación del periodo |
# | **Discretización espacial** | Las coordenadas del centroide se redondean a píxeles enteros. Con una escala de 400 px/m, la resolución es de 2.5 mm/px. | Error angular ≈ 0.14° |
# | **Ángulo inicial grande** | Con $\theta_0 = 45°$, la aproximación lineal ($\sin\theta \approx \theta$) no es válida, lo que introduce un sesgo sistemático en la predicción teórica simple. | ~4–5% en $T$ sin corrección |
# | **Integración numérica** | El método de Euler semi-implícito tiene error de truncamiento $O(\Delta t^2)$, lo que introduce pequeñas desviaciones acumulativas. | Acumulativo con el tiempo |
# | **Leakage espectral** | Aun con ventana de Hanning, la DFT de una señal no periódica introduce dispersión de energía. | Ensanchamiento de picos en FFT |
# | **Amortiguamiento** | La fricción causa que la frecuencia real cambie ligeramente con el tiempo (el péndulo se «ralentiza» un poco al disminuir la amplitud). | Variable, detectable en espectrograma |
#
# ### Limitaciones del método
# - Solo funciona con **escenas controladas** (fondo uniforme, iluminación constante).
# - Depende de la **calibración correcta del rango HSV**.
# - La conversión de píxeles a ángulo asume conocer la posición exacta del pivote.
# - No se aplica corrección por distorsión de lente (en una cámara real sería necesario).

# %%
# Resumen final automatizado
print("\n" + "=" * 60)
print("   RESUMEN FINAL DE RESULTADOS")
print("=" * 60)
print(f"   Frames procesados    : {detections}/{frame_idx}")
print(f"   Duración analizada   : {times[-1]:.2f} s")
print(f"   Resolución temporal  : {1000/FPS:.1f} ms/frame")
print()
print("   ESTIMACIONES DEL PERIODO:")
for name, (T_est, T_std) in methods.items():
    print(f"   • {name:22s}: {T_est:.4f} ± {T_std:.4f} s")
print()
print(f"   VALOR TEÓRICO (lineal) : {T_linear:.4f} s")
print(f"   VALOR TEÓRICO (Borda)  : {T_borda:.4f} s")
if len(peak_times) >= 3:
    print(f"   COEF. AMORTIGUAMIENTO  : γ = {gamma_fit:.4f} s⁻¹")
print("=" * 60)
