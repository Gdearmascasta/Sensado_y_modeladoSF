import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Activity, Target, Sliders, Play, BarChart3, RotateCcw } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Label } from 'recharts';

function App() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [calib, setCalib] = useState({ refPoints: [] as { x: number, y: number }[], pixelsDist: 0, realDist: 1.0 });

  const [hsvFrame, setHsvFrame] = useState(0);
  const [hsv, setHsv] = useState({ hMin: 0, hMax: 25, sMin: 80, sMax: 255, vMin: 80, vMax: 255 });

  const [processRange, setProcessRange] = useState({ start: 0, end: 0 });
  const [detectionFrame, setDetectionFrame] = useState(0);
  const [results, setResults] = useState<any>(null);

  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const imgRef = useRef<HTMLImageElement>(null);

  // 1. Upload Video
  const handleUpload = async (file: File) => {
    setLoading(true);
    setFile(file);
    const fd = new FormData();
    fd.append("video", file);
    try {
      const { data } = await axios.post("http://localhost:8000/upload", fd);
      setVideoInfo(data);
      setHsvFrame(Math.floor(data.total_frames / 2));
      setDetectionFrame(0);
      setProcessRange({ start: 0, end: data.total_frames });
    } catch (e: any) {
      setErrorMsg(e.message || "Error al subir video");
    }
    setLoading(false);
  };

  // 2. Calibracion Click
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (calib.refPoints.length >= 2) return;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calcular escala de la imagen mostrada vs original
    const scaleX = imgRef.current!.naturalWidth / rect.width;
    const scaleY = imgRef.current!.naturalHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newPoints = [...calib.refPoints, { x, y }];
    let dist = calib.pixelsDist;
    if (newPoints.length === 2) {
      dist = Math.sqrt(Math.pow(newPoints[0].x - newPoints[1].x, 2) + Math.pow(newPoints[0].y - newPoints[1].y, 2));
    }
    setCalib({ ...calib, refPoints: newPoints, pixelsDist: dist });
  };

  // 4. Analizar
  const handleAnalyze = async () => {
    setLoading(true);
    setErrorMsg("");
    setLiveLogs([]);
    const fd = new FormData();
    fd.append("filename", videoInfo.filename);
    fd.append("start_frame", processRange.start.toString());
    fd.append("end_frame", processRange.end.toString());
    fd.append("real_dist", calib.realDist.toString());
    fd.append("pixels_dist", calib.pixelsDist.toString());
    fd.append("hmin", hsv.hMin.toString()); fd.append("hmax", hsv.hMax.toString());
    fd.append("smin", hsv.sMin.toString()); fd.append("smax", hsv.sMax.toString());
    fd.append("vmin", hsv.vMin.toString()); fd.append("vmax", hsv.vMax.toString());

    try {
      const response = await fetch("http://localhost:8000/analyze_stream", {
        method: "POST",
        body: fd
      });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(l => l.trim() !== "");
          for (const line of lines) {
            const data = JSON.parse(line);
            if (data.type === "progress") {
              setLiveLogs(prev => [...prev.slice(-40), data]);
              logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            } else if (data.type === "result") {
              setResults(data.data);
            } else if (data.type === "error") {
              setErrorMsg(data.message);
            }
          }
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al procesar el video");
    }
    setLoading(false);
  };

  // Construccion URls con Timestamp para forzar recarga en react si mueve slider
  const hsvQuery = `filename=${videoInfo?.filename}&frame_idx=${hsvFrame}&hmin=${hsv.hMin}&hmax=${hsv.hMax}&smin=${hsv.sMin}&smax=${hsv.sMax}&vmin=${hsv.vMin}&vmax=${hsv.vMax}`;
  const previewUrl = videoInfo ? `http://localhost:8000/preview?${hsvQuery}` : "";
  const maskUrl = videoInfo ? `http://localhost:8000/mask?${hsvQuery}` : "";

  return (
    <div className="min-h-screen bg-background text-white p-6 font-sans">
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="text-primary w-8 h-8" />
          <h1 className="text-2xl font-bold">Gravedad Tracker</h1>
        </div>
        <div className="md:ml-auto flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {['Subir Video', 'Calibrar (Regla)', 'Filtro HSV', 'Procesar', 'Resultados'].map((s, i) => (
            <div key={s} onClick={() => i + 1 <= step && setStep(i + 1)} className={`shrink-0 cursor-pointer px-4 py-2 text-sm rounded-full border transition-colors ${step === i + 1 ? 'bg-primary border-primary font-semibold' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              {i + 1}. {s}
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">

        {step === 1 && (
          <div className="bg-card border border-white/5 p-12 rounded-2xl flex flex-col items-center justify-center min-h-[500px] text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Paso 1: Seleccionar Video</h2>
            <p className="text-zinc-400 mb-8 max-w-sm">Elige un video de caída libre para analizar. Se recomienda que la cámara esté fija y nivelada.</p>

            <label className="bg-primary hover:bg-primaryHover transition-all text-white px-8 py-4 rounded-xl cursor-pointer font-bold text-lg shadow-lg shadow-primary/20">
              {loading ? "Cargando..." : "Explorar archivos .mov / .mp4"}
              <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={e => {
                if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0])
              }} />
            </label>
            {errorMsg && <p className="text-red-500 mt-4">{errorMsg}</p>}

            {videoInfo && (
              <div className="mt-8 w-full max-w-2xl flex flex-col items-center gap-6 animate-fade-in">
                <h3 className="text-xl font-semibold text-zinc-300">Video Original</h3>
                <video src={`http://localhost:8000/video/${videoInfo.filename}`} controls className="max-h-[50vh] w-full bg-black rounded-lg shadow-xl" />
                <button onClick={() => setStep(2)} className="bg-accent hover:bg-emerald-600 shadow-lg text-white px-8 py-3 rounded-xl font-bold transition-all w-full md:w-auto">
                  Ir al Paso 2: Calibrar
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && videoInfo && (
          <div className="bg-card p-6 md:p-8 border border-white/5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/20 p-2 rounded-lg"><Target className="w-6 h-6 text-accent" /></div>
              <div>
                <h2 className="text-xl font-semibold">Paso 2: Calibración</h2>
                <p className="text-zinc-400 text-sm">Haz click en los DOS EXTREMOS de la regla en la imagen.</p>
              </div>
            </div>

            <div className="relative inline-block border-2 border-zinc-700 bg-black rounded-xl overflow-hidden shadow-2xl">
              <img
                ref={imgRef}
                src={`data:image/jpeg;base64,${videoInfo.first_frame_b64}`}
                onClick={handleImageClick}
                alt="Frame Inicial"
                className="max-h-[60vh] object-contain cursor-crosshair hover:opacity-90 transition-opacity"
              />

              {/* Render Hooks de Calibración */}
              {calib.refPoints.map((p, i) => (
                <div key={i} className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-lg"
                  style={{ left: `${(p.x / imgRef.current!.naturalWidth) * 100}%`, top: `${(p.y / imgRef.current!.naturalHeight) * 100}%` }}>
                  <span className="absolute left-4 -top-2 text-red-500 font-bold drop-shadow-md">P{i + 1}</span>
                </div>
              ))}
              {calib.refPoints.length === 2 && (
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none stroke-red-500 stroke-2 drop-shadow-lg">
                  <line
                    x1={`${(calib.refPoints[0].x / imgRef.current!.naturalWidth) * 100}%`}
                    y1={`${(calib.refPoints[0].y / imgRef.current!.naturalHeight) * 100}%`}
                    x2={`${(calib.refPoints[1].x / imgRef.current!.naturalWidth) * 100}%`}
                    y2={`${(calib.refPoints[1].y / imgRef.current!.naturalHeight) * 100}%`}
                  />
                </svg>
              )}
            </div>

            {calib.refPoints.length === 2 ? (
              <div className="mt-8 flex flex-col md:flex-row items-center gap-6 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Distancia en píxeles:</p>
                  <p className="text-2xl font-mono font-bold text-white">{calib.pixelsDist.toFixed(1)} px</p>
                </div>
                <div className="w-[1px] h-12 bg-zinc-800 hidden md:block"></div>
                <div className="flex-1 w-full md:w-auto">
                  <label className="text-sm text-zinc-400 block mb-2">Ingresa su equivalencia en Metros reales:</label>
                  <input type="number" step="0.1" value={calib.realDist} onChange={e => setCalib({ ...calib, realDist: parseFloat(e.target.value) })} className="bg-black border border-zinc-700 rounded-lg px-4 py-3 w-40 text-lg font-mono outline-none focus:border-accent transition-colors" />
                  <span className="ml-3 text-zinc-500">mts</span>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => setCalib({ ...calib, refPoints: [] })} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-3 rounded-xl transition-colors shrink-0">
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                  <button onClick={() => setStep(3)} className="bg-accent hover:bg-emerald-600 shadow-lg shadow-accent/20 text-white px-8 py-3 rounded-xl font-bold transition-all w-full md:w-auto">
                    Siguiente Paso
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 font-medium">
                ⚠️ Te falta marcar {2 - calib.refPoints.length} punto(s) en la imagen.
              </div>
            )}
          </div>
        )}

        {step === 3 && videoInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-xl h-fit">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-500/20 p-2 rounded-lg"><Sliders className="w-6 h-6 text-orange-500" /></div>
                <div>
                  <h2 className="text-xl font-semibold">Paso 3: Filtro HSV</h2>
                  <p className="text-zinc-400 text-sm">Ajusta los sliders para detectar solo la bola.</p>
                </div>
              </div>

              <div className="mb-8 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <label className="text-sm text-zinc-400 flex justify-between mb-3 font-medium">Frame de prueba: <span className="text-white font-mono bg-black px-2 py-0.5 rounded">{hsvFrame} / {videoInfo.total_frames}</span></label>
                <input type="range" min={0} max={videoInfo.total_frames - 1} value={hsvFrame} onChange={e => setHsvFrame(parseInt(e.target.value))} className="w-full accent-primary" />
              </div>

              <div className="space-y-6">
                {[
                  { id: 'h', label: 'Hue (Matriz)', minK: 'hMin', maxK: 'hMax', maxV: 180, color: 'accent-red-500' },
                  { id: 's', label: 'Sat (Saturación)', minK: 'sMin', maxK: 'sMax', maxV: 255, color: 'accent-green-500' },
                  { id: 'v', label: 'Val (Brillo)', minK: 'vMin', maxK: 'vMax', maxV: 255, color: 'accent-blue-500' }
                ].map((g) => (
                  <div key={g.id} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                    <span className="text-sm text-zinc-400 block mb-3 font-medium">{g.label}</span>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-xs w-8 text-zinc-500">Min</span>
                      <input type="range" min={0} max={g.maxV} value={(hsv as any)[g.minK]} onChange={e => setHsv({ ...hsv, [g.minK]: parseInt(e.target.value) })} className={`flex-1 ${g.color}`} />
                      <span className="w-10 text-right font-mono text-sm bg-black px-2 py-1 rounded">{(hsv as any)[g.minK]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs w-8 text-zinc-500">Max</span>
                      <input type="range" min={0} max={g.maxV} value={(hsv as any)[g.maxK]} onChange={e => setHsv({ ...hsv, [g.maxK]: parseInt(e.target.value) })} className={`flex-1 ${g.color}`} />
                      <span className="w-10 text-right font-mono text-sm bg-black px-2 py-1 rounded">{(hsv as any)[g.maxK]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setStep(4)} className="w-full mt-8 bg-primary hover:bg-primaryHover shadow-lg shadow-primary/20 text-white py-4 rounded-xl font-bold transition-all text-lg">Confirmar HSV</button>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800 flex-1 relative flex items-center justify-center min-h-[300px] shadow-2xl">
                <span className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-zinc-300 z-10">Vista Previa Original</span>
                <img src={previewUrl} className="max-h-full max-w-full object-contain" alt="Original Filtered" />
              </div>
              <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800 flex-1 relative flex items-center justify-center min-h-[300px] shadow-2xl">
                <span className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-zinc-300 z-10">Máscara HSV</span>
                <img src={maskUrl} className="max-h-full max-w-full object-contain" alt="Mask" />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-card p-10 rounded-2xl border border-white/5 max-w-2xl mx-auto text-center mt-12 shadow-2xl relative overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="w-10 h-10 text-primary ml-1" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Paso 4: Procesamiento</h2>
            <p className="text-zinc-400 mb-8">El motor en Python iterará frame por frame buscando el centro de masa de la pelota y aplicará Scipy Curve Fitting automáticamente.</p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="w-full md:w-auto">
                <label className="block text-sm text-zinc-400 mb-2 font-medium">Frame de Inicio</label>
                <input type="number" value={processRange.start} onChange={e => setProcessRange({ ...processRange, start: parseInt(e.target.value) })} className="bg-black border border-zinc-700 rounded-lg px-4 py-3 w-full md:w-32 text-center font-mono text-lg focus:border-primary outline-none" />
              </div>
              <div className="hidden md:block w-8 h-[2px] bg-zinc-700"></div>
              <div className="w-full md:w-auto">
                <label className="block text-sm text-zinc-400 mb-2 font-medium">Frame Fin</label>
                <input type="number" value={processRange.end} onChange={e => setProcessRange({ ...processRange, end: parseInt(e.target.value) })} className="bg-black border border-zinc-700 rounded-lg px-4 py-3 w-full md:w-32 text-center font-mono text-lg focus:border-primary outline-none" />
              </div>
            </div>

            <button onClick={handleAnalyze} disabled={loading} className="w-full bg-primary hover:bg-primaryHover shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-5 rounded-xl flex items-center justify-center gap-3 text-lg transition-all">
              {loading ? <span className="animate-pulse">⏳ Ejecutando iteraciones...</span> : "Iniciar Análisis Científico"}
            </button>

            {results && !loading && (
              <button onClick={() => setStep(5)} className="w-full mt-4 bg-green-600 hover:bg-green-500 shadow-xl shadow-green-500/20 text-white font-bold py-5 rounded-xl flex items-center justify-center gap-3 text-lg transition-all animate-fade-in">
                📊 Ver Resultados del Análisis
              </button>
            )}

            {/* Log de Consola tipo Python */}
            {(liveLogs.length > 0) && (
              <div className="mt-8 bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4 text-left font-mono text-sm max-h-60 overflow-y-auto">
                {liveLogs.map((log, i) => (
                  <div key={i} className="mb-1 text-zinc-400">
                    {log.detected ? (
                      <span>
                        <span className="text-zinc-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-green-400">✅ Bola Detectada</span> » Frame: <span className="text-white">{log.frame}</span> | t=<span className="text-blue-400">{log.t.toFixed(3)}s</span> | y=<span className="text-orange-400">{log.y}px</span>
                      </span>
                    ) : (
                      <span>
                        <span className="text-zinc-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-red-400">❌ NO Detectado</span> » Frame: <span className="text-white">{log.frame}</span>
                      </span>
                    )}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}

            {errorMsg && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-medium">{errorMsg}</div>}

            <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl mt-10 flex flex-col items-center w-full">
              <h3 className="font-semibold text-lg mb-4 text-center">Detecciones Frame por Frame</h3>
              <p className="text-sm text-zinc-400 mb-6 text-center max-w-xl">
                Desliza para ver la detección del objeto individualmente en cualquier parte del video.
              </p>
              <div className="w-full max-w-3xl flex flex-col items-center gap-4">
                <input type="range" min={0} max={videoInfo.total_frames - 1} value={detectionFrame} onChange={e => setDetectionFrame(parseInt(e.target.value))} className="w-full accent-primary" />
                <span className="text-sm font-mono bg-black px-3 py-1 rounded text-zinc-300">Frame: {detectionFrame} / {videoInfo.total_frames - 1}</span>
                <img src={`http://localhost:8000/preview?filename=${videoInfo.filename}&frame_idx=${detectionFrame}&hmin=${hsv.hMin}&hmax=${hsv.hMax}&smin=${hsv.sMin}&smax=${hsv.sMax}&vmin=${hsv.vMin}&vmax=${hsv.vMax}`} className="max-h-[60vh] w-full object-contain bg-black rounded-lg shadow-2xl border border-zinc-800" alt="Frame Detection" />
              </div>
            </div>
          </div>
        )}

        {step === 5 && results && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-500/20 p-2 rounded-lg"><BarChart3 className="w-6 h-6 text-green-500" /></div>
              <div>
                <h2 className="text-2xl font-bold">Paso 5: Resultados</h2>
                <p className="text-zinc-400 text-sm">Cálculo de gravedad por ajuste de curva de caída libre.</p>
              </div>
            </div>

            <div className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-black/40 px-6 py-4 border-b border-white/5">
                <h3 className="font-bold text-lg">Modelo: y = y₀ + v₀t + ½gt²</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-white/5">
                {/* Celda g */}
                <div className="bg-card p-6">
                  <h4 className="text-sm text-zinc-500 mb-1 flex items-center gap-2">🎯 g</h4>
                  <div className="text-xl font-mono font-bold text-primary">{results.g.toFixed(3)} ± {results.g_err.toFixed(3)} <span className="text-sm">m/s²</span></div>
                </div>
                {/* Celda y0 */}
                <div className="bg-card p-6">
                  <h4 className="text-sm text-zinc-500 mb-1 flex items-center gap-2">📐 y₀</h4>
                  <div className="text-lg font-mono font-medium text-zinc-300">{results.y0.toFixed(4)} <span className="text-sm">m</span></div>
                </div>
                {/* Celda v0 */}
                <div className="bg-card p-6">
                  <h4 className="text-sm text-zinc-500 mb-1 flex items-center gap-2">💨 v₀</h4>
                  <div className="text-lg font-mono font-medium text-zinc-300">{results.v0.toFixed(4)} <span className="text-sm">m/s</span></div>
                </div>
                {/* Celda R2 */}
                <div className="bg-card p-6">
                  <h4 className="text-sm text-zinc-500 mb-1 flex items-center gap-2">📈 R²</h4>
                  <div className="text-xl font-mono font-bold text-accent">{(results.r2).toFixed(6)}</div>
                </div>
                {/* Celda Error */}
                <div className="bg-card p-6">
                  <h4 className="text-sm text-zinc-500 mb-1 flex items-center gap-2">⚠️ Error vs 9.8</h4>
                  <div className={`text-xl font-mono font-bold ${Math.abs((results.g - 9.8) / 9.8) > 0.05 ? 'text-orange-500' : 'text-accent'}`}>{(((Math.abs(results.g - 9.8)) / 9.8) * 100).toFixed(2)}%</div>
                </div>
                {/* Celda Puntos */}
                <div className="bg-card p-6">
                  <h4 className="text-sm text-zinc-500 mb-1 flex items-center gap-2">📊 Puntos</h4>
                  <div className="text-lg font-mono font-medium text-zinc-300">{results.points} detectados</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
              <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
                <h3 className="font-semibold text-lg mb-4 text-center">Gráfica de Regresión (Posición vs Tiempo)</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis type="number" dataKey="time" name="t (s)" stroke="#71717a" domain={['auto', 'auto']} >
                      <Label value="t (s)" offset={0} position="bottom" fill="#71717a" />
                    </XAxis>
                    <YAxis type="number" dataKey="y_raw" name="y (m)" stroke="#71717a" domain={['auto', 'auto']} reversed >
                      <Label value="y (m) ↓" angle={-90} position="insideLeft" fill="#71717a" />
                    </YAxis>
                    <ZAxis type="number" range={[15, 15]} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                    <Scatter name="Datos" data={results.times.map((t: any, i: any) => ({ time: t, y_raw: results.y_meters[i], y_fit: results.y_fit[i] }))} fill="#71717a" />
                    <Scatter name={`g=${results.g.toFixed(3)}`} data={results.times.map((t: any, i: any) => ({ time: t, y_raw: results.y_meters[i], y_fit: results.y_fit[i] }))} dataKey="y_fit" fill="none" opacity={1} line={{ stroke: '#6366f1', strokeWidth: 3 }} shape={() => null} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col mb-10 pb-10">
                <h3 className="font-semibold text-lg mb-4 text-center">Residuos (R²={(results.r2).toFixed(4)})</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis type="number" dataKey="time" stroke="#71717a" domain={['auto', 'auto']}>
                      <Label value="t (s)" offset={0} position="bottom" fill="#71717a" />
                    </XAxis>
                    <YAxis type="number" dataKey="residuo" stroke="#71717a">
                      <Label value="Residuos (cm)" angle={-90} position="insideLeft" fill="#71717a" />
                    </YAxis>
                    <ZAxis type="number" range={[8, 8]} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                    <Scatter data={results.times.map((t: any, i: any) => ({ time: t, residuo: (results.y_meters[i] - results.y_fit[i]) * 100 }))} fill="#0ea5e9" />
                    {/* Add a simple line for zero directly using recharts reference line approach if needed, or trick it: */}
                    <Scatter data={[{ time: results.times[0], zero: 0 }, { time: results.times[results.times.length - 1], zero: 0 }]} dataKey="zero" line={{ stroke: '#ef4444', strokeDasharray: "5 5", strokeWidth: 2 }} shape={() => null} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}

// Support for labels without extra imports in recharts
export default App;
