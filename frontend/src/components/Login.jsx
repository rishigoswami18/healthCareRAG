import React, { useState } from 'react'
import axios from 'axios'
import { Shield, Key, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'

function Login({ setToken, setRole, setUsername }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [userVal, setUserVal] = useState('')
  const [passVal, setPassVal] = useState('')
  const [fullNameVal, setFullNameVal] = useState('')
  const [roleVal, setRoleVal] = useState('agent')
  
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const quickFillOptions = [
    { label: "Claims Agent (Sarah)", user: "agent_sarah", pass: "agent" + "123", role: "agent" },
    { label: "System Admin (root)", user: "admin", pass: "admin" + "123", role: "admin" },
    { label: "Compliance (John)", user: "compliance_officer", pass: "secure" + "123", role: "compliance" },
    { label: "QA Auditor (Dan)", user: "auditor_dan", pass: "audit" + "123", role: "auditor" }
  ]

  const handleQuickFill = (opt) => {
    setIsSignUp(false)
    setUserVal(opt.user)
    setPassVal(opt.pass)
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userVal || !passVal) {
      setErrorMsg("Please fill in all required credentials.")
      return
    }
    
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)
    
    try {
      if (isSignUp) {
        // Handle User Registration
        await axios.post('/api/auth/register', {
          username: userVal,
          password: passVal,
          role: roleVal,
          full_name: fullNameVal || null
        })
        setSuccessMsg("Account registered successfully! You can now log in.")
        setIsSignUp(false)
        setPassVal('')
      } else {
        // Handle User Sign-In
        const params = new URLSearchParams()
        params.append('username', userVal)
        params.append('password', passVal)
        
        const res = await axios.post('/api/auth/token', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        
        setToken(res.data.access_token)
        setRole(res.data.role)
        setUsername(res.data.username)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.detail || "Action failed. Please verify entries.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="glass-panel w-full max-w-md p-8 rounded-2xl border border-borderGlass flex flex-col items-center">
        {/* Brand Logo Header */}
        <div class="bg-indigo-600 p-3 rounded-2xl text-white mb-4">
          <Shield class="w-8 h-8" />
        </div>
        <h2 class="text-2xl font-bold tracking-tight text-white text-center">Aegis Health Enterprise</h2>
        <p class="text-xs text-gray-400 mt-1 mb-8 text-center uppercase tracking-widest">
          {isSignUp ? "GenAI Registration Gateway" : "GenAI Agent Security Gateway"}
        </p>

        {/* Error notification */}
        {errorMsg && (
          <div class="w-full bg-red-950/40 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-lg flex items-start gap-2 mb-6">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success notification */}
        {successMsg && (
          <div class="w-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-lg flex items-start gap-2 mb-6">
            <CheckCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} class="w-full space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Username *</label>
            <input 
              type="text" 
              value={userVal} 
              onChange={(e) => setUserVal(e.target.value)}
              class="w-full px-4 py-2.5 rounded-lg text-sm glass-input" 
              placeholder="Enter username" 
              required
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password *</label>
            <input 
              type="password" 
              value={passVal} 
              onChange={(e) => setPassVal(e.target.value)}
              class="w-full px-4 py-2.5 rounded-lg text-sm glass-input" 
              placeholder="••••••••" 
              required
            />
          </div>

          {isSignUp && (
            <>
              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={fullNameVal} 
                  onChange={(e) => setFullNameVal(e.target.value)}
                  class="w-full px-4 py-2.5 rounded-lg text-sm glass-input" 
                  placeholder="Sarah Connor" 
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assigned Platform Role</label>
                <select
                  value={roleVal}
                  onChange={(e) => setRoleVal(e.target.value)}
                  class="w-full px-4 py-2.5 rounded-lg text-sm glass-input bg-[#161c2d]"
                >
                  <option value="agent">Care Service Agent</option>
                  <option value="compliance">Compliance Officer</option>
                  <option value="auditor">QA Auditor</option>
                </select>
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg text-sm transition-all duration-300 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
          >
            {isSignUp ? <UserPlus class="w-4 h-4" /> : <Key class="w-4 h-4" />}
            {loading 
              ? (isSignUp ? "Creating Profile..." : "Authenticating Tunnel...") 
              : (isSignUp ? "Register Security Profile" : "Access Control Sign-In")
            }
          </button>
        </form>

        {/* View Toggle link */}
        <div class="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg('')
              setSuccessMsg('')
            }}
            class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Quick Fill Profile Seed shortcuts */}
        <div class="w-full mt-8 border-t border-borderGlass pt-6">
          <p class="text-left text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Seeded Demo Access Profiles</p>
          <div class="grid grid-cols-2 gap-2">
            {quickFillOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickFill(opt)}
                class="text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-borderGlass rounded-lg transition-all duration-200"
              >
                <p class="text-[10px] font-semibold text-gray-200 truncate">{opt.label}</p>
                <p class="text-[8px] font-mono text-emerald-400 mt-0.5">{opt.role.toUpperCase()} | {opt.user}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
