"use client";
import { useState, useEffect } from 'react';
import { Lock, Building2 } from 'lucide-react';

export default function LoginView({ onNavigate }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Fallbacks de segurança originais 1234 e 0000 
  // Na produção isso seria puxado do localStorage ou database setting.
  const handleKey = async (digit) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    
    if (newPin.length >= 4) {
      setTimeout(() => validate(newPin), 150);
    }
  };

  const validate = async (value) => {
    // 1. Tentar puxar os PINs do BD offline
    let masterPin = '1234';
    let funcPin = '0000';
    if (typeof window !== 'undefined' && window.electronAPI) {
      const dbMaster = await window.electronAPI.getSetting('master_pin');
      const dbFunc = await window.electronAPI.getSetting('func_pin');
      if (dbMaster) masterPin = String(dbMaster);
      if (dbFunc) funcPin = String(dbFunc);
    }

    if (value === masterPin) {
      localStorage.setItem('ac_role', 'socio');
      onNavigate('caixa');
    } else if (value === funcPin) {
      localStorage.setItem('ac_role', 'funcionario');
      onNavigate('caixa');
    } else {
      setShake(true);
      setError('PIN incorreto. Tente novamente.');
      setTimeout(() => { setShake(false); setPin(''); }, 700);
    }
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKey(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        validate(pin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, handleKey, validate]);

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-blue-600 p-3 rounded-2xl">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Agiliza Corban</h1>
          <p className="text-slate-400 text-sm">Sistema Offline de Caixa</p>
        </div>
      </div>

      <div className={`bg-slate-800 border border-slate-700 rounded-3xl p-8 w-full max-w-xs shadow-2xl transition-all ${shake ? 'animate-pulse border-red-500' : ''}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-slate-400" />
          <p className="text-slate-400 text-sm text-center">Digite a senha de acesso</p>
        </div>

        <div className="flex justify-center gap-4 my-6">
          {dots.map((filled, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${filled ? 'bg-blue-500 border-blue-500 scale-110' : 'border-slate-500'}`} />
          ))}
        </div>

        {error && <p className="text-red-400 text-xs text-center mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => handleKey(String(n))}
              className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-xl py-4 rounded-xl transition-all duration-150"
            >
              {n}
            </button>
          ))}
          <div /> 
          <button
            onClick={() => handleKey('0')}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-xl py-4 rounded-xl transition-all duration-150"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="bg-slate-700 hover:bg-red-900 active:scale-95 text-slate-300 font-bold py-4 rounded-xl transition-all duration-150 text-sm"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
