"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, TrendingDown, Calendar,
  BarChart2, Settings, Plug, RefreshCw, ChevronRight,
  Lock, CheckCircle2
} from 'lucide-react';

const fmt = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState('fechamento'); // fechamento | mensal | config
  const [summaryDay, setSummaryDay] = useState({ revenue: 0, withdrawals: 0 });
  const [summaryMonth, setSummaryMonth] = useState({ revenue: 0, withdrawals: 0 });
  const [zreading, setZReading] = useState([]);
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [portStatus, setPortStatus] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [funcPin, setFuncPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadData = useCallback(async () => {
    if (!isElectron) return;
    const [day, month, zr] = await Promise.all([
      window.electronAPI.getSummaryToday(),
      window.electronAPI.getSummaryMonth(),
      window.electronAPI.getZReading(),
    ]);
    setSummaryDay(day);
    setSummaryMonth(month);
    setZReading(zr);
  }, []);

  const loadConfig = useCallback(async () => {
    if (!isElectron) return;
    const portList = await window.electronAPI.listPorts();
    setPorts(portList);
    const savedPort = await window.electronAPI.getSetting('com_port');
    if (savedPort) setSelectedPort(savedPort);
  }, []);

  useEffect(() => {
    // Redirect if not socio
    const role = localStorage.getItem('ac_role');
    if (role !== 'socio') { router.replace('/login'); return; }
    loadData();
    loadConfig();
  }, [loadData, loadConfig, router]);

  const handleConnectPort = async () => {
    if (!selectedPort || !isElectron) return;
    const result = await window.electronAPI.openPort(selectedPort);
    if (result.success) {
      await window.electronAPI.setSetting('com_port', selectedPort);
      setPortStatus('connected');
      showToast(`Porta ${selectedPort} conectada!`);
    } else {
      setPortStatus('error');
      showToast(`Erro: ${result.error}`, 'warn');
    }
  };

  const handleDisconnectPort = async () => {
    if (!isElectron) return;
    await window.electronAPI.closePort();
    setPortStatus('');
    showToast('Porta desconectada.', 'warn');
  };

  const handleSavePin = async () => {
    if (!isElectron) return;
    if (masterPin.length >= 4) await window.electronAPI.setSetting('master_pin', masterPin);
    if (funcPin.length >= 4) await window.electronAPI.setSetting('func_pin', funcPin);
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2000);
    showToast('PINs salvos com sucesso!');
  };

  const ratioDay = summaryDay.revenue > 0 ? (summaryDay.withdrawals / summaryDay.revenue) * 100 : 0;
  const ratioMonth = summaryMonth.revenue > 0 ? (summaryMonth.withdrawals / summaryMonth.revenue) * 100 : 0;

  const totalZ = zreading.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* HEADER */}
      <header className="flex items-center gap-4 px-6 py-4 bg-slate-800 border-b border-slate-700">
        <button onClick={() => router.push('/caixa')} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-white">Painel do Sócio</h1>
          <p className="text-slate-400 text-xs">Fechamento · Relatórios · Configurações</p>
        </div>
      </header>

      {/* TABS */}
      <div className="flex gap-1 px-6 pt-4">
        {[
          { key: 'fechamento', label: 'Fechamento (Z)', icon: BarChart2 },
          { key: 'mensal', label: 'Visão Mensal', icon: Calendar },
          { key: 'config', label: 'Configurações', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ─── TAB: FECHAMENTO Z-READING ─── */}
        {tab === 'fechamento' && (
          <div className="space-y-4">
            {/* Resumo rápido */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs mb-1">Receita do Dia</p>
                <p className="text-green-400 text-2xl font-bold">{fmt(summaryDay.revenue)}</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs mb-1">Retiradas</p>
                <p className="text-amber-400 text-2xl font-bold">{fmt(summaryDay.withdrawals)}</p>
              </div>
              <div className={`rounded-2xl p-4 border ${ratioDay <= 50 ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                <p className="text-slate-400 text-xs mb-1">Termômetro Hoje</p>
                <p className={`text-2xl font-bold ${ratioDay <= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {ratioDay.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Z-Reading por serviço */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <p className="font-semibold text-white">Z-Reading — Detalhe por Serviço</p>
                <p className="text-green-400 font-bold">{fmt(totalZ)}</p>
              </div>
              {zreading.length === 0 ? (
                <p className="text-slate-600 text-sm p-6 text-center">Nenhum serviço registrado hoje.</p>
              ) : (
                <div className="divide-y divide-slate-700">
                  {zreading.map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs w-5 text-right">{row.qty}x</span>
                        <span className="text-white text-sm">{row.description}</span>
                      </div>
                      <span className="text-green-400 font-semibold text-sm">{fmt(row.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: MENSAL ─── */}
        {tab === 'mensal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <p className="text-slate-400 text-sm">Receita do Mês</p>
                </div>
                <p className="text-green-400 text-3xl font-black">{fmt(summaryMonth.revenue)}</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  <p className="text-slate-400 text-sm">Retiradas do Mês</p>
                </div>
                <p className="text-amber-400 text-3xl font-black">{fmt(summaryMonth.withdrawals)}</p>
              </div>
            </div>

            {/* Termômetro Mensal */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-4">🌡️ Termômetro Cerbasi — Mês</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Lucro Líquido: <span className="text-green-400 font-bold">{fmt(summaryMonth.revenue - summaryMonth.withdrawals)}</span></span>
                <span className={`font-bold ${ratioMonth <= 50 ? 'text-green-400' : 'text-red-400'}`}>{ratioMonth.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-5 overflow-hidden">
                <div
                  className={`h-5 rounded-full transition-all duration-700 flex items-center justify-end pr-2 ${ratioMonth <= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(ratioMonth, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>0%</span>
                <span className="text-yellow-500 font-semibold">⚠ 50%</span>
                <span>100%</span>
              </div>
              <p className={`text-center mt-3 font-bold ${ratioMonth <= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {ratioMonth <= 50 ? '✅ Suas retiradas estão saudáveis este mês!' : '🔴 Retiradas acima de 50% — atenção ao pró-labore!'}
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB: CONFIGURAÇÕES ─── */}
        {tab === 'config' && (
          <div className="space-y-4">
            {/* Painel de Senhas (Serial) */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Plug className="w-4 h-4 text-blue-400" />
                <p className="font-semibold text-white">Painel de Senhas (Porta COM)</p>
              </div>
              <div className="flex gap-2 mb-3">
                <select
                  id="select-port"
                  value={selectedPort}
                  onChange={e => setSelectedPort(e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione a Porta COM</option>
                  {ports.map(p => (
                    <option key={p.path} value={p.path}>{p.path} — {p.manufacturer}</option>
                  ))}
                </select>
                <button
                  id="btn-refresh-ports"
                  onClick={loadConfig}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded-xl transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  id="btn-connect-port"
                  onClick={handleConnectPort}
                  disabled={!selectedPort}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-xl text-sm transition-all"
                >
                  Conectar
                </button>
                <button
                  id="btn-disconnect-port"
                  onClick={handleDisconnectPort}
                  className="flex-1 bg-slate-700 hover:bg-red-900 text-white font-semibold py-2 rounded-xl text-sm transition-all"
                >
                  Desconectar
                </button>
              </div>
              {portStatus === 'connected' && (
                <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Painel conectado</p>
              )}
              {portStatus === 'error' && (
                <p className="text-red-400 text-xs mt-2">❌ Falha na conexão</p>
              )}
            </div>

            {/* PINs de acesso */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-amber-400" />
                <p className="font-semibold text-white">PINs de Acesso</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">PIN do Sócio (Master)</label>
                  <input
                    id="input-master-pin"
                    type="password"
                    maxLength={8}
                    placeholder="Novo PIN Master (min. 4 dígitos)"
                    value={masterPin}
                    onChange={e => setMasterPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">PIN do Funcionário</label>
                  <input
                    id="input-func-pin"
                    type="password"
                    maxLength={8}
                    placeholder="Novo PIN Funcionário (min. 4 dígitos)"
                    value={funcPin}
                    onChange={e => setFuncPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  id="btn-save-pins"
                  onClick={handleSavePin}
                  className={`w-full font-bold py-2 rounded-xl text-sm transition-all ${pinSaved ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-500'} text-white`}
                >
                  {pinSaved ? '✓ Salvo!' : 'Salvar PINs'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl z-50 ${toast.type === 'warn' ? 'bg-amber-600' : 'bg-green-600'} text-white`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
