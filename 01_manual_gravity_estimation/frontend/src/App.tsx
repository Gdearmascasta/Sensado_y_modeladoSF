import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ZAxis, ResponsiveContainer, ComposedChart } from 'recharts'
import { Plus, Trash2, Calculator, Activity, ArrowRight } from 'lucide-react'
import axios from 'axios'
import './index.css'

interface DataPoint {
  t: number | string
  y: number | string
}

function App() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([
    { t: 0.662, y: 2.3 },
    { t: 0.63, y: 2.2 },
    { t: 0.568, y: 2.1 },
    { t: 0.482, y: 2.0 },
    { t: 0.466, y: 1.9 },
    { t: 0.406, y: 1.8 },
  ])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleAddPoint = () => {
    setDataPoints([...dataPoints, { t: '', y: '' }])
  }

  const handleRemovePoint = (index: number) => {
    const newPoints = [...dataPoints]
    newPoints.splice(index, 1)
    setDataPoints(newPoints)
  }

  const handleChange = (index: number, field: 't' | 'y', value: string) => {
    const newPoints = [...dataPoints]
    newPoints[index][field] = value === '' ? '' : Number(value)
    setDataPoints(newPoints)
  }

  const handleEstimate = async () => {
    const validPoints = dataPoints.filter(p => p.t !== '' && p.y !== '' && !isNaN(Number(p.t)) && !isNaN(Number(p.y)))
    if (validPoints.length < 2) {
      alert("Need at least 2 valid points")
      return
    }

    setLoading(true)
    try {
      const payload = {
        t: validPoints.map(p => Number(p.t)),
        y: validPoints.map(p => Number(p.y))
      }
      
      const res = await axios.post('http://localhost:8001/estimate', payload)
      if (res.data.error) {
        alert("Error: " + res.data.error)
      } else {
        setResult({
          g: res.data.g,
          points: validPoints,
          fit_t: res.data.fit_t,
          fit_y: res.data.fit_y
        })
      }
    } catch (e) {
      alert("Error estimating gravity")
    } finally {
      setLoading(false)
    }
  }

  const getChartData = () => {
    if (!result) return []
    const chartData = []
    
    for (let i = 0; i < result.fit_t.length; i++) {
        chartData.push({
            time: result.fit_t[i],
            fitted: result.fit_y[i]
        })
    }
    
    return chartData
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Activity size={28} />
          <h1>Gravity Estimator</h1>
        </div>
        <p className="subtitle">Manual Data Analysis</p>
      </header>

      <main className="main-content">
        <div className="card data-card glass-panel">
          <h2>Data Points (t, y)</h2>
          <div className="points-list">
            {dataPoints.map((point, i) => (
              <div key={i} className="point-row">
                <div className="input-group">
                  <label>Time (s)</label>
                  <input type="number" value={point.t} onChange={(e) => handleChange(i, 't', e.target.value)} placeholder="0.0" />
                </div>
                <div className="input-group">
                  <label>Distance (m)</label>
                  <input type="number" value={point.y} onChange={(e) => handleChange(i, 'y', e.target.value)} placeholder="0.0" />
                </div>
                <button className="icon-btn danger" onClick={() => handleRemovePoint(i)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="btn outline" onClick={handleAddPoint}>
              <Plus size={18} /> Add Point
            </button>
            <button className="btn primary" onClick={handleEstimate} disabled={loading}>
              {loading ? 'Calculating...' : <><Calculator size={18} /> Estimate Gravity</>}
            </button>
          </div>
        </div>

        <div className="card result-card glass-panel">
          <h2>Estimation Results</h2>
          {result ? (
            <div className="results-container">
              <div className="g-value">
                <span className="label">Estimated Gravity (g)</span>
                <span className="value">{result.g.toFixed(4)} <span className="unit">m/s²</span></span>
              </div>
              
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" type="number" domain={['auto', 'auto']} stroke="#a0a0a0" label={{ value: 'Time (s)', position: 'bottom', fill: '#a0a0a0' }} />
                    <YAxis dataKey="fitted" type="number" domain={['auto', 'auto']} stroke="#a0a0a0" label={{ value: 'Distance (m)', angle: -90, position: 'left', fill: '#a0a0a0' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(20, 20, 30, 0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }} />
                    <Legend />
                    {/* Fitted Curve */}
                    <Line data={getChartData()} type="monotone" dataKey="fitted" stroke="#00f2fe" strokeWidth={3} dot={false} name="Fitted Curve" />
                    {/* Experimental Points */}
                    <Scatter name="Experimental Data" data={result.points.map((p: any) => ({time: p.t, fitted: p.y}))} fill="#ff0844" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Activity size={48} className="empty-icon" />
              <p>Enter data points and run estimation to see results here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
