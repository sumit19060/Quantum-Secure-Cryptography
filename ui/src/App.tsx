import { useState, useEffect } from 'react';
import { 
  Shield, 
  Settings, 
  Play, 
  Cpu, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Terminal,
  Activity,
  History,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = "http://localhost:5000/api";

interface QSBState {
  config: string;
  n: number;
  script_hash160: string;
  p2sh_script_pubkey: string;
  [key: string]: any;
}

interface QSBConfig {
  config: string;
  funding_txid: string;
  funding_vout: number;
  funding_value: number;
  dest_address: string;
  locktime: number;
  sequence: number;
  round1_indices: string;
  round2_indices: string;
  vast_api_key: string;
  gpus: number;
  budget: number;
}

export default function App() {
  const [config, setConfig] = useState<QSBConfig>({
    config: "A",
    funding_txid: "",
    funding_vout: 0,
    funding_value: 0,
    dest_address: "",
    locktime: 0,
    sequence: 0,
    round1_indices: "",
    round2_indices: "",
    vast_api_key: "",
    gpus: 8,
    budget: 50
  });
  const [state, setState] = useState<QSBState | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rawTx, setRawTx] = useState<string | null>(null);
  const [vastLogs, setVastLogs] = useState<string[]>([]);
  const [vastRunning, setVastRunning] = useState(false);
  const [stats, setStats] = useState({ 
    difficulty: "~2^46.4", 
    rate: "238 M/s", 
    cost: "$120",
    opcodes: "184/201",
    q_security: "~2^118"
  });

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchStats();
  }, [config.config, config.gpus]);

  const fetchState = async () => {
    try {
      const res = await fetch(`${API_BASE}/state`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (e) {
      console.log("State not initialized yet");
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.log("Config not found");
    }
  };

  const fetchVastLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/vast/logs`);
      if (res.ok) {
        const data = await res.json();
        setVastLogs(data.logs);
        setVastRunning(data.running);
        // Auto-populate search results into config fields
        if (data.results && data.results.locktime) {
          setConfig(prev => ({
            ...prev,
            locktime: data.results.locktime,
            round1_indices: data.results.round1_indices || prev.round1_indices,
            round2_indices: data.results.round2_indices || prev.round2_indices,
          }));
          if (!data.running && data.results.round1_indices) {
            setSuccess(`Search complete! Found locktime=${data.results.locktime}`);
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchConfig();
    fetchState();
    const interval = setInterval(fetchVastLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSetup = async () => {
    setLoading("setup");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: config.config }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Setup Phase Complete!");
        fetchState();
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleExport = async () => {
    setLoading("export");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("GPU Parameter Files Exported!");
        fetchState();
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAssemble = async () => {
    setLoading("assemble");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Transaction Assembled Successfully!");
        setRawTx(data.raw_tx);
        fetchState();
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleVastSearch = async () => {
    setLoading("search");
    setError(null);
    setSuccess(null);
    setVastLogs([]);
    try {
      // Save config first
      await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const res = await fetch(`${API_BASE}/vast/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Real cryptographic search started! Watch the logs below.");
        setVastRunning(true);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 grid grid-cols-12 gap-6 overflow-hidden">
      {/* Sidebar - Config */}
      <aside className="col-span-12 lg:col-span-3 space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">QSB Dashboard</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Quantum-Safe Bitcoin v1.0</p>
          </div>
        </div>

        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Configuration</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Target Address</label>
              <input 
                type="text" 
                value={config.dest_address}
                onChange={e => setConfig({...config, dest_address: e.target.value})}
                placeholder="Destination Hex"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Value (Sats)</label>
                <input 
                  type="number" 
                  value={config.funding_value}
                  onChange={e => setConfig({...config, funding_value: Number(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Variant</label>
                <select 
                  value={config.config}
                  onChange={e => setConfig({...config, config: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none"
                >
                  <option value="A">Config A (Secure)</option>
                  <option value="test">Test Mode</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Funding TXID</label>
              <input 
                type="text" 
                value={config.funding_txid}
                onChange={e => setConfig({...config, funding_txid: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800">
              <label className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Vast.ai API Key
              </label>
              <input 
                type="password" 
                value={config.vast_api_key}
                onChange={e => setConfig({...config, vast_api_key: e.target.value})}
                placeholder="Enter VASTAI_API_KEY"
                className="w-full bg-slate-950 border border-indigo-500/20 rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">GPU Count</label>
                <input 
                  type="number" 
                  value={config.gpus}
                  onChange={e => setConfig({...config, gpus: Number(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Budget ($)</label>
                <input 
                  type="number" 
                  value={config.budget}
                  onChange={e => setConfig({...config, budget: Number(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">GPU Search Results</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Locktime</label>
                <input 
                  type="number" 
                  value={config.locktime}
                  onChange={e => setConfig({...config, locktime: Number(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Seq</label>
                <input 
                  type="number" 
                  value={config.sequence}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none opacity-50 cursor-not-allowed"
                  disabled
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Round 1 Indices</label>
              <input 
                type="text" 
                value={config.round1_indices}
                onChange={e => setConfig({...config, round1_indices: e.target.value})}
                placeholder="i0, i1, i2..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Round 2 Indices</label>
              <input 
                type="text" 
                value={config.round2_indices}
                onChange={e => setConfig({...config, round2_indices: e.target.value})}
                placeholder="i0, i1, i2..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono outline-none"
              />
            </div>
          </div>
        </section>
      </aside>

      {/* Main Content - Pipeline */}
      <main className="col-span-12 lg:col-span-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Phase Cards */}
          <div className="col-span-2 grid grid-cols-3 gap-6">
            <PhaseCard 
              num="1" 
              title="Setup" 
              icon={<Play />} 
              active={!!state} 
              loading={loading === 'setup'}
              onClick={handleSetup}
              description="Generate HORS keys and build Bitcoin Script"
            />
            <PhaseCard 
              num="2" 
              title="Export" 
              icon={<Download />} 
              active={!!state} 
              loading={loading === 'export'}
              onClick={handleExport}
              disabled={!state}
              description="Export binary parameters for GPU search"
            />
            <PhaseCard 
              num="3" 
              title="Search" 
              icon={<Activity />} 
              active={vastRunning} 
              loading={loading === 'search'}
              onClick={handleVastSearch}
              disabled={!state}
              description="Deploy to Vast.ai fleet for GPU search"
            />
            <PhaseCard 
              num="4" 
              title="Assemble" 
              icon={<CheckCircle2 />} 
              active={!!rawTx} 
              loading={loading === 'assemble'}
              onClick={handleAssemble}
              disabled={!config.round1_indices}
              description="Import GPU hits and build final transaction"
            />
          </div>

          {/* Activity / Status */}
          <section className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col relative overflow-hidden h-[300px]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">System Logs & Vast.ai Fleet</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500", vastRunning && "animate-pulse")} />
                  <span className="text-[10px] font-bold text-emerald-500">{vastRunning ? "FLEET ACTIVE" : "SYSTEM ONLINE"}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 font-mono text-[10px] space-y-1 overflow-y-auto bg-slate-950/50">
              {state && (
                <div className="text-slate-500 mb-4 pb-4 border-b border-slate-800 space-y-1">
                  <p className="text-indigo-400 tracking-wider font-bold mb-2">[$] STATE LOADED</p>
                  <p>SCRIPT_HASH160: {state.script_hash160}</p>
                  <p>P2SH_ADDRESS: {state.p2sh_script_pubkey.substring(0, 40)}...</p>
                  <p>TOTAL_OPCODES: {stats.opcodes}</p>
                  <p>QUANTUM_SECURITY: {stats.q_security}</p>
                </div>
              )}
              {vastLogs.length > 0 ? (
                vastLogs.slice(-200).map((log, i) => (
                  <div key={i} className="text-slate-400 flex gap-4">
                    <span className="text-slate-600 shrink-0">[{String(i).padStart(3, '0')}]</span>
                    <span className={cn(
                      (log.includes('HIT') || log.includes('✓')) && 'text-emerald-400 font-bold',
                      log.includes('ERROR') && 'text-red-400 font-bold',
                      log.includes('Phase') && 'text-indigo-400 font-semibold',
                      log.includes('═') && 'text-cyan-400',
                      log.includes('╔') && 'text-cyan-400',
                      log.includes('╚') && 'text-cyan-400',
                      log.includes('║') && 'text-cyan-400',
                    )}>{log}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic">No search logs — waiting for Phase 3...</div>
              )}
              
              <AnimatePresence>
                {error && (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="p-3 mt-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex gap-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
                {success && (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="p-3 mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex gap-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <p>{success}</p>
                  </motion.div>
                )}
                {rawTx && (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">✓ Raw Transaction Hex ({(rawTx.length / 2).toLocaleString()} bytes)</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(rawTx); setSuccess("Copied to clipboard!"); }}
                        className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="p-3 bg-slate-950 border border-emerald-500/20 rounded-lg max-h-[100px] overflow-y-auto">
                      <code className="text-[9px] text-emerald-300 break-all leading-relaxed">{rawTx}</code>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      {/* Right Column - Details/Metrics */}
      <aside className="col-span-12 lg:col-span-3 space-y-6">
         <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">GPU Search Engine</h2>
            </div>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                    <span>Search Difficulty</span>
                    <span className="text-indigo-400">{stats.difficulty}</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(10, parseFloat(stats.difficulty.replace(/[^\d.-]/g, '')) * 2))}%` }}
                    />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <span className="text-[9px] uppercase text-slate-500 block">Est. Rate</span>
                    <span className="text-lg font-mono font-bold text-white">{stats.rate}</span>
                  </div>
                  <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <span className="text-[9px] uppercase text-slate-500 block">Est. Cost</span>
                    <span className="text-lg font-mono font-bold text-white">{stats.cost}</span>
                  </div>
               </div>

               <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2">
                 <div className="flex items-center gap-2">
                   <Info className="w-3 h-3 text-indigo-400" />
                   <span className="text-[10px] font-bold text-indigo-300 uppercase">GPU Requirements</span>
                 </div>
                 <p className="text-[10px] text-slate-400">Search requires CUDA compilation. Target fleet: 8x RTX 4070 or better.</p>
               </div>
            </div>
         </section>

         <section className="bg-indigo-600 rounded-2xl p-6 shadow-2xl relative overflow-hidden group border border-indigo-500">
            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10 group-hover:scale-110 transition-transform">
              <Cpu className="w-32 h-32" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2 relative z-10">Quantum Defense</h3>
            <p className="text-indigo-100 text-xs leading-relaxed relative z-10">
              Your transaction is protected by hash-to-signature puzzles that remain secure even if Shor's algorithm breaks ECDSA.
            </p>
         </section>
      </aside>
    </div>
  );
}

function PhaseCard({ num, title, icon, active, loading, disabled, onClick, description }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative flex flex-col p-6 rounded-2xl border transition-all text-left outline-none",
        active 
          ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20" 
          : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700",
        (disabled || loading) && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn(
        "absolute top-4 right-4 text-[10px] font-black italic opacity-20",
        active ? "text-white" : "text-slate-500"
      )}>
        PHASE {num}
      </div>
      
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
        active ? "bg-white/20" : "bg-slate-950 border border-slate-800"
      )}>
        {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
      </div>

      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-2", active ? "text-white" : "text-slate-300")}>
        {title}
      </h3>
      <p className={cn("text-[10px] leading-relaxed", active ? "text-indigo-100" : "text-slate-500")}>
        {description}
      </p>
    </button>
  );
}
