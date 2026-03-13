"""
Punto de entrada de la aplicación de cálculo de gravedad.
"""

import sys
import os

# Asegurar que el directorio padre esté en el path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gravity_app.gui.main_window import GravityApp


def main():
    app = GravityApp()
    app.mainloop()


if __name__ == "__main__":
    main()
