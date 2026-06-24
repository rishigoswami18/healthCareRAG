import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar.jsx'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import ChatInterface from './components/ChatInterface.jsx'
import VoiceInterface from './components/VoiceInterface.jsx'
import AdminPanel from './components/AdminPanel.jsx'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [role, setRole] = useState(localStorage.getItem('role') || '')
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      localStorage.setItem('username', username)
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('username')
    }
  }, [token, role, username])

  const handleLogout = () => {
    setToken('')
    setRole('')
    setUsername('')
    setActiveTab('dashboard')
  }

  if (!token) {
    return (
      <Login 
        setToken={setToken} 
        setRole={setRole} 
        setUsername={setUsername} 
      />
    )
  }

  // Define tabs based on role permissions
  const getAvailableTabs = () => {
    const tabs = [{ id: 'dashboard', name: 'Dashboard' }]
    
    if (role === 'admin' || role === 'agent') {
      tabs.push({ id: 'chat', name: 'Agent Chat Workspace' })
      tabs.push({ id: 'voice', name: 'Voice AI Simulator' })
    }
    
    if (role === 'admin' || role === 'compliance' || role === 'auditor') {
      tabs.push({ id: 'admin', name: 'Compliance & Knowledge Panel' })
    }

    return tabs
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard token={token} role={role} />
      case 'chat':
        return <ChatInterface token={token} role={role} />
      case 'voice':
        return <VoiceInterface token={token} />
      case 'admin':
        return <AdminPanel token={token} role={role} />
      default:
        return <Dashboard token={token} role={role} />
    }
  }

  return (
    <div class="min-h-screen flex flex-col">
      <Navbar 
        username={username} 
        role={role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        availableTabs={getAvailableTabs()}
        onLogout={handleLogout} 
      />
      <main class="flex-grow container mx-auto p-4 md:p-6 max-w-7xl">
        {renderActiveView()}
      </main>
      <footer class="text-center py-4 border-t border-borderGlass text-gray-500 text-xs mt-8">
        🛡️ HIPAA Secure Tunnel Active | Aegis Health GenAI Platform v1.0.0 (Core Engine Offline-Robust Mode)
      </footer>
    </div>
  )
}

export default App
