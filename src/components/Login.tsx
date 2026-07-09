// src/components/Login.tsx
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Bus, Lock, LogIn, ShieldAlert, ShieldCheck, UserCheck, Eye, EyeOff, KeyRound } from 'lucide-react';

interface LoginProps {
  systemUsers: User[];
  onLoginSuccess: (user: User) => void;
  theme: 'light' | 'cosmic' | 'cyber';
}

export default function Login({ systemUsers, onLoginSuccess, theme }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    const foundUser = systemUsers.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!foundUser) {
      setError('Пользователь с таким логином не найден');
      return;
    }

    if (foundUser.password !== password) {
      setError('Неверный пароль. Попробуйте еще раз');
      return;
    }

    onLoginSuccess(foundUser);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Администратор',
          style: 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
        };
      case 'dispatcher':
        return {
          label: 'Диспетчер',
          style: 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
        };
      case 'manager':
        return {
          label: 'Начальник / Руководитель',
          style: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
        };
      default:
        return {
          label: 'Просмотр',
          style: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
        };
    }
  };

  return (
    <div className={`theme-${theme} min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans`}>
      {/* Dynamic glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 animate-pulse duration-5000"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse duration-4000"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 z-10 transition-all duration-300">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600/10 text-blue-500 rounded-xl border border-blue-500/20">
            <Bus className="w-8 h-8 animate-bounce" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">СХОДЫ-СЕРВИС</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Система линейного контроля и аудита сходов
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Имя пользователя (Логин):</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <UserCheck className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Например: admin, dispatcher..."
                className="w-full bg-slate-950/60 border border-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Пароль:</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Введите пароль..."
                className="w-full bg-slate-950/60 border border-slate-800 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/10"
          >
            <LogIn className="w-4 h-4" />
            <span>Авторизоваться в системе</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider border-t border-slate-800/60 pt-4 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Безопасная авторизация по ролям</span>
        </div>
      </div>
    </div>
  );
}
