"""
Reproductor de video embebido con PyQt6.
"""

import cv2
from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QSlider, QWidget)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QImage, QPixmap
from gravity_app.utils.constants import *


class VideoPlayerDialog(QDialog):
    def __init__(self, parent, video_path, title="Reproductor de Video",
                 start_frame=0, end_frame=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setStyleSheet(f"background-color: {BG_DARK}; color: {TEXT_PRIMARY};")
        self.video_path = video_path
        self.start_frame = start_frame
        self.playing = False

        self.cap = cv2.VideoCapture(video_path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.end_frame = end_frame or self.total_frames
        self.current_frame = start_frame

        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        scale = min(800 / w, 600 / h, 1.0)
        self.display_w = int(w * scale)
        self.display_h = int(h * scale)

        self.setFixedSize(self.display_w + 40, self.display_h + 160)
        self.timer = QTimer()
        self.timer.timeout.connect(self._play_tick)

        self._build_ui()
        self._show_frame()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)

        self.image_label = QLabel()
        self.image_label.setFixedSize(self.display_w, self.display_h)
        self.image_label.setStyleSheet("background: #000; border: 1px solid #2a2a4a;")
        self.image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.image_label, alignment=Qt.AlignmentFlag.AlignCenter)

        self.info_label = QLabel("")
        self.info_label.setStyleSheet(f"color: {TEXT_SECONDARY}; font-family: Menlo; font-size: 11px;")
        layout.addWidget(self.info_label, alignment=Qt.AlignmentFlag.AlignCenter)

        self.slider = QSlider(Qt.Orientation.Horizontal)
        self.slider.setRange(self.start_frame, self.end_frame - 1)
        self.slider.setValue(self.start_frame)
        self.slider.setStyleSheet(f"""
            QSlider::groove:horizontal {{ background: {BG_INPUT}; height: 6px; border-radius: 3px; }}
            QSlider::handle:horizontal {{ background: {ACCENT_PRIMARY}; width: 14px; margin: -4px 0; border-radius: 7px; }}
            QSlider::sub-page:horizontal {{ background: {ACCENT_PRIMARY}; border-radius: 3px; }}
        """)
        self.slider.valueChanged.connect(self._on_slider)
        layout.addWidget(self.slider)

        btn_row = QHBoxLayout()
        btn_style = f"""
            QPushButton {{ background: {BG_INPUT}; color: {TEXT_PRIMARY}; border: none;
                          padding: 8px 14px; border-radius: 6px; font-size: 14px; }}
            QPushButton:hover {{ background: {ACCENT_PRIMARY}; }}
        """
        for text, action in [("⏮", lambda: self._goto(self.start_frame)),
                             ("⏪", lambda: self._step(-10)),
                             ("◀", lambda: self._step(-1))]:
            b = QPushButton(text)
            b.setStyleSheet(btn_style)
            b.clicked.connect(action)
            btn_row.addWidget(b)

        self.play_btn = QPushButton("▶")
        self.play_btn.setStyleSheet(f"""
            QPushButton {{ background: {ACCENT_PRIMARY}; color: #fff; border: none;
                          padding: 8px 18px; border-radius: 6px; font-size: 14px; font-weight: bold; }}
            QPushButton:hover {{ background: #7d75ff; }}
        """)
        self.play_btn.clicked.connect(self._toggle_play)
        btn_row.addWidget(self.play_btn)

        for text, action in [("▶", lambda: self._step(1)),
                             ("⏩", lambda: self._step(10)),
                             ("⏭", lambda: self._goto(self.end_frame - 1))]:
            b = QPushButton(text)
            b.setStyleSheet(btn_style)
            b.clicked.connect(action)
            btn_row.addWidget(b)

        layout.addLayout(btn_row)

    def _show_frame(self):
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, self.current_frame)
        ret, frame = self.cap.read()
        if not ret:
            return

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = frame_rgb.shape
        bytes_per_line = ch * w
        qimg = QImage(frame_rgb.data, w, h, bytes_per_line, QImage.Format.Format_RGB888)
        pixmap = QPixmap.fromImage(qimg).scaled(
            self.display_w, self.display_h, Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation)
        self.image_label.setPixmap(pixmap)

        t = self.current_frame / self.fps
        self.info_label.setText(f"Frame {self.current_frame}/{self.total_frames}  •  t = {t:.3f}s")
        self.slider.blockSignals(True)
        self.slider.setValue(self.current_frame)
        self.slider.blockSignals(False)

    def _on_slider(self, val):
        self.current_frame = val
        if not self.playing:
            self._show_frame()

    def _toggle_play(self):
        self.playing = not self.playing
        self.play_btn.setText("⏸" if self.playing else "▶")
        if self.playing:
            self.timer.start(max(1, int(1000 / self.fps)))
        else:
            self.timer.stop()

    def _play_tick(self):
        if self.current_frame >= self.end_frame - 1:
            self.playing = False
            self.play_btn.setText("▶")
            self.timer.stop()
            return
        self.current_frame += 1
        self._show_frame()

    def _step(self, delta):
        self.playing = False
        self.play_btn.setText("▶")
        self.timer.stop()
        self._goto(self.current_frame + delta)

    def _goto(self, frame_n):
        self.current_frame = max(self.start_frame, min(frame_n, self.end_frame - 1))
        self._show_frame()

    def closeEvent(self, event):
        self.timer.stop()
        self.playing = False
        self.cap.release()
        super().closeEvent(event)
