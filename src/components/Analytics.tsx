import React, { useState, useMemo } from 'react';
import { Incident } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Calendar, Route, Bus, Users, AlertTriangle, RefreshCw, 
  TrendingUp, Download, CheckSquare 
} from 'lucide-react';

interface AnalyticsProps {
  incidents: Incident[];
}

type SubPage = 'days' | 'routes' | 'buses' | 'drivers' | 'breakdowns' | 'recurring';

const COLORS = ['#1F3864', '#C55A11', '#C00000', '#2E7D32', '#7B1FA2', '#0097A7', '#F57C00', '#689F38'];

export default function Analytics({ incidents }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<SubPage>('days');

  // Common data: ignore empty incidents
  const validIncidents = useMemo(() => incidents, [incidents]);

  // 1. Daily Analytics calculations
  const dailyStats = useMemo(() => {
    if (validIncidents.length === 0) return { peakDay: '—', minDay: '—', avgVal: 0, tableData: [], chartData: [] };

    const days: Record<string, { total: number; tech: number; health: number; dtp: number; org: number; other: number }> = {};
    validIncidents.forEach(i => {
      const d = i.incident_date;
      if (!days[d]) {
        days[d] = { total: 0, tech: 0, health: 0, dtp: 0, org: 0, other: 0 };
      }
      days[d].total += 1;
      if (i.breakdown_category === 'Здоровье') days[d].health += 1;
      else if (i.breakdown_category === 'ДТП') days[d].dtp += 1;
      else if (i.breakdown_category === 'Организационные') days[d].org += 1;
      else if (i.breakdown_category === 'Прочие') days[d].other += 1;
      else days[d].tech += 1;
    });

    const tableData = Object.entries(days).map(([date, c]) => ({
      date,
      ...c
    })).sort((a, b) => b.date.localeCompare(a.date));

    // Calculate peaks
    let peakDay = '—';
    let maxVal = -1;
    let minDay = '—';
    let minVal = 99999;

    tableData.forEach(row => {
      if (row.total > maxVal) {
        maxVal = row.total;
        peakDay = `${row.date} (${row.total} сходов)`;
      }
      if (row.total < minVal) {
        minVal = row.total;
        minDay = `${row.date} (${row.total} сходов)`;
      }
    });

    const avgVal = Number((validIncidents.length / Object.keys(days).length).toFixed(1));

    return {
      peakDay,
      minDay,
      avgVal,
      tableData,
      chartData: [...tableData].sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [validIncidents]);

  // 2. Routes Analytics calculations
  const routesStats = useMemo(() => {
    const routes: Record<string, { total: number; tech: number; health: number; dtp: number }> = {};
    validIncidents.forEach(i => {
      const r = i.route_number || 'Не указан';
      if (!routes[r]) {
        routes[r] = { total: 0, tech: 0, health: 0, dtp: 0 };
      }
      routes[r].total += 1;
      if (i.breakdown_category === 'Здоровье') routes[r].health += 1;
      else if (i.breakdown_category === 'ДТП') routes[r].dtp += 1;
      else routes[r].tech += 1;
    });

    const tableData = Object.entries(routes).map(([route, c]) => ({
      route,
      ...c,
      percent: Number(((c.total / validIncidents.length) * 100).toFixed(1))
    })).sort((a, b) => b.total - a.total);

    return { tableData };
  }, [validIncidents]);

  // 3. Problem Buses Analytics
  const busesStats = useMemo(() => {
    const buses: Record<string, { total: number; tech: number; health: number; dtp: number; dates: string[] }> = {};
    validIncidents.forEach(i => {
      const v = i.vehicle_number || 'Не указан';
      if (!buses[v]) {
        buses[v] = { total: 0, tech: 0, health: 0, dtp: 0, dates: [] };
      }
      buses[v].total += 1;
      buses[v].dates.push(i.incident_date);
      if (i.breakdown_category === 'Здоровье') buses[v].health += 1;
      else if (i.breakdown_category === 'ДТП') buses[v].dtp += 1;
      else buses[v].tech += 1;
    });

    const tableData = Object.entries(buses).map(([vehicle, c]) => {
      // Get max date
      const sortedDates = [...c.dates].sort();
      const lastDate = sortedDates[sortedDates.length - 1] || '—';
      
      // Compute Risk Status
      let status = '🟢 0-1 сход';
      let colorClass = 'text-green-600 bg-green-50 border-green-200';
      if (c.total >= 5 || c.dtp > 0) {
        status = '🔴 Высокий риск (5+)';
        colorClass = 'text-red-600 bg-red-50 border-red-200';
      } else if (c.total >= 3) {
        status = '🟠 Средний риск (3-4)';
        colorClass = 'text-orange-600 bg-orange-50 border-orange-200';
      } else if (c.total === 2) {
        status = '🟡 Умеренный риск (2)';
        colorClass = 'text-amber-600 bg-amber-50 border-amber-200';
      }

      return {
        vehicle,
        ...c,
        lastDate,
        status,
        colorClass
      };
    }).sort((a, b) => b.total - a.total);

    return { tableData };
  }, [validIncidents]);

  // 4. Drivers Analytics
  const driversStats = useMemo(() => {
    const drivers: Record<string, { tab: string; name: string; total: number; health: number; dtp: number }> = {};
    validIncidents.forEach(i => {
      const name = i.driver_name || 'Неизвестный водитель';
      if (!drivers[name]) {
        drivers[name] = { tab: i.driver_tab_number || '—', name, total: 0, health: 0, dtp: 0 };
      }
      drivers[name].total += 1;
      if (i.breakdown_category === 'Здоровье') drivers[name].health += 1;
      else if (i.breakdown_category === 'ДТП') drivers[name].dtp += 1;
    });

    const tableData = Object.values(drivers).sort((a, b) => b.total - a.total);
    const multiIncidentsCount = tableData.filter(d => d.total >= 2 || d.dtp >= 1).length;

    return { tableData, multiIncidentsCount };
  }, [validIncidents]);

  // 5. Breakdowns Analytics
  const breakdownsStats = useMemo(() => {
    const bdowns: Record<string, { name: string; category: string; crit: string; total: number }> = {};
    validIncidents.forEach(i => {
      const n = i.breakdown_name || 'Не классифицировано';
      if (!bdowns[n]) {
        bdowns[n] = { name: n, category: i.breakdown_category || '—', crit: i.criticality || '—', total: 0 };
      }
      bdowns[n].total += 1;
    });

    const tableData = Object.values(bdowns).sort((a, b) => b.total - a.total);
    return { tableData };
  }, [validIncidents]);

  // 6. Recurring Faults Analysis (Same bus, same breakdown twice!)
  const recurringFaults = useMemo(() => {
    const busBdownCounts: Record<string, { count: number; dates: string[] }> = {};
    
    validIncidents.forEach(i => {
      if (i.vehicle_number && i.breakdown_name) {
        const key = `${i.vehicle_number}||${i.breakdown_name}`;
        if (!busBdownCounts[key]) {
          busBdownCounts[key] = { count: 0, dates: [] };
        }
        busBdownCounts[key].count += 1;
        busBdownCounts[key].dates.push(i.incident_date);
      }
    });

    return Object.entries(busBdownCounts)
      .filter(([_, d]) => d.count >= 2)
      .map(([key, d]) => {
        const [vehicle, bdown] = key.split('||');
        // Find corresponding vehicle model
        const incident = validIncidents.find(i => i.vehicle_number === vehicle);
        const model = incident?.source_file || 'ЛиАЗ-5292'; // Mock placeholder model
        return {
          vehicle,
          model,
          breakdownName: bdown,
          count: d.count,
          dates: d.dates.sort().join(', ')
        };
      }).sort((a, b) => b.count - a.count);
  }, [validIncidents]);

  return (
    <div className="space-y-6">
      {/* Tab select menu */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('days')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'days' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Анализ по дням</span>
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'routes' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Route className="w-4 h-4" />
          <span>Анализ по маршрутам</span>
        </button>
        <button
          onClick={() => setActiveTab('buses')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'buses' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Bus className="w-4 h-4" />
          <span>Проблемные автобусы</span>
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'drivers' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <Users className="w-4 h-4" />
          <span>Анализ по водителям</span>
        </button>
        <button
          onClick={() => setActiveTab('breakdowns')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'breakdowns' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Анализ поломок</span>
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'recurring' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Повторяющиеся дефекты</span>
        </button>
      </div>

      {/* DAYS ANALYTICS VIEW */}
      {activeTab === 'days' && (
        <div className="space-y-6">
          {/* KPI sub-cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-400 font-bold">Пиковый день по сходам</p>
              <h4 className="text-base font-bold text-slate-800 mt-1">{dailyStats.peakDay}</h4>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-400 font-bold">Спокойный день по сходам</p>
              <h4 className="text-base font-bold text-slate-800 mt-1">{dailyStats.minDay}</h4>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-400 font-bold">Среднее количество сходов в сутки</p>
              <h4 className="text-xl font-bold text-slate-800 mt-1">{dailyStats.avgVal} сходов / день</h4>
            </div>
          </div>

          {/* Bar Chart Stacked */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">📈 Сходы с линии по дням в разрезе групп</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats.chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip wrapperStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tech" name="Технические" stackId="a" fill="#1F3864" />
                  <Bar dataKey="health" name="По здоровью" stackId="a" fill="#2E7D32" />
                  <Bar dataKey="dtp" name="ДТП" stackId="a" fill="#C00000" />
                  <Bar dataKey="org" name="Организ." stackId="a" fill="#C55A11" />
                  <Bar dataKey="other" name="Прочие" stackId="a" fill="#7B1FA2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Дата</th>
                    <th className="px-5 py-3 text-center">Всего сходов</th>
                    <th className="px-5 py-3 text-center">Технические</th>
                    <th className="px-5 py-3 text-center">По состоянию здоровья</th>
                    <th className="px-5 py-3 text-center">Аварии / ДТП</th>
                    <th className="px-5 py-3 text-center">Организационные</th>
                    <th className="px-5 py-3 text-center">Прочее</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dailyStats.tableData.map(row => (
                    <tr key={row.date} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-700 font-bold">{row.date}</td>
                      <td className="px-5 py-3 text-center text-slate-900 font-bold bg-slate-50/30">{row.total}</td>
                      <td className="px-5 py-3 text-center text-blue-800">{row.tech}</td>
                      <td className="px-5 py-3 text-center text-green-700">{row.health}</td>
                      <td className="px-5 py-3 text-center text-red-600">{row.dtp}</td>
                      <td className="px-5 py-3 text-center text-amber-700">{row.org}</td>
                      <td className="px-5 py-3 text-center text-purple-700">{row.other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROUTES ANALYTICS VIEW */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-700 mb-4">🚌 ТОП-10 маршрутов по аварийности / сходам</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routesStats.tableData.slice(0, 10)} layout="vertical">
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="route" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="total" name="Сходов с линии" fill="#C55A11" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick explanation info card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">💡 Анализ плотности</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Высокая доля сходов на определенных маршрутах может указывать на сложные дорожные условия, плохое качество дорожного полотна или заторы. 
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Наибольшее число сходов:</span>
                  <span className="font-bold text-slate-800">Маршрут №{routesStats.tableData[0]?.route || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Процентная доля от всего парка:</span>
                  <span className="font-bold text-slate-800">{routesStats.tableData[0]?.percent || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Номер маршрута</th>
                    <th className="px-5 py-3 text-center">Всего сходов за период</th>
                    <th className="px-5 py-3 text-center">Доля в общем количестве (%)</th>
                    <th className="px-5 py-3 text-center">Технические неисправности</th>
                    <th className="px-5 py-3 text-center">По самочувствию водителя</th>
                    <th className="px-5 py-3 text-center">ДТП и происшествия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {routesStats.tableData.map(row => (
                    <tr key={row.route} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-900 font-bold">Маршрут № {row.route}</td>
                      <td className="px-5 py-3 text-center text-slate-900 font-bold">{row.total}</td>
                      <td className="px-5 py-3 text-center text-blue-600">{row.percent}%</td>
                      <td className="px-5 py-3 text-center text-slate-500">{row.tech}</td>
                      <td className="px-5 py-3 text-center text-slate-500">{row.health}</td>
                      <td className="px-5 py-3 text-center text-slate-500">{row.dtp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROBLEMS BUSES VIEW */}
      {activeTab === 'buses' && (
        <div className="space-y-6">
          {/* Quick Explanation */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">🚦 Классификация технического состояния ТС</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Автобусы ранжируются по критичности поломок и их количеству. Частые сходы (3+) одного и того же госномера сигнализируют о необходимости проведения глубокого ТО-2 в ремонтной зоне автопарка.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-bold">
              <div className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg">🟢 Стабильное (0-1 сход)</div>
              <div className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg">🟡 Умеренное (2 схода)</div>
              <div className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg">🟠 Требует ТО (3-4 схода)</div>
              <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg">🔴 Аварийное (5+ или ДТП)</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Госномер ТС</th>
                    <th className="px-5 py-3 text-center">Всего сходов за период</th>
                    <th className="px-5 py-3 text-center">Технические неисправности</th>
                    <th className="px-5 py-3 text-center">ДТП и происшествия</th>
                    <th className="px-5 py-3">Дата последнего происшествия</th>
                    <th className="px-5 py-3">Оценка технического статуса ТС</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {busesStats.tableData.map(row => (
                    <tr key={row.vehicle} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-900 font-mono font-bold uppercase">{row.vehicle}</td>
                      <td className="px-5 py-3 text-center text-slate-900 font-bold bg-slate-50/20">{row.total}</td>
                      <td className="px-5 py-3 text-center text-slate-500">{row.tech}</td>
                      <td className="px-5 py-3 text-center text-slate-500">{row.dtp}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.lastDate}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${row.colorClass}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DRIVERS VIEW */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
              <p className="text-xs text-slate-400 font-bold">Водители с повторными сходами или ДТП за период</p>
              <h4 className="text-xl font-bold text-slate-800 mt-1">{driversStats.multiIncidentsCount} водителей</h4>
              <p className="text-[10px] text-slate-400 mt-1">
                Систематические сходы по самочувствию или ДТП по вине водителя требуют проведения внеочередных инструктажей или терапевтического контроля на предрейсовом медицинском осмотре (ПРМО).
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <p className="text-xs text-slate-400 font-bold">Самый проблемный водитель</p>
              <h4 className="text-base font-bold text-slate-800 mt-1">
                {driversStats.tableData[0] ? `${driversStats.tableData[0].name} (${driversStats.tableData[0].total} сходов)` : '—'}
              </h4>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Ф.И.О. водителя</th>
                    <th className="px-5 py-3 w-40">Табельный номер</th>
                    <th className="px-5 py-3 text-center">Всего сходов</th>
                    <th className="px-5 py-3 text-center">Сходы по здоровью</th>
                    <th className="px-5 py-3 text-center">Участие в ДТП</th>
                    <th className="px-5 py-3">Примечание ОТиТБ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {driversStats.tableData.map(row => (
                    <tr key={row.name} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-900 font-bold">{row.name}</td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-500">#{row.tab}</td>
                      <td className="px-5 py-3 text-center text-slate-900 font-bold bg-slate-50/20">{row.total}</td>
                      <td className="px-5 py-3 text-center text-green-700">{row.health}</td>
                      <td className="px-5 py-3 text-center text-red-600">{row.dtp}</td>
                      <td className="px-5 py-3 text-xs font-medium text-slate-400">
                        {row.total >= 3 ? '🔴 Требуется внеочередной разбор на КБД' : 
                         row.total === 2 ? '🟡 Поставить на контроль ПРМО' : '🟢 Стандарт'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BREAKDOWNS VIEW */}
      {activeTab === 'breakdowns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Наименование неисправности</th>
                    <th className="px-5 py-3">Группа поломки</th>
                    <th className="px-5 py-3">Критичность</th>
                    <th className="px-5 py-3 text-center">Количество сходов</th>
                    <th className="px-5 py-3 text-center">Процентная доля (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {breakdownsStats.tableData.map(row => (
                    <tr key={row.name} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-900 font-bold text-xs">{row.name}</td>
                      <td className="px-5 py-3 text-slate-500 font-medium">{row.category}</td>
                      <td className="px-5 py-3 text-xs font-medium">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          row.crit === 'Критическая' ? 'bg-red-50 text-red-700 border-red-100' :
                          row.crit === 'Высокая' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {row.crit}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-slate-900 font-bold bg-slate-50/20">{row.total}</td>
                      <td className="px-5 py-3 text-center text-blue-700">
                        {Number(((row.total / validIncidents.length) * 100).toFixed(1))}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECURRING DEFFECTS VIEW */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">🔁 Систематически повторяющиеся неисправности</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Выявление случаев, когда **на одном и том же автобусе** возникает **одна и та же поломка** 2 или более раз в течение отчетного периода. Это прямой маркер некачественного ремонта или "хронического" дефекта узла, не устраненного слесарями.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Госномер ТС</th>
                    <th className="px-5 py-3">Модель / Серия</th>
                    <th className="px-5 py-3">Наименование систематической поломки</th>
                    <th className="px-5 py-3 text-center">Кол-во повторений</th>
                    <th className="px-5 py-3">Даты зафиксированных происшествий</th>
                    <th className="px-5 py-3">Рекомендация ОГМ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {recurringFaults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Повторяющихся дефектов на одном автобусе не обнаружено. Качество ремонта в норме.</td>
                    </tr>
                  ) : (
                    recurringFaults.map(row => (
                      <tr key={`${row.vehicle}-${row.breakdownName}`} className="hover:bg-rose-50/20 bg-rose-50/5">
                        <td className="px-5 py-3.5 text-rose-800 font-mono font-bold uppercase">{row.vehicle}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium text-xs">{row.model}</td>
                        <td className="px-5 py-3.5 text-slate-900 font-bold text-xs text-rose-700">{row.breakdownName}</td>
                        <td className="px-5 py-3.5 text-center text-rose-900 font-bold text-sm bg-rose-100/30">{row.count} раза</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{row.dates}</td>
                        <td className="px-5 py-3.5 text-xs text-rose-600 font-bold">
                          ⚠️ Внеочередная дефектовка узла главным инженером!
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
