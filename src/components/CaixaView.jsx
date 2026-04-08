"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  Printer, FileText, QrCode, CreditCard, BarChart3,
  PlusCircle, LogOut, ClipboardList, X, DollarSign,
  TrendingUp, Trash2, AlertCircle, Hash, Settings, Package
} from 'lucide-react';

const ICON_MAP = {
  'Printer': Printer, 'FileText': FileText, 'QrCode': QrCode,
  'CreditCard': CreditCard, 'BarChart3': BarChart3, 'Package': Package
};

const fmt = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

// Aqui ele já carrega o objeto electron global (se existir no Electron preloads)
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export default function CaixaView({ onNavigate }) {
  const [role, setRole] = useState('funcionario');
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, withdrawals: 0 });
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDesc, setModalDesc] = useState('');
  const [modalValue, setModalValue] = useState('');
  const [saqueModalOpen, setSaqueModalOpen] = useState(false);
  const [saqueValue, setSaqueValue] = useState('');
  const [toast, setToast] = useState(null);
  const [senhaAtual, setSenhaAtual] = useState(0);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadData = useCallback(async () => {
    if (!isElectron) return;
    const [txs, sum, prods] = await Promise.all([
      window.electronAPI.getTransactionsToday(),
      window.electronAPI.getSummaryToday(),
      window.electronAPI.getProducts(),
    ]);
    setTransactions(txs);
    setSummary(sum);
    setProducts(prods);
    const s = await window.electronAPI.getCurrentSenha();
    setSenhaAtual(s);
  }, []);

  useEffect(() => {
    const r = localStorage.getItem('ac_role') || 'funcionario';
    setRole(r);
    loadData();
  }, [loadData]);

  const addService = async (service) => {
    if (!isElectron) { showToast('Modo Web: DB não disponível', 'warn'); return; }
    await window.electronAPI.addTransaction({
      type: 'RECIPE',
      description: service.label,
      amount_cents: service.value,
    });
    await loadData();
    showToast(`✓ ${service.label} — ${fmt(service.value)}`);
  };

  const addAvulso = async () => {
    const cents = Math.round(parseFloat(modalValue.replace(',', '.')) * 100);
    if (!modalDesc.trim() || isNaN(cents) || cents <= 0) return;
    if (isElectron) {
      await window.electronAPI.addTransaction({ type: 'AVULSO', description: modalDesc, amount_cents: cents });
      await loadData();
    }
    setModalOpen(false); setModalDesc(''); setModalValue('');
    showToast(`✓ ${modalDesc} — ${fmt(cents)}`);
  };

  const addSaque = async () => {
    if (role !== 'socio') return;
    const cents = Math.round(parseFloat(saqueValue.replace(',', '.')) * 100);
    if (isNaN(cents) || cents <= 0) return;
    if (isElectron) {
      await window.electronAPI.addTransaction({ type: 'SAQUE', description: 'Retirada Sócio', amount_cents: cents });
      await loadData();
    }
    setSaqueModalOpen(false); setSaqueValue('');
    showToast('Retirada registrada!', 'warn');
  };

  const deleteTransaction = async (id) => {
    if (role !== 'socio' || !isElectron) return;
    await window.electronAPI.deleteTransaction(id);
    await loadData();
    showToast('Registro removido.', 'warn');
  };

  const handleChamarSenha = async () => {
    if (isElectron) {
      const result = await window.electronAPI.callSenha();
      setSenhaAtual(result.numero);
    } else {
      const next = senhaAtual + 1;
      setSenhaAtual(next);
    }
  };

  const ratio = summary.revenue > 0 ? (summary.withdrawals / summary.revenue) * 100 : 0;
  const termometroGreen = ratio <= 50;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">Agiliza Corban</h1>
            <p className="text-slate-400 text-xs">
              {role === 'socio' ? '👑 Sócio' : '🧑‍💼 Funcionário'} ·{' '}
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {senhaAtual > 0 && (
            <div className="flex items-center bg-transparent border border-red-500/50 rounded-xl overflow-hidden shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]">
              <span className="bg-red-600 font-bold px-3 py-2 text-white text-sm uppercase tracking-wider">
                Senha
              </span>
              <span className="bg-slate-900 px-4 py-2 text-white font-black text-lg tracking-widest min-w-[80px] text-center border-l border-red-500/50">
                #{String(senhaAtual).padStart(3, '0')}
              </span>
            </div>
          )}
          <button
            onClick={handleChamarSenha}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 px-3 py-2 rounded-xl text-sm font-medium transition-all ml-2"
          >
            <Hash className="w-4 h-4" />
            <span>Chamar Próxima</span>
          </button>

          {role === 'socio' && (
            <>
              <button
                onClick={() => setSaqueModalOpen(true)}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              >
                <TrendingUp className="w-4 h-4" /> Retirada
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-sm transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => { localStorage.removeItem('ac_role'); onNavigate('login'); }}
            className="flex items-center gap-2 bg-slate-700 hover:bg-red-900 px-3 py-2 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-5 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(s => {
              const Icon = ICON_MAP[s.icon] || Package;
              return (
                <button
                  key={s.id}
                  onClick={() => addService(s)}
                  className={`${s.color} active:scale-95 rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-150 shadow-lg group`}
                >
                  <Icon className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" />
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm leading-tight">{s.label}</p>
                    <p className="text-white/70 text-lg font-bold mt-1">{fmt(s.value)}</p>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => setModalOpen(true)}
              className="bg-slate-700 hover:bg-slate-600 border-2 border-dashed border-slate-500 active:scale-95 rounded-2xl p-5 flex flex-col items-center gap-3 transition-all group"
            >
              <PlusCircle className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
              <div className="text-center">
                <p className="text-slate-300 font-semibold text-sm">Produto / Serviço</p>
                <p className="text-slate-500 text-xs mt-1">Avulso / Diverso</p>
              </div>
            </button>
          </div>

          {role === 'socio' && (
            <div className="mt-6 bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">🌡️ Progresso da Meta — Hoje</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Receita: <span className="text-green-400 font-bold">{fmt(summary.revenue)}</span></span>
                <span className="text-slate-300">Retiradas: <span className={`font-bold ${termometroGreen ? 'text-green-400' : 'text-red-400'}`}>{fmt(summary.withdrawals)}</span></span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-700 ${termometroGreen ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(ratio, 100)}%` }}
                />
              </div>
              <p className={`text-right text-xs mt-1 font-semibold ${termometroGreen ? 'text-green-400' : 'text-red-400'}`}>
                {ratio.toFixed(1)}% {termometroGreen ? '✅ Saudável' : '🔴 Atenção!'}
              </p>
            </div>
          )}
        </main>

        <aside className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Lançamentos de Hoje</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {transactions.length === 0 && (
              <p className="text-slate-600 text-sm text-center mt-8">Nenhum lançamento ainda.</p>
            )}
            {transactions.map(tx => (
              <div
                key={tx.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 border ${tx.type === 'SAQUE' ? 'border-amber-800/40 bg-amber-900/10' : 'border-slate-700 bg-slate-750'}`}
              >
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{tx.description}</p>
                  <p className={`text-xs font-bold ${tx.type === 'SAQUE' ? 'text-amber-400' : 'text-green-400'}`}>
                    {tx.type === 'SAQUE' ? '-' : '+'}{fmt(tx.amount_cents)}
                  </p>
                </div>
                {role === 'socio' && (
                  <button onClick={() => deleteTransaction(tx.id)} className="ml-2 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-700">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Total do dia</span>
              <span className="text-green-400 font-bold text-sm">{fmt(summary.revenue)}</span>
            </div>
            {role === 'socio' && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Retiradas</span>
                <span className="text-amber-400 font-bold">{fmt(summary.withdrawals)}</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl z-50 ${toast.type === 'warn' ? 'bg-amber-600' : 'bg-green-600'} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Espaço para Toasts */}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold text-lg">Produto / Serviço Avulso</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input
                id="avulso-desc" type="text" placeholder="Descrição (ex: Recuperação Gov.br)"
                value={modalDesc} onChange={e => setModalDesc(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <input
                id="avulso-value" type="text" placeholder="Valor (ex: 15,00)"
                value={modalValue} onChange={e => setModalValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAvulso()}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button id="avulso-confirm" onClick={addAvulso}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all">
              Registrar
            </button>
          </div>
        </div>
      )}

      {saqueModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">Registrar Retirada</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Receita total hoje: <span className="font-bold text-white">{fmt(summary.revenue)}</span>
                </p>
              </div>
              <button onClick={() => setSaqueModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <input
              id="saque-value" type="text" placeholder="Valor (ex: 200,00)"
              value={saqueValue} onChange={e => setSaqueValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSaque()}
              className={`w-full bg-slate-700 border rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors ${
                (parseFloat(saqueValue.replace(',', '.')) || 0) * 100 > summary.revenue * 0.5 
                  ? 'border-red-500 focus:border-red-500 text-red-100' 
                  : (parseFloat(saqueValue.replace(',', '.')) || 0) > 0 
                    ? 'border-green-500 focus:border-green-500 text-green-100' 
                    : 'border-slate-600 focus:border-amber-500'
              }`}
              autoFocus
            />
            { (parseFloat(saqueValue.replace(',', '.')) || 0) * 100 > summary.revenue * 0.5 && 
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Alerta: Valor ultrapassa 50% da receita atual.</p>
            }

            <button id="saque-confirm" onClick={addSaque}
              className="mt-5 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all">
              Confirmar Retirada
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
