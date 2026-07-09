import React, { useState, useEffect } from 'react';
import { 
  INITIAL_BREAKDOWNS, INITIAL_DRIVERS, INITIAL_DISPATCHERS, 
  INITIAL_VEHICLES, INITIAL_INCIDENTS 
} from './data';
import { Incident, Breakdown, Driver, Dispatcher, Vehicle, User } from './types';

// Components
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import AddIncident from './components/AddIncident';
import Upload from './components/Upload';
import BreakdownsCatalog from './components/BreakdownsCatalog';
import References from './components/References';
import DataQuality from './components/DataQuality';
import Login from './components/Login';

// Icons
import { 
  LayoutDashboard, ClipboardList, PlusCircle, UploadCloud, 
  Wrench, BookOpen, ShieldCheck, ShieldAlert, CheckCircle, RefreshCcw, LogOut, Bus 
} from 'lucide-react';

const DEFAULT_SYSTEM_USERS: User[] = [
  { id: 1, name: 'Петров Иван Иванович (Диспетчер)', username: 'dispatcher', role: 'dispatcher', password: '123' },
  { id: 2, name: 'Смирнов Александр Викторович (Администратор)', username: 'admin', role: 'admin', password: 'admin' },
  { id: 3, name: 'Козлов Сергей Петрович (Начальник колонны)', username: 'kolonna', role: 'manager', password: '123' },
  { id: 4, name: 'Соколов Дмитрий Анатольевич (Руководитель)', username: 'manager', role: 'manager', password: '123' },
  { id: 5, name: 'Сидоров Петр Сергеевич (Просмотр)', username: 'viewer', role: 'viewer', password: '123' }
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Interface Themes: 'light' (Светлая классика), 'cosmic' (Космическая синева), 'cyber' (Кибернетический изумруд)
  const [theme, setTheme] = useState<'light' | 'cosmic' | 'cyber'>(() => {
    return (localStorage.getItem('shody_theme') as 'light' | 'cosmic' | 'cyber') || 'light';
  });

  // Role Permissions
  const [systemUsers, setSystemUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('shody_system_users');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_SYSTEM_USERS; }
    }
    return DEFAULT_SYSTEM_USERS;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('shody_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Main persistence states
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    const hasClearedV2 = localStorage.getItem('shody_incidents_cleared_v2');
    if (!hasClearedV2) {
      localStorage.setItem('shody_incidents_cleared_v2', 'true');
      localStorage.setItem('shody_incidents', JSON.stringify([]));
      return [];
    }
    const saved = localStorage.getItem('shody_incidents');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_INCIDENTS; }
    }
    return INITIAL_INCIDENTS;
  });
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>(() => {
    const saved = localStorage.getItem('shody_breakdowns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_BREAKDOWNS; }
    }
    return INITIAL_BREAKDOWNS;
  });
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('shody_drivers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_DRIVERS; }
    }
    return INITIAL_DRIVERS;
  });
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>(() => {
    const saved = localStorage.getItem('shody_dispatchers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_DISPATCHERS; }
    }
    return INITIAL_DISPATCHERS;
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('shody_vehicles');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_VEHICLES; }
    }
    return INITIAL_VEHICLES;
  });

  // Confirmation states for custom in-app modals (to avoid window.confirm iframe blocks)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Sync back to localstorage whenever state changes
  useEffect(() => {
    localStorage.setItem('shody_incidents', JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem('shody_breakdowns', JSON.stringify(breakdowns));
  }, [breakdowns]);

  useEffect(() => {
    localStorage.setItem('shody_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('shody_dispatchers', JSON.stringify(dispatchers));
  }, [dispatchers]);

  useEffect(() => {
    localStorage.setItem('shody_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('shody_system_users', JSON.stringify(systemUsers));
  }, [systemUsers]);

  // Auto-clear notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Database state mutations
  const handleAddIncident = (newIncident: Omit<Incident, 'id'>) => {
    const nextId = incidents.length > 0 ? Math.max(...incidents.map(i => i.id)) + 1 : 1;
    const added: Incident = { id: nextId, ...newIncident };
    setIncidents([added, ...incidents]);
  };

  const handleBulkAddIncidents = (newIncidents: Omit<Incident, 'id'>[]) => {
    let nextId = incidents.length > 0 ? Math.max(...incidents.map(i => i.id)) + 1 : 1;
    const addedList: Incident[] = newIncidents.map(i => {
      const added = { id: nextId, ...i };
      nextId += 1;
      return added;
    });
    setIncidents([...addedList, ...incidents]);
  };

  const handleUpdateIncident = (id: number, updated: Partial<Incident>) => {
    setIncidents(incidents.map(i => i.id === id ? { ...i, ...updated } : i));
  };

  const handleDeleteIncident = (id: number) => {
    setIncidents(incidents.filter(i => i.id !== id));
  };

  const handleResetToFactorySettings = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Сбросить все данные?',
      message: 'Внимание! Все измененные и добавленные данные будут стерты, а журналы сброшены до исходных демо-данных. Вы подтверждаете действие?',
      onConfirm: () => {
        localStorage.removeItem('shody_incidents');
        localStorage.removeItem('shody_breakdowns');
        localStorage.removeItem('shody_drivers');
        localStorage.removeItem('shody_dispatchers');
        localStorage.removeItem('shody_vehicles');
        localStorage.removeItem('shody_system_users');
        
        setIncidents(INITIAL_INCIDENTS);
        setBreakdowns(INITIAL_BREAKDOWNS);
        setDrivers(INITIAL_DRIVERS);
        setDispatchers(INITIAL_DISPATCHERS);
        setVehicles(INITIAL_VEHICLES);
        setSystemUsers(DEFAULT_SYSTEM_USERS);
        
        setNotification('Данные успешно сброшены к начальным заводским значениям.');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Heuristic to detect if there is any corrupted binary / wrong encoding data
  const hasCorruptedData = incidents.some(i => 
    i.incident_date?.includes('\uFFFD') || 
    i.vehicle_number?.includes('\uFFFD') || 
    i.original_reason?.includes('\uFFFD') ||
    (i.incident_date && i.incident_date.length > 15 && /[a-zA-Z]/.test(i.incident_date))
  );

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('shody_user', JSON.stringify(user));
    setNotification(`Добро пожаловать, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('shody_user');
  };

  if (!currentUser) {
    return <Login systemUsers={systemUsers} onLoginSuccess={handleLoginSuccess} theme={theme} />;
  }

  return (
    <div className={`theme-${theme} min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 leading-normal transition-colors duration-300`}>
      {/* Dynamic left sidebar */}
      <aside className="w-full md:w-72 bg-[#0f172a] text-slate-300 flex flex-col justify-between shrink-0 shadow-2xl z-20">
        <div className="flex flex-col h-full">
          {/* Logo / Header banner */}
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 text-white shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide text-white leading-tight">Сходы-Сервис</h1>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Линейный мониторинг</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-2 space-y-1.5 flex-1 overflow-y-auto">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Аналитический дашборд' },
              { id: 'journal', icon: ClipboardList, label: 'Журнал сходов с линии' },
              { id: 'add', icon: PlusCircle, label: 'Ввести сход вручную' },
              { id: 'upload', icon: UploadCloud, label: 'Импорт диспетчерских' },
              { id: 'catalog', icon: Wrench, label: 'Справочник поломок' },
              { id: 'references', icon: BookOpen, label: 'Служебные словари' },
              { id: 'quality', icon: ShieldCheck, label: 'Аудит качества данных' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === item.id 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-blue-500' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User profile footer */}
          <div className="p-4 mt-auto">
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-semibold text-white truncate">{currentUser.name.split(' (')[0]}</div>
                  <div className="text-[11px] text-slate-400 font-medium">{currentUser.role === 'admin' ? 'Администратор' : currentUser.role === 'dispatcher' ? 'Диспетчер' : 'Руководитель'}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Выйти из системы
              </button>
            </div>
            <div className="mt-4 flex justify-between items-center px-1">
              <span className="text-[10px] text-slate-500 font-medium">v1.2.0</span>
              <button
                onClick={handleResetToFactorySettings}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                title="Сбросить все данные до заводских"
              >
                <RefreshCcw className="w-3 h-3" />
                Сброс
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main page content area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {hasCorruptedData && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <h3 className="text-sm font-black text-amber-800">Обнаружены поврежденные данные (иероглифы)</h3>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Похоже, ранее был загружен XLSX-файл напрямую как текст или в неверной кодировке. 
                  Мы исправили загрузчик — теперь он полноценно поддерживает Excel-файлы (.xlsx, .xls) и автоматически определяет кодировку CSV (UTF-8 / Windows-1251). 
                  Рекомендуется сбросить поврежденные записи, чтобы очистить реестр.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Сбросить поврежденные записи?',
                  message: 'Очистить поврежденные записи и сбросить базу данных к чистым исходным демо-данным?',
                  onConfirm: () => {
                    localStorage.removeItem('shody_incidents');
                    localStorage.removeItem('shody_breakdowns');
                    localStorage.removeItem('shody_drivers');
                    localStorage.removeItem('shody_dispatchers');
                    localStorage.removeItem('shody_vehicles');
                    localStorage.removeItem('shody_system_users');
                    
                    setIncidents(INITIAL_INCIDENTS);
                    setBreakdowns(INITIAL_BREAKDOWNS);
                    setDrivers(INITIAL_DRIVERS);
                    setDispatchers(INITIAL_DISPATCHERS);
                    setVehicles(INITIAL_VEHICLES);
                    setSystemUsers(DEFAULT_SYSTEM_USERS);
                    
                    setNotification('Поврежденные данные успешно сброшены!');
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  }
                });
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Сбросить поврежденные записи</span>
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard theme={theme} incidents={incidents} breakdowns={breakdowns} />
        )}

        {activeTab === 'journal' && (
          <Journal 
            incidents={incidents} 
            breakdowns={breakdowns}
            currentUser={currentUser}
            onUpdateIncident={handleUpdateIncident}
            onDeleteIncident={handleDeleteIncident}
          />
        )}

        {activeTab === 'add' && (
          <AddIncident 
            breakdowns={breakdowns}
            drivers={drivers}
            vehicles={vehicles}
            incidents={incidents}
            currentUser={currentUser}
            onAddIncident={handleAddIncident}
          />
        )}

        {activeTab === 'upload' && (
          <Upload 
            breakdowns={breakdowns}
            drivers={drivers}
            vehicles={vehicles}
            currentUser={currentUser}
            onBulkAddIncidents={handleBulkAddIncidents}
          />
        )}

        {activeTab === 'catalog' && (
          <BreakdownsCatalog 
            breakdowns={breakdowns}
            currentUser={currentUser}
            onAddBreakdown={(b) => setBreakdowns([...breakdowns, { id: breakdowns.length + 1, ...b }])}
            onUpdateBreakdown={(id, updated) => setBreakdowns(breakdowns.map(b => b.id === id ? { ...b, ...updated } : b))}
            onDeleteBreakdown={(id) => setBreakdowns(breakdowns.filter(b => b.id !== id))}
          />
        )}

        {activeTab === 'references' && (
          <References 
            drivers={drivers}
            dispatchers={dispatchers}
            vehicles={vehicles}
            currentUser={currentUser}
            onSaveDrivers={setDrivers}
            onSaveDispatchers={setDispatchers}
            onSaveVehicles={setVehicles}
            users={systemUsers}
            onSaveUsers={setSystemUsers}
          />
        )}

        {activeTab === 'quality' && (
          <DataQuality incidents={incidents} />
        )}
      </main>

      {/* Custom Confirmation Modal Overlay (Bypasses Native Confirm Iframe Blocks) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-amber-500">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-lg font-black text-slate-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Да, сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Alert Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold tracking-wide">{notification}</span>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
