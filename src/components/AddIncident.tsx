import React, { useState, useMemo } from 'react';
import { Incident, Breakdown, Driver, Vehicle, User, Criticality, IncidentStatus } from '../types';
import { Save, HelpCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddIncidentProps {
  breakdowns: Breakdown[];
  drivers: Driver[];
  vehicles: Vehicle[];
  incidents: Incident[];
  currentUser: User;
  onAddIncident: (incident: Omit<Incident, 'id'>) => void;
}

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export default function AddIncident({ 
  breakdowns, drivers, vehicles, incidents, currentUser, onAddIncident 
}: AddIncidentProps) {
  // Extract unique route numbers from incidents
  const uniqueRoutes = useMemo(() => {
    const routes = new Set<string>();
    incidents.forEach(inc => {
      if (inc.route_number && inc.route_number.trim() !== '') {
        routes.add(inc.route_number.trim());
      }
    });
    return Array.from(routes).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  }, [incidents]);

  const uniqueVehicles = useMemo(() => {
    const vSet = new Set<string>();
    vehicles.forEach(v => vSet.add(v.vehicle_number));
    incidents.forEach(inc => {
      if (inc.vehicle_number && inc.vehicle_number.trim() !== '') {
        vSet.add(inc.vehicle_number.trim());
      }
    });
    return Array.from(vSet).sort();
  }, [vehicles, incidents]);

  const uniqueDrivers = useMemo(() => {
    const dMap = new Map<string, string>();
    drivers.forEach(d => dMap.set(d.tab_number, d.name));
    incidents.forEach(inc => {
      if (inc.driver_tab_number && inc.driver_tab_number.trim() !== '') {
        if (!dMap.has(inc.driver_tab_number)) {
          dMap.set(inc.driver_tab_number, inc.driver_name || '');
        }
      }
    });
    return Array.from(dMap.entries()).map(([tab, name]) => ({ tab_number: tab, name }));
  }, [drivers, incidents]);
  // Form states
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [columnNumber, setColumnNumber] = useState('Колонна №1');
  const [routeNumber, setRouteNumber] = useState('');
  const [runNumber, setRunNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverTabNumber, setDriverTabNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [incidentReportTime, setIncidentReportTime] = useState('');
  const [returnToDepotTime, setReturnToDepotTime] = useState('');
  const [restartTime, setRestartTime] = useState('');
  const [originalReason, setOriginalReason] = useState('');
  const [selectedBreakdownCode, setSelectedBreakdownCode] = useState('');
  const [note, setNote] = useState('');
  const [healthReason, setHealthReason] = useState('');
  const [dispatcherName, setDispatcherName] = useState(currentUser.name);
  const [status, setStatus] = useState<IncidentStatus>('открыт');

  // Suggestions state
  const suggestions = useMemo(() => {
    if (!originalReason.trim()) return [];
    const query = originalReason.toLowerCase();
    
    return breakdowns.filter(b => {
      const nameMatch = b.breakdown_name.toLowerCase().includes(query);
      const catMatch = b.category.toLowerCase().includes(query);
      const kwMatch = b.keywords.split(',').some(kw => {
        const cleanedKw = kw.trim().toLowerCase();
        return cleanedKw && (query.includes(cleanedKw) || cleanedKw.includes(query));
      });
      return nameMatch || catMatch || kwMatch;
    }).slice(0, 3);
  }, [originalReason, breakdowns]);

  // Handle suggestion click
  const selectSuggestion = (b: Breakdown) => {
    setSelectedBreakdownCode(b.breakdown_code);
    if (b.category === 'Здоровье') {
      setStatus('требует проверки');
    }
  };

  // Driver autofill on tab number change
  const handleTabNumberChange = (val: string) => {
    setDriverTabNumber(val);
    const drv = uniqueDrivers.find(d => d.tab_number === val);
    if (drv) {
      setDriverName(drv.name);
    }
  };

  const handleDriverNameChange = (val: string) => {
    setDriverName(val);
    const drv = uniqueDrivers.find(d => d.name === val);
    if (drv) {
      setDriverTabNumber(drv.tab_number);
    }
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeNumber || !vehicleNumber || !originalReason) {
      alert('Пожалуйста, заполните обязательные поля: Маршрут, Госномер ТС и Причина схода.');
      return;
    }

    const bItem = breakdowns.find(b => b.breakdown_code === selectedBreakdownCode) || breakdowns.find(b => b.breakdown_code === 'BRK-013')!;

    const d = new Date(incidentDate);
    const weekday = WEEKDAYS[d.getDay()];

    const newIncident: Omit<Incident, 'id'> = {
      incident_date: incidentDate,
      weekday,
      column_number: columnNumber,
      route_number: routeNumber,
      run_number: runNumber,
      vehicle_number: vehicleNumber.toUpperCase(),
      driver_tab_number: driverTabNumber,
      driver_name: driverName,
      departure_time: departureTime,
      incident_report_time: incidentReportTime,
      return_to_depot_time: returnToDepotTime,
      restart_time: restartTime,
      original_reason: originalReason,
      breakdown_code: bItem.breakdown_code,
      breakdown_category: bItem.category,
      breakdown_name: bItem.breakdown_name,
      criticality: bItem.criticality,
      note,
      health_reason: healthReason,
      dispatcher_name: dispatcherName,
      status,
      source_file: 'ручной ввод'
    };

    onAddIncident(newIncident);

    // Fire confetti on success!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Reset Form
    setRouteNumber('');
    setRunNumber('');
    setVehicleNumber('');
    setDriverTabNumber('');
    setDriverName('');
    setDepartureTime('');
    setIncidentReportTime('');
    setReturnToDepotTime('');
    setRestartTime('');
    setOriginalReason('');
    setSelectedBreakdownCode('');
    setNote('');
    setHealthReason('');
    setStatus('открыт');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <span>➕</span> Добавить сход вручную
        </h1>
        <p className="text-sm text-slate-500 mt-1">Добавление новой записи схода с линии в режиме реального времени</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Section 1: Core details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">📅 Общая информация</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Дата происшествия <span className="text-rose-500">*</span></label>
              <input 
                type="date" 
                required
                value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Колонна автопарка</label>
              <select
                value={columnNumber}
                onChange={e => setColumnNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Колонна №1">Колонна №1</option>
                <option value="Колонна №2">Колонна №2</option>
                <option value="Колонна №3">Колонна №3</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Номер маршрута <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required
                list="route-suggestions"
                placeholder="Например, 2, 24, 130"
                value={routeNumber}
                onChange={e => setRouteNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <datalist id="route-suggestions">
                {uniqueRoutes.map((route, idx) => (
                  <option key={idx} value={route} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Номер выхода (рейса)</label>
              <input 
                type="text" 
                placeholder="Например, 1, 5"
                value={runNumber}
                onChange={e => setRunNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Госномер ТС <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required
                placeholder="А012АА"
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value)}
                list="vehicles-list"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              />
              <datalist id="vehicles-list">
                {uniqueVehicles.map((v, idx) => <option key={idx} value={v} />)}
              </datalist>
            </div>
          </div>
        </div>

        {/* Section 2: Driver & Dispatcher */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">👥 Экипаж и диспетчер</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Табельный номер водителя</label>
              <input 
                type="text" 
                placeholder="Например, 1023"
                value={driverTabNumber}
                onChange={e => handleTabNumberChange(e.target.value)}
                list="drivers-tab-list"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <datalist id="drivers-tab-list">
                {uniqueDrivers.map((d, idx) => <option key={idx} value={d.tab_number} />)}
              </datalist>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Ф.И.О. водителя</label>
              <input 
                type="text" 
                placeholder="Начните вводить Ф.И.О. или подгрузится по табельному"
                value={driverName}
                onChange={e => handleDriverNameChange(e.target.value)}
                list="drivers-name-list"
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <datalist id="drivers-name-list">
                {uniqueDrivers.map((d, idx) => d.name ? <option key={idx} value={d.name} /> : null)}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Диспетчер смены</label>
              <input 
                type="text" 
                disabled
                value={dispatcherName}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Timings */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">⏰ Режимы времени</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Время выезда</label>
              <input 
                type="time" 
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Время сообщения</label>
              <input 
                type="time" 
                value={incidentReportTime}
                onChange={e => setIncidentReportTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Заезд в парк</label>
              <input 
                type="time" 
                value={returnToDepotTime}
                onChange={e => setReturnToDepotTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Повторный выход</label>
              <input 
                type="time" 
                value={restartTime}
                onChange={e => setRestartTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Cause & Dynamic Classification */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">🛠️ Описание неисправности и классификация</h3>
          <div className="space-y-4">
            {/* Original Reason Text Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">Причина схода (свободный ввод) <span className="text-rose-500">*</span></label>
                <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Умная автоклассификация активна</span>
                </div>
              </div>
              <textarea 
                required
                rows={3}
                placeholder="Например, закипел двигатель в пробке, лопнул патрубок охлаждения или у водителя высокое давление"
                value={originalReason}
                onChange={e => setOriginalReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Smart Classification Suggestions */}
            {suggestions.length > 0 && (
              <div className="bg-slate-50 border border-blue-100 rounded-lg p-3 space-y-2">
                <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Рекомендуемые поломки на основе текста:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s.breakdown_code}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all ${
                        selectedBreakdownCode === s.breakdown_code 
                        ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-mono text-[10px] bg-slate-200 px-1 py-0.2 rounded text-slate-700 font-semibold">{s.breakdown_code}</span>
                      <span>{s.breakdown_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Reason Dropdown Select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Поломка в справочнике</label>
                <select
                  value={selectedBreakdownCode}
                  onChange={e => {
                    setSelectedBreakdownCode(e.target.value);
                    const b = breakdowns.find(x => x.breakdown_code === e.target.value);
                    if (b?.category === 'Здоровье') {
                      setStatus('требует проверки');
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Выберите неисправность из каталога --</option>
                  {breakdowns.map(b => (
                    <option key={b.breakdown_code} value={b.breakdown_code}>
                      ({b.breakdown_code}) {b.breakdown_name} — {b.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Статус схода</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as IncidentStatus)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="открыт">открыт (на линии или ожидает буксир)</option>
                  <option value="закрыт">закрыт (сделан или заменен на линии)</option>
                  <option value="требует проверки">требует проверки</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Детали по здоровью (заполняется только для категории «Здоровье»)</label>
                <input 
                  type="text" 
                  placeholder="Например: Гипертония (давление 160/100) или Жалобы на острую боль"
                  value={healthReason}
                  onChange={e => setHealthReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Примечание ремонтной зоны (по желанию)</label>
                <input 
                  type="text" 
                  placeholder="Например: Произвели замену водяной помпы в ремонтной зоне"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form controls */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Сохранить сход</span>
          </button>
        </div>
      </form>
    </div>
  );
}
