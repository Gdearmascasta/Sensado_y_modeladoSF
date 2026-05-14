# 05 — Imágenes Satelitales — Clasificación de Cobertura Terrestre

Aplicación web que lleva el flujo del notebook `actividad.ipynb` a una interfaz interactiva. Consulta imágenes **Sentinel-2 L2A** del catálogo STAC de Microsoft Planetary Computer, descarga las bandas espectrales necesarias, calcula índices (NDVI, BSI, NDWI), entrena un clasificador **Random Forest** con pseudo-etiquetado y genera un mapa clasificado de cobertura terrestre (Vegetación / Agua / Minería / No clasificado).

---

## 🏗️ Arquitectura

```
05_satellite_images/
├── backend/              # FastAPI — puerto 8004
│   ├── main.py
│   ├── session_store.py  # Sesiones en memoria con TTL 60 min
│   ├── requirements.txt
│   └── core/
│       ├── search.py     # Búsqueda STAC
│       ├── bands.py      # Descarga windowed + True Color Preview
│       ├── indices.py    # NDVI, BSI, NDWI
│       ├── classifier.py # Pseudo-etiquetado + Random Forest
│       └── export.py     # PNG clasificado + GeoTIFF
├── frontend/             # React + TypeScript + Vite + Tailwind — puerto 5177
│   └── src/
│       ├── components/
│       │   ├── SearchPanel.tsx      # Paso 1: configurar consulta STAC
│       │   ├── BandsPanel.tsx       # Paso 2: descargar bandas
│       │   ├── IndicesPanel.tsx     # Paso 3: explorar índices
│       │   ├── ClassifierPanel.tsx  # Paso 4: entrenar y predecir
│       │   └── MapPanel.tsx         # Paso 5: ver y exportar mapa
│       └── hooks/
│           └── useProgressStream.ts # Consumo de streams NDJSON
├── actividad.ipynb       # Notebook de referencia (no modificar)
├── mapa_clasificacion_mineria.png
└── run.sh                # Script de arranque unificado
```

## 🚀 Ejecución rápida

```bash
cd 05_satellite_images
bash run.sh
```

- **Frontend:** http://localhost:5177
- **Backend API:** http://localhost:8004
- **Docs API:** http://localhost:8004/docs

## 🔧 Ejecución manual

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8004 --reload
```

### Frontend
```bash
cd frontend
npm install && npm run dev
```

## 🗺️ Flujo de la Aplicación (5 pasos)

### Paso 1 — Búsqueda STAC
Configura la zona de interés (Bounding Box), el rango temporal y el umbral de nubosidad. El backend consulta el catálogo de Planetary Computer y selecciona la escena Sentinel-2 con menor cobertura de nubes.

### Paso 2 — Descarga de Bandas
Descarga las 5 bandas espectrales (B02, B03, B04, B08, B11) usando lectura por ventana (`rasterio.windows.from_bounds`). El progreso se transmite en tiempo real via NDJSON streaming. Al finalizar se muestra el **True Color Preview** (B04/B03/B02 normalizado por percentiles 2-98).

### Paso 3 — Índices Espectrales
Calcula y visualiza los tres índices con sus colormaps:

| Índice | Fórmula | Colormap | Detecta |
|--------|---------|----------|---------|
| NDVI | `(B08-B04)/(B08+B04)` | RdYlGn | Vegetación |
| BSI | `((B11+B04)-(B08+B02))/((B11+B04)+(B08+B02))` | YlOrBr | Suelo desnudo |
| NDWI | `(B03-B08)/(B03+B08)` | Blues | Agua |

### Paso 4 — Clasificador Random Forest
Ajusta los umbrales de pseudo-etiquetado, previsualiza el conteo de píxeles por clase, entrena el modelo (`n_estimators=100, random_state=42`) y predice la clase de todos los píxeles. El OOB accuracy se muestra al finalizar el entrenamiento.

**Pseudo-etiquetado por defecto:**
```
Vegetación : NDVI > 0.60  AND BSI  < -0.10
Agua        : NDWI > 0.10  AND NDVI < 0.10
Minería     : BSI  > 0.12  AND NDVI < 0.25
```

### Paso 5 — Mapa Clasificado
Visualiza el mapa con leyenda integrada y descarga en dos formatos:
- **PNG** — imagen renderizada con `ListedColormap(['green','blue','saddlebrown','black'])`
- **GeoTIFF** — banda `int16` georreferenciada con CRS y transformación afín de la ventana

## 🔑 Conceptos Clave

### ¿Por qué funciona con una sola imagen?
El modelo no necesita datos de entrenamiento externos. Usa **pseudo-etiquetado**: aplica reglas físicas conocidas (propiedades espectrales de vegetación, agua y suelo) para etiquetar automáticamente los píxeles más "puros" de la propia imagen. El Random Forest luego generaliza esas reglas a los píxeles ambiguos.

### Sesiones en memoria
Cada búsqueda crea una sesión con TTL de 60 minutos que almacena las bandas descargadas, los índices calculados, el clasificador entrenado y el mapa resultante. Esto evita re-descargas entre pasos.

### Streaming NDJSON
Las operaciones largas (descarga, entrenamiento, predicción) transmiten su progreso como `application/x-ndjson` con líneas `{stage, progress, message}`, permitiendo actualizar la barra de progreso en tiempo real.

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3, FastAPI, rasterio, pystac-client, planetary-computer, scikit-learn, numpy, matplotlib |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, lucide-react |
| Datos | Sentinel-2 L2A via Microsoft Planetary Computer STAC |
| ML | RandomForestClassifier (scikit-learn) |
| Exportación | GeoTIFF (rasterio), PNG (matplotlib) |

## 📦 Dependencias del Backend

```
fastapi
uvicorn
pydantic
numpy
scipy
rasterio
pystac-client
planetary-computer
scikit-learn
matplotlib
python-multipart
```
