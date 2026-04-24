import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Activity, Sliders, Play, ChevronRight, CheckCircle2, AlertCircle, Timer } from 'lucide-react';
import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Label } from 'recharts';

function App() {
  const [step, setStep] = useState(1);
  const [_file, setFile] = useState<File | null>(null);
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

  const steps = [
    { id: 1, label: 'Subir Video', icon: Upload },
    { id: 2, label: 'Filtro HSV', icon: Sliders },
    { id: 3, label: 'Configuración', icon: Play },
    { id: 4, label: 'Análisis', icon: Activity },
  ];

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
  const previewUrl = videoInfo ? `http://localhost:8003/preview?${hsvQuery}` : "";
  const maskUrl = videoInfo ? `http://localhost:8003/mask?${hsvQuery}` : "";

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
            <Timer className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight accent-gradient-text">Péndulo Simple</h1>
            <p className="text-zinc-500 font-medium">Análisis de oscilaciones y periodo por visión artificial</p>
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
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
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
            <div className="w-24 h-24 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-8 border border-purple-500/20 group hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-purple-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Analizar Oscilaciones</h2>
            <p className="text-zinc-400 mb-10 max-w-sm text-center leading-relaxed">
              Sube un video de un péndulo oscilando para calcular su periodo y la gravedad local automáticamente.
            </p>
            
            <label className="relative overflow-hidden group">
              <input 
                type="file" 
                accept="video/mp4,video/quicktime" 
                className="hidden" 
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} 
              />
              <div className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-5 rounded-2xl cursor-pointer font-bold text-lg shadow-2xl shadow-purple-600/20 transition-all flex items-center gap-3">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Cargando video...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Seleccionar Video</span>
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
                    Video detectado correctamente
                  </h3>
                  <button onClick={() => setStep(2)} className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 group">
                    Ir al filtro HSV <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl">
                  <video src={`http://localhost:8003/video/${videoInfo.filename}`} controls className="w-full" />
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
                  <h2 className="text-xl font-bold">Segmentación HSV</h2>
                  <p className="text-zinc-500 text-sm font-medium">Detectar la masa del péndulo</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-zinc-400">Frame de Referencia</label>
                    <span className="text-xs font-mono bg-black/50 px-2 py-1 rounded-lg text-purple-400">
                      {hsvFrame} / {videoInfo.total_frames}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={videoInfo.total_frames - 1} 
                    value={hsvFrame} 
                    onChange={e => setHsvFrame(parseInt(e.target.value))} 
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div className="grid gap-6">
                  {[
                    { id: 'h', label: 'Matiz (Hue)', minK: 'hMin', maxK: 'hMax', maxV: 180, color: 'accent-purple-500' },
                    { id: 's', label: 'Saturación', minK: 'sMin', maxK: 'sMax', maxV: 255, color: 'accent-purple-500' },
                    { id: 'v', label: 'Brillo (Value)', minK: 'vMin', maxK: 'vMax', maxV: 255, color: 'accent-purple-500' }
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
                            className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500" 
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
                            className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500" 
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
                Configurar Parámetros
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-8 h-fit">
              <div className="glass-panel overflow-hidden relative flex items-center justify-center min-h-[400px]">
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-10">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Original</span>
                </div>
                <img src={previewUrl} className="max-h-[500px] w-full object-contain" alt="Original Preview" />
              </div>
              <div className="glass-panel overflow-hidden relative flex items-center justify-center min-h-[400px]">
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-10">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Máscara de detección</span>
                </div>
                <img src={maskUrl} className="max-h-[500px] w-full object-contain" alt="Mask Preview" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Process Config */}
        {step === 3 && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="glass-panel p-12 text-center relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-24 h-24 bg-purple-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-purple-600/20">
                  <Play className="w-10 h-10 text-purple-600 ml-1" />
                </div>
                <h2 className="text-4xl font-bold mb-4 tracking-tight">Análisis de Oscilaciones</h2>
                <p className="text-zinc-500 mb-12 text-lg font-medium">
                  Define los parámetros físicos para el cálculo de la gravedad.
                </p>
                
                <div className="flex flex-col gap-8 mb-12 p-10 bg-black/40 rounded-3xl border border-white/5 items-center">
                  <div className="w-full max-w-sm">
                    <label className="block text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest text-center">Longitud del Péndulo (m)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={length} 
                      onChange={e => setLength(e.target.value)} 
                      className="bg-zinc-900 border border-white/10 focus:border-purple-500/50 rounded-2xl px-6 py-5 w-full text-center text-3xl outline-none transition-all font-mono text-purple-400 font-bold" 
                    />
                  </div>
                  
                  <div className="w-full grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest text-left">Frame Inicio</label>
                      <input 
                        type="number" 
                        value={processRange.start} 
                        onChange={e => setProcessRange({ ...processRange, start: parseInt(e.target.value) })} 
                        className="bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 w-full text-center text-xl outline-none font-mono" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest text-left">Frame Fin</label>
                      <input 
                        type="number" 
                        value={processRange.end} 
                        onChange={e => setProcessRange({ ...processRange, end: parseInt(e.target.value) })} 
                        className="bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 w-full text-center text-xl outline-none font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAnalyze} 
                  disabled={loading} 
                  className={`w-full py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl ${
                    loading ? 'bg-zinc-800 cursor-wait' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20 active:scale-95'
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Analizando Dinámica...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-6 h-6" />
                        <span>Iniciar Procesamiento</span>
                      </>
                    )}
                  </div>
                </button>

                {liveLogs.length > 0 && (
                  <div className="mt-12 bg-black rounded-2xl border border-white/5 p-6 text-left shadow-inner">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Tracking Logs</span>
                      <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    </div>
                    <div className="font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                      {liveLogs.map((log, i) => (
                        <div key={i} className="flex gap-3 mb-1">
                          <span className="text-zinc-700">[{log.frame}]</span>
                          {log.detected ? (
                            <span className="text-purple-400">POS_X: {log.x}px | ANGLE: {log.theta?.toFixed(3)} rad</span>
                          ) : (
                            <span className="text-zinc-600">LOST_TRACK...</span>
                          )}
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                )}
                {errorMsg && <div className="mt-8 p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 text-sm font-bold">{errorMsg}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && results && (
          <div className="space-y-8 animate-fade-in">
            {/* Main Result Card */}
            <div className="glass-panel overflow-hidden border border-purple-500/20">
              <div className="bg-purple-600/10 px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl">Cinemática del Péndulo</h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Estimación de Gravedad Local</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-500 block">Longitud (L)</span>
                  <span className="text-lg font-mono font-bold text-purple-400">{length} m</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-[1px] bg-white/5">
                {[
                  { label: 'Periodo (T) Promedio', value: results.avg_T.toFixed(4), unit: 's', color: 'text-purple-500', size: 'text-4xl' },
                  { label: 'Gravedad (g)', value: results.g_est.toFixed(3), unit: 'm/s²', color: 'text-emerald-500', size: 'text-4xl' },
                  { label: 'T (Cruces por 0)', value: results.T_zero_crossing.toFixed(4), unit: 's', color: 'text-zinc-300', size: 'text-xl' },
                  { label: 'T (Picos)', value: results.T_peaks.toFixed(4), unit: 's', color: 'text-zinc-300', size: 'text-xl' },
                  { label: 'Amortiguamiento', value: results.gamma.toFixed(4), unit: 's⁻¹', color: 'text-orange-400', size: 'text-xl' },
                ].map((item, i) => (
                  <div key={i} className="bg-zinc-900/40 p-8">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">{item.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-mono font-bold tracking-tighter ${item.size} ${item.color}`}>{item.value}</span>
                      <span className="text-[10px] text-zinc-600 font-bold uppercase">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Angle Chart */}
              <div className="glass-panel p-8 h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold">Posición Angular (θ)</h3>
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Activity className="w-4 h-4 text-purple-500" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="80%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis type="number" dataKey="time" stroke="#52525b" tick={{ fontSize: 10 }}>
                      <Label value="TIEMPO (S)" offset={-10} position="insideBottom" fill="#52525b" style={{ fontSize: '9px', fontWeight: 800 }} />
                    </XAxis>
                    <YAxis type="number" dataKey="theta" stroke="#52525b" tick={{ fontSize: 10 }}>
                      <Label value="ÁNGULO (RAD)" angle={-90} position="insideLeft" fill="#52525b" style={{ fontSize: '9px', fontWeight: 800 }} />
                    </YAxis>
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                    <Scatter name="Trayectoria" data={results.times.map((t: any, i: any) => ({ time: t, theta: results.theta[i] }))} fill="#a78bfa" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* FFT Chart */}
              <div className="glass-panel p-8 h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold">Dominio de Frecuencia (FFT)</h3>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="80%">
                  <LineChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }} data={results.freqs.map((f: any, i: any) => ({ freq: f, power: results.power[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis type="number" dataKey="freq" stroke="#52525b" tick={{ fontSize: 10 }} domain={[0, 5]}>
                      <Label value="FRECUENCIA (HZ)" offset={-10} position="insideBottom" fill="#52525b" style={{ fontSize: '9px', fontWeight: 800 }} />
                    </XAxis>
                    <YAxis type="number" dataKey="power" stroke="#52525b" tick={{ fontSize: 10 }}>
                      <Label value="AMPLITUD" angle={-90} position="insideLeft" fill="#52525b" style={{ fontSize: '9px', fontWeight: 800 }} />
                    </YAxis>
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="power" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <button 
              onClick={() => setStep(1)} 
              className="w-full py-5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-2xl font-bold transition-all border border-white/5 flex items-center justify-center gap-2"
            >
              <Timer className="w-5 h-5" />
              Realizar nuevo experimento
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
