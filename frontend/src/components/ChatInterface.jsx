import React, { useState } from 'react'
import axios from 'axios'
import { Send, Shield, Search, ArrowRight, Brain, AlertTriangle, Scale } from 'lucide-react'

function ChatInterface({ token, role }) {
  const [query, setQuery] = useState('')
  const [patientId, setPatientId] = useState('PAT-9034')
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'agent',
      text: "Aegis Assistant Ready. Set the active Patient ID above to fetch EHR clinical history automatically, then submit a customer service query (e.g. 'Is my insurance still active?' or 'Why was my bill copay so high?').",
      routingInfo: null,
      sources: []
    }
  ])
  const [loading, setLoading] = useState(false)
  const [activeDiagnosis, setActiveDiagnosis] = useState(null)

  const quickPatientOptions = [
    { id: "PAT-9034", name: "Alice Smith (Heart/Spine)" },
    { id: "PAT-8812", name: "Bob Jones (Diabetes)" },
    { id: "PAT-4567", name: "Charlie Brown (Prior Auth Scan)" },
    { id: "", name: "No Patient Filter (General Search)" }
  ]

  const handleSend = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    const userMessage = { sender: 'user', text: query }
    setChatHistory(prev => [...prev, userMessage])
    setLoading(true)
    
    const originalQuery = query
    setQuery('')

    try {
      const res = await axios.post('/api/agents/chat', {
        query: originalQuery,
        patient_id: patientId || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Implement human-like word-by-word typing simulation
      const fullAnswer = res.data.answer
      const words = fullAnswer.split(" ")
      
      const botMessagePlaceholder = {
        sender: 'agent',
        text: '',
        routingInfo: res.data.routing_info,
        sources: res.data.sources,
        metadata: res.data.metadata
      }

      setChatHistory(prev => [...prev, botMessagePlaceholder])
      setActiveDiagnosis(res.data)

      let wordIdx = 0
      let currentText = ""
      
      const streamWords = () => {
        if (wordIdx < words.length) {
          currentText += (wordIdx === 0 ? "" : " ") + words[wordIdx]
          setChatHistory(prev => {
            const historyCopy = [...prev]
            const lastMsgIdx = historyCopy.length - 1
            if (historyCopy[lastMsgIdx] && historyCopy[lastMsgIdx].sender === 'agent') {
              historyCopy[lastMsgIdx] = {
                ...historyCopy[lastMsgIdx],
                text: currentText
              }
            }
            return historyCopy
          })
          wordIdx++
          setTimeout(streamWords, 35) // Natural typing speed (35ms per word)
        }
      }
      streamWords()
    } catch (err) {
      console.error(err)
      const errMessage = {
        sender: 'agent',
        text: "Error executing agent pipeline: " + (err.response?.data?.detail || "Connection timeout."),
        routingInfo: null,
        sources: []
      }
      setChatHistory(prev => [...prev, errMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[80vh]">
      {/* Left Chat Stream Board */}
      <div class="glass-panel rounded-xl border border-borderGlass lg:col-span-7 flex flex-col overflow-hidden h-full">
        {/* Patient Selection bar */}
        <div class="bg-white/5 border-b border-borderGlass p-4 flex flex-col gap-2">
          <label class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Active Patient EHR Scope</label>
          <div class="flex flex-wrap gap-2">
            {quickPatientOptions.map(p => (
              <button
                key={p.id}
                onClick={() => setPatientId(p.id)}
                class={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  patientId === p.id 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10" 
                    : "bg-white/5 border-borderGlass text-gray-400 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable messages container */}
        <div class="flex-grow p-4 overflow-y-auto space-y-4">
          {chatHistory.map((msg, index) => {
            const isUser = msg.sender === 'user'
            return (
              <div key={index} class={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div class={`max-w-[85%] rounded-2xl p-4 border ${
                  isUser 
                    ? 'bg-indigo-600/20 border-indigo-500/30 text-gray-100 rounded-tr-none' 
                    : 'bg-white/5 border-borderGlass text-gray-200 rounded-tl-none'
                }`}>
                  <div class="flex items-center gap-1.5 mb-1">
                    <span class="text-[9px] uppercase tracking-widest font-mono text-indigo-400 font-bold">
                      {isUser ? "Human Agent" : "Aegis Orchestrator"}
                    </span>
                    {!isUser && msg.routingInfo?.allocated_agent && (
                      <span class="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                        {msg.routingInfo.allocated_agent}
                      </span>
                    )}
                  </div>
                  
                  <p class="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            )
          })}
          
          {loading && (
            <div class="flex justify-start">
              <div class="bg-white/5 border border-borderGlass rounded-2xl rounded-tl-none p-4 max-w-[80%] flex items-center gap-2">
                <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <span class="text-xs text-gray-400 ml-1 font-mono font-medium">Orchestrating agent routing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input panel Form */}
        <form onSubmit={handleSend} class="p-4 border-t border-borderGlass bg-white/5 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type patient query (e.g. 'Why was claim CLM-10293 denied?' or 'Is Alice eligible?')..."
            class="flex-grow px-4 py-3 rounded-xl text-sm glass-input"
          />
          <button
            type="submit"
            disabled={loading}
            class="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all duration-300 disabled:opacity-50"
          >
            <Send class="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Right GenAI Diagnostics Panel */}
      <div class="glass-panel rounded-xl border border-borderGlass lg:col-span-5 p-5 flex flex-col overflow-y-auto h-full space-y-5">
        <div class="flex items-center gap-2 border-b border-borderGlass pb-3">
          <Brain class="w-5 h-5 text-indigo-400" />
          <div>
            <h3 class="text-sm font-semibold text-white uppercase tracking-wider">GenAI Diagnostics Board</h3>
            <p class="text-[10px] text-gray-400">Live orchestration trace, metadata fetches, and vector citations.</p>
          </div>
        </div>

        {activeDiagnosis ? (
          <div class="space-y-4">
            {/* Visual Node Pipeline Map */}
            <div class="bg-white/5 border border-borderGlass p-3 rounded-xl">
              <span class="text-[9px] uppercase tracking-widest text-indigo-400 font-mono font-bold block mb-2">Internal Pipeline Trace</span>
              
              <div class="flex flex-col gap-1.5 text-xs">
                <div class="flex items-center justify-between text-gray-300">
                  <span>Query Intent:</span>
                  <span class="font-mono font-bold text-white capitalize">{activeDiagnosis.routing_info.predicted_intent}</span>
                </div>
                
                <div class="flex items-center justify-between text-gray-300">
                  <span>Allocated Expert Agent:</span>
                  <span class="font-mono font-bold text-emerald-400">{activeDiagnosis.routing_info.allocated_agent}</span>
                </div>

                <div class="flex items-center justify-between text-gray-300">
                  <span>Ticket Priority Rating:</span>
                  <span class={`font-mono font-bold uppercase ${
                    activeDiagnosis.routing_info.ticket_priority === 'high' ? 'text-red-400' : 'text-indigo-300'
                  }`}>{activeDiagnosis.routing_info.ticket_priority}</span>
                </div>

                <div class="flex items-center justify-between text-gray-300">
                  <span>Vocal Empathy Score:</span>
                  <span class="font-mono font-bold text-indigo-300 capitalize">{activeDiagnosis.routing_info.caller_sentiment}</span>
                </div>

                <div class="flex items-center justify-between text-gray-300">
                  <span>Est. Resolution Time:</span>
                  <span class="font-mono font-bold text-white">{activeDiagnosis.routing_info.est_resolution_hours} Hours</span>
                </div>
              </div>
            </div>

            {/* HIPAA redacts Warning triggers */}
            {activeDiagnosis.routing_info.phi_redacted && (
              <div class="bg-red-950/20 border border-red-500/30 text-red-300 p-3 rounded-xl flex items-start gap-2">
                <Shield class="w-5 h-5 shrink-0 text-red-400" />
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-red-400">HIPAA Safeguard Redaction Triggered</h4>
                  <p class="text-[10px] mt-0.5 leading-relaxed">Protected Health Information (PHI) such as active SSNs, cell numbers, or DOB configurations were identified in the response and redacted before output.</p>
                </div>
              </div>
            )}

            {/* Injected Citations */}
            <div class="space-y-2">
              <span class="text-[9px] uppercase tracking-widest text-indigo-400 font-mono font-bold block">Hybrid vector database RAG Citations</span>
              {activeDiagnosis.sources.length > 0 ? (
                activeDiagnosis.sources.map((s, idx) => (
                  <div key={idx} class="bg-white/5 border border-borderGlass p-3 rounded-lg flex flex-col gap-1 hover:border-indigo-500/20 transition-all">
                    <div class="flex justify-between items-center text-[10px] font-mono text-gray-300">
                      <span class="font-bold text-indigo-300">{s.id || "Indexed Source"}</span>
                      <span class="font-semibold text-emerald-400">Relevance: {s.score}</span>
                    </div>
                    <p class="text-[11px] text-gray-400 leading-normal mt-0.5">{s.source_citation}</p>
                  </div>
                ))
              ) : (
                <p class="text-xs text-gray-500 italic">No search documents were referenced for this response.</p>
              )}
            </div>
            
            {/* Grounding & Hallucination Guard */}
            <div class="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-xl flex items-start gap-2">
              <Scale class="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <h4 class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Hallucination Prevention Guard</h4>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex-grow bg-gray-800 h-2 rounded-full overflow-hidden w-28">
                    <div 
                      class={`h-full ${activeDiagnosis.hallucination_score > 0.3 ? 'bg-red-400' : 'bg-emerald-400'}`} 
                      style={{ width: `${Math.max(10, (1 - activeDiagnosis.hallucination_score) * 100)}%` }}
                    ></div>
                  </div>
                  <span class="text-[10px] font-mono text-gray-300 font-semibold">
                    {activeDiagnosis.hallucination_score === 0 ? "100% Grounded" : `${Math.round(activeDiagnosis.hallucination_score * 100)}% Divergence`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div class="flex flex-col items-center justify-center flex-grow py-12 text-center text-gray-500">
            <Search class="w-8 h-8 text-gray-600 mb-2" />
            <p class="text-xs italic">Submit a prompt in the workspace to trace its ML classification, vector retrieval layers, and HIPAA audit constraints.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInterface
