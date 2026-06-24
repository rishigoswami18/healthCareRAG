import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Activity, Phone, Clipboard, FileX, ThumbsUp, Percent } from 'lucide-react'

function Dashboard({ token, role }) {
  const [data, setData] = useState(null)
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const authHeader = { headers: { Authorization: `Bearer ${token}` } }
        const resStats = await axios.get('/api/analytics/dashboard', authHeader)
        setData(resStats.data)
        
        const resClaims = await axios.get('/api/claims', authHeader)
        setClaims(resClaims.data)
      } catch (err) {
        console.error("Error loading dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [token])

  if (loading || !data) {
    return (
      <div class="flex items-center justify-center min-h-[60vh]">
        <div class="flex flex-col items-center gap-2">
          <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sm text-indigo-400 font-medium tracking-wide">Syncing telemetry data...</p>
        </div>
      </div>
    )
  }

  // Pre-process charts datasets
  const csatHistory = data.metrics_series.csat_history.map((val, idx) => ({
    period: `Period ${idx + 1}`,
    CSAT: val,
    SLA: data.metrics_series.sla_compliance_history[idx]
  }))

  const ahtHistory = data.metrics_series.average_handle_time_history.map((val, idx) => ({
    period: `Period ${idx + 1}`,
    AHT: val
  }))

  return (
    <div class="space-y-6">
      {/* Upper banner section */}
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-white">Operations Command Center</h2>
        <p class="text-xs text-gray-400">Real-time performance metrics, compliance auditing status, and ML claim denial forecasts.</p>
      </div>

      {/* KPI Metric Summary grid */}
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Metric 1 */}
        <div class="glass-panel p-4 rounded-xl flex flex-col justify-between border border-borderGlass hover:border-indigo-500/30 transition-all duration-300">
          <div class="flex items-center justify-between text-indigo-400">
            <ThumbsUp class="w-4 h-4" />
            <span class="text-[10px] font-mono text-emerald-400 font-semibold">+1.2%</span>
          </div>
          <div class="mt-3">
            <p class="text-2xl font-bold text-white leading-none">{data.csat}%</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1">CSAT Score</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div class="glass-panel p-4 rounded-xl flex flex-col justify-between border border-borderGlass hover:border-indigo-500/30 transition-all duration-300">
          <div class="flex items-center justify-between text-indigo-400">
            <Percent class="w-4 h-4" />
            <span class="text-[10px] font-mono text-indigo-400 font-semibold">Goal 40</span>
          </div>
          <div class="mt-3">
            <p class="text-2xl font-bold text-white leading-none">{data.nps}</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1">Net Promoter (NPS)</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div class="glass-panel p-4 rounded-xl flex flex-col justify-between border border-borderGlass hover:border-indigo-500/30 transition-all duration-300">
          <div class="flex items-center justify-between text-indigo-400">
            <Phone class="w-4 h-4" />
            <span class="text-[10px] font-mono text-emerald-400 font-semibold">-0.2m</span>
          </div>
          <div class="mt-3">
            <p class="text-2xl font-bold text-white leading-none">{data.aht_minutes}m</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1">Handle Time (AHT)</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div class="glass-panel p-4 rounded-xl flex flex-col justify-between border border-borderGlass hover:border-indigo-500/30 transition-all duration-300">
          <div class="flex items-center justify-between text-indigo-400">
            <Activity class="w-4 h-4" />
            <span class="text-[10px] font-mono text-emerald-400 font-semibold">94.8%</span>
          </div>
          <div class="mt-3">
            <p class="text-2xl font-bold text-white leading-none">{data.sla_compliance_percent}%</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1">SLA Compliance</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div class="glass-panel p-4 rounded-xl flex flex-col justify-between border border-borderGlass hover:border-indigo-500/30 transition-all duration-300">
          <div class="flex items-center justify-between text-red-400">
            <FileX class="w-4 h-4" />
            <span class="text-[10px] font-mono text-red-400 font-semibold">Escalated</span>
          </div>
          <div class="mt-3">
            <p class="text-2xl font-bold text-white leading-none">{data.escalation_rate_percent}%</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1">Escalation Rate</p>
          </div>
        </div>

        {/* Metric 6 */}
        <div class="glass-panel p-4 rounded-xl flex flex-col justify-between border border-borderGlass hover:border-indigo-500/30 transition-all duration-300">
          <div class="flex items-center justify-between text-indigo-400">
            <Clipboard class="w-4 h-4" />
            <span class="text-[10px] font-mono text-red-400 font-semibold">Denied</span>
          </div>
          <div class="mt-3">
            <p class="text-2xl font-bold text-white leading-none">{data.claim_denial_rate_percent}%</p>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1">Claim Denial Rate</p>
          </div>
        </div>
      </div>

      {/* Chart grid row */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSAT / SLA Area Chart */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass">
          <h3 class="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Quality Trends (CSAT & SLA %)</h3>
          <div class="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={csatHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCsat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSla" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#9CA3AF" fontSize={11} />
                <YAxis domain={[80, 100]} stroke="#9CA3AF" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                <Area type="monotone" dataKey="CSAT" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorCsat)" />
                <Area type="monotone" dataKey="SLA" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSla)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Handle Time Bar Chart */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass">
          <h3 class="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Average Handle Time Drop (Minutes)</h3>
          <div class="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ahtHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#9CA3AF" fontSize={11} />
                <YAxis domain={[0, 6]} stroke="#9CA3AF" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                <Bar dataKey="AHT" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Claims and productivity summary */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity counters */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass lg:col-span-1 space-y-4">
          <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Agent Productivity Stats</h3>
          
          <div class="space-y-3 pt-2">
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-borderGlass">
              <span class="text-xs text-gray-300">Total Calls Handled</span>
              <span class="text-sm font-bold text-white">{data.productivity.total_calls_handled}</span>
            </div>
            
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-borderGlass">
              <span class="text-xs text-gray-300">Pending Review Claims</span>
              <span class="text-sm font-bold text-indigo-400">{data.productivity.open_claims}</span>
            </div>

            <div class="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-borderGlass">
              <span class="text-xs text-gray-300">Approved Claims</span>
              <span class="text-sm font-bold text-emerald-400">{data.productivity.resolved_claims}</span>
            </div>
          </div>
        </div>

        {/* Claim Denial Forecast Board */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Claims Forensic Registry & Denial Probability</h3>
            <span class="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-semibold">RandomForest ML Engine</span>
          </div>

          <div class="overflow-x-auto max-h-48">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-borderGlass text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                  <th class="py-2.5">Claim ID</th>
                  <th>Patient</th>
                  <th>Billed Amt</th>
                  <th>Status</th>
                  <th class="text-right">ML Denial Risk</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-borderGlass">
                {claims.map((claim) => (
                  <tr key={claim.id} class="hover:bg-white/5 transition-colors">
                    <td class="py-2.5 font-mono text-gray-200">{claim.claim_number}</td>
                    <td class="font-medium text-gray-300">{claim.patient_name}</td>
                    <td class="text-gray-300">${claim.billed_amount.toLocaleString()}</td>
                    <td>
                      <span class={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        claim.status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : claim.status === 'denied' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td class="text-right font-mono font-semibold text-indigo-400">{Math.round(claim.denied_probability * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
