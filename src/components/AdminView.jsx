"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, TrendingUp, TrendingDown, Calendar,
  BarChart2, Settings, Plug, RefreshCw, ChevronRight,
  Lock, CheckCircle2, Printer, AlertCircle, Goal, Package, Pencil, Trash2
} from 'lucide-react';

const fmt = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export default function AdminView({ onNavigate }) {
  const [tab, setTab] = useState('fechamento'); // fechamento | mensal | config
  const [summaryDay, setSummaryDay] = useState({ revenue: 0, withdrawals: 0 });
  const [summaryMonth, setSummaryMonth] = useState({ revenue: 0, withdrawals: 0 });
  const [zreading, setZReading] = useState([]);
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [portStatus, setPortStatus] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [funcPin, setFuncPin] = useState('');
  const [products, setProducts] = useState([]);
  const [draggedProductIndex, setDraggedProductIndex] = useState(null);
  
  // Modals Pin
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  
  // Produto Editor
  const [editingProduct, setEditingProduct] = useState(null);
  const [metaDiaria, setMetaDiaria] = useState('1000');
  const [metaMensal, setMetaMensal] = useState('30000');
  const [metaSaved, setMetaSaved] = useState(false);

  const [pinSaved, setPinSaved] = useState(false);
  const [toast, setToast] = useState(null);

  // Fechamento de Caixa
  const [showFechamento, setShowFechamento] = useState(false);
  const [caixaObservado, setCaixaObservado] = useState('');
  const [caixaDif, setCaixaDif] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadData = useCallback(async () => {
    if (!isElectron) return;
    const [day, month, zr, prods] = await Promise.all([
      window.electronAPI.getSummaryToday(),
      window.electronAPI.getSummaryMonth(),
      window.electronAPI.getZReading(),
      window.electronAPI.getProducts(),
    ]);
    setSummaryDay(day);
    setSummaryMonth(month);
    setZReading(zr);
    setProducts(prods);
  }, []);

  const loadConfig = useCallback(async () => {
    if (!isElectron) return;
    const portList = await window.electronAPI.listPorts();
    setPorts(portList);
    const savedPort = await window.electronAPI.getSetting('com_port');
    if (savedPort) setSelectedPort(savedPort);

    const md = await window.electronAPI.getSetting('meta_diaria');
    if (md) setMetaDiaria(md);
    const mm = await window.electronAPI.getSetting('meta_mensal');
    if (mm) setMetaMensal(mm);

  }, []);

  useEffect(() => {
    const role = localStorage.getItem('ac_role');
    if (role !== 'socio') { 
      onNavigate('login');
      return; 
    }
    loadData();
    loadConfig();
  }, [loadData, loadConfig, onNavigate]);

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

  const handleRequestPinChange = () => {
    setEmailModalOpen(true);
  };

  const handleConfirmPinChange = async () => {
    if (!isElectron) return;
    if (masterPin.length >= 4) await window.electronAPI.setSetting('master_pin', masterPin);
    if (funcPin.length >= 4) await window.electronAPI.setSetting('func_pin', funcPin);
    setPinSaved(true);
    setEmailModalOpen(false);
    setTimeout(() => setPinSaved(false), 2000);
    
    // Alerta de envio de e-mail integrado ao cliente de email do windows (Outlook, Mail)
    const subject = "Senhas Atualizadas - Agiliza Corban";
    const body = `Olá, as senhas foram atualizadas com sucesso no Agiliza Corban.\n\nSócio (Master): ${masterPin}\nFuncionário (Caixa): ${funcPin}\n\nGuarde isto em local seguro!`;
    window.location.href = `mailto:${emailValue}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    showToast('Cliente de e-mail aberto para envio da nova senha.', 'success');
  };

  const handleSaveMetas = async () => {
    if (!isElectron) return;
    await window.electronAPI.setSetting('meta_diaria', metaDiaria);
    await window.electronAPI.setSetting('meta_mensal', metaMensal);
    setMetaSaved(true);
    setTimeout(() => setMetaSaved(false), 2000);
    showToast('Metas salvas com sucesso!');
  };

  const handleImprimir = async () => {
    if (isElectron && window.electronAPI.printReport) {
      await window.electronAPI.printReport();
    } else {
      window.print();
    }
  };

  const calcularFechamento = () => {
    const obs = Math.round(parseFloat(caixaObservado.replace(',', '.')) * 100);
    if (isNaN(obs)) return;
    const liquidoSistema = summaryDay.revenue - summaryDay.withdrawals;
    const diferenca = obs - liquidoSistema;
    setCaixaDif(diferenca);
  };

  const registrarDiferenca = async (tipo) => {
    if (!isElectron) return;
    if (caixaDif === null) return;
    
    const amount = Math.abs(caixaDif);
    if (tipo === 'quebra') {
       await window.electronAPI.addTransaction({
        type: 'SAQUE',
        description: 'Quebra de Caixa (Diferença Negativa)',
        amount_cents: amount,
      });
      showToast(`Registrado ${fmt(amount)} como quebra.`);
    } else if (tipo === 'sobra') {
       // Tratado como receita diversa, fundo de devolução em até 30 dias
       await window.electronAPI.addTransaction({
        type: 'RECIPE',
        description: 'Sobra de Caixa (Diferença Positiva)',
        amount_cents: amount,
      });
      showToast(`Registrado ${fmt(amount)} como sobra no fundo.`);
    }
    
    // Realiza backup do banco na pasta Documentos
    const backupPath = await window.electronAPI.backupDb();
    if (backupPath) {
      showToast(`Fechamento concluído. Backup salvo em Documentos!`);
    }

    setShowFechamento(false);
    setCaixaDif(null);
    setCaixaObservado('');
    loadData();
  };

  const handleDragStart = (index) => {
    setDraggedProductIndex(index);
  };
  
  const handleDrop = async (index) => {
    if (draggedProductIndex === null || draggedProductIndex === index) return;
    const items = Array.from(products);
    const [reorderedItem] = items.splice(draggedProductIndex, 1);
    items.splice(index, 0, reorderedItem);
    
    setProducts(items);
    setDraggedProductIndex(null);
    
    if (isElectron && window.electronAPI.reorderProducts) {
      await window.electronAPI.reorderProducts(items.map(p => p.id));
      showToast('Ordem salva.');
    }
  };

  const deleteProduct = async (id) => {
    if (!isElectron) return;
    if (!confirm('Deseja realmente remover este produto?')) return;
    await window.electronAPI.deleteProduct(id);
    loadData();
    showToast('Produto removido.');
  };

  const saveProduct = async () => {
    if (!isElectron || !editingProduct) return;
    const valueNum = Math.round(parseFloat(String(editingProduct.value).replace(',', '.')) * 100);
    const id = editingProduct.isNew ? editingProduct.label.toLowerCase().replace(/\s+/g, '-') : editingProduct.id;
    await window.electronAPI.saveProduct({ ...editingProduct, id, value: valueNum });
    setEditingProduct(null);
    loadData();
    showToast('Produto salvo.');
  };

  const totalZ = zreading.reduce((acc, r) => acc + r.total, 0);
  const targetDia = Math.round(parseFloat(metaDiaria) * 100) || 1;
  const targetMes = Math.round(parseFloat(metaMensal) * 100) || 1;
  
  const progressoDia = (summaryDay.revenue / targetDia) * 100;
  const progressoMes = (summaryMonth.revenue / targetMes) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col print-bg-white">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 print-hide">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('caixa')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-white">Painel do Sócio</h1>
            <p className="text-slate-400 text-xs">Fechamento · Relatórios · Configurações</p>
          </div>
        </div>
        {(tab === 'fechamento' || tab === 'mensal') && (
          <button onClick={handleImprimir} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-sm transition-all">
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </button>
        )}
      </header>

      <div className="flex gap-1 px-6 pt-4 print-hide">
        {[
          { key: 'fechamento', label: 'Fechamento (Z)', icon: BarChart2 },
          { key: 'mensal', label: 'Visão Mensal', icon: Calendar },
          { key: 'produtos', label: 'Produtos', icon: Package },
          { key: 'config', label: 'Configurações', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 printable-area">
        {tab === 'fechamento' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 print-box">
                <p className="text-slate-400 text-xs mb-1">Receita do Dia</p>
                <p className="text-green-400 text-2xl font-bold">{fmt(summaryDay.revenue)}</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 print-box">
                <p className="text-slate-400 text-xs mb-1">Retiradas</p>
                <p className="text-amber-400 text-2xl font-bold">{fmt(summaryDay.withdrawals)}</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 print-box">
                <p className="text-slate-400 text-xs mb-1">Lucro Líquido</p>
                <p className="text-blue-400 text-2xl font-bold">{fmt(summaryDay.revenue - summaryDay.withdrawals)}</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 print-box">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">📈 Progresso da Meta — Hoje</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Atual: <span className="text-green-400 font-bold">{fmt(summaryDay.revenue)}</span></span>
                <span className="text-slate-300">Meta: <span className="font-bold">{fmt(targetDia)}</span></span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-700 ${progressoDia >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(progressoDia, 100)}%` }}
                />
              </div>
              <p className="text-right text-xs mt-1 font-semibold text-slate-400">
                {progressoDia.toFixed(1)}% {progressoDia >= 100 ? '✅ Meta Atingida!' : ''}
              </p>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden print-box">
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

        {tab === 'mensal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 print-box">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <p className="text-slate-400 text-sm">Receita do Mês</p>
                </div>
                <p className="text-green-400 text-3xl font-black">{fmt(summaryMonth.revenue)}</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 print-box">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  <p className="text-slate-400 text-sm">Retiradas do Mês</p>
                </div>
                <p className="text-amber-400 text-3xl font-black">{fmt(summaryMonth.withdrawals)}</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 print-box">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-4">📈 Progresso da Meta — Mês</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Lucro Líquido Realizado: <span className="text-blue-400 font-bold">{fmt(summaryMonth.revenue - summaryMonth.withdrawals)}</span></span>
                <span className="font-bold text-green-400">{progressoMes.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-5 overflow-hidden">
                <div
                  className={`h-5 rounded-full transition-all duration-700 flex items-center justify-end pr-2 ${progressoMes >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(progressoMes, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>0%</span>
                <span className="text-slate-400 font-semibold">Meta: {fmt(targetMes)}</span>
                <span>100%</span>
              </div>
              <p className="text-center mt-3 font-bold text-green-400">
                {progressoMes >= 100 ? '✅ Parabéns! Meta Mensal Atingida!' : 'Continue assim, falta pouco para a meta!'}
              </p>
            </div>
          </div>
        )}

        {tab === 'produtos' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <p className="font-semibold text-white">Catálogo de Serviços Rápido</p>
                <button
                  onClick={() => setEditingProduct({ isNew: true, label: '', value: '', icon: 'FileText', color: 'bg-blue-700 hover:bg-blue-600' })}
                  className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                >
                  + Novo Produto
                </button>
              </div>
              <div className="divide-y divide-slate-700">
                {products.map((p, index) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className="flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-slate-500 mr-2 flex flex-col justify-center gap-[2px]">
                        <div className="w-4 h-[2px] bg-slate-500 rounded-full"></div>
                        <div className="w-4 h-[2px] bg-slate-500 rounded-full"></div>
                        <div className="w-4 h-[2px] bg-slate-500 rounded-full"></div>
                      </div>
                      <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center`}>
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{p.label}</p>
                        <p className="text-slate-400 text-xs">{fmt(p.value)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingProduct({ ...p, value: (p.value / 100).toFixed(2).replace('.', ',') })} className="text-slate-400 hover:text-white p-2">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="text-slate-400 hover:text-red-400 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="space-y-4">
            
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Goal className="w-4 h-4 text-green-400" />
                <p className="font-semibold text-white">Metas de Faturamento</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Meta Diária (R$)</label>
                  <input
                    type="text" placeholder="Ex: 1000"
                    value={metaDiaria} onChange={e => setMetaDiaria(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Meta Mensal (R$)</label>
                  <input
                    type="text" placeholder="Ex: 30000"
                    value={metaMensal} onChange={e => setMetaMensal(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveMetas}
                className={`w-full font-bold py-2 rounded-xl text-sm transition-all ${metaSaved ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
              >
                {metaSaved ? '✓ Atualizado' : 'Salvar Metas'}
              </button>
            </div>

            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-amber-400" />
                <p className="font-semibold text-white">Gestão de Caixas e PINs</p>
              </div>
              <p className="text-xs text-slate-400 mb-4">A redefinição de senha via interface acionará um alerta de e-mail local na operação.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Redefinir PIN do Sócio (Master)</label>
                  <input
                    type="password" maxLength={8} placeholder="Novo PIN Master (min. 4 dígitos)"
                    value={masterPin} onChange={e => setMasterPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Redefinir PIN do Funcionário (Caixa)</label>
                  <input
                    type="password" maxLength={8} placeholder="Novo PIN Funcionário (min. 4 dígitos)"
                    value={funcPin} onChange={e => setFuncPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={handleRequestPinChange}
                  className={`w-full font-bold py-2 rounded-xl text-sm transition-all ${pinSaved ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-500'} text-white`}
                >
                  {pinSaved ? '✓ Salvo e Enviado!' : 'Continuar para Enviar E-mail e Salvar'}
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Plug className="w-4 h-4 text-blue-400" />
                <p className="font-semibold text-white">Painel de Senhas (Porta COM)</p>
              </div>
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedPort}
                  onChange={e => setSelectedPort(e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione a Porta COM</option>
                  {ports.map(p => (
                    <option key={p.path} value={p.path}>{p.path} — {p.manufacturer}</option>
                  ))}
                </select>
                <button onClick={loadConfig} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-xl transition-all">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConnectPort} disabled={!selectedPort}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-xl text-sm transition-all"
                >
                  Conectar
                </button>
                <button
                  onClick={handleDisconnectPort}
                  className="flex-1 bg-slate-700 hover:bg-red-900 text-white font-semibold py-2 rounded-xl text-sm transition-all"
                >
                  Desconectar
                </button>
              </div>
              {portStatus === 'connected' && <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Painel conectado</p>}
              {portStatus === 'error' && <p className="text-red-400 text-xs mt-2">❌ Falha na conexão</p>}
            </div>

          </div>
        )}
      </div>

      {tab === 'fechamento' && (
        <button onClick={() => setShowFechamento(true)} className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-8 rounded-full shadow-[0_10px_30px_-5px_rgba(37,99,235,0.6)] flex items-center gap-3 transition-all z-40 print-hide hover:scale-105 active:scale-95">
          <BarChart2 className="w-5 h-5"/> Realizar Fechamento de Caixa
        </button>
      )}

      {showFechamento && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 print-hide">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-xl mb-4 text-center">Conferência de Caixa</h3>
            
            <div className="bg-slate-700 p-4 rounded-xl mb-4">
              <p className="text-slate-400 text-sm text-center mb-1">Lucro Líquido Esperado (Caixa)</p>
              <p className="text-white text-3xl font-black text-center">{fmt(summaryDay.revenue - summaryDay.withdrawals)}</p>
            </div>

            <p className="text-slate-300 text-sm mb-2">Digite o valor físico conferido no caixa:</p>
            <input
              type="text" placeholder="Ex: 500,00"
              value={caixaObservado} onChange={e => setCaixaObservado(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-4 text-white text-center text-2xl font-bold focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            
            <button
              onClick={calcularFechamento}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all mb-4"
            >
              Calcular Diferença
            </button>

            {caixaDif !== null && (
              <div className={`p-4 rounded-xl mt-4 border ${caixaDif === 0 ? 'bg-green-900/30 border-green-700' : caixaDif < 0 ? 'bg-red-900/40 border-red-700' : 'bg-transparent border-blue-500 border-dashed'}`}>
                {caixaDif === 0 && <p className="text-green-400 text-center font-bold text-lg">Caixa Bateu Perfeitamente! ✅</p>}
                
                {caixaDif < 0 && (
                  <div className="text-center">
                    <p className="text-red-400 font-bold mb-1">Diferença Negativa (Faltou R$ {fmt(Math.abs(caixaDif)).replace('R$', '')})</p>
                    <p className="text-xs text-slate-400 mb-3">Deseja descontar como quebra de caixa?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setCaixaDif(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-semibold">Voltar e Conferir</button>
                      <button onClick={() => registrarDiferenca('quebra')} className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded-lg text-sm font-semibold text-white">Registrar Quebra</button>
                    </div>
                  </div>
                )}

                {caixaDif > 0 && (
                  <div className="text-center">
                    <p className="text-blue-400 font-bold mb-1">Sobra de Caixa (+ R$ {fmt(caixaDif).replace('R$', '')})</p>
                    <p className="text-xs text-slate-400 mb-3">Sobra será guardada no fundo apurador por 30 dias.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setCaixaDif(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-semibold">Voltar e Conferir</button>
                      <button onClick={() => registrarDiferenca('sobra')} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-sm font-semibold text-white">Registrar Sobra</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => { setShowFechamento(false); setCaixaDif(null); }} className="mt-4 w-full text-slate-400 hover:text-white text-sm font-semibold">
              Cancelar e Fechar
            </button>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 print-hide">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-xl mb-4">{editingProduct.isNew ? 'Novo Produto' : 'Editar Produto'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Nome do Serviço</label>
                <input
                  type="text" placeholder="Ex: Cópia Colorida"
                  value={editingProduct.label} onChange={e => setEditingProduct({ ...editingProduct, label: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Valor (R$)</label>
                <input
                  type="text" placeholder="Ex: 5,00"
                  value={editingProduct.value} onChange={e => setEditingProduct({ ...editingProduct, value: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditingProduct(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-xl text-sm transition-all">Cancelar</button>
                <button onClick={saveProduct} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-xl text-sm transition-all">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 print-hide">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-xl mb-4">Enviar senha por E-mail</h3>
            <p className="text-slate-400 text-xs mb-4">Insira o e-mail do sócio para enviar a nova senha configurada com segurança antes de salvar.</p>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">E-mail de Destino</label>
                <input
                  type="email" placeholder="contato@empresa.com.br"
                  value={emailValue} onChange={e => setEmailValue(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEmailModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-xl text-sm transition-all">Cancelar</button>
                <button onClick={handleConfirmPinChange} disabled={!emailValue.trim()} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition-all">Salvar e Enviar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl z-50 ${toast.type === 'warn' ? 'bg-amber-600' : 'bg-green-600'} text-white`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
