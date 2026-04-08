"use client";
import { useState, useEffect } from 'react';
import CaixaView from '@/components/CaixaView';
import LoginView from '@/components/LoginView';
import AdminView from '@/components/AdminView';

export default function AppRouter() {
  const [currentRoute, setCurrentRoute] = useState('login');

  useEffect(() => {
    const role = localStorage.getItem('ac_role');
    if (role) setCurrentRoute('caixa');
  }, []);

  const navigate = (route) => setCurrentRoute(route);

  // Sistema de rotas manual para resolver navegação de arquivos (file://) no Electron
  if (currentRoute === 'login') return <LoginView onNavigate={navigate} />;
  if (currentRoute === 'caixa') return <CaixaView onNavigate={navigate} />;
  if (currentRoute === 'admin') return <AdminView onNavigate={navigate} />;
  
  return null;
}
