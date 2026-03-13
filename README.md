# Sensado y Modelado de Sistemas Físicos

Repositorio dedicado a documentar y centralizar todas las actividades, prácticas y códigos desarrollados en la asignatura de **Sensado y Modelado de Sistemas Físicos**. Incluye implementaciones, ejercicios, experimentos y recursos utilizados para el análisis, simulación y comprensión del comportamiento de sistemas físicos a partir de datos.

---

## 🚀 Proyectos y Actividades

### 1. Estimación Manual de Caída Libre (`01_manual_gravity_estimation/`)
Análisis tradicional en el cual calculamos la gravedad extraída de un objeto en caída libre de forma manual evaluando modelos físicos.

### 2. Suite Automatizada: Gravedad Tracker (`02_automated_gravity_tracker/`)
Una completa suite de análisis de video diseñado para estimar el valor de la gravedad ($g$) a partir de videos caseros de un objeto en caída libre de forma totalmente automatizada. Este proyecto cuenta con distintos enfoques de desarrollo para el procesamiento de los fotogramas y la interacción con el usuario.

#### 📌 Características del Gravedad Tracker
- **Segmentación por Color (HSV):** Detección de la bola mediante máscaras generadas dinámicamente con OpenCV.
- **Calibración a Escala Real:** Conversión de medidas de píxeles a metros usando un objeto de referencia dentro del video.
- **Seguimiento Frame por Frame:** Cálculo automatizado del centro de masa para determinar la posición $y(t)$ del objeto.
- **Ajuste Estadístico Continuo:** Regresión cuadrática usando `scipy.optimize.curve_fit` bajo el modelo de caída libre ideal ($y = y_0 + v_0t + \frac{1}{2}gt^2$).

#### 🛠️ Versiones Disponibles

**Visión Monolítica y Escritorio:**
Se desarrolló una versión en un entorno de escritorio haciendo uso de `PyQt6` integrada completamente con las lógicas del análisis (ver: `app_gravedad.py`).

**Arquitectura Web Moderna (FastAPI + React):**
Un sistema refactorizado, que traslada el cómputo intensivo al backend y brinda una experiencia rica visualmente:
1. **🚀 Backend:** Programado en Python utilizando `FastAPI` y un motor de streaming de imágenes (`OpenCV`).
2. **✨ Frontend:** Diseñado como una Single Page Application (SPA) haciendo uso de `React` (TSX), `Tailwind CSS` y `Recharts` para gráficos interactivos. Incluye utilidades de previsualización en vivo, ajustes en tiempo real y controles del registro de detección (`Detecciones Frame por Frame`).

#### 💻 ¿Cómo Ejecutar la Versión Web?

1. **Backend:**
   Navega al directorio del backend y despliega su entorno virtual con sus requerimientos, e inicia el servidor.
   ```bash
   cd 02_automated_gravity_tracker/backend
   pip install -r requirements.txt
   python3 -m uvicorn main:app --reload
   ```

2. **Frontend:**
   Navega al directorio del panel de React y lanza la interfaz en entorno de Node.
   ```bash
   cd 02_automated_gravity_tracker/frontend
   npm install
   npm run dev
   ```
   *Accede desde tu navegador al puerto 5173 e interactúa con el Tracker.*
