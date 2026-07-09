import React, { useState, useEffect } from 'react';
import { Driver, Dispatcher, Vehicle, User, UserRole } from '../types';
import { Users, FileText, Plus, Trash2, Save, Download, HelpCircle, FileSpreadsheet, Key, Shield } from 'lucide-react';

interface ReferencesProps {
  drivers: Driver[];
  dispatchers: Dispatcher[];
  vehicles: Vehicle[];
  currentUser: User;
  onSaveDrivers: (drivers: Driver[]) => void;
  onSaveDispatchers: (dispatchers: Dispatcher[]) => void;
  onSaveVehicles: (vehicles: Vehicle[]) => void;
  users: User[];
  onSaveUsers: (users: User[]) => void;
}

type RefKind = 'driver' | 'dispatcher' | 'vehicle' | 'user';

export default function References({
  drivers, dispatchers, vehicles, currentUser, onSaveDrivers, onSaveDispatchers, onSaveVehicles, users, onSaveUsers
}: ReferencesProps) {
  const [activeTab, setActiveTab] = useState<RefKind>('driver');

  // Local grid editors state
  const [localDrivers, setLocalDrivers] = useState<Driver[]>([]);
  const [localDispatchers, setLocalDispatchers] = useState<Dispatcher[]>([]);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>([]);
  const [localUsers, setLocalUsers] = useState<User[]>([]);

  // Synchronize local states when props change
  useEffect(() => {
    setLocalDrivers([...drivers]);
  }, [drivers]);

  useEffect(() => {
    setLocalDispatchers([...dispatchers]);
  }, [dispatchers]);

  useEffect(() => {
    setLocalVehicles([...vehicles]);
  }, [vehicles]);

  useEffect(() => {
    if (users) {
      setLocalUsers([...users]);
    }
  }, [users]);

  const hasWriteAccess = currentUser.role === 'admin' || currentUser.role === 'dispatcher';

  // Drivers Grid handlers
  const addDriverRow = () => {
    const nextId = localDrivers.length > 0 ? Math.max(...localDrivers.map(d => d.id)) + 1 : 1;
    setLocalDrivers([...localDrivers, { id: nextId, tab_number: '', name: '' }]);
  };

  const updateDriverField = (index: number, field: keyof Driver, value: string) => {
    const updated = [...localDrivers];
    updated[index] = { ...updated[index], [field]: value };
    setLocalDrivers(updated);
  };

  const removeDriverRow = (id: number) => {
    setLocalDrivers(localDrivers.filter(d => d.id !== id));
  };

  const saveDrivers = () => {
    const cleaned = localDrivers.filter(d => d.tab_number.trim() !== '' || d.name.trim() !== '');
    onSaveDrivers(cleaned);
    alert('Справочник водителей сохранен.');
  };

  // Dispatchers Grid handlers
  const addDispatcherRow = () => {
    const nextId = localDispatchers.length > 0 ? Math.max(...localDispatchers.map(d => d.id)) + 1 : 1;
    setLocalDispatchers([...localDispatchers, { id: nextId, tab_number: '', name: '' }]);
  };

  const updateDispatcherField = (index: number, field: keyof Dispatcher, value: string) => {
    const updated = [...localDispatchers];
    updated[index] = { ...updated[index], [field]: value };
    setLocalDispatchers(updated);
  };

  const removeDispatcherRow = (id: number) => {
    setLocalDispatchers(localDispatchers.filter(d => d.id !== id));
  };

  const saveDispatchers = () => {
    const cleaned = localDispatchers.filter(d => d.tab_number.trim() !== '' || d.name.trim() !== '');
    onSaveDispatchers(cleaned);
    alert('Справочник диспетчеров сохранен.');
  };

  // Vehicles Grid handlers
  const addVehicleRow = () => {
    const nextId = localVehicles.length > 0 ? Math.max(...localVehicles.map(v => v.id)) + 1 : 1;
    setLocalVehicles([...localVehicles, { id: nextId, vehicle_number: '', model: '', bus_class: 'большой' }]);
  };

  const updateVehicleField = (index: number, field: keyof Vehicle, value: string) => {
    const updated = [...localVehicles];
    updated[index] = { ...updated[index], [field]: value };
    setLocalVehicles(updated);
  };

  const removeVehicleRow = (id: number) => {
    setLocalVehicles(localVehicles.filter(v => v.id !== id));
  };

  const saveVehicles = () => {
    const cleaned = localVehicles.filter(v => v.vehicle_number.trim() !== '');
    onSaveVehicles(cleaned);
    alert('Справочник транспортных средств сохранен.');
  };

  // Users Grid handlers
  const addUserRow = () => {
    const nextId = localUsers.length > 0 ? Math.max(...localUsers.map(u => u.id)) + 1 : 1;
    setLocalUsers([...localUsers, { id: nextId, username: '', name: '', role: 'viewer', password: '123' }]);
  };

  const updateUserField = (index: number, field: keyof User, value: any) => {
    const updated = [...localUsers];
    updated[index] = { ...updated[index], [field]: value };
    setLocalUsers(updated);
  };

  const removeUserRow = (id: number) => {
    if (id === currentUser.id) {
      alert('Вы не можете удалить свою собственную учётную запись!');
      return;
    }
    setLocalUsers(localUsers.filter(u => u.id !== id));
  };

  const saveUsers = () => {
    const cleaned = localUsers.filter(u => u.username.trim() !== '' && u.name.trim() !== '');
    if (cleaned.length === 0) {
      alert('Список пользователей не может быть пустым.');
      return;
    }
    const hasAdmin = cleaned.some(u => u.role === 'admin');
    if (!hasAdmin) {
      alert('Ошибка: В системе должен быть хотя бы один администратор!');
      return;
    }
    const usernames = cleaned.map(u => u.username.trim().toLowerCase());
    const uniqueUsernames = new Set(usernames);
    if (uniqueUsernames.size !== usernames.length) {
      alert('Ошибка: Имена пользователей (логины) должны быть уникальными!');
      return;
    }

    onSaveUsers(cleaned);
    alert('Список пользователей успешно сохранен.');
  };

  // Export CSV
  const handleDownloadCSV = (kind: RefKind) => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (kind === 'driver') {
      headers = ['Табельный номер', 'Ф.И.О.'];
      rows = localDrivers.map(d => [d.tab_number, d.name]);
      filename = 'справочник_водителей.csv';
    } else if (kind === 'dispatcher') {
      headers = ['Табельный номер', 'Ф.И.О.'];
      rows = localDispatchers.map(d => [d.tab_number, d.name]);
      filename = 'справочник_диспетчеров.csv';
    } else {
      headers = ['Госномер', 'Марка', 'Класс автобуса'];
      rows = localVehicles.map(v => [v.vehicle_number, v.model, v.bus_class]);
      filename = 'справочник_транспорта.csv';
    }

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple file import simulator for demonstrations
  const handleMockImport = (kind: RefKind) => {
    if (kind === 'driver') {
      const demoDrivers: Driver[] = [
        ...localDrivers,
        { id: 100, tab_number: '2044', name: 'Павлов Игорь Леонидович' },
        { id: 101, tab_number: '2155', name: 'Семенов Павел Андреевич' },
        { id: 102, tab_number: '2288', name: 'Федоров Артем Григорьевич' }
      ];
      setLocalDrivers(demoDrivers);
      alert('Успешно импортировано 3 записи в справочник водителей.');
    } else if (kind === 'dispatcher') {
      const demoDispatchers: Dispatcher[] = [
        ...localDispatchers,
        { id: 100, tab_number: 'D-04', name: 'Михайлова Вера Павловна' }
      ];
      setLocalDispatchers(demoDispatchers);
      alert('Успешно импортирована 1 запись в справочник диспетчеров.');
    } else {
      const demoVehicles: Vehicle[] = [
        ...localVehicles,
        { id: 100, vehicle_number: 'Х555ХХ', model: 'Волгабас-6271', bus_class: 'особо большой' },
        { id: 101, vehicle_number: 'У666УУ', model: 'ПАЗ-3204', bus_class: 'средний' }
      ];
      setLocalVehicles(demoVehicles);
      alert('Успешно импортировано 2 ТС в справочник транспорта.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <span>👥</span> Управление справочниками
          </h1>
          <p className="text-sm text-slate-500 mt-1">Редактирование персонала (водители, диспетчеры) и подвижного состава</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-center flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'driver' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>🚍</span> Водители
          </button>
          <button
            onClick={() => setActiveTab('dispatcher')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'dispatcher' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>🎧</span> Диспетчеры
          </button>
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'vehicle' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>🚌</span> Транспорт
          </button>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('user')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'user' ? 'bg-white text-blue-700 shadow-sm border border-blue-100' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>👤</span> Пользователи системы
            </button>
          )}
        </div>
      </div>

      {/* Editor Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {activeTab === 'driver' && '🚍 Справочник водителей пассажирского транспорта'}
              {activeTab === 'dispatcher' && '🎧 Справочник диспетчеров смены'}
              {activeTab === 'vehicle' && '🚌 Справочник автобусов (подвижного состава)'}
              {activeTab === 'user' && '👤 Управление пользователями и ролями системы'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'user' 
                ? 'Панель администратора. Здесь вы можете создавать, изменять и удалять учетные записи пользователей системы.'
                : hasWriteAccess 
                  ? 'Режим ручного редактирования. Кликните на ячейку для ввода, кнопка «+» внизу добавит пустую строку.' 
                  : 'Режим просмотра справочника (изменения заблокированы).'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeTab !== 'user' && hasWriteAccess && (
              <button
                onClick={() => handleMockImport(activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Импорт из Excel</span>
              </button>
            )}
            {activeTab !== 'user' && (
              <button
                onClick={() => handleDownloadCSV(activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* DRIVERS TAB */}
        {activeTab === 'driver' && (
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 w-16">ID</th>
                    <th className="px-4 py-2.5 w-52">Табельный номер водителя</th>
                    <th className="px-4 py-2.5">Ф.И.О. водителя пассажирского транспорта</th>
                    {hasWriteAccess && <th className="px-4 py-2.5 w-16 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {localDrivers.map((d, index) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-xs font-mono text-slate-400">#{d.id}</td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          disabled={!hasWriteAccess}
                          placeholder="Пример: 1023"
                          value={d.tab_number}
                          onChange={e => updateDriverField(index, 'tab_number', e.target.value)}
                          className={`px-2 py-1 text-sm rounded border ${hasWriteAccess ? 'border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent bg-transparent cursor-default'} w-full font-mono`}
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          disabled={!hasWriteAccess}
                          placeholder="Иванов Иван Иванович"
                          value={d.name}
                          onChange={e => updateDriverField(index, 'name', e.target.value)}
                          className={`px-2 py-1 text-sm rounded border ${hasWriteAccess ? 'border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent bg-transparent cursor-default'} w-full font-semibold`}
                        />
                      </td>
                      {hasWriteAccess && (
                        <td className="px-4 py-1 text-center">
                          <button
                            onClick={() => removeDriverRow(d.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Удалить строку"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasWriteAccess && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  onClick={addDriverRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                  <span>Добавить водителя</span>
                </button>

                <button
                  onClick={saveDrivers}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить водителей</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* DISPATCHERS TAB */}
        {activeTab === 'dispatcher' && (
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 w-16">ID</th>
                    <th className="px-4 py-2.5 w-52">Код / Номер диспетчера</th>
                    <th className="px-4 py-2.5">Ф.И.О. диспетчера смены</th>
                    {hasWriteAccess && <th className="px-4 py-2.5 w-16 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {localDispatchers.map((d, index) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-xs font-mono text-slate-400">#{d.id}</td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          disabled={!hasWriteAccess}
                          placeholder="Пример: D-01"
                          value={d.tab_number}
                          onChange={e => updateDispatcherField(index, 'tab_number', e.target.value)}
                          className={`px-2 py-1 text-sm rounded border ${hasWriteAccess ? 'border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent bg-transparent cursor-default'} w-full font-mono`}
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          disabled={!hasWriteAccess}
                          placeholder="Смирнова Ольга Владимировна"
                          value={d.name}
                          onChange={e => updateDispatcherField(index, 'name', e.target.value)}
                          className={`px-2 py-1 text-sm rounded border ${hasWriteAccess ? 'border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent bg-transparent cursor-default'} w-full font-semibold`}
                        />
                      </td>
                      {hasWriteAccess && (
                        <td className="px-4 py-1 text-center">
                          <button
                            onClick={() => removeDispatcherRow(d.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Удалить строку"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasWriteAccess && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  onClick={addDispatcherRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                  <span>Добавить диспетчера</span>
                </button>

                <button
                  onClick={saveDispatchers}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить диспетчеров</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* VEHICLES TAB */}
        {activeTab === 'vehicle' && (
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 w-16">ID</th>
                    <th className="px-4 py-2.5 w-48">Государственный номер ТС</th>
                    <th className="px-4 py-2.5 w-52">Марка / Модель автобуса</th>
                    <th className="px-4 py-2.5">Класс вместимости</th>
                    {hasWriteAccess && <th className="px-4 py-2.5 w-16 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {localVehicles.map((v, index) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-xs font-mono text-slate-400">#{v.id}</td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          disabled={!hasWriteAccess}
                          placeholder="Пример: А012АА"
                          value={v.vehicle_number}
                          onChange={e => updateVehicleField(index, 'vehicle_number', e.target.value.toUpperCase())}
                          className={`px-2 py-1 text-sm rounded border ${hasWriteAccess ? 'border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent bg-transparent cursor-default'} w-full font-mono uppercase font-bold`}
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          disabled={!hasWriteAccess}
                          placeholder="ЛиАЗ-5292"
                          value={v.model}
                          onChange={e => updateVehicleField(index, 'model', e.target.value)}
                          className={`px-2 py-1 text-sm rounded border ${hasWriteAccess ? 'border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent bg-transparent cursor-default'} w-full font-medium`}
                        />
                      </td>
                      <td className="px-3 py-1">
                        <select
                          disabled={!hasWriteAccess}
                          value={v.bus_class}
                          onChange={e => updateVehicleField(index, 'bus_class', e.target.value)}
                          className={`px-2 py-1 text-sm rounded border ${hasWriteAccess ? 'border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-transparent bg-transparent cursor-default'} w-full`}
                        >
                          <option value="особо малый">Особо малый (Газели, &lt; 20 мест)</option>
                          <option value="малый">Малый (City, &lt; 40 мест)</option>
                          <option value="средний">Средний (ПАЗ, МАЗ-206)</option>
                          <option value="большой">Большой (ЛиАЗ-5292, МАЗ-203)</option>
                          <option value="особо большой">Особо большой (ЛиАЗ-6213 "гармошка")</option>
                        </select>
                      </td>
                      {hasWriteAccess && (
                        <td className="px-4 py-1 text-center">
                          <button
                            onClick={() => removeVehicleRow(v.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Удалить строку"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasWriteAccess && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  onClick={addVehicleRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                  <span>Добавить транспорт</span>
                </button>

                <button
                  onClick={saveVehicles}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить транспорт</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB (ONLY FOR ADMIN) */}
        {activeTab === 'user' && currentUser.role === 'admin' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 w-16">ID</th>
                    <th className="px-4 py-2.5 w-44">Логин пользователя</th>
                    <th className="px-4 py-2.5 w-44">Пароль</th>
                    <th className="px-4 py-2.5">Ф.И.О. / Описание роли</th>
                    <th className="px-4 py-2.5 w-56">Роль</th>
                    <th className="px-4 py-2.5 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {localUsers.map((u, index) => (
                    <tr key={u.id} className={`hover:bg-slate-50/50 ${u.id === currentUser.id ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-4 py-2 text-xs font-mono text-slate-400">
                        #{u.id}
                        {u.id === currentUser.id && (
                          <span className="block text-[8px] text-blue-600 font-black uppercase mt-0.5">Это Вы</span>
                        )}
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          placeholder="Пример: ivan_p"
                          value={u.username}
                          onChange={e => updateUserField(index, 'username', e.target.value.trim().toLowerCase())}
                          className="px-2 py-1 text-sm rounded border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full font-mono"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          placeholder="Пароль..."
                          value={u.password || ''}
                          onChange={e => updateUserField(index, 'password', e.target.value)}
                          className="px-2 py-1 text-sm rounded border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full font-mono"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <input
                          type="text"
                          placeholder="Пример: Иванов Иван Иванович"
                          value={u.name}
                          onChange={e => updateUserField(index, 'name', e.target.value)}
                          className="px-2 py-1 text-sm rounded border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full font-semibold"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <select
                          value={u.role}
                          onChange={e => updateUserField(index, 'role', e.target.value as UserRole)}
                          className="px-2 py-1 text-sm rounded border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full font-bold cursor-pointer"
                        >
                          <option value="admin">Администратор (Полный доступ)</option>
                          <option value="dispatcher">Диспетчер (Линейный ввод и справочники)</option>
                          <option value="manager">Начальник / Руководитель (Просмотр, аудит и экспорт)</option>
                          <option value="viewer">Просмотр (Только чтение)</option>
                        </select>
                      </td>
                      <td className="px-4 py-1 text-center">
                        <button
                          onClick={() => removeUserRow(u.id)}
                          disabled={u.id === currentUser.id}
                          className={`p-1 rounded ${u.id === currentUser.id ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600'}`}
                          title={u.id === currentUser.id ? 'Нельзя удалить себя' : 'Удалить пользователя'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                onClick={addUserRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span>Добавить пользователя</span>
              </button>

              <button
                onClick={saveUsers}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить пользователей</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
