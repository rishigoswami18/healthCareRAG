import React from 'react'
import { Shield, LogOut, User } from 'lucide-react'

function Navbar({ username, role, activeTab, setActiveTab, availableTabs, onLogout }) {
  return (
    <header class="glass-panel sticky top-0 z-40 w-full border-b border-borderGlass px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand Logo */}
      <div class="flex items-center gap-2">
        <div class="bg-indigo-600 p-2 rounded-lg text-white">
          <Shield class="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-wider bg-gradient-to-r from-white via-indigo-200 to-emerald-300 bg-clip-text text-transparent">
            AEGIS HEALTH
          </h1>
          <p class="text-[10px] text-gray-400 uppercase tracking-widest leading-none">Enterprise Agentic Platform</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <nav class="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-borderGlass">
        {availableTabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.name}
            </button>
          )
        })}
      </nav>

      {/* User Status and Action */}
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-borderGlass">
          <div class="bg-emerald-500/20 p-1.5 rounded-full text-emerald-400">
            <User class="w-3.5 h-3.5" />
          </div>
          <div class="text-left">
            <p class="text-xs font-semibold leading-none">{username}</p>
            <p class="text-[9px] text-emerald-400 uppercase font-mono tracking-wider leading-none mt-0.5">{role}</p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/10 hover:border-red-500/30"
        >
          <LogOut class="w-4 h-4" />
          <span class="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}

export default Navbar
