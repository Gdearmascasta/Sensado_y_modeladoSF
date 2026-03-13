"""
Punto de entrada: ejecutar con `python run_app.py`
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt6.QtWidgets import QApplication
from gravity_app.gui.main_window import GravityApp

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = GravityApp()
    window.show()
    sys.exit(app.exec())
