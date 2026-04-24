import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Activity, Sliders, Play, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Label } from 'recharts';

function App() {
  const [step, setStep] = useState(1);
  const [_file, setFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [hsvFrame, setHsvFrame] = useState(0);
  const [hsv, setHsv] = useState({ hMin: 0, hMax: 25, sMin: 100, sMax: 255, vMin: 100, vMax: 255 });

  const [processRange, setProcessRange] = useState({ start: 0, end: 0 });
  const [_detectionFrame, setDetectionFrame] = useState(0);
  const [results, setResults] = useState<any>(null);

  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const steps = [
    { id: 1, label: 'Subir Video', icon: Upload },
    { id: 2, label: 'Filtro HSV', icon: Sliders },
    { id: 3, label: 'Procesar', icon: Play },
    { id: 4, label: 'Resultados', icon: Activity },
  ];

  const handleUpload = async (file: File) => {
    setLoading(true);
    setFile(file);
    const fd = new FormData();
    fd.append("video", file);
    try {
      const { data } = await axios.post("http://localhost:8002/upload", fd);
      setVideoInfo(data);
      setHsvFrame(Math.floor(data.total_frames / 2));
      setDetectionFrame(0);
      setProcessRange({ start: 0, end: data.total_frames });
      setStep(2);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al subir video");
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setErrorMsg("");
    setLiveLogs([]);
    const fd = new FormData();
    fd.append("filename", videoInfo.filename);
    fd.append("start_frame", processRange.start.toString());
    fd.append("end_frame", processRange.end.toString());
    fd.append("hmin", hsv.hMin.toString()); fd.append("hmax", hsv.hMax.toString());
    fd.append("smin", hsv.sMin.toString()); fd.append("smax", hsv.sMax.toString());
    fd.append("vmin", hsv.vMin.toString()); fd.append("vmax", hsv.vMax.toString());

    try {
      const response = await fetch("http://localhost:8002/analyze_stream", {
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
              setStep(4);
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
  const previewUrl = videoInfo ? `http://localhost:8002/preview?${hsvQuery}` : "";
  const maskUrl = videoInfo ? `http://localhost:8002/mask?${hsvQuery}` : "";

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight accent-gradient-text">Coeficiente de Restitución</h1>
            <p className="text-zinc-500 font-medium">Análisis de impacto y elasticidad con visión artificial</p>
          </div>
        </div>

        {/* Stepper */}
        <nav className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-2xl border border-white/5">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => (videoInfo || i === 0) && setStep(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  step === s.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <s.icon className={`w-4 h-4 ${step === s.id ? 'text-white' : ''}`} />
                <span className="text-sm font-semibold hidden lg:block">{s.label}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-zinc-700 mx-1 hidden lg:block" />}
            </div>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="glass-panel p-12 flex flex-col items-center justify-center min-h-[500px] animate-fade-in">
            <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-8 border border-blue-500/20 group hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-blue-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Comenzar Análisis</h2>
            <p className="text-zinc-400 mb-10 max-w-sm text-center leading-relaxed">
              Sube un video de una pelota en caída libre para calcular su coeficiente de restitución automáticamente.
            </p>
            
            <label className="relative overflow-hidden group">
              <input 
                type="file" 
                accept="video/mp4,video/quicktime" 
                className="hidden" 
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} 
              />
              <div className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl cursor-pointer font-bold text-lg shadow-2xl shadow-blue-600/20 transition-all flex items-center gap-3">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Seleccionar Archivo</span>
                  </>
                )}
              </div>
            </label>

            {errorMsg && (
              <div className="mt-8 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{errorMsg}</span>
              </div>
            )}
            
            {videoInfo && !loading && (
              <div className="mt-12 w-full max-w-3xl animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Video cargado con éxito
                  </h3>
                  <button onClick={() => setStep(2)} className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 group">
                    Continuar al filtro <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl">
                  <video src={`http://localhost:8002/video/${videoInfo.filename}`} controls className="w-full" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: HSV Filter */}
        {step === 2 && videoInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            <div className="lg:col-span-5 glass-panel p-8 h-fit">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <Sliders className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Configuración de Visión</h2>
                  <p className="text-zinc-500 text-sm font-medium">Aislar el objeto del fondo</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-zinc-400">Selección de Frame</label>
                    <span className="text-xs font-mono bg-black/50 px-2 py-1 rounded-lg text-blue-400">
                      {hsvFrame} / {videoInfo.total_frames}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={videoInfo.total_frames - 1} 
                    value={hsvFrame} 
                    onChange={e => setHsvFrame(parseInt(e.target.value))} 
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="grid gap-6">
                  {[
                    { id: 'h', label: 'Matiz (Hue)', minK: 'hMin', maxK: 'hMax', maxV: 180, color: 'accent-blue-500' },
                    { id: 's', label: 'Saturación', minK: 'sMin', maxK: 'sMax', maxV: 255, color: 'accent-blue-500' },
                    { id: 'v', label: 'Brillo (Value)', minK: 'vMin', maxK: 'vMax', maxV: 255, color: 'accent-blue-500' }
                  ].map((g) => (
                    <div key={g.id} className="bg-white/5 p-5 rounded-2xl border border-white/5">
                      <label className="text-sm font-bold text-zinc-400 block mb-6">{g.label}</label>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-zinc-600 uppercase w-8">Min</span>
                          <input 
                            type="range" 
                            min={0} 
                            max={g.maxV} 
                            value={(hsv as any)[g.minK]} 
                            onChange={e => setHsv({ ...hsv, [g.minK]: parseInt(e.target.value) })} 
                            className={`flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${g.color}`} 
                          />
                          <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded-md min-w-[32px] text-center">{(hsv as any)[g.minK]}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-zinc-600 uppercase w-8">Max</span>
                          <input 
                            type="range" 
                            min={0} 
                            max={g.maxV} 
                            value={(hsv as any)[g.maxK]} 
                            onChange={e => setHsv({ ...hsv, [g.maxK]: parseInt(e.target.value) })} 
                            className={`flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${g.color}`} 
                          />
                          <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded-md min-w-[32px] text-center">{(hsv as any)[g.maxK]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setStep(3)} 
                className="w-full mt-10 bg-white/10 hover:bg-white/20 text-white py-5 rounded-2xl font-bold transition-all border border-white/10"
              >
                Confirmar y Continuar
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-8 h-fit">
              <div className="glass-panel overflow-hidden relative flex items-center justify-center min-h-[400px] group">
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-10">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Preview Original</span>
                </div>
                <img src={previewUrl} className="max-h-[500px] w-full object-contain" alt="Original Preview" />
              </div>
              <div className="glass-panel overflow-hidden relative flex items-center justify-center min-h-[400px] group">
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-10">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mascara Binaria</span>
                </div>
                <img src={maskUrl} className="max-h-[500px] w-full object-contain" alt="Mask Preview" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Process */}
        {step === 3 && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="glass-panel p-12 text-center relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-24 h-24 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-600/20">
                  <Play className="w-10 h-10 text-blue-600 ml-1" />
                </div>
                <h2 className="text-4xl font-bold mb-4 italic tracking-tight">Procesar Trayectoria</h2>
                <p className="text-zinc-500 mb-12 text-lg font-medium leading-relaxed">
                  El motor de visión trackeará la pelota frame por frame y calculará los puntos de rebote.
                </p>
                
                <div className="flex flex-col md:flex-row gap-6 mb-12 p-8 bg-black/40 rounded-3xl border border-white/5 items-center justify-center">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest text-left ml-1">Rango Inicial</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={processRange.start} 
                        onChange={e => setProcessRange({ ...processRange, start: parseInt(e.target.value) })} 
                        className="bg-zinc-900 border border-white/5 group-hover:border-white/10 rounded-2xl px-6 py-4 w-full text-center text-xl outline-none transition-all font-mono" 
                      />
                    </div>
                  </div>
                  <div className="w-8 h-[1px] bg-zinc-800 hidden md:block mt-6" />
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest text-left ml-1">Rango Final</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={processRange.end} 
                        onChange={e => setProcessRange({ ...processRange, end: parseInt(e.target.value) })} 
                        className="bg-zinc-900 border border-white/5 group-hover:border-white/10 rounded-2xl px-6 py-4 w-full text-center text-xl outline-none transition-all font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAnalyze} 
                  disabled={loading} 
                  className={`w-full py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl relative overflow-hidden group ${
                    loading ? 'bg-zinc-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 active:scale-95'
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 fill-current" />
                        <span>Iniciar Análisis</span>
                      </>
                    )}
                  </div>
                </button>

                {liveLogs.length > 0 && (
                  <div className="mt-12 bg-black rounded-2xl border border-white/5 p-6 text-left overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Logs en tiempo real</span>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                      </div>
                    </div>
                    <div className="font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                      {liveLogs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-zinc-700">[{log.frame.toString().padStart(4, '0')}]</span>
                          {log.detected ? (
                            <span className="text-emerald-500/80">OBJ_DETECTED at Y: {log.y}px</span>
                          ) : (
                            <span className="text-zinc-600">NULL_SEARCHING...</span>
                          )}
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && results && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Stats */}
            <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
              {[
                { label: 'Promedio (e)', value: results.e_avg.toFixed(3), color: 'text-blue-500', unit: 'coeff' },
                { label: 'Desviación', value: '±' + results.e_std.toFixed(3), color: 'text-zinc-300', unit: 'std' },
                { label: 'Rebotes', value: results.e_values.length, color: 'text-emerald-500', unit: 'detectados' },
                { label: 'Data Points', value: results.points, color: 'text-orange-500', unit: 'frames' },
              ].map((stat, i) => (
                <div key={i} className="glass-panel p-8 group hover:border-white/20 transition-all">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold font-mono tracking-tighter ${stat.color}`}>{stat.value}</span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">{stat.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Chart */}
            <div className="lg:col-span-8 glass-panel p-8 h-[550px] relative">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold">Curva de Rebotes</h3>
                  <p className="text-sm text-zinc-500 font-medium">Altura vs Tiempo (Normalizada)</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Trayectoria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Impactos</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    type="number" 
                    dataKey="time" 
                    stroke="#52525b" 
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                  >
                    <Label value="Tiempo (s)" offset={-20} position="insideBottom" fill="#71717a" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }} />
                  </XAxis>
                  <YAxis 
                    type="number" 
                    dataKey="h" 
                    stroke="#52525b" 
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                  >
                    <Label value="Altura (px)" angle={-90} position="insideLeft" offset={-10} fill="#71717a" style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }} />
                  </YAxis>
                  <ZAxis type="number" range={[15, 60]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Scatter 
                    name="Trayectoria" 
                    data={results.times.map((t: any, i: any) => ({ time: t, h: results.heights[i] }))} 
                    fill="#3b82f6" 
                    line={{ stroke: '#3b82f6', strokeWidth: 1.5, opacity: 0.6 }} 
                  />
                  <Scatter 
                    name="Picos Detectados" 
                    data={results.peak_times.map((t: any, i: any) => ({ time: t, h: results.peak_heights[i] }))} 
                    fill="#ef4444" 
                    shape="star" 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* List of values */}
            <div className="lg:col-span-4 glass-panel p-8 h-[550px] flex flex-col">
              <h3 className="text-xl font-bold mb-6">Valores de 'e'</h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {results.e_values.map((v: number, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-zinc-400 uppercase tracking-tighter">Impacto</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-blue-400">{v.toFixed(4)}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setStep(1)} 
                className="w-full mt-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold transition-all border border-white/5"
              >
                Nuevo Análisis
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
