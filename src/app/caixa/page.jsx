"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Printer, FileText, QrCode, CreditCard, BarChart3,
  PlusCircle, LogOut, ClipboardList, X, DollarSign,
  TrendingUp, Trash2, AlertCircle, Hash, Settings
} from 'lucide-react';

const SERVICES = [
  { id: 'imp-pb',    label: 'Impressão P&B',       value: 100,  icon: Printer,     color: 'bg-slate-700 hover:bg-slate-600' },
  { id: 'imp-color', label: 'Impressão Colorida',  value: 200,  icon: Printer,     color: 'bg-violet-700 hover:bg-violet-600' },
  { id: 'boleto',    label: 'Taxa Boleto',          value: 400,  icon: FileText,    color: 'bg-blue-700 hover:bg-blue-600' },
  { id: 'gov-br',    label: 'Acesso Gov.br',        value: 1000, icon: QrCode,      color: 'bg-cyan-700 hover:bg-cyan-600' },
  { id: 'extrato',   label: 'Extrato Bancário',     value: 300,  icon: BarChart3,   color: 'bg-indigo-700 hover:bg-indigo-600' },
  { id: 'xerox',     label: 'Cópia / Xerox',       value: 100,  icon: FileText,    color: 'bg-teal-700 hover:bg-teal-600' },
  { id: 'digital',   label: 'Digitalização',        value: 150,  icon: FileText,    color: 'bg-emerald-700 hover:bg-emerald-600' },
  { id: 'cartao',    label: 'Débito/Crédito Caixa', value: 500, icon: CreditCard,  color: 'bg-amber-700 hover:bg-amber-600' },
];

const fmt = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export default function CaixaPage() {
  const router = useRouter();
  const [role, setRole] = useState('funcionario');
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, withdrawals: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDesc, setModalDesc] = useState('');
  const [modalValue, setModalValue] = useState('');
  const [saqueModalOpen, setSaqueModalOpen] = useState(false);
  const [saqueValue, setSaqueValue] = useState('');
  const [toast, setToast] = useState(null);
  const [senhaAtual, setSenhaAtual] = useState(0);
  const [senhaToast, setSenhaToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadData = useCallback(async () => {
    if (!isElectron) return;
    const [txs, sum] = await Promise.all([
      window.electronAPI.getTransactionsToday(),
      window.electronAPI.getSummaryToday(),
    ]);
    setTransactions(txs);
    setSummary(sum);
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

  // Sprint 3 — Chamar Senha
  const handleChamarSenha = async () => {
    let result;
    if (isElectron) {
      result = await window.electronAPI.callSenha();
    } else {
      const next = senhaAtual + 1;
      result = { senha: String(next).padStart(3, '0'), numero: next };
      setSenhaAtual(next);
    }
    setSenhaToast(result.senha);
    setTimeout(() => setSenhaToast(null), 3000);
  };

  const ratio = summary.revenue > 0 ? (summary.withdrawals / summary.revenue) * 100 : 0;
  const termometroGreen = ratio <= 50;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* HEADER */}
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
          {/* Botão Chamar Senha */}
          <button
            id="btn-senha"
            onClick={handleChamarSenha}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Hash className="w-4 h-4" />
            <span>Chamar Senha</span>
            {senhaAtual > 0 && (
              <span className="bg-purple-900 text-purple-300 text-xs px-2 py-0.5 rounded-lg">
                #{String(senhaAtual).padStart(3, '0')}
              </span>
            )}
          </button>

          {role === 'socio' && (
            <>
              <button
                id="btn-saque"
                onClick={() => setSaqueModalOpen(true)}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              >
                <TrendingUp className="w-4 h-4" /> Retirada
              </button>
              <button
                id="btn-admin"
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-sm transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            id="btn-logout"
            onClick={() => { localStorage.removeItem('ac_role'); router.push('/login'); }}
            className="flex items-center gap-2 bg-slate-700 hover:bg-red-900 px-3 py-2 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* GRID DE SERVIÇOS */}
        <main className="flex-1 p-5 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {SERVICES.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  id={`service-${s.id}`}
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
            {/* Avulso */}
            <button
              id="service-avulso"
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

          {/* TERMÔMETRO só Sócio */}
          {role === 'socio' && (
            <div className="mt-6 bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">🌡️ Termômetro Cerbasi — Hoje</p>
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

        {/* SIDEBAR LANÇAMENTOS */}
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

      {/* TOAST PRINCIPAL */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl z-50 ${toast.type === 'warn' ? 'bg-amber-600' : 'bg-green-600'} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* TOAST SENHA */}
      {senhaToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-purple-700 text-white px-8 py-5 rounded-3xl shadow-2xl z-50 text-center">
          <p className="text-xs uppercase tracking-widest text-purple-300 mb-1">Próxima Senha</p>
          <p className="text-5xl font-black tracking-widest">#{senhaToast}</p>
        </div>
      )}

      {/* MODAL AVULSO */}
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

      {/* MODAL SAQUE */}
      {saqueModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-amber-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">Registrar Retirada</h3>
                <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Mantenha abaixo de 50% da receita
                </p>
              </div>
              <button onClick={() => setSaqueModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input
              id="saque-value" type="text" placeholder="Valor (ex: 200,00)"
              value={saqueValue} onChange={e => setSaqueValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSaque()}
              className="w-full bg-slate-700 border border-amber-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              autoFocus
            />
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
