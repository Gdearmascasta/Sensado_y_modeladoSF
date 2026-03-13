"""
Ventana principal — PyQt6.
Navegación por pasos con sidebar, log en la GUI y botones de video/frames.
"""

import sys, os, threading
import cv2
import numpy as np
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                              QHBoxLayout, QLabel, QPushButton, QFrame,
                              QSlider, QLineEdit, QProgressBar, QScrollArea,
                              QStackedWidget, QMessageBox, QSizePolicy, QGridLayout,
                              QTextEdit, QSplitter)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QObject
from PyQt6.QtGui import QImage, QPixmap, QFont, QColor
import matplotlib
matplotlib.use("QtAgg")
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
from matplotlib.figure import Figure

from gravity_app.utils.constants import *
from gravity_app.core.video import find_videos, get_video_info, read_frame
from gravity_app.core.detection import detect_ball
from gravity_app.core.physics import filter_free_fall_region, fit_gravity
from gravity_app.gui.video_player import VideoPlayerDialog
from gravity_app.gui.frame_viewer import FrameViewerDialog


# ── Signals helper for thread-safe UI updates ──
class _Signals(QObject):
    progress = pyqtSignal(int, str, int)   # percent, status, detections
    frame_preview = pyqtSignal(object)     # numpy frame
    done = pyqtSignal()


# ── Reusable styles ──
CARD_CSS = f"""
    QFrame#card {{ background: {BG_CARD}; border: 1px solid {BORDER_COLOR}; border-radius: 10px; }}
"""
BTN_PRIMARY = f"""
    QPushButton {{ background: {ACCENT_PRIMARY}; color: #fff; border: none;
                  padding: 10px 22px; border-radius: 7px; font-size: 13px; font-weight: 600; }}
    QPushButton:hover {{ background: #7d75ff; }}
    QPushButton:disabled {{ background: #333; color: #666; }}
"""
BTN_SECONDARY = f"""
    QPushButton {{ background: {BG_INPUT}; color: {TEXT_PRIMARY}; border: 1px solid {BORDER_COLOR};
                  padding: 10px 18px; border-radius: 7px; font-size: 12px; }}
    QPushButton:hover {{ background: #333355; }}
"""
BTN_SUCCESS = f"""
    QPushButton {{ background: {SUCCESS_COLOR}; color: {BG_DARK}; border: none;
                  padding: 10px 22px; border-radius: 7px; font-size: 13px; font-weight: 600; }}
    QPushButton:hover {{ background: #00e8bb; }}
"""
SLIDER_CSS = f"""
    QSlider::groove:horizontal {{ background: {BG_INPUT}; height: 6px; border-radius: 3px; }}
    QSlider::handle:horizontal {{ background: {ACCENT_PRIMARY}; width: 14px; margin: -4px 0; border-radius: 7px; }}
    QSlider::sub-page:horizontal {{ background: {ACCENT_PRIMARY}; border-radius: 3px; }}
"""


class GravityApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("🚀 Cálculo de Gravedad por Video")
        self.setMinimumSize(WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT)
        self.resize(1200, 820)
        self.setStyleSheet(f"background-color: {BG_DARK}; color: {TEXT_PRIMARY};")

        # State
        self.video_path = None
        self.video_info = None
        self.first_frame = None
        self.pixels_per_meter = None
        self.hsv_lower = np.array(DEFAULT_HSV_LOWER)
        self.hsv_upper = np.array(DEFAULT_HSV_UPPER)
        self.start_frame = 0
        self.end_frame = 0
        self.detections = []
        self.results = None
        self.current_step = 0
        self._ref_points = []

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.videos_dir = os.path.join(base_dir, "laboratories-u", "videos")

        self._build_ui()
        self._update_sidebar()
        self._show_step(0)

    # ──────────────────────────────────────────────────
    # BUILD UI
    # ──────────────────────────────────────────────────
    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        root = QHBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Sidebar ──
        sidebar = QWidget()
        sidebar.setFixedWidth(SIDEBAR_WIDTH)
        sidebar.setStyleSheet(f"background: {BG_SIDEBAR};")
        sb_layout = QVBoxLayout(sidebar)
        sb_layout.setContentsMargins(0, 0, 0, 0)
        sb_layout.setSpacing(0)

        # Title
        title_w = QWidget()
        title_w.setStyleSheet(f"background: {BG_SIDEBAR};")
        tl = QVBoxLayout(title_w)
        tl.setContentsMargins(20, 22, 20, 4)
        t1 = QLabel("🚀 Gravedad App")
        t1.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 20px; font-weight: bold;")
        tl.addWidget(t1)
        t2 = QLabel("Caída Libre por Video")
        t2.setStyleSheet(f"color: {TEXT_SECONDARY}; font-size: 11px;")
        tl.addWidget(t2)
        sb_layout.addWidget(title_w)

        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.HLine)
        sep.setStyleSheet(f"color: {BORDER_COLOR};")
        sb_layout.addWidget(sep)

        # Steps
        self.step_widgets = []
        for i, step in enumerate(STEPS):
            sw = QPushButton(f"  {step['icon']}  {step['title']}")
            sw.setFixedHeight(48)
            sw.setCursor(Qt.CursorShape.PointingHandCursor)
            sw.setStyleSheet(f"""
                QPushButton {{ background: transparent; color: {TEXT_MUTED}; border: none;
                              text-align: left; padding-left: 18px; font-size: 13px; }}
                QPushButton:hover {{ background: #1c1c36; }}
            """)
            sw.clicked.connect(lambda _, idx=i: self._on_step_click(idx))
            sb_layout.addWidget(sw)
            self.step_widgets.append(sw)

        sb_layout.addStretch(1)

        # Log area
        sep2 = QFrame()
        sep2.setFrameShape(QFrame.Shape.HLine)
        sep2.setStyleSheet(f"color: {BORDER_COLOR};")
        sb_layout.addWidget(sep2)

        log_title = QLabel("  📋 Log del Proceso")
        log_title.setStyleSheet(f"color: {TEXT_SECONDARY}; font-size: 11px; padding: 8px 0 2px 12px;")
        sb_layout.addWidget(log_title)

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setStyleSheet(f"""
            QTextEdit {{ background: #10101e; color: {TEXT_SECONDARY}; border: none;
                        font-family: Menlo; font-size: 10px; padding: 6px; }}
        """)
        self.log_text.setMaximumHeight(220)
        sb_layout.addWidget(self.log_text)

        root.addWidget(sidebar)

        # ── Content area ──
        self.content_stack = QStackedWidget()
        self.content_stack.setStyleSheet(f"background: {BG_DARK};")
        root.addWidget(self.content_stack, 1)

        # Pre-build pages
        self.pages = {}
        for step in STEPS:
            page = QScrollArea()
            page.setWidgetResizable(True)
            page.setStyleSheet("QScrollArea { border: none; }")
            inner = QWidget()
            inner.setStyleSheet(f"background: {BG_DARK};")
            page.setWidget(inner)
            self.pages[step["id"]] = (page, inner)
            self.content_stack.addWidget(page)

    def _log(self, msg, color=None):
        c = color or TEXT_SECONDARY
        self.log_text.append(f'<span style="color:{c};">{msg}</span>')

    def _update_sidebar(self):
        for i, sw in enumerate(self.step_widgets):
            if i == self.current_step:
                sw.setStyleSheet(f"""
                    QPushButton {{ background: {ACCENT_PRIMARY}; color: #fff; border: none;
                                  text-align: left; padding-left: 18px; font-size: 13px; font-weight: bold;
                                  border-radius: 0px; }}
                """)
            elif i < self.current_step:
                sw.setStyleSheet(f"""
                    QPushButton {{ background: #162016; color: {SUCCESS_COLOR}; border: none;
                                  text-align: left; padding-left: 18px; font-size: 13px; }}
                    QPushButton:hover {{ background: #1c2c1c; }}
                """)
            else:
                sw.setStyleSheet(f"""
                    QPushButton {{ background: transparent; color: {TEXT_MUTED}; border: none;
                                  text-align: left; padding-left: 18px; font-size: 13px; }}
                    QPushButton:hover {{ background: #1c1c36; }}
                """)

    def _on_step_click(self, idx):
        if idx <= self.current_step:
            self._show_step(idx)

    def _show_step(self, idx):
        self.current_step = idx
        self._update_sidebar()

        page, inner = self.pages[STEPS[idx]["id"]]
        # Clear old layout
        old = inner.layout()
        if old:
            while old.count():
                item = old.takeAt(0)
                w = item.widget()
                if w:
                    w.deleteLater()
            QWidget().setLayout(old)

        layout = QVBoxLayout(inner)
        layout.setContentsMargins(30, 20, 30, 20)
        layout.setSpacing(12)

        builder = {
            "select": self._build_select,
            "calibrate": self._build_calibrate,
            "hsv": self._build_hsv,
            "process": self._build_process,
            "results": self._build_results,
        }[STEPS[idx]["id"]]
        builder(layout)
        layout.addStretch(1)

        self.content_stack.setCurrentWidget(page)

    # ── Helpers ──
    def _make_header(self, layout, icon, title, subtitle):
        t = QLabel(f"{icon} {title}")
        t.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 22px; font-weight: bold;")
        layout.addWidget(t)
        s = QLabel(subtitle)
        s.setStyleSheet(f"color: {TEXT_SECONDARY}; font-size: 13px;")
        layout.addWidget(s)
        layout.addSpacing(8)

    def _make_card(self, layout, title=None):
        card = QFrame()
        card.setObjectName("card")
        card.setStyleSheet(CARD_CSS)
        cl = QVBoxLayout(card)
        cl.setContentsMargins(18, 14, 18, 14)
        if title:
            t = QLabel(title)
            t.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 15px; font-weight: bold;")
            cl.addWidget(t)
            sep = QFrame()
            sep.setFrameShape(QFrame.Shape.HLine)
            sep.setStyleSheet(f"color: {BORDER_COLOR};")
            cl.addWidget(sep)
        layout.addWidget(card)
        return cl

    def _cv2_to_pixmap(self, frame_bgr, w, h):
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        fh, fw, ch = rgb.shape
        qimg = QImage(rgb.data, fw, fh, ch * fw, QImage.Format.Format_RGB888)
        return QPixmap.fromImage(qimg).scaled(w, h, Qt.AspectRatioMode.KeepAspectRatio,
                                              Qt.TransformationMode.SmoothTransformation)

    # ──────────────────────────────────────────────────
    # STEP 1: SELECT VIDEO
    # ──────────────────────────────────────────────────
    def _build_select(self, layout):
        self._log("── Paso 1: Seleccionar Video ──", ACCENT_PRIMARY)
        self._make_header(layout, "📹", "Seleccionar Video", "Elige un video de caída libre para analizar")

        btn_row = QHBoxLayout()
        b_browse = QPushButton("📁 Examinar equipo...")
        b_browse.setStyleSheet(BTN_PRIMARY)
        b_browse.setCursor(Qt.CursorShape.PointingHandCursor)
        b_browse.clicked.connect(self._browse_file)
        btn_row.addWidget(b_browse)
        btn_row.addStretch(1)
        layout.addLayout(btn_row)

        lbl = QLabel("O selecciona uno de la carpeta predefinida:")
        lbl.setStyleSheet(f"color: {TEXT_SECONDARY}; font-size: 13px; margin-top: 10px; margin-bottom: 5px;")
        layout.addWidget(lbl)

        videos = find_videos(self.videos_dir)
        if not videos:
            no_vid = QLabel("No se encontraron videos en " + self.videos_dir)
            no_vid.setStyleSheet(f"color: {TEXT_MUTED};")
            layout.addWidget(no_vid)
            return

        for v in videos:
            cl = self._make_card(layout)
            row = QHBoxLayout()

            icon = QLabel("🎬")
            icon.setStyleSheet("font-size: 28px;")
            row.addWidget(icon)

            info = QVBoxLayout()
            n = QLabel(v["name"])
            n.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 14px; font-weight: bold;")
            info.addWidget(n)
            s = QLabel(f"{v['size_mb']:.1f} MB")
            s.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 11px;")
            info.addWidget(s)
            row.addLayout(info, 1)

            b_view = QPushButton("🎥 Ver")
            b_view.setStyleSheet(BTN_SECONDARY)
            b_view.setCursor(Qt.CursorShape.PointingHandCursor)
            b_view.clicked.connect(lambda _, p=v["path"]: self._preview_video(p))
            row.addWidget(b_view)

            b_sel = QPushButton("Seleccionar ▶")
            b_sel.setStyleSheet(BTN_PRIMARY)
            b_sel.setCursor(Qt.CursorShape.PointingHandCursor)
            b_sel.clicked.connect(lambda _, p=v["path"]: self._select_video(p))
            row.addWidget(b_sel)

            cl.addLayout(row)

    def _preview_video(self, path):
        from PyQt6.QtGui import QDesktopServices
        from PyQt6.QtCore import QUrl
        QDesktopServices.openUrl(QUrl.fromLocalFile(path))

    def _browse_file(self):
        from PyQt6.QtWidgets import QFileDialog
        path, _ = QFileDialog.getOpenFileName(
            self, "Seleccionar Video", "", 
            "Videos (*.mp4 *.mov *.MOV *.MP4 *.avi *.mkv);;All Files (*)"
        )
        if path:
            self._select_video(path)

    def _select_video(self, path):
        self.video_path = path
        self.video_info = get_video_info(path)
        if not self.video_info:
            QMessageBox.warning(self, "Error", "No se pudo abrir el video.")
            return
        self.first_frame = read_frame(path, 0)
        self.end_frame = self.video_info["total_frames"]
        self._log(f"Video: {os.path.basename(path)}", ACCENT_BLUE)
        self._log(f"  {self.video_info['width']}x{self.video_info['height']} • "
                  f"{self.video_info['fps']:.0f} FPS • {self.video_info['duration']:.1f}s", ACCENT_BLUE)
        self.current_step = 1
        self._show_step(1)

    # ──────────────────────────────────────────────────
    # STEP 2: CALIBRATION
    # ──────────────────────────────────────────────────
    def _build_calibrate(self, layout):
        self._log("── Paso 2: Calibración ──", ACCENT_PRIMARY)
        self._make_header(layout, "📏", "Calibración",
                          "Haz click en los DOS EXTREMOS de la regla en la imagen")

        self._ref_points = []

        if self.first_frame is None:
            layout.addWidget(QLabel("Error: no hay frame disponible."))
            return

        h, w = self.first_frame.shape[:2]
        scale = min(650 / w, 400 / h, 1.0)
        self._cal_w = int(w * scale)
        self._cal_h = int(h * scale)
        self._cal_scale = scale

        self.cal_label = QLabel()
        self.cal_label.setFixedSize(self._cal_w, self._cal_h)
        self.cal_label.setStyleSheet("border: 1px solid #2a2a4a;")
        self.cal_label.mousePressEvent = self._on_cal_click
        self._draw_cal()
        layout.addWidget(self.cal_label, alignment=Qt.AlignmentFlag.AlignCenter)

        # Status
        self.cal_status = QLabel("Haz click en 2 puntos de la regla")
        self.cal_status.setStyleSheet(f"color: {WARNING_COLOR}; font-size: 12px;")
        layout.addWidget(self.cal_status)

        # Buttons row
        btn_row = QHBoxLayout()
        b_reset = QPushButton("🔄 Resetear")
        b_reset.setStyleSheet(BTN_SECONDARY)
        b_reset.clicked.connect(self._reset_cal)
        btn_row.addWidget(b_reset)
        b_vid = QPushButton("🎥 Ver Video")
        b_vid.setStyleSheet(BTN_SECONDARY)
        b_vid.clicked.connect(lambda: self._preview_video(self.video_path))
        btn_row.addWidget(b_vid)
        btn_row.addStretch(1)
        layout.addLayout(btn_row)

        # Real distance input
        cl = self._make_card(layout, "Medida real de la referencia")
        input_row = QHBoxLayout()
        input_row.addWidget(QLabel("Distancia real (metros):"))
        self.cal_input = QLineEdit("0.30")
        self.cal_input.setFixedWidth(100)
        self.cal_input.setStyleSheet(f"""
            QLineEdit {{ background: {BG_INPUT}; color: {TEXT_PRIMARY}; border: 1px solid {BORDER_COLOR};
                        border-radius: 5px; padding: 6px; font-family: Menlo; }}
        """)
        input_row.addWidget(self.cal_input)
        hint = QLabel("(ej. 0.30 = 30 cm)")
        hint.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 11px;")
        input_row.addWidget(hint)
        input_row.addStretch(1)
        cl.addLayout(input_row)

        b_conf = QPushButton("Confirmar Calibración ▶")
        b_conf.setStyleSheet(BTN_SUCCESS)
        b_conf.setCursor(Qt.CursorShape.PointingHandCursor)
        b_conf.clicked.connect(self._confirm_cal)
        cl.addWidget(b_conf, alignment=Qt.AlignmentFlag.AlignRight)

    def _draw_cal(self):
        vis = self.first_frame.copy()
        for i, pt in enumerate(self._ref_points):
            px = (int(pt[0]), int(pt[1]))
            cv2.circle(vis, px, 8, (0, 0, 255), -1)
            cv2.putText(vis, f"P{i+1}", (px[0]+12, px[1]-8), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            if i > 0:
                p0 = (int(self._ref_points[0][0]), int(self._ref_points[0][1]))
                cv2.line(vis, p0, px, (0, 0, 255), 2)
                dist = np.sqrt((p0[0]-px[0])**2 + (p0[1]-px[1])**2)
                mid = ((p0[0]+px[0])//2, (p0[1]+px[1])//2)
                cv2.putText(vis, f"{dist:.0f} px", mid, cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 180, 0), 2)
        self.cal_label.setPixmap(self._cv2_to_pixmap(vis, self._cal_w, self._cal_h))

    def _on_cal_click(self, event):
        if len(self._ref_points) >= 2:
            return
        real_x = event.position().x() / self._cal_scale
        real_y = event.position().y() / self._cal_scale
        self._ref_points.append((real_x, real_y))
        self._log(f"  Punto {len(self._ref_points)}: ({real_x:.0f}, {real_y:.0f})")
        self._draw_cal()
        if len(self._ref_points) >= 2:
            d = np.sqrt((self._ref_points[0][0]-self._ref_points[1][0])**2 +
                        (self._ref_points[0][1]-self._ref_points[1][1])**2)
            self.cal_status.setText(f"✅ Distancia: {d:.0f} px — Ingresa la medida real")
            self.cal_status.setStyleSheet(f"color: {SUCCESS_COLOR}; font-size: 12px;")

    def _reset_cal(self):
        self._ref_points = []
        self.cal_status.setText("Haz click en 2 puntos de la regla")
        self.cal_status.setStyleSheet(f"color: {WARNING_COLOR}; font-size: 12px;")
        self._draw_cal()

    def _confirm_cal(self):
        if len(self._ref_points) < 2:
            QMessageBox.warning(self, "Calibración", "Marca 2 puntos primero.")
            return
        try:
            real = float(self.cal_input.text())
            if real <= 0: raise ValueError
        except ValueError:
            QMessageBox.warning(self, "Calibración", "Distancia inválida.")
            return
        px_dist = np.sqrt((self._ref_points[0][0]-self._ref_points[1][0])**2 +
                          (self._ref_points[0][1]-self._ref_points[1][1])**2)
        self.pixels_per_meter = px_dist / real
        self._log(f"✅ Calibración: {self.pixels_per_meter:.1f} px/m", SUCCESS_COLOR)
        self.current_step = 2
        self._show_step(2)

    # ──────────────────────────────────────────────────
    # STEP 3: HSV
    # ──────────────────────────────────────────────────
    def _build_hsv(self, layout):
        self._log("── Paso 3: Ajuste HSV ──", ACCENT_PRIMARY)
        self._make_header(layout, "🎨", "Detección de la Bola",
                          "Ajusta los sliders HSV para detectar solo la bola")

        self._hsv_frame_idx = self.video_info["total_frames"] // 2

        h, w = self.first_frame.shape[:2]
        sc = min(360 / w, 280 / h, 1.0)
        self._hsv_w, self._hsv_h = int(w * sc), int(h * sc)

        img_row = QHBoxLayout()
        self.hsv_img = QLabel()
        self.hsv_img.setFixedSize(self._hsv_w, self._hsv_h)
        self.hsv_img.setStyleSheet("border: 1px solid #2a2a4a;")
        img_row.addWidget(self.hsv_img)
        self.hsv_mask = QLabel()
        self.hsv_mask.setFixedSize(self._hsv_w, self._hsv_h)
        self.hsv_mask.setStyleSheet("border: 1px solid #2a2a4a;")
        img_row.addWidget(self.hsv_mask)
        layout.addLayout(img_row)

        self.hsv_status = QLabel("")
        self.hsv_status.setStyleSheet(f"color: {SUCCESS_COLOR}; font-size: 12px;")
        layout.addWidget(self.hsv_status)

        # HSV sliders
        cl = self._make_card(layout, "Parámetros HSV")
        self._hsv_sliders = {}
        params = [("H min", 0, 180, int(self.hsv_lower[0])), ("H max", 0, 180, int(self.hsv_upper[0])),
                  ("S min", 0, 255, int(self.hsv_lower[1])), ("S max", 0, 255, int(self.hsv_upper[1])),
                  ("V min", 0, 255, int(self.hsv_lower[2])), ("V max", 0, 255, int(self.hsv_upper[2]))]
        grid = QGridLayout()
        for i, (name, lo, hi, val) in enumerate(params):
            r, c = i // 2, (i % 2) * 3
            lbl = QLabel(name)
            lbl.setStyleSheet(f"color: {TEXT_SECONDARY}; font-size: 11px;")
            grid.addWidget(lbl, r, c)
            sl = QSlider(Qt.Orientation.Horizontal)
            sl.setRange(lo, hi)
            sl.setValue(val)
            sl.setStyleSheet(SLIDER_CSS)
            sl.valueChanged.connect(self._update_hsv)
            grid.addWidget(sl, r, c+1)
            val_lbl = QLabel(str(val))
            val_lbl.setFixedWidth(30)
            val_lbl.setStyleSheet(f"color: {TEXT_ACCENT}; font-family: Menlo; font-size: 11px;")
            sl.valueChanged.connect(lambda v, l=val_lbl: l.setText(str(v)))
            grid.addWidget(val_lbl, r, c+2)
            self._hsv_sliders[name] = sl
        cl.addLayout(grid)

        # Frame nav
        nav = QHBoxLayout()
        nav.addWidget(QLabel("Frame:"))
        self.hsv_slider = QSlider(Qt.Orientation.Horizontal)
        self.hsv_slider.setRange(0, self.video_info["total_frames"] - 1)
        self.hsv_slider.setValue(self._hsv_frame_idx)
        self.hsv_slider.setStyleSheet(SLIDER_CSS)
        self.hsv_slider.valueChanged.connect(self._on_hsv_frame)
        nav.addWidget(self.hsv_slider, 1)
        layout.addLayout(nav)

        btn_row = QHBoxLayout()
        b = QPushButton("👁 Ver Frames")
        b.setStyleSheet(BTN_SECONDARY)
        b.clicked.connect(self._open_hsv_viewer)
        btn_row.addWidget(b)
        b2 = QPushButton("🎥 Ver Video")
        b2.setStyleSheet(BTN_SECONDARY)
        b2.clicked.connect(lambda: self._preview_video(self.video_path))
        btn_row.addWidget(b2)
        btn_row.addStretch(1)
        b3 = QPushButton("Confirmar ▶")
        b3.setStyleSheet(BTN_SUCCESS)
        b3.setCursor(Qt.CursorShape.PointingHandCursor)
        b3.clicked.connect(self._confirm_hsv)
        btn_row.addWidget(b3)
        layout.addLayout(btn_row)

        self._update_hsv()

    def _on_hsv_frame(self, val):
        self._hsv_frame_idx = val
        self._update_hsv()

    def _update_hsv(self):
        if not hasattr(self, '_hsv_sliders'):
            return
        frame = read_frame(self.video_path, self._hsv_frame_idx)
        if frame is None:
            return
        lo = np.array([self._hsv_sliders["H min"].value(), self._hsv_sliders["S min"].value(),
                       self._hsv_sliders["V min"].value()])
        hi = np.array([self._hsv_sliders["H max"].value(), self._hsv_sliders["S max"].value(),
                       self._hsv_sliders["V max"].value()])
        center, mask = detect_ball(frame, lo, hi)
        vis = frame.copy()
        if center:
            cv2.circle(vis, center, 15, (0, 255, 0), 3)
            self.hsv_status.setText(f"● Bola detectada ({center[0]}, {center[1]})")
        else:
            self.hsv_status.setText("✗ No detectada")
            self.hsv_status.setStyleSheet(f"color: {ERROR_COLOR}; font-size: 12px;")

        self.hsv_img.setPixmap(self._cv2_to_pixmap(vis, self._hsv_w, self._hsv_h))
        mask_c = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
        self.hsv_mask.setPixmap(self._cv2_to_pixmap(mask_c, self._hsv_w, self._hsv_h))

    def _open_hsv_viewer(self):
        lo = np.array([self._hsv_sliders["H min"].value(), self._hsv_sliders["S min"].value(),
                       self._hsv_sliders["V min"].value()])
        hi = np.array([self._hsv_sliders["H max"].value(), self._hsv_sliders["S max"].value(),
                       self._hsv_sliders["V max"].value()])
        d = FrameViewerDialog(self, self.video_path, fps=self.video_info["fps"],
                              hsv_lower=lo, hsv_upper=hi, title="Visor HSV")
        d.exec()

    def _confirm_hsv(self):
        self.hsv_lower = np.array([self._hsv_sliders["H min"].value(), self._hsv_sliders["S min"].value(),
                                   self._hsv_sliders["V min"].value()])
        self.hsv_upper = np.array([self._hsv_sliders["H max"].value(), self._hsv_sliders["S max"].value(),
                                   self._hsv_sliders["V max"].value()])
        self._log(f"✅ HSV: H[{self.hsv_lower[0]}-{self.hsv_upper[0]}] "
                  f"S[{self.hsv_lower[1]}-{self.hsv_upper[1]}] "
                  f"V[{self.hsv_lower[2]}-{self.hsv_upper[2]}]", SUCCESS_COLOR)
        self.current_step = 3
        self._show_step(3)

    # ──────────────────────────────────────────────────
    # STEP 4: PROCESSING
    # ──────────────────────────────────────────────────
    def _build_process(self, layout):
        self._log("── Paso 4: Procesamiento ──", ACCENT_PRIMARY)
        self._make_header(layout, "⚙️", "Procesamiento Automático",
                          "Analiza el video frame por frame")

        cl = self._make_card(layout, "Rango de Análisis")
        rr = QHBoxLayout()
        rr.addWidget(QLabel("Desde:"))
        self.proc_start = QLineEdit(str(self.start_frame))
        self.proc_start.setFixedWidth(80)
        self.proc_start.setStyleSheet(f"background:{BG_INPUT}; color:{TEXT_PRIMARY}; border:1px solid {BORDER_COLOR}; border-radius:4px; padding:5px; font-family:Menlo;")
        rr.addWidget(self.proc_start)
        rr.addWidget(QLabel("Hasta:"))
        self.proc_end = QLineEdit(str(self.end_frame))
        self.proc_end.setFixedWidth(80)
        self.proc_end.setStyleSheet(f"background:{BG_INPUT}; color:{TEXT_PRIMARY}; border:1px solid {BORDER_COLOR}; border-radius:4px; padding:5px; font-family:Menlo;")
        rr.addWidget(self.proc_end)
        b_frames = QPushButton("📹 Explorar Frames")
        b_frames.setStyleSheet(BTN_SECONDARY)
        b_frames.clicked.connect(lambda: FrameViewerDialog(self, self.video_path,
                                    fps=self.video_info["fps"], title="Explorar frames").exec())
        rr.addWidget(b_frames)
        rr.addStretch(1)
        cl.addLayout(rr)

        # Progress
        cl2 = self._make_card(layout, "Progreso")
        self.proc_status = QLabel("Listo para procesar")
        self.proc_status.setStyleSheet(f"color: {TEXT_SECONDARY}; font-size: 12px;")
        cl2.addWidget(self.proc_status)
        self.proc_bar = QProgressBar()
        self.proc_bar.setStyleSheet(f"""
            QProgressBar {{ background: {BG_INPUT}; border: none; border-radius: 4px; height: 10px; text-align: center; color: transparent; }}
            QProgressBar::chunk {{ background: {ACCENT_PRIMARY}; border-radius: 4px; }}
        """)
        cl2.addWidget(self.proc_bar)
        self.proc_count = QLabel("")
        self.proc_count.setStyleSheet(f"color: {SUCCESS_COLOR}; font-family: Menlo; font-size: 11px;")
        cl2.addWidget(self.proc_count)

        # Preview
        self.proc_img = QLabel()
        self.proc_img.setFixedSize(420, 260)
        self.proc_img.setStyleSheet("background: #000; border: 1px solid #2a2a4a;")
        layout.addWidget(self.proc_img, alignment=Qt.AlignmentFlag.AlignCenter)

        # Buttons
        btn_row = QHBoxLayout()
        b_vid = QPushButton("🎥 Ver Video")
        b_vid.setStyleSheet(BTN_SECONDARY)
        b_vid.clicked.connect(lambda: self._preview_video(self.video_path))
        btn_row.addWidget(b_vid)
        btn_row.addStretch(1)
        self.proc_start_btn = QPushButton("▶ Iniciar Procesamiento")
        self.proc_start_btn.setStyleSheet(BTN_SUCCESS)
        self.proc_start_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.proc_start_btn.clicked.connect(self._run_process)
        btn_row.addWidget(self.proc_start_btn)
        self.proc_next_btn = QPushButton("Ver Resultados ▶")
        self.proc_next_btn.setStyleSheet(BTN_PRIMARY)
        self.proc_next_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.proc_next_btn.clicked.connect(self._goto_results)
        self.proc_next_btn.hide()
        btn_row.addWidget(self.proc_next_btn)
        layout.addLayout(btn_row)

    def _run_process(self):
        self.proc_start_btn.setEnabled(False)
        self.start_frame = int(self.proc_start.text())
        self.end_frame = int(self.proc_end.text())

        self._signals = _Signals()
        self._signals.progress.connect(self._on_proc_progress)
        self._signals.frame_preview.connect(self._on_proc_frame)
        self._signals.done.connect(self._on_proc_done)

        threading.Thread(target=self._process_thread, daemon=True).start()

    def _process_thread(self):
        cap = cv2.VideoCapture(self.video_path)
        fps = self.video_info["fps"]
        cap.set(cv2.CAP_PROP_POS_FRAMES, self.start_frame)
        self.detections = []
        total = self.end_frame - self.start_frame

        for i in range(total):
            ret, frame = cap.read()
            if not ret:
                break
            fidx = self.start_frame + i
            center, _ = detect_ball(frame, self.hsv_lower, self.hsv_upper)
            if center:
                self.detections.append({"frame": fidx, "center": center, "time": fidx/fps,
                                        "y_px": center[1], "x_px": center[0]})
            pct = int((i+1)/total*100)
            if i % 5 == 0:
                self._signals.progress.emit(pct, f"Frame {fidx}", len(self.detections))
                if center:
                    vis = frame.copy()
                    cv2.circle(vis, center, 12, (0, 255, 0), 3)
                    self._signals.frame_preview.emit(vis)

        cap.release()
        self._signals.done.emit()

    def _on_proc_progress(self, pct, status, det_count):
        self.proc_bar.setValue(pct)
        self.proc_status.setText(f"{status} ({pct}%)")
        self.proc_count.setText(f"Detecciones: {det_count}")

    def _on_proc_frame(self, frame):
        try:
            self.proc_img.setPixmap(self._cv2_to_pixmap(frame, 420, 260))
        except Exception:
            pass

    def _on_proc_done(self):
        self.proc_bar.setValue(100)
        self.proc_status.setText("✅ Procesamiento completo")
        self.proc_count.setText(f"Total: {len(self.detections)} detecciones")
        self._log(f"✅ {len(self.detections)} detecciones", SUCCESS_COLOR)
        self.proc_next_btn.show()

    def _goto_results(self):
        if not self.detections:
            QMessageBox.warning(self, "Sin datos", "No hay detecciones.")
            return
        self.current_step = 4
        self._show_step(4)

    # ──────────────────────────────────────────────────
    # STEP 5: RESULTS
    # ──────────────────────────────────────────────────
    def _build_results(self, layout):
        self._log("── Paso 5: Resultados ──", ACCENT_PRIMARY)
        self._make_header(layout, "📊", "Resultados", "Cálculo de gravedad por ajuste de curva")

        times = np.array([d["time"] for d in self.detections])
        y_px = np.array([d["y_px"] for d in self.detections])
        times_rel = times - times[0]
        y_meters = y_px / self.pixels_per_meter

        times_f, y_f, msg = filter_free_fall_region(times_rel, y_meters)
        self._log(f"  {msg}", ACCENT_BLUE)

        try:
            res = fit_gravity(times_f, y_f)
            self.results = res
        except Exception as e:
            self._log(f"Error: {e}", ERROR_COLOR)
            layout.addWidget(QLabel(f"❌ Error: {e}"))
            return

        # Metrics cards
        cl = self._make_card(layout, "Modelo: y = y₀ + v₀t + ½gt²")
        grid = QGridLayout()
        metrics = [
            ("🎯 g", f"{res['g']:.3f} ± {res['g_err']:.3f} m/s²", ACCENT_PRIMARY),
            ("📐 y₀", f"{res['y0']:.4f} ± {res['y0_err']:.4f} m", TEXT_SECONDARY),
            ("💨 v₀", f"{res['v0']:.4f} ± {res['v0_err']:.4f} m/s", TEXT_SECONDARY),
            ("📈 R²", f"{res['r_squared']:.6f}", SUCCESS_COLOR),
            ("⚠️ Error", f"{res['error_pct']:.2f}%", WARNING_COLOR if res['error_pct'] > 5 else SUCCESS_COLOR),
            ("📊 Puntos", f"{res['n_points']}", TEXT_SECONDARY),
        ]
        for i, (label, value, color) in enumerate(metrics):
            r, c = i // 3, (i % 3)
            cell = QVBoxLayout()
            l1 = QLabel(label)
            l1.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 11px;")
            cell.addWidget(l1)
            l2 = QLabel(value)
            l2.setStyleSheet(f"color: {color}; font-family: Menlo; font-size: 13px; font-weight: bold;")
            cell.addWidget(l2)
            grid.addLayout(cell, r, c)
        cl.addLayout(grid)

        self._log(f"🎯 g = {res['g']:.3f} ± {res['g_err']:.3f} m/s²", SUCCESS_COLOR)
        self._log(f"   R² = {res['r_squared']:.6f} | Error = {res['error_pct']:.2f}%", ACCENT_BLUE)

        # Chart
        fig = Figure(figsize=(9, 3.5), dpi=100, facecolor=BG_CARD)
        ax1 = fig.add_subplot(121)
        ax1.set_facecolor("#12122a")
        ax1.plot(res["times_rel"], res["y_meters"], 'wo', ms=3, alpha=0.5, label="Datos")
        ax1.plot(res["t_fit"], res["y_fit"], color=ACCENT_PRIMARY, lw=2.5, label=f"g={res['g']:.3f}")
        ax1.set_xlabel("t (s)", color=TEXT_SECONDARY)
        ax1.set_ylabel("y (m) ↓", color=TEXT_SECONDARY)
        ax1.set_title("Posición vs Tiempo", color=TEXT_PRIMARY, fontsize=11)
        ax1.legend(fontsize=8, facecolor=BG_CARD, edgecolor=BORDER_COLOR, labelcolor=TEXT_PRIMARY)
        ax1.tick_params(colors=TEXT_MUTED)
        ax1.grid(True, alpha=0.15)

        ax2 = fig.add_subplot(122)
        ax2.set_facecolor("#12122a")
        ax2.plot(res["times_rel"], res["residuals"]*100, '.', color=ACCENT_BLUE, ms=3, alpha=0.5)
        ax2.axhline(0, color=ACCENT_WARN, ls='--', alpha=0.5)
        ax2.set_xlabel("t (s)", color=TEXT_SECONDARY)
        ax2.set_ylabel("Residuos (cm)", color=TEXT_SECONDARY)
        ax2.set_title(f"Residuos (R²={res['r_squared']:.4f})", color=TEXT_PRIMARY, fontsize=11)
        ax2.tick_params(colors=TEXT_MUTED)
        ax2.grid(True, alpha=0.15)
        fig.tight_layout()

        canvas = FigureCanvasQTAgg(fig)
        canvas.setMinimumHeight(320)
        layout.addWidget(canvas)

        # Buttons
        btn_row = QHBoxLayout()
        b1 = QPushButton("🎥 Ver Video")
        b1.setStyleSheet(BTN_SECONDARY)
        b1.clicked.connect(lambda: self._preview_video(self.video_path))
        btn_row.addWidget(b1)
        b2 = QPushButton("👁 Ver Detecciones")
        b2.setStyleSheet(BTN_SECONDARY)
        b2.clicked.connect(self._open_result_viewer)
        btn_row.addWidget(b2)
        btn_row.addStretch(1)
        b3 = QPushButton("💾 Guardar Gráfica")
        b3.setStyleSheet(BTN_PRIMARY)
        b3.clicked.connect(lambda: self._save_fig(fig))
        btn_row.addWidget(b3)
        layout.addLayout(btn_row)

    def _open_result_viewer(self):
        det = [{"frame": d["frame"], "center": d["center"]} for d in self.detections]
        d = FrameViewerDialog(self, self.video_path, detections=det,
                              fps=self.video_info["fps"], title="Detecciones")
        d.exec()

    def _save_fig(self, fig):
        out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           "gravedad_resultado.png")
        fig.savefig(out, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
        self._log(f"💾 Guardada: {out}", SUCCESS_COLOR)
        QMessageBox.information(self, "Guardado", f"Gráfica en:\n{out}")
