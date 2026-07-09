// src/components/Journal.tsx
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Incident, Breakdown, Criticality, IncidentStatus, User } from '../types';
import { 
  Search, Filter, Edit, Trash2, Download, Save, X, PlusCircle,
  Calendar, AlertTriangle, Heart, ShieldAlert, Wrench, Clock, Bus, 
  CheckCircle, FileText, ChevronDown, ChevronUp, Activity, FileSpreadsheet,
  RefreshCcw, UserCheck, HelpCircle
} from 'lucide-react';

interface JournalProps {
  incidents: Incident[];
  breakdowns: Breakdown[];
  currentUser: User;
  onUpdateIncident: (id: number, updated: Partial<Incident>) => void;
  onDeleteIncident: (id: number) => void;
}

const WEEKDAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export default function Journal({ 
  incidents, breakdowns, currentUser, onUpdateIncident, onDeleteIncident 
}: JournalProps) {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'dispatcher' | 'compact'>('dispatcher');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('Все');
  const [selectedVehicle, setSelectedVehicle] = useState('Все');
  const [selectedCrit, setSelectedCrit] = useState('Все');
  const [selectedCat, setSelectedCat] = useState('Все');
  const [selectedDriver, setSelectedDriver] = useState('Все');
  const [selectedDispatcher, setSelectedDispatcher] = useState('Все');
  const [selectedColumn, setSelectedColumn] = useState('Все');
  const [selectedStatus, setSelectedStatus] = useState('Все');
  const [onlyHealth, setOnlyHealth] = useState(false);
  const [onlyDtp, setOnlyDtp] = useState(false);

  // Expanded row state (drawer detail)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Incident>>({});

  // Unique lists for filters
  const filterOptions = useMemo(() => {
    const routes = new Set<string>();
    const vehicles = new Set<string>();
    const crits = new Set<string>();
    const cats = new Set<string>();
    const drivers = new Set<string>();
    const dispatchers = new Set<string>();
    const columns = new Set<string>();

    incidents.forEach(i => {
      if (i.route_number) routes.add(i.route_number);
      if (i.vehicle_number) vehicles.add(i.vehicle_number);
      if (i.criticality) crits.add(i.criticality);
      if (i.breakdown_category) cats.add(i.breakdown_category);
      if (i.driver_name) drivers.add(i.driver_name);
      if (i.dispatcher_name) dispatchers.add(i.dispatcher_name);
      if (i.column_number) columns.add(i.column_number);
    });

    return {
      routes: Array.from(routes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      vehicles: Array.from(vehicles).sort(),
      crits: Array.from(crits).sort(),
      cats: Array.from(cats).sort(),
      drivers: Array.from(drivers).sort(),
      dispatchers: Array.from(dispatchers).sort(),
      columns: Array.from(columns).sort()
    };
  }, [incidents]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const matchSearch = searchTerm === '' || 
        [
          i.route_number, i.vehicle_number, i.driver_name, 
          i.original_reason, i.breakdown_name, i.note, i.dispatcher_name,
          i.health_reason, i.driver_tab_number
        ].some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRoute = selectedRoute === 'Все' || i.route_number === selectedRoute;
      const matchVehicle = selectedVehicle === 'Все' || i.vehicle_number === selectedVehicle;
      const matchCrit = selectedCrit === 'Все' || i.criticality === selectedCrit;
      const matchCat = selectedCat === 'Все' || i.breakdown_category === selectedCat;
      const matchDriver = selectedDriver === 'Все' || i.driver_name === selectedDriver;
      const matchDispatcher = selectedDispatcher === 'Все' || i.dispatcher_name === selectedDispatcher;
      const matchColumn = selectedColumn === 'Все' || i.column_number === selectedColumn;
      const matchStatus = selectedStatus === 'Все' || i.status === selectedStatus;

      const matchesHealth = !onlyHealth || !!i.health_reason;
      const matchesDtp = !onlyDtp || 
        (i.original_reason?.toLowerCase().includes('дтп') || 
         i.breakdown_name?.toLowerCase().includes('дтп') || 
         i.note?.toLowerCase().includes('дтп'));

      return matchSearch && matchRoute && matchVehicle && matchCrit && matchCat && 
             matchDriver && matchDispatcher && matchColumn && matchStatus && 
             matchesHealth && matchesDtp;
    }).sort((a, b) => b.incident_date.localeCompare(a.incident_date));
  }, [
    incidents, searchTerm, selectedRoute, selectedVehicle, selectedCrit, 
    selectedCat, selectedDriver, selectedDispatcher, selectedColumn, selectedStatus, 
    onlyHealth, onlyDtp
  ]);

  // General counters for analytical summary bar inside the journal
  const counters = useMemo(() => {
    let openCount = 0;
    let checkCount = 0;
    let healthCount = 0;
    let dtpCount = 0;

    incidents.forEach(i => {
      if (i.status === 'открыт') openCount++;
      if (i.status === 'требует проверки') checkCount++;
      if (i.health_reason) healthCount++;
      const isDtp = i.original_reason?.toLowerCase().includes('дтп') || 
                    i.breakdown_name?.toLowerCase().includes('дтп') || 
                    i.note?.toLowerCase().includes('дтп');
      if (isDtp) dtpCount++;
    });

    return { openCount, checkCount, healthCount, dtpCount };
  }, [incidents]);

  // Excel (.xlsx) Export using xlsx library with auto-filters and dynamic cell resizing
  const handleExportXLSX = () => {
    try {
      const headers = [
        '№ п/п', 'Дата', 'День недели', 'Колонна', 'Маршрут', 'Выход', 'Гос.№ т/с', 
        'Табельный номер водителя', 'Ф.И.О. водителя', 'Планируемое время выезда', 
        'Время схода (когда сообщил)', 'Время заезда в парк', 'Время повторного выхода', 
        'Причина схода (Оригинал)', 'Код неисправности', 'Группа поломки', 
        'Каталожная поломка', 'Критичность', 'Статус', 'Диспетчер', 
        'Сход по здоровью (причина)', 'Примечание ремзоны', 'Источник данных'
      ];

      const rows = filteredIncidents.map((i, index) => [
        index + 1, i.incident_date, i.weekday, i.column_number, i.route_number, i.run_number, i.vehicle_number,
        i.driver_tab_number, i.driver_name, i.departure_time, i.incident_report_time,
        i.return_to_depot_time, i.restart_time, i.original_reason, i.breakdown_code,
        i.breakdown_category, i.breakdown_name, i.criticality, i.status, i.dispatcher_name,
        i.health_reason, i.note, i.source_file
      ]);

      // Create SheetJS workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // 1. Enable Autofilter for all columns
      const lastColLetter = XLSX.utils.encode_col(headers.length - 1);
      const totalRowsCount = rows.length + 1; // including headers row
      ws['!autofilter'] = { ref: `A1:${lastColLetter}${totalRowsCount}` };

      // 2. Automatically compute column widths based on longest cell content
      const colWidths = headers.map((header, colIndex) => {
        let maxLength = header.toString().length;
        rows.forEach(row => {
          const val = row[colIndex];
          if (val !== null && val !== undefined) {
            const length = val.toString().length;
            if (length > maxLength) {
              maxLength = length;
            }
          }
        });
        // Add padding of 3 characters, set minimum width to 10 characters
        return { wch: Math.max(maxLength + 3, 10) };
      });
      ws['!cols'] = colWidths;

      // 3. Automatically set row heights to fit padded spacing elegantly (e.g. 21pt)
      ws['!rows'] = Array(totalRowsCount).fill({ hpt: 21 });

      // Append sheet and download file
      XLSX.utils.book_append_sheet(wb, ws, 'Реестр сходов');
      XLSX.writeFile(wb, `shody_registry_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Ошибка при генерации Excel файла:', error);
      alert('Произошла ошибка при экспорте в Excel.');
    }
  };

  const startEdit = (incident: Incident, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Avoid toggling expansion row
    setEditingId(incident.id);
    setEditForm({ ...incident });
  };

  const handleEditChange = (field: keyof Incident, value: any) => {
    if (field === 'breakdown_name') {
      const bItem = breakdowns.find(b => b.breakdown_name === value);
      if (bItem) {
        setEditForm(prev => ({
          ...prev,
          breakdown_name: value,
          breakdown_code: bItem.breakdown_code,
          breakdown_category: bItem.category,
          criticality: bItem.criticality
        }));
        return;
      }
    }

    if (field === 'incident_date') {
      // Auto-compute weekday in Russian
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          const weekdayStr = WEEKDAYS_RU[d.getDay()];
          setEditForm(prev => ({
            ...prev,
            incident_date: value,
            weekday: weekdayStr
          }));
          return;
        }
      } catch (err) {}
    }

    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const saveEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateIncident(id, editForm);
    setEditingId(null);
  };

  const toggleRowExpansion = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // If editing another row, cancel it
      if (editingId !== id) {
        setEditingId(null);
      }
    }
  };

  const hasWriteAccess = currentUser.role === 'admin' || currentUser.role === 'dispatcher';

  return (
    <div className="space-y-6">
      {/* Top statistics summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Всего записей</div>
            <div className="text-xl font-black text-slate-800 font-sans">{incidents.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Открытые сходы</div>
            <div className="text-xl font-black text-red-600 font-sans">{counters.openCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Требуют проверки</div>
            <div className="text-xl font-black text-amber-600 font-sans">{counters.checkCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Сходы по здоровью</div>
            <div className="text-xl font-black text-rose-600 font-sans">{counters.healthCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">ДТП / Столкновения</div>
            <div className="text-xl font-black text-slate-700 font-sans">{counters.dtpCount}</div>
          </div>
        </div>
      </div>

      {/* Page Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight font-sans">Реестр диспетчерских сходов с линии</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium font-sans">
            Синхронизированная база линейных сбоев, уходов в парк, ремонтов и больничных листов за июнь 2026 года
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('dispatcher')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                viewMode === 'dispatcher' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Диспетчерский вид</span>
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                viewMode === 'compact' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Компактные карточки</span>
            </button>
          </div>

          <button
            onClick={handleExportXLSX}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт в Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider font-sans">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Поиск и фильтрация сходов</span>
          </div>

          <div className="flex items-center gap-3 font-sans">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={onlyHealth}
                onChange={e => setOnlyHealth(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="flex items-center gap-0.5 text-rose-600 font-bold">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                Здоровье
              </span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={onlyDtp}
                onChange={e => setOnlyDtp(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ДТП
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-sans">
          {/* Search Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Текстовый фильтр</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ФИО, госномер, причина..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 bg-slate-50/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-semibold"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Column filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Автоколонна</label>
            <select
              value={selectedColumn}
              onChange={e => setSelectedColumn(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-slate-50/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-semibold"
            >
              <option value="Все">Все колонны</option>
              {filterOptions.columns.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Route filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Линейный маршрут</label>
            <select
              value={selectedRoute}
              onChange={e => setSelectedRoute(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-slate-50/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-semibold"
            >
              <option value="Все">Все маршруты</option>
              {filterOptions.routes.map(r => (
                <option key={r} value={r}>Маршрут №{r}</option>
              ))}
            </select>
          </div>

          {/* Vehicle filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Гос. Номер ТС</label>
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-slate-50/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-semibold"
            >
              <option value="Все">Все гос. номера</option>
              {filterOptions.vehicles.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Текущий статус</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-slate-50/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-semibold"
            >
              <option value="Все">Все статусы</option>
              <option value="открыт">Открытые сходы</option>
              <option value="требует проверки">На проверке</option>
              <option value="закрыт">Закрытые (в архиве)</option>
            </select>
          </div>
        </div>

        {/* Secondary line of filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1.5 border-t border-slate-100 font-sans">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Найдено в базе:</span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-black rounded-md">
              {filteredIncidents.length} записей
            </span>
          </div>

          {/* Clear filters shortcut */}
          <div className="md:col-start-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm(''); setSelectedRoute('Все'); setSelectedVehicle('Все');
                setSelectedCrit('Все'); setSelectedCat('Все'); setSelectedDriver('Все');
                setSelectedDispatcher('Все'); setSelectedColumn('Все'); setSelectedStatus('Все');
                setOnlyHealth(false); setOnlyDtp(false);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCcw className="w-3 h-3" />
              <span>Сбросить все настройки фильтров</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'dispatcher' ? (
        /* DISPATCHER SPREADSHEET LEDGER MODE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs table-fixed min-w-[1550px]">
              <thead className="bg-slate-900 text-slate-300 font-bold sticky top-0 border-b border-slate-800 z-10 font-sans">
                <tr className="divide-x divide-slate-800">
                  <th className="px-3 py-3 w-14 text-center font-mono">№ п/п</th>
                  <th className="px-3 py-3 w-24">Дата</th>
                  <th className="px-2 py-3 w-16 text-center">Колонна</th>
                  <th className="px-2 py-3 w-16 text-center">Маршрут</th>
                  <th className="px-2 py-3 w-14 text-center">Выход</th>
                  <th className="px-3 py-3 w-24 text-center">Гос. № т/с</th>
                  <th className="px-3 py-3 w-28">Табель водителя</th>
                  <th className="px-3 py-3 w-40">Ф.И.О. водителя</th>
                  <th className="px-3 py-3 w-52 text-center bg-slate-950/40">Расписание (План / Сход / Заезд / Повтор)</th>
                  <th className="px-4 py-3">Причина схода водителя & примечания ремзоны</th>
                  <th className="px-3 py-3 w-44 text-center">Сход по состоянию здоровья</th>
                  <th className="px-3 py-3 w-28 text-center">Категория</th>
                  <th className="px-3 py-3 text-xs uppercase tracking-wider w-32 text-center">Статус</th>
                  {hasWriteAccess && <th className="px-4 py-3 text-xs uppercase tracking-wider w-20 text-center">Действия</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-slate-400 font-semibold">Сходы с линии по выбранным фильтрам не обнаружены</td>
                  </tr>
                ) : (
                  filteredIncidents.map((i, index) => {
                    const isExpanded = expandedId === i.id;
                    const isEditing = editingId === i.id;
                    const isHealthReason = !!i.health_reason;
                    const isDtpReason = i.original_reason?.toLowerCase().includes('дтп') || i.breakdown_name?.toLowerCase().includes('дтп');

                    // Style row based on categories
                    let rowBg = 'bg-white hover:bg-slate-50';
                    if (isExpanded) {
                      rowBg = 'bg-blue-50/20';
                    } else if (isHealthReason) {
                      rowBg = 'bg-rose-50/40 hover:bg-rose-100/40';
                    } else if (isDtpReason) {
                      rowBg = 'bg-amber-50/40 hover:bg-amber-100/40';
                    }

                    // Status style configurations
                    const statusConfig: Record<IncidentStatus, { bg: string, text: string, textR: string }> = {
                      'закрыт': { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: '● ЗАКРЫТ', textR: 'Закрыт' },
                      'открыт': { bg: 'bg-red-50 text-red-800 border-red-200 animate-pulse font-extrabold', text: '● ОТКРЫТ', textR: 'Открыт' },
                      'требует проверки': { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: '● ПРОВЕРКА', textR: 'Проверка' }
                    };

                    const currentStatusStyle = statusConfig[i.status] || statusConfig['закрыт'];

                    return (
                      <React.Fragment key={i.id}>
                        {/* Master Ledger Row */}
                        <tr 
                          onClick={() => toggleRowExpansion(i.id)}
                          className={`divide-x divide-slate-100 transition-all cursor-pointer ${rowBg}`}
                        >
                          {/* Row Number */}
                          <td className="px-3 py-3 text-center font-mono text-slate-500 font-bold">{index + 1}</td>
                          
                          {/* Date */}
                          <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{i.incident_date}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">{i.weekday}</div>
                          </td>

                          {/* Column Number */}
                          <td className="px-2 py-3 text-center font-black text-slate-600 text-xs">
                            {i.column_number || '—'}
                          </td>

                          {/* Route Number */}
                          <td className="px-2 py-3 text-center font-black text-slate-900 text-sm">
                            №{i.route_number}
                          </td>

                          {/* Run Number */}
                          <td className="px-2 py-3 text-center font-bold text-slate-500 font-mono">
                            {i.run_number || '—'}
                          </td>

                          {/* Vehicle Plate */}
                          <td className="px-3 py-3 text-center">
                            <span className="font-mono font-black bg-white px-2 py-0.5 border border-slate-300 text-slate-800 rounded shadow-sm text-[10px]">
                              {i.vehicle_number || 'н/д'}
                            </span>
                          </td>

                          {/* Driver Tab Number */}
                          <td className="px-3 py-3 font-mono text-slate-500 font-black">{i.driver_tab_number || '—'}</td>

                          {/* Driver Name */}
                          <td className="px-3 py-3 font-extrabold text-slate-800 truncate" title={i.driver_name}>
                            {i.driver_name}
                          </td>

                          {/* Chrono Timeline Grid */}
                          <td className="px-2 py-2 bg-slate-50/60 font-mono">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-semibold leading-tight text-slate-600">
                              <div>Пл: <span className="text-slate-800 font-bold">{i.departure_time || '—'}</span></div>
                              <div className="text-red-500">Сх: <span className="text-red-600 font-extrabold">{i.incident_report_time || '—'}</span></div>
                              <div>За: <span className="text-slate-800 font-bold">{i.return_to_depot_time || '—'}</span></div>
                              <div className="text-emerald-600">Вы: <span className="text-emerald-700 font-extrabold">{i.restart_time || '—'}</span></div>
                            </div>
                          </td>

                          {/* Reason and Repair Code */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 truncate max-w-[340px]" title={i.breakdown_name}>
                              {i.breakdown_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium italic truncate max-w-[340px] mt-0.5" title={i.original_reason}>
                              «{i.original_reason}»
                            </div>
                            {i.note && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 mt-1 rounded inline-block font-semibold">
                                Ремзона: {i.note}
                              </div>
                            )}
                          </td>

                          {/* Health Indicator (Highlighted if health cases) */}
                          <td className="px-3 py-3 text-center">
                            {isHealthReason ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
                                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                                <span className="truncate max-w-[120px]" title={i.health_reason}>{i.health_reason}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-semibold">—</span>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                              {i.breakdown_category || 'Прочее'}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-3 text-center whitespace-nowrap font-sans">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border tracking-wider ${currentStatusStyle.bg}`}>
                              {currentStatusStyle.text}
                            </span>
                          </td>

                          {/* Fast Action Row buttons */}
                          <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {hasWriteAccess ? (
                                <>
                                  <button
                                    onClick={(e) => startEdit(i, e)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                                    title="Быстрое редактирование"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      if (window.confirm(`Вы уверены, что хотите окончательно удалить сход с линии #${i.id}?`)) {
                                        onDeleteIncident(i.id);
                                      }
                                    }}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                    title="Удалить рапорт"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-bold">Осмотр</span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expended Drawer Panel containing Timeline and Editor */}
                        {isExpanded && (
                          <tr className="bg-slate-100/50">
                            <td colSpan={14} className="px-6 py-5 border-y border-slate-300">
                              <div className="max-w-5xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                
                                {/* Info Panel & Diagnostics */}
                                <div className="p-6 space-y-5 md:col-span-1 bg-slate-50/50 font-sans">
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                                      <Activity className="w-3.5 h-3.5" />
                                      <span>Диагностическая карточка #{i.id}</span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 leading-snug">Параметры инцидента</h4>
                                    <p className="text-[10px] text-slate-400">Источник сведений: {i.source_file || 'Ручной реестр'}</p>
                                  </div>

                                  <div className="space-y-3.5 text-xs text-slate-600 font-semibold">
                                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                      <span className="text-slate-400">Дата отправления:</span>
                                      <span className="text-slate-800 font-bold">{i.incident_date} ({i.weekday})</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                      <span className="text-slate-400">Автоколонна:</span>
                                      <span className="text-slate-800 font-bold">{i.column_number || 'Не указана'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                      <span className="text-slate-400">Выпуск ТС:</span>
                                      <span className="text-slate-800 font-bold">Маршрут {i.route_number}, Выход {i.run_number || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                      <span className="text-slate-400">Гос. Номер ТС:</span>
                                      <span className="text-slate-800 font-mono font-bold bg-slate-100 px-1.5 rounded">{i.vehicle_number || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                      <span className="text-slate-400">Водитель автобуса:</span>
                                      <span className="text-slate-800 font-bold text-right">{i.driver_name} (Таб. {i.driver_tab_number})</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                      <span className="text-slate-400">Отв. диспетчер:</span>
                                      <span className="text-blue-600 font-bold">{i.dispatcher_name || 'Смирнов А.А.'}</span>
                                    </div>
                                  </div>

                                  {/* AI Classifier context card */}
                                  <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-lg space-y-2">
                                    <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                                      <Wrench className="w-3.5 h-3.5" />
                                      <span>ИИ-Классификация отказа</span>
                                    </div>
                                    <div className="space-y-1 text-[11px] text-blue-700 font-medium">
                                      <div>Код неисправности: <strong className="font-mono">{i.breakdown_code || 'н/д'}</strong></div>
                                      <div>Характер поломки: <strong>{i.breakdown_name || 'Не классифицирован'}</strong></div>
                                      <div>Категория: <strong>{i.breakdown_category || 'Не определена'}</strong></div>
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <span>Степень тяжести:</span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                          i.criticality === 'Высокая' ? 'bg-red-100 text-red-800' :
                                          i.criticality === 'Средняя' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                          {i.criticality || 'Низкая'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Form / Interactive Panel block */}
                                <div className="p-6 md:col-span-2 space-y-4 font-sans">
                                  {isEditing ? (
                                    /* ACTIVE EDITOR VIEW */
                                    <div className="space-y-4">
                                      <div className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1">
                                        Форма редактирования схода №{i.id}
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Дата схода</label>
                                          <input
                                            type="date"
                                            value={editForm.incident_date || ''}
                                            onChange={e => handleEditChange('incident_date', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Линейный Маршрут</label>
                                          <input
                                            type="text"
                                            value={editForm.route_number || ''}
                                            onChange={e => handleEditChange('route_number', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Выход расписания</label>
                                          <input
                                            type="text"
                                            value={editForm.run_number || ''}
                                            onChange={e => handleEditChange('run_number', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                                          />
                                        </div>

                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Гос.номер ТС</label>
                                          <input
                                            type="text"
                                            value={editForm.vehicle_number || ''}
                                            onChange={e => handleEditChange('vehicle_number', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono font-bold"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Табельный водителя</label>
                                          <input
                                            type="text"
                                            value={editForm.driver_tab_number || ''}
                                            onChange={e => handleEditChange('driver_tab_number', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">ФИО водителя</label>
                                          <input
                                            type="text"
                                            value={editForm.driver_name || ''}
                                            onChange={e => handleEditChange('driver_name', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                                          />
                                        </div>
                                      </div>

                                      {/* Times Grid */}
                                      <div className="bg-slate-50 p-3.5 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-200/60">
                                        <div>
                                          <label className="text-[9px] font-black text-slate-400 uppercase">Выезд (план)</label>
                                          <input
                                            type="time"
                                            placeholder="--:--"
                                            value={editForm.departure_time || ''}
                                            onChange={e => handleEditChange('departure_time', e.target.value)}
                                            className="w-full mt-0.5 p-1 border border-slate-200 bg-white rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none text-center font-bold font-mono"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] font-black text-red-500 uppercase">Время схода</label>
                                          <input
                                            type="time"
                                            placeholder="--:--"
                                            value={editForm.incident_report_time || ''}
                                            onChange={e => handleEditChange('incident_report_time', e.target.value)}
                                            className="w-full mt-0.5 p-1 border border-slate-200 bg-white rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none text-center text-red-600 font-black font-mono"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] font-black text-slate-400 uppercase">Заезд в парк</label>
                                          <input
                                            type="time"
                                            placeholder="--:--"
                                            value={editForm.return_to_depot_time || ''}
                                            onChange={e => handleEditChange('return_to_depot_time', e.target.value)}
                                            className="w-full mt-0.5 p-1 border border-slate-200 bg-white rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none text-center font-bold font-mono"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] font-black text-emerald-600 uppercase">Выпуск на линию</label>
                                          <input
                                            type="time"
                                            placeholder="--:--"
                                            value={editForm.restart_time || ''}
                                            onChange={e => handleEditChange('restart_time', e.target.value)}
                                            className="w-full mt-0.5 p-1 border border-slate-200 bg-white rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none text-center text-emerald-600 font-black font-mono"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Группа / Причина по каталогу поломок</label>
                                          <select
                                            value={editForm.breakdown_name || ''}
                                            onChange={e => handleEditChange('breakdown_name', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white font-semibold"
                                          >
                                            {breakdowns.map(b => (
                                              <option key={b.breakdown_code} value={b.breakdown_name}>{b.breakdown_name} ({b.breakdown_code})</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Статус схода</label>
                                          <select
                                            value={editForm.status || 'закрыт'}
                                            onChange={e => handleEditChange('status', e.target.value as IncidentStatus)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white font-bold"
                                          >
                                            <option value="закрыт">закрыт (сбой устранен, автобус выпущен/заменен)</option>
                                            <option value="открыт">открыт (происшествие в процессе диспетчеризации)</option>
                                            <option value="требует проверки">требует проверки (неполные данные)</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <div>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase">Исходная причина схода (рапорт водителя)</label>
                                          <input
                                            type="text"
                                            value={editForm.original_reason || ''}
                                            onChange={e => handleEditChange('original_reason', e.target.value)}
                                            className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-semibold text-slate-700"
                                          />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
                                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                                              <span>Причина схода по состоянию здоровья</span>
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="например, высокое давление, головная боль"
                                              value={editForm.health_reason || ''}
                                              onChange={e => handleEditChange('health_reason', e.target.value)}
                                              className="w-full mt-0.5 p-1.5 border border-rose-200 rounded text-xs focus:ring-1 focus:ring-rose-500 outline-none bg-rose-50/20 font-bold"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Примечания ремзоны / Замена ТС</label>
                                            <input
                                              type="text"
                                              placeholder="номер замененного ТС или отчет мастера"
                                              value={editForm.note || ''}
                                              onChange={e => handleEditChange('note', e.target.value)}
                                              className="w-full mt-0.5 p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-semibold"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button
                                          type="button"
                                          onClick={() => setEditingId(null)}
                                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                        >
                                          Отмена
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => saveEdit(i.id, e)}
                                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                          <Save className="w-4 h-4" />
                                          <span>Сохранить в реестр</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* READ-ONLY DETAIL PANEL */
                                    <div className="space-y-5 h-full flex flex-col justify-between">
                                      <div className="space-y-4">
                                        <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                                          <div>
                                            <h4 className="text-sm font-black text-slate-800">Рапорт о неисправности ТС и заездах</h4>
                                            <p className="text-[11px] text-slate-400">Исходные сведения от диспетчерской смены</p>
                                          </div>
                                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border uppercase ${currentStatusStyle.bg}`}>
                                            {currentStatusStyle.textR}
                                          </span>
                                        </div>

                                        <blockquote className="p-4 bg-slate-50 border-l-4 border-slate-400 text-slate-700 italic text-xs leading-relaxed rounded-r-lg font-medium">
                                          «{i.original_reason || 'Сообщение водителя отсутствует.'}»
                                        </blockquote>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                                          {isHealthReason && (
                                            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg space-y-1.5">
                                              <div className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">
                                                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                                                <span>Снятие по состоянию здоровья</span>
                                              </div>
                                              <p className="text-slate-800 font-extrabold leading-normal">
                                                Официальная причина: <span className="underline decoration-rose-300 decoration-2">{i.health_reason}</span>
                                              </p>
                                            </div>
                                          )}

                                          {i.note ? (
                                            <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-lg space-y-1.5">
                                              <div className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Отчет мастера ремзоны / Замена ТС</div>
                                              <p className="text-slate-800 leading-normal font-bold">{i.note}</p>
                                            </div>
                                          ) : (
                                            <div className="p-4 bg-slate-50 rounded-lg text-slate-400 italic text-center text-[11px] border border-dashed border-slate-200 flex flex-col justify-center items-center">
                                              <span>Сведения ремзоны и замены ТС отсутствуют.</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Horizontal Timetable flow */}
                                        <div className="space-y-2 mt-4 pt-3.5 border-t border-slate-100">
                                          <span className="text-xs font-bold text-slate-700 block">Зафиксированный таймлайн:</span>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[11px]">
                                            <div className="flex items-center gap-1.5">
                                              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                              <div>План: <strong className="text-slate-800">{i.departure_time || '—'}</strong></div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-red-600 font-bold">
                                              <AlertTriangle className="w-4 h-4 shrink-0" />
                                              <div>Сход: <strong className="text-red-700">{i.incident_report_time || '—'}</strong></div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                              <Bus className="w-4 h-4 text-slate-400 shrink-0" />
                                              <div>Заезд: <strong className="text-slate-700">{i.return_to_depot_time || '—'}</strong></div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                              <CheckCircle className="w-4 h-4 shrink-0" />
                                              <div>Линия: <strong className="text-emerald-700">{i.restart_time || 'Нет'}</strong></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex justify-between items-center border-t border-slate-100 pt-3.5 text-xs text-slate-400 font-bold">
                                        <span>Автор записи: <strong>{i.dispatcher_name || 'Автоматическая диспетчерская'}</strong></span>
                                        {hasWriteAccess && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => startEdit(i)}
                                              className="px-4 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer"
                                            >
                                              Редактировать
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (window.confirm('Удалить эту диспетчерскую запись из общего журнала?')) {
                                                  onDeleteIncident(i.id);
                                                }
                                              }}
                                              className="px-4 py-1.5 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
                                            >
                                              Удалить
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* COMPACT CARD VIEW MODE (Perfect for mobile screens or bento summaries) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 font-sans">
          {filteredIncidents.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm font-semibold text-slate-400">
              Сходы с линии по выбранным фильтрам не обнаружены
            </div>
          ) : (
            filteredIncidents.map(i => {
              const isHealth = !!i.health_reason;
              const isDtp = i.original_reason?.toLowerCase().includes('дтп') || i.breakdown_name?.toLowerCase().includes('дтп');
              
              let cardAccent = 'border-slate-200';
              if (isHealth) cardAccent = 'border-rose-300 bg-rose-50/5';
              else if (isDtp) cardAccent = 'border-amber-300 bg-amber-50/5';

              return (
                <div 
                  key={i.id}
                  onClick={() => toggleRowExpansion(i.id)}
                  className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${cardAccent}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-400">#{i.id}</span>
                        <span className="font-black text-slate-900 text-sm bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono">
                          {i.vehicle_number || 'н/д'}
                        </span>
                      </div>
                      
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wider ${
                        i.status === 'закрыт' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        i.status === 'открыт' ? 'bg-red-50 text-red-800 border-red-200 animate-pulse' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {i.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{i.incident_date}</span>
                      </div>
                      <div className="text-blue-600">Маршрут {i.route_number}</div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 line-clamp-1">{i.breakdown_name}</h4>
                      <p className="text-xs text-slate-500 italic line-clamp-2">«{i.original_reason}»</p>
                    </div>

                    <div className="text-xs text-slate-600 font-semibold border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div>Водитель: <strong className="text-slate-800">{i.driver_name}</strong></div>
                      <div className="text-[10px] text-slate-400">Таб. {i.driver_tab_number}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between font-mono">
                    <div className="text-red-500">Сход: <strong>{i.incident_report_time || '—'}</strong></div>
                    <div className="text-slate-300">|</div>
                    <div>Заезд: <strong>{i.return_to_depot_time || '—'}</strong></div>
                    <div className="text-slate-300">|</div>
                    <div className="text-emerald-600">Повт: <strong>{i.restart_time || 'Нет'}</strong></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
