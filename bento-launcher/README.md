# Bento Launcher — Hub Central

Dashboard central del repositorio "Sensado y Modelado de Sistemas Físicos". Presenta todas las aplicaciones del curso en una cuadrícula estilo **bento** con tiles de tamaños variables. Cada tile permite lanzar la app correspondiente mostrando los comandos de terminal necesarios.

---

## 🏗️ Arquitectura

```
bento-launcher/
├── public/
│   ├── imgs/          # Capturas de pantalla para el README
│   └── logos/         # Logo UTB
├── src/
│   ├── components/
│   │   ├── BentoGrid.tsx        # Cuadrícula CSS Grid
│   │   ├── BentoTile.tsx        # Tile individual
│   │   ├── InfoCard.tsx         # Tarjeta informativa del curso
│   │   ├── Header.tsx           # Cabecera con título y logo
│   │   ├── InstructionModal.tsx # Modal con comandos de lanzamiento
│   │   └── CodeBlock.tsx        # Bloque de código copiable
│   ├── data/
│   │   └── appRegistry.ts       # Registro de todas las apps
│   └── types/
│       └── index.ts             # Tipos TypeScript compartidos
├── package.json
└── vite.config.ts
```

## 🚀 Ejecución

```bash
cd bento-launcher
npm install
npm run dev
```

Accede en: **http://localhost:3000**

## ➕ Agregar una nueva app

Edita `src/data/appRegistry.ts` y añade una entrada al array `appRegistry`:

```typescript
{
  id: 'mi-nueva-app',
  name: 'Mi Nueva App',
  description: 'Descripción breve de la app.',
  icon: IconComponent,          // icono de lucide-react
  accentColor: '#10b981',       // color hex de acento
  gridSize: { colSpan: 1, rowSpan: 1 },
  launchType: 'comando_local',
  previewUrl: 'http://localhost:XXXX',
  launchSteps: [
    {
      label: '1. Iniciar Backend',
      command: 'cd mi-app/backend && python main.py',
    },
    {
      label: '2. Iniciar Frontend',
      command: 'cd mi-app/frontend && npm run dev',
    },
  ],
}
```

## 📋 Apps registradas

| App | Puerto Frontend | Puerto Backend | Tipo |
|-----|----------------|----------------|------|
| Estimación Manual de Gravedad | 5173 | 8001 | `comando_local` |
| Gravity Tracker Automatizado | 5174 | 8000 | `comando_local` |
| Coeficiente de Restitución | 5175 | 8002 | `comando_local` |
| Péndulo Simple | 5176 | 8003 | `comando_local` |
| Imágenes Satelitales | 5177 | 8004 | `comando_local` |

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19, TypeScript |
| Build | Vite 8 |
| Estilos | Tailwind CSS 3.4 |
| Iconos | lucide-react |
| Testing | Vitest + @testing-library/react + fast-check |
