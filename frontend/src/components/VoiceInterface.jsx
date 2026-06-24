import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Phone, PhoneOff, Mic, Volume2, User, HelpCircle, AlertCircle } from 'lucide-react'

function VoiceInterface({ token }) {
  const [inCall, setInCall] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [transcriptText, setTranscriptText] = useState('')
  const [currentSpeech, setCurrentSpeech] = useState('')
  const [sentiment, setSentiment] = useState('neutral')
  const [escalationDetected, setEscalationDetected] = useState(false)
  const [coachNotes, setCoachNotes] = useState('Active listening: Standby for transcription...')
  const [summary, setSummary] = useState('')
  
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  useEffect(() => {
    // Initialize Web Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'

      rec.onresult = (e) => {
        let interimTranscript = ''
        let finalTranscript = ''
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript
          } else {
            interimTranscript += e.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          sendTranscriptionChunk(finalTranscript)
        }
        setCurrentSpeech(interimTranscript || finalTranscript)
      }

      rec.onerror = (e) => {
        console.error("Speech Recognition Error: ", e)
      }

      recognitionRef.current = rec
    }
  }, [])

  const startCall = async () => {
    const sId = "CALL-" + Math.floor(Math.random() * 900000 + 100000)
    setSessionId(sId)
    setTranscriptText('')
    setCurrentSpeech('')
    setSentiment('neutral')
    setEscalationDetected(false)
    setSummary('')
    setCoachNotes('Verifying caller identity... Ask for patient DOB.')
    setInCall(true)

    try {
      await axios.post('/api/voice/session', {
        session_id: sId,
        caller_name: "Alice Smith",
        patient_id: "PAT-9034"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Try starting browser mic recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      } else {
        // Fallback simulate voice input helper
        setCoachNotes("Speech API not fully supported or permission missing. Typing in chat box simulates microphone voice feeds.")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const sendTranscriptionChunk = async (text) => {
    if (!text.trim()) return
    setTranscriptText(prev => prev + "\nPatient: " + text)
    
    try {
      const res = await axios.put(`/api/voice/session/${sessionId}`, {
        transcript: "Patient: " + text
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setSentiment(res.data.sentiment)
      setEscalationDetected(res.data.escalation_detected)
      setCoachNotes(res.data.coach_notes || "Documenting call status details...")

      // Now query Agentic RAG pipeline dynamically as an assistant feedback
      const agentRes = await axios.post('/api/agents/chat', {
        query: text,
        patient_id: "PAT-9034"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Speak back the response using Speech Synthesis (Text-To-Speech)
      const answerClean = agentRes.data.answer.replace(/\[References:.*?\]/, '')
      setTranscriptText(prev => prev + "\nAgent: " + answerClean)
      
      if (synthRef.current) {
        synthRef.current.cancel()
        const utterance = new SpeechSynthesisUtterance(answerClean)
        utterance.rate = 1.0
        synthRef.current.speak(utterance)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const endCall = async () => {
    setInCall(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (synthRef.current) {
      synthRef.current.cancel()
    }

    try {
      const res = await axios.post(`/api/voice/session/${sessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSummary(res.data.summary)
      setCoachNotes('Call ended. Telemetry summary compiled.')
    } catch (err) {
      console.error(err)
    }
  }

  // Fallback simulator click
  const triggerSimulationPrompt = (mockPrompt) => {
    if (inCall) {
      sendTranscriptionChunk(mockPrompt)
    }
  }

  return (
    <div class="space-y-6">
      {/* Header bar */}
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-white">Voice AI Command Center</h2>
          <p class="text-xs text-gray-400">Speech-to-text, real-time vocal empathy checks, and live supervisor coaching cards.</p>
        </div>
        
        {/* Toggle active button */}
        {!inCall ? (
          <button
            onClick={startCall}
            class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <Phone class="w-4 h-4" />
            Connect Call Channel
          </button>
        ) : (
          <button
            onClick={endCall}
            class="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
          >
            <PhoneOff class="w-4 h-4" />
            Hangup Call
          </button>
        )}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Live Dial logs */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass lg:col-span-8 flex flex-col h-[60vh] overflow-hidden space-y-4">
          <div class="flex items-center justify-between border-b border-borderGlass pb-3">
            <span class="text-xs font-semibold text-white uppercase tracking-wider">Live Call Transcript Panel</span>
            {inCall && (
              <span class="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span class="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse-fast"></span>
                Channel Connected: {sessionId}
              </span>
            )}
          </div>

          {/* Transcript details box */}
          <div class="flex-grow bg-white/5 border border-borderGlass rounded-xl p-4 overflow-y-auto font-mono text-xs space-y-2 text-gray-300">
            {transcriptText ? (
              transcriptText.split('\n').map((line, i) => {
                const isPatient = line.startsWith('Patient:')
                return (
                  <div key={i} class={`py-1 ${isPatient ? 'text-indigo-300' : 'text-emerald-300'}`}>
                    <span class="font-bold">{isPatient ? "🗣️ Patient: " : "🛡️ Agent: "}</span>
                    {line.replace(/^(Patient:|Agent:)/, '')}
                  </div>
                )
              })
            ) : (
              <div class="flex items-center justify-center h-full text-gray-500 italic text-center">
                {!inCall 
                  ? "Standby. Click 'Connect Call Channel' to open lines."
                  : "Listening... Speak clearly into your mic or select simulation triggers below."
                }
              </div>
            )}
            
            {currentSpeech && (
              <div class="text-gray-500 italic text-left pt-1">
                🗣️ Processing: "{currentSpeech}"
              </div>
            )}
          </div>

          {/* Simulation triggers helpers */}
          {inCall && (
            <div class="space-y-2 pt-2 border-t border-borderGlass">
              <span class="text-[9px] uppercase tracking-widest text-indigo-400 font-mono font-bold block">Preset Dial Simulation Prompts</span>
              <div class="flex flex-wrap gap-2">
                <button 
                  onClick={() => triggerSimulationPrompt("I need to check the status of my claim, my bill copay was denied")} 
                  class="px-2.5 py-1 bg-white/5 border border-borderGlass rounded text-[10px] hover:bg-white/10 text-gray-300"
                >
                  "Why was my claim denied?"
                </button>
                <button 
                  onClick={() => triggerSimulationPrompt("I want to speak with your manager immediately, this charge is unfair!")} 
                  class="px-2.5 py-1 bg-white/5 border border-borderGlass rounded text-[10px] hover:bg-white/10 text-gray-300"
                >
                  "Upset / Manager Escalation"
                </button>
                <button 
                  onClick={() => triggerSimulationPrompt("Do I need a prior authorization for CPT-74177 abdominal CT scan?")} 
                  class="px-2.5 py-1 bg-white/5 border border-borderGlass rounded text-[10px] hover:bg-white/10 text-gray-300"
                >
                  "Check Prior Auth scan"
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Empathy & Coach panel */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass lg:col-span-4 flex flex-col space-y-5 h-full overflow-y-auto">
          {/* Sentiment Meter Gauge */}
          <div class="space-y-2.5">
            <span class="text-xs font-semibold text-white uppercase tracking-wider block">Voice Empathy Analyzer</span>
            
            <div class="bg-white/5 border border-borderGlass p-4 rounded-xl flex flex-col items-center gap-2">
              <div class={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full ${
                sentiment === 'frustrated' 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : sentiment === 'satisfied' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}>
                Vocal State: {sentiment}
              </div>

              {/* Graphical indicator bar */}
              <div class="w-full flex items-center justify-between mt-2 gap-1 text-[10px] text-gray-400">
                <span class={sentiment === 'frustrated' ? 'text-red-400 font-bold' : ''}>Upset</span>
                <div class="flex-grow bg-gray-800 h-2 mx-2 rounded-full overflow-hidden relative">
                  <div 
                    class={`h-full absolute transition-all duration-300 ${
                      sentiment === 'frustrated' ? 'bg-red-500 w-1/3 left-0' : sentiment === 'satisfied' ? 'bg-emerald-500 w-1/3 right-0' : 'bg-indigo-500 w-1/3 left-1/3'
                    }`}
                  ></div>
                </div>
                <span class={sentiment === 'satisfied' ? 'text-emerald-400 font-bold' : ''}>Satisfied</span>
              </div>
            </div>
          </div>

          {/* Escalation alert banner */}
          {escalationDetected && (
            <div class="bg-red-950/20 border border-red-500/30 text-red-300 p-3.5 rounded-xl flex items-start gap-2.5 animate-pulse-fast">
              <AlertCircle class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-red-400">Escalation Trigger Detected</h4>
                <p class="text-[10px] mt-0.5 leading-relaxed">System flagged high stress level. Supervisor alert generated. Prioritizing backup agent desk routing.</p>
              </div>
            </div>
          )}

          {/* Real-time agent Coaching guidelines */}
          <div class="flex-grow space-y-3">
            <span class="text-xs font-semibold text-white uppercase tracking-wider block">Supervisor Coaching Overlay</span>
            
            <div class="bg-indigo-950/15 border border-indigo-500/15 rounded-xl p-4 min-h-[160px] flex flex-col justify-between">
              <div class="space-y-2 text-xs text-gray-300">
                {coachNotes.split('\n').map((line, idx) => (
                  <div key={idx} class="flex items-start gap-2">
                    <span class="text-indigo-400 font-bold">•</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              
              <div class="border-t border-indigo-500/10 pt-3 mt-4 flex items-center gap-1.5 text-[9px] text-indigo-400 font-mono">
                <Volume2 class="w-3.5 h-3.5" />
                Speech Synthesis Output Enabled
              </div>
            </div>
          </div>

          {/* Summary Box (visible after ending call) */}
          {summary && (
            <div class="bg-white/5 border border-borderGlass p-4 rounded-xl space-y-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">AI Call Summary Compiled</h4>
              <p class="text-[11px] text-gray-400 leading-relaxed font-mono">{summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VoiceInterface
