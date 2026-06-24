import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Upload, Link2, Shield, FileText, CheckCircle, Database } from 'lucide-react'

function AdminPanel({ token, role }) {
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [auditLogs, setAuditLogs] = useState([])
  const [indexedDocs, setIndexedDocs] = useState([])

  const isAuditorRole = role === 'admin' || role === 'compliance' || role === 'auditor'

  const fetchRegistry = async () => {
    try {
      const authHeader = { headers: { Authorization: `Bearer ${token}` } }
      const docsRes = await axios.get('/api/knowledge/documents', authHeader)
      setIndexedDocs(docsRes.data)
      
      if (isAuditorRole) {
        const auditRes = await axios.get('/api/compliance/audit-logs', authHeader)
        setAuditLogs(auditRes.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchRegistry()
  }, [token, role])

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setStatusMsg('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'General')
    formData.append('channel', 'General')

    try {
      await axios.post('/api/knowledge/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      setStatusMsg(`Successfully uploaded and indexed: ${file.name}`)
      setFile(null)
      fetchRegistry()
    } catch (err) {
      console.error(err)
      setStatusMsg("Upload failed: " + (err.response?.data?.detail || "Verification error."))
    } finally {
      setLoading(false)
    }
  }

  const handleScrape = async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setStatusMsg('')

    try {
      await axios.post('/api/knowledge/scrape', { url }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStatusMsg(`Successfully scraped and indexed website guidelines.`)
      setUrl('')
      fetchRegistry()
    } catch (err) {
      console.error(err)
      setStatusMsg("Web ingestion failed: " + (err.response?.data?.detail || "Network blocked."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="space-y-6">
      {/* Header Info */}
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-white">Compliance & Knowledge Operations</h2>
        <p class="text-xs text-gray-400">Ingest clinical documents, review secure audit access trails, and monitor RAG indexing telemetry.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Knowledge management block */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass space-y-6">
          <div class="flex items-center gap-2 border-b border-borderGlass pb-3">
            <Database class="w-5 h-5 text-indigo-400" />
            <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Ingestion Pipeline Control</h3>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div class="bg-indigo-950/20 border border-indigo-500/30 text-indigo-300 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle class="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* File uploader Form */}
          <form onSubmit={handleFileUpload} class="space-y-3">
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ingest Document (PDF, DOCX, TXT)</label>
            <div class="flex gap-2">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                class="flex-grow text-xs text-gray-400 px-3 py-2 bg-white/5 border border-borderGlass rounded-lg file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !file}
                class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload class="w-3.5 h-3.5" />
                Ingest
              </button>
            </div>
          </form>

          {/* Web scraping Form */}
          <form onSubmit={handleScrape} class="space-y-3 pt-4 border-t border-borderGlass">
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Index Medical Policy Webpages</label>
            <div class="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://clinical.unitedhealth.com/policy..."
                class="flex-grow px-3 py-2 rounded-lg text-xs glass-input"
              />
              <button
                type="submit"
                disabled={loading || !url}
                class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Link2 class="w-3.5 h-3.5" />
                Scrape
              </button>
            </div>
          </form>

          {/* Ingested Documents List */}
          <div class="space-y-3 pt-6 border-t border-borderGlass">
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Active Ingested Files Registry</h4>
            <div class="max-h-48 overflow-y-auto border border-borderGlass rounded-lg">
              <table class="w-full text-left border-collapse text-[11px] text-gray-300">
                <thead>
                  <tr class="bg-white/5 border-b border-borderGlass text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                    <th class="p-2">Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th class="text-right p-2">Chunks</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-borderGlass font-mono">
                  {indexedDocs.map((doc) => (
                    <tr key={doc.id} class="hover:bg-white/5">
                      <td class="p-2 font-sans text-gray-200 truncate max-w-[160px]">{doc.filename}</td>
                      <td class="uppercase text-[9px]">{doc.file_type}</td>
                      <td>
                        <span class="text-emerald-400 font-semibold">{doc.status}</span>
                      </td>
                      <td class="text-right p-2">{doc.total_chunks}</td>
                    </tr>
                  ))}
                  {indexedDocs.length === 0 && (
                    <tr>
                      <td colSpan="4" class="p-3 text-center text-gray-500 italic font-sans">No custom guidelines ingested yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* HIPAA Access and Audit Logging panel */}
        <div class="glass-panel p-5 rounded-xl border border-borderGlass space-y-4">
          <div class="flex items-center justify-between border-b border-borderGlass pb-3">
            <div class="flex items-center gap-2">
              <Shield class="w-5 h-5 text-emerald-400" />
              <h3 class="text-sm font-semibold text-white uppercase tracking-wider">HIPAA Audit Access Ledger</h3>
            </div>
            <span class="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">Immutable Logs</span>
          </div>

          {isAuditorRole ? (
            <div class="overflow-x-auto max-h-[420px] border border-borderGlass rounded-lg">
              <table class="w-full text-left border-collapse text-[10px] font-mono text-gray-300">
                <thead>
                  <tr class="bg-white/5 border-b border-borderGlass text-gray-400 font-bold uppercase tracking-wider text-[8px]">
                    <th class="p-2.5">User</th>
                    <th>Action</th>
                    <th>Resource Scope</th>
                    <th>IP Addr</th>
                    <th class="text-right p-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-borderGlass">
                  {auditLogs.map((log) => (
                    <tr key={log.id} class="hover:bg-white/5">
                      <td class="p-2.5 font-sans font-semibold text-gray-200">{log.username}</td>
                      <td>
                        <span class={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          log.action === 'PHI_ACCESS' 
                            ? 'bg-red-500/10 text-red-400' 
                            : log.action === 'WRITE' 
                              ? 'bg-yellow-500/10 text-yellow-400' 
                              : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td class="font-sans text-gray-300 max-w-[120px] truncate">{log.resource}</td>
                      <td>{log.ip_address}</td>
                      <td class="text-right p-2.5 text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" class="p-3 text-center text-gray-500 italic font-sans text-xs">Ledger is empty. Make api queries first.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div class="flex flex-col items-center justify-center py-20 text-center text-gray-500">
              <AlertTriangle class="w-8 h-8 text-yellow-500 mb-2" />
              <p class="text-xs">Access Denied. You do not hold compliance officer or audit access privileges.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
