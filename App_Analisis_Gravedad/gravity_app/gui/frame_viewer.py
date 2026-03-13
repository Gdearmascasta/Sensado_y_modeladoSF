"""
Visor de frames con PyQt6: navega frame por frame y ve detecciones.
"""

import cv2
import numpy as np
from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QSlider, QWidget)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage, QPixmap
from gravity_app.utils.constants import *
from gravity_app.core.detection import detect_ball


class FrameViewerDialog(QDialog):
    def __init__(self, parent, video_path, detections=None, fps=30,
                 hsv_lower=None, hsv_upper=None, title="Visor de Frames"):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setStyleSheet(f"background-color: {BG_DARK}; color: {TEXT_PRIMARY};")
        self.video_path = video_path
        self.detections = detections or []
        self.fps = fps
        self.hsv_lower = hsv_lower
        self.hsv_upper = hsv_upper

        self.cap = cv2.VideoCapture(video_path)
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        scale = min(600 / w, 420 / h, 1.0)
        self.display_w = int(w * scale)
        self.display_h = int(h * scale)
        self.current_frame = 0

        self.det_map = {d["frame"]: d.get("center") for d in self.detections}

        total_w = self.display_w + 40
        if self.hsv_lower is not None:
            total_w = self.display_w * 2 + 60
        self.setFixedSize(total_w, self.display_h + 200)

        self._build_ui()
        self._show()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 10, 15, 10)

        # Info bar
        info_row = QHBoxLayout()
        self.info_label = QLabel("")
        self.info_label.setStyleSheet(f"color: {TEXT_PRIMARY}; font-family: Menlo; font-size: 12px;")
        info_row.addWidget(self.info_label)
        self.status_label = QLabel("")
        self.status_label.setStyleSheet(f"color: {SUCCESS_COLOR}; font-family: Menlo; font-size: 11px;")
        info_row.addWidget(self.status_label, alignment=Qt.AlignmentFlag.AlignRight)
        layout.addLayout(info_row)

        # Image area
        img_row = QHBoxLayout()
        self.image_label = QLabel()
        self.image_label.setFixedSize(self.display_w, self.display_h)
        self.image_label.setStyleSheet("background: #000; border: 1px solid #2a2a4a;")
        img_row.addWidget(self.image_label)

        if self.hsv_lower is not None:
            self.mask_label = QLabel()
            self.mask_label.setFixedSize(self.display_w, self.display_h)
            self.mask_label.setStyleSheet("background: #000; border: 1px solid #2a2a4a;")
            img_row.addWidget(self.mask_label)
        layout.addLayout(img_row)

        # Slider
        self.slider = QSlider(Qt.Orientation.Horizontal)
        self.slider.setRange(0, self.total_frames - 1)
        self.slider.setStyleSheet(f"""
            QSlider::groove:horizontal {{ background: {BG_INPUT}; height: 6px; border-radius: 3px; }}
            QSlider::handle:horizontal {{ background: {ACCENT_PRIMARY}; width: 14px; margin: -4px 0; border-radius: 7px; }}
            QSlider::sub-page:horizontal {{ background: {ACCENT_PRIMARY}; border-radius: 3px; }}
        """)
        self.slider.valueChanged.connect(self._on_slider)
        layout.addWidget(self.slider)

        # Controls
        btn_style = f"""
            QPushButton {{ background: {BG_INPUT}; color: {TEXT_PRIMARY}; border: none;
                          padding: 6px 12px; border-radius: 5px; font-size: 12px; }}
            QPushButton:hover {{ background: {ACCENT_PRIMARY}; }}
        """
        ctrl = QHBoxLayout()
        for text, delta in [("⏮", -9999), ("⏪ 10", -10), ("◀ 1", -1),
                            ("1 ▶", 1), ("10 ⏩", 10), ("⏭", 9999)]:
            b = QPushButton(text)
            b.setStyleSheet(btn_style)
            b.clicked.connect(lambda _, d=delta: self._step(d))
            ctrl.addWidget(b)
        layout.addLayout(ctrl)

        if self.detections:
            det_ctrl = QHBoxLayout()
            jump_style = f"""
                QPushButton {{ background: #1a2a2a; color: {SUCCESS_COLOR}; border: 1px solid #1a3a3a;
                              padding: 6px 14px; border-radius: 5px; font-size: 11px; }}
                QPushButton:hover {{ background: #2a3a3a; }}
            """
            b_prev = QPushButton("◀ Detección anterior")
            b_prev.setStyleSheet(jump_style)
            b_prev.clicked.connect(self._prev_det)
            det_ctrl.addWidget(b_prev)

            b_next = QPushButton("Detección siguiente ▶")
            b_next.setStyleSheet(jump_style)
            b_next.clicked.connect(self._next_det)
            det_ctrl.addWidget(b_next)

            lbl = QLabel(f"  {len(self.detections)} detecciones")
            lbl.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 10px;")
            det_ctrl.addWidget(lbl)
            layout.addLayout(det_ctrl)

    def _show(self):
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, self.current_frame)
        ret, frame = self.cap.read()
        if not ret:
            return

        vis = frame.copy()
        mask_vis = None

        if self.hsv_lower is not None and self.hsv_upper is not None:
            center, mask = detect_ball(vis, self.hsv_lower, self.hsv_upper)
            if center:
                cv2.circle(vis, center, 15, (0, 255, 0), 3)
            mask_vis = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
        elif self.current_frame in self.det_map and self.det_map[self.current_frame]:
            cv2.circle(vis, self.det_map[self.current_frame], 15, (0, 255, 0), 3)

        self._set_pixmap(self.image_label, vis)
        if mask_vis is not None and hasattr(self, 'mask_label'):
            self._set_pixmap(self.mask_label, mask_vis)

        t = self.current_frame / self.fps
        self.info_label.setText(f"Frame {self.current_frame}/{self.total_frames}  •  t = {t:.3f}s")
        self.status_label.setText("● Detectada" if self.current_frame in self.det_map else "")
        self.slider.blockSignals(True)
        self.slider.setValue(self.current_frame)
        self.slider.blockSignals(False)

    def _set_pixmap(self, label, frame_bgr):
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb.shape
        qimg = QImage(rgb.data, w, h, ch * w, QImage.Format.Format_RGB888)
        pixmap = QPixmap.fromImage(qimg).scaled(
            self.display_w, self.display_h, Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation)
        label.setPixmap(pixmap)

    def _on_slider(self, val):
        self.current_frame = val
        self._show()

    def _step(self, delta):
        self.current_frame = max(0, min(self.current_frame + delta, self.total_frames - 1))
        self._show()

    def _prev_det(self):
        frames = sorted(self.det_map.keys())
        prev = [f for f in frames if f < self.current_frame]
        if prev:
            self.current_frame = prev[-1]
            self._show()

    def _next_det(self):
        frames = sorted(self.det_map.keys())
        nxt = [f for f in frames if f > self.current_frame]
        if nxt:
            self.current_frame = nxt[0]
            self._show()

    def closeEvent(self, event):
        self.cap.release()
        super().closeEvent(event)
