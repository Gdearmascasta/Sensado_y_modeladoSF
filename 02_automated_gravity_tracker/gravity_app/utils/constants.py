"""
Constantes de configuración y estilos para la aplicación.
"""

# ─── Colores del tema (Dark Mode Premium) ─────────────────
BG_DARK = "#0f0f1a"
BG_CARD = "#1a1a2e"
BG_CARD_HOVER = "#22223a"
BG_SIDEBAR = "#141428"
BG_INPUT = "#252540"

ACCENT_PRIMARY = "#6c63ff"      # Violeta principal
ACCENT_SECONDARY = "#00d4aa"    # Verde/teal
ACCENT_WARN = "#ff6b6b"         # Rojo suave
ACCENT_ORANGE = "#ff9f43"       # Naranja
ACCENT_BLUE = "#4fc3f7"         # Azul claro

TEXT_PRIMARY = "#e8e8f0"
TEXT_SECONDARY = "#9090b0"
TEXT_MUTED = "#606080"
TEXT_ACCENT = "#a78bfa"

BORDER_COLOR = "#2a2a4a"
BORDER_ACTIVE = "#6c63ff"

SUCCESS_COLOR = "#00d4aa"
ERROR_COLOR = "#ff6b6b"
WARNING_COLOR = "#ff9f43"

# ─── Fuentes ──────────────────────────────────────────────
FONT_FAMILY = "Helvetica Neue"
FONT_TITLE = (FONT_FAMILY, 22, "bold")
FONT_HEADING = (FONT_FAMILY, 16, "bold")
FONT_SUBHEADING = (FONT_FAMILY, 13, "bold")
FONT_BODY = (FONT_FAMILY, 12)
FONT_SMALL = (FONT_FAMILY, 10)
FONT_MONO = ("Menlo", 11)
FONT_MONO_SMALL = ("Menlo", 9)
FONT_EMOJI = (FONT_FAMILY, 14)

# ─── Dimensiones de ventana ───────────────────────────────
WINDOW_MIN_WIDTH = 1100
WINDOW_MIN_HEIGHT = 750
SIDEBAR_WIDTH = 280

# ─── Video ────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = (".mov", ".mp4", ".avi", ".mkv")
DEFAULT_HSV_LOWER = (0, 80, 80)
DEFAULT_HSV_UPPER = (25, 255, 255)

# ─── Física ───────────────────────────────────────────────
G_REAL = 9.80665  # m/s² valor teórico
VEL_THRESHOLD = 0.05  # m/s mínimo para considerar caída
MIN_CONSECUTIVE_FALL = 3  # frames mínimos de caída
MIN_DATA_POINTS = 5  # puntos mínimos para ajuste

# ─── Pasos del proceso ───────────────────────────────────
STEPS = [
    {"id": "select",      "icon": "📹", "title": "Seleccionar Video",    "desc": "Elige el video a analizar"},
    {"id": "calibrate",   "icon": "📏", "title": "Calibración",          "desc": "Marca la referencia de medida"},
    {"id": "hsv",         "icon": "🎨", "title": "Detección de Bola",    "desc": "Ajusta el filtro de color HSV"},
    {"id": "process",     "icon": "⚙️", "title": "Procesamiento",        "desc": "Análisis automático del video"},
    {"id": "results",     "icon": "📊", "title": "Resultados",           "desc": "Gravedad calculada y gráficas"},
]
