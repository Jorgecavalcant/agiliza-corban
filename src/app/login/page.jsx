"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Building2 } from 'lucide-react';

const MASTER_PIN = '1234'; // TODO: tornarel configurável via Settings

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleKey = (digit) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length >= 4) {
      setTimeout(() => validate(newPin), 150);
    }
  };

  const validate = (value) => {
    if (value === MASTER_PIN) {
      // Sócio — acesso total
      localStorage.setItem('ac_role', 'socio');
      router.push('/caixa');
    } else if (value === '0000') {
      // Funcionário — acesso restrito
      localStorage.setItem('ac_role', 'funcionario');
      router.push('/caixa');
    } else {
      setShake(true);
      setError('PIN incorreto. Tente novamente.');
      setTimeout(() => { setShake(false); setPin(''); }, 700);
    }
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-blue-600 p-3 rounded-2xl">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Agiliza Corban</h1>
          <p className="text-slate-400 text-sm">Sistema de Caixa Offline</p>
        </div>
      </div>

      {/* Card */}
      <div className={`bg-slate-800 border border-slate-700 rounded-3xl p-8 w-full max-w-xs shadow-2xl transition-all ${shake ? 'animate-pulse border-red-500' : ''}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-slate-400" />
          <p className="text-slate-400 text-sm text-center">Digite seu PIN de acesso</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-4 my-6">
          {dots.map((filled, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${filled ? 'bg-blue-500 border-blue-500 scale-110' : 'border-slate-500'}`} />
          ))}
        </div>

        {error && <p className="text-red-400 text-xs text-center mb-4">{error}</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              id={`pin-btn-${n}`}
              onClick={() => handleKey(String(n))}
              className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-xl py-4 rounded-xl transition-all duration-150"
            >
              {n}
            </button>
          ))}
          <div /> {/* spacer */}
          <button
            id="pin-btn-0"
            onClick={() => handleKey('0')}
            className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-xl py-4 rounded-xl transition-all duration-150"
          >
            0
          </button>
          <button
            id="pin-btn-del"
            onClick={handleDelete}
            className="bg-slate-700 hover:bg-red-900 active:scale-95 text-slate-300 font-bold py-4 rounded-xl transition-all duration-150 text-sm"
          >
            ⌫
          </button>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          Sócio: PIN mestre · Funcionário: 0000
        </p>
      </div>
    </div>
  );
}
