import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Activity, Sliders, Play, BarChart3 } from 'lucide-react';
import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Label } from 'recharts';

function App() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [hsvFrame, setHsvFrame] = useState(0);
  const [hsv, setHsv] = useState({ hMin: 0, hMax: 25, sMin: 100, sMax: 255, vMin: 100, vMax: 255 });

  const [processRange, setProcessRange] = useState({ start: 0, end: 0 });
  const [length, setLength] = useState("1.0");
  const [results, setResults] = useState<any>(null);

  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 1. Upload Video
  const handleUpload = async (file: File) => {
    setLoading(true);
    setFile(file);
    const fd = new FormData();
    fd.append("video", file);
    try {
      const { data } = await axios.post("http://localhost:8003/upload", fd);
      setVideoInfo(data);
      setHsvFrame(Math.floor(data.total_frames / 2));
      setProcessRange({ start: 0, end: data.total_frames });
      setStep(2);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al subir video");
    }
    setLoading(false);
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
    fd.append("length", length);
    fd.append("hmin", hsv.hMin.toString()); fd.append("hmax", hsv.hMax.toString());
    fd.append("smin", hsv.sMin.toString()); fd.append("smax", hsv.sMax.toString());
    fd.append("vmin", hsv.vMin.toString()); fd.append("vmax", hsv.vMax.toString());

    try {
      const response = await fetch("http://localhost:8003/analyze_stream", {
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

  const hsvQuery = `filename=${videoInfo?.filename}&frame_idx=${hsvFrame}&hmin=${hsv.hMin}&hmax=${hsv.hMax}&smin=${hsv.sMin}&smax=${hsv.sMax}&vmin=${hsv.vMin}&vmax=${hsv.vMax}`;
  const previewUrl = videoInfo ? `http://localhost:8003/preview?${hsvQuery}` : "";
  const maskUrl = videoInfo ? `http://localhost:8003/mask?${hsvQuery}` : "";

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans">
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="text-purple-500 w-8 h-8" />
          <h1 className="text-2xl font-bold">Péndulo Simple</h1>
        </div>
        <div className="md:ml-auto flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {['Subir Video', 'Filtro HSV', 'Procesar', 'Resultados'].map((s, i) => (
            <div key={s} onClick={() => i + 1 <= step && setStep(i + 1)} className={`shrink-0 cursor-pointer px-4 py-2 text-sm rounded-full border transition-colors ${step === i + 1 ? 'bg-purple-600 border-purple-600 font-semibold' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              {i + 1}. {s}
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {step === 1 && (
          <div className="bg-zinc-900 border border-white/5 p-12 rounded-2xl flex flex-col items-center justify-center min-h-[500px] text-center shadow-xl">
            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Paso 1: Seleccionar Video</h2>
            <p className="text-zinc-400 mb-8 max-w-sm">Elige un video de un péndulo oscilando.</p>
            <label className="bg-purple-600 hover:bg-purple-500 transition-all text-white px-8 py-4 rounded-xl cursor-pointer font-bold text-lg shadow-lg">
              {loading ? "Cargando..." : "Explorar archivos"}
              <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={e => {
                if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0])
              }} />
            </label>
            {errorMsg && <p className="text-red-500 mt-4">{errorMsg}</p>}
          </div>
        )}

        {step === 2 && videoInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-zinc-900 p-6 md:p-8 rounded-2xl border border-white/5 shadow-xl h-fit">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-500/20 p-2 rounded-lg"><Sliders className="w-6 h-6 text-orange-500" /></div>
                <div>
                  <h2 className="text-xl font-semibold">Paso 2: Filtro HSV</h2>
                  <p className="text-zinc-400 text-sm">Ajusta los sliders para detectar la masa.</p>
                </div>
              </div>
              <div className="mb-8 p-4 bg-black/50 rounded-xl border border-zinc-800">
                <label className="text-sm text-zinc-400 flex justify-between mb-3 font-medium">Frame de prueba: <span className="text-white bg-black px-2 py-0.5 rounded">{hsvFrame} / {videoInfo.total_frames}</span></label>
                <input type="range" min={0} max={videoInfo.total_frames - 1} value={hsvFrame} onChange={e => setHsvFrame(parseInt(e.target.value))} className="w-full accent-purple-500" />
              </div>
              <div className="space-y-6">
                {[
                  { id: 'h', label: 'Hue (Matriz)', minK: 'hMin', maxK: 'hMax', maxV: 180, color: 'accent-red-500' },
                  { id: 's', label: 'Sat (Saturación)', minK: 'sMin', maxK: 'sMax', maxV: 255, color: 'accent-green-500' },
                  { id: 'v', label: 'Val (Brillo)', minK: 'vMin', maxK: 'vMax', maxV: 255, color: 'accent-blue-500' }
                ].map((g) => (
                  <div key={g.id} className="bg-black/50 p-4 rounded-xl border border-zinc-800">
                    <span className="text-sm text-zinc-400 block mb-3 font-medium">{g.label}</span>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-xs w-8 text-zinc-500">Min</span>
                      <input type="range" min={0} max={g.maxV} value={(hsv as any)[g.minK]} onChange={e => setHsv({ ...hsv, [g.minK]: parseInt(e.target.value) })} className={`flex-1 ${g.color}`} />
                      <span className="w-10 text-right text-sm bg-black px-2 py-1 rounded">{(hsv as any)[g.minK]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs w-8 text-zinc-500">Max</span>
                      <input type="range" min={0} max={g.maxV} value={(hsv as any)[g.maxK]} onChange={e => setHsv({ ...hsv, [g.maxK]: parseInt(e.target.value) })} className={`flex-1 ${g.color}`} />
                      <span className="w-10 text-right text-sm bg-black px-2 py-1 rounded">{(hsv as any)[g.maxK]}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(3)} className="w-full mt-8 bg-purple-600 hover:bg-purple-500 shadow-lg text-white py-4 rounded-xl font-bold transition-all text-lg">Confirmar HSV</button>
            </div>
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800 flex-1 relative flex items-center justify-center min-h-[300px] shadow-xl">
                <span className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold z-10">Original</span>
                <img src={previewUrl} className="max-h-full max-w-full object-contain" alt="Original Filtered" />
              </div>
              <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800 flex-1 relative flex items-center justify-center min-h-[300px] shadow-xl">
                <span className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold z-10">Máscara HSV</span>
                <img src={maskUrl} className="max-h-full max-w-full object-contain" alt="Mask" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-zinc-900 p-10 rounded-2xl border border-white/5 max-w-2xl mx-auto text-center mt-12 shadow-xl relative overflow-hidden">
            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="w-10 h-10 text-purple-500 ml-1" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Paso 3: Procesamiento</h2>
            <p className="text-zinc-400 mb-8">El motor analizará las oscilaciones de la masa automáticamente con OpenCV y SciPy.</p>
            
            <div className="flex flex-col gap-6 mb-10 p-6 bg-black/50 rounded-xl justify-center items-center">
              <div className="w-full max-w-xs">
                <label className="block text-sm text-zinc-400 mb-2 font-medium">Longitud del Péndulo (L) en metros</label>
                <input type="number" step="0.01" value={length} onChange={e => setLength(e.target.value)} className="bg-black border border-zinc-700 rounded-lg px-4 py-3 w-full text-center text-lg outline-none text-purple-400 font-mono" />
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2 font-medium">Frame de Inicio</label>
                  <input type="number" value={processRange.start} onChange={e => setProcessRange({ ...processRange, start: parseInt(e.target.value) })} className="bg-black border border-zinc-700 rounded-lg px-4 py-3 w-32 text-center text-lg outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2 font-medium">Frame Fin</label>
                  <input type="number" value={processRange.end} onChange={e => setProcessRange({ ...processRange, end: parseInt(e.target.value) })} className="bg-black border border-zinc-700 rounded-lg px-4 py-3 w-32 text-center text-lg outline-none" />
                </div>
              </div>
            </div>

            <button onClick={handleAnalyze} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 shadow-xl disabled:opacity-50 text-white font-bold py-5 rounded-xl text-lg transition-all">
              {loading ? "⏳ Analizando frames y espectro FFT..." : "Iniciar Análisis"}
            </button>
            {results && !loading && (
              <button onClick={() => setStep(4)} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 shadow-xl text-white font-bold py-5 rounded-xl text-lg transition-all">
                📊 Ver Resultados
              </button>
            )}
            {(liveLogs.length > 0) && (
              <div className="mt-8 bg-black border border-zinc-800 rounded-xl p-4 text-left font-mono text-sm max-h-60 overflow-y-auto">
                {liveLogs.map((log, i) => (
                  <div key={i} className="mb-1 text-zinc-400">
                    {log.detected ? `✅ Masa Detectada » Frame: ${log.frame} | x=${log.x}px` : `❌ NO Detectado » Frame: ${log.frame}`}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
            {errorMsg && <div className="mt-6 p-4 bg-red-500/10 text-red-500 rounded-xl">{errorMsg}</div>}
          </div>
        )}

        {step === 4 && results && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-black/40 px-6 py-4 border-b border-white/5">
                <h3 className="font-bold text-lg">Estimación de Periodo y Gravedad</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-white/5">
                <div className="bg-zinc-900 p-6">
                  <h4 className="text-sm text-zinc-500 mb-1">⏱️ Periodo (T) Promedio</h4>
                  <div className="text-3xl font-mono font-bold text-purple-500">{results.avg_T.toFixed(4)}s</div>
                </div>
                <div className="bg-zinc-900 p-6">
                  <h4 className="text-sm text-zinc-500 mb-1">🎯 Gravedad Estimada (g)</h4>
                  <div className="text-3xl font-mono font-bold text-emerald-500">{results.g_est.toFixed(3)}</div>
                  <div className="text-xs text-zinc-400 mt-1">m/s²</div>
                </div>
                <div className="bg-zinc-900 p-6">
                  <h4 className="text-sm text-zinc-500 mb-1">Frecuencia Pico (FFT)</h4>
                  <div className="text-lg font-mono text-zinc-300">{results.f0.toFixed(4)} Hz</div>
                </div>
                <div className="bg-zinc-900 p-6">
                  <h4 className="text-sm text-zinc-500 mb-1">Total frames trackeados</h4>
                  <div className="text-lg font-mono text-zinc-300">{results.points}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 shadow-xl h-[400px]">
                <h3 className="font-semibold text-lg mb-4 text-center">Posición X vs Tiempo</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis type="number" dataKey="time" stroke="#71717a" domain={['auto', 'auto']}>
                      <Label value="Tiempo (s)" offset={0} position="bottom" fill="#71717a" />
                    </XAxis>
                    <YAxis type="number" dataKey="x" stroke="#71717a" domain={['auto', 'auto']}>
                      <Label value="Posición X (px)" angle={-90} position="insideLeft" fill="#71717a" />
                    </YAxis>
                    <ZAxis type="number" range={[15, 15]} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                    <Scatter name="Trayectoria" data={results.times.map((t: any, i: any) => ({ time: t, x: results.x_positions[i] }))} fill="#a855f7" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 shadow-xl h-[400px]">
                <h3 className="font-semibold text-lg mb-4 text-center">Espectro de Frecuencia (FFT)</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }} data={results.freqs.map((f: any, i: any) => ({ freq: f, power: results.power[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis type="number" dataKey="freq" stroke="#71717a" domain={[0, 5]}>
                      <Label value="Frecuencia (Hz)" offset={0} position="bottom" fill="#71717a" />
                    </XAxis>
                    <YAxis type="number" dataKey="power" stroke="#71717a">
                      <Label value="Amplitud" angle={-90} position="insideLeft" fill="#71717a" />
                    </YAxis>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                    <Line type="monotone" dataKey="power" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

