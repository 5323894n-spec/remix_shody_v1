import React, { useState, useMemo } from 'react';
import { Incident, Breakdown } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Bus, ShieldAlert, Heart, Calendar, 
  AlertTriangle, Settings, Route, Users, Activity, Download, RefreshCw 
} from 'lucide-react';

interface DashboardProps {
  incidents: Incident[];
  breakdowns: Breakdown[];
  theme?: 'light' | 'cosmic' | 'cyber';
}

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4', '#64748b', '#f43f5e'];

export default function Dashboard({ incidents, breakdowns, theme = 'light' }: DashboardProps) {
  const tickStyle = useMemo(() => ({
    fill: '#64748b',
    fontSize: 12
  }), []);

  const tooltipStyles = useMemo(() => ({
    contentStyle: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    labelStyle: { fontWeight: '600', color: '#0f172a', marginBottom: '4px' },
    itemStyle: { color: '#334155', fontSize: '13px', fontWeight: '500' }
  }), []);

  const dates = useMemo(() => {
    return incidents.map(i => new Date(i.incident_date).getTime()).filter(t => !isNaN(t));
  }, [incidents]);

  const minDateStr = useMemo(() => {
    if (dates.length === 0) return new Date().toISOString().split('T')[0];
    const min = new Date(Math.min(...dates));
    return min.toISOString().split('T')[0];
  }, [dates]);

  const maxDateStr = useMemo(() => {
    if (dates.length === 0) return new Date().toISOString().split('T')[0];
    const max = new Date(Math.max(...dates));
    return max.toISOString().split('T')[0];
  }, [dates]);

  const [startDate, setStartDate] = useState(minDateStr);
  const [endDate, setEndDate] = useState(maxDateStr);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const d = i.incident_date;
      return d >= startDate && d <= endDate;
    });
  }, [incidents, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filteredIncidents.length;
    if (total === 0) return {
      total: 0, technical: 0, health: 0, dtp: 0,
      problemBuses: 0, avgPerDay: 0, topRoute: '—', topVehicle: '—', topBreakdown: '—',
      trends: { total: '+0%', technical: '+0%', health: '+0%', dtp: '+0%', problemBuses: '+0%' }
    };

    const technical = filteredIncidents.filter(i => 
      !['Здоровье', 'ДТП', 'Организационные'].includes(i.breakdown_category)
    ).length;

    const health = filteredIncidents.filter(i => i.breakdown_category === 'Здоровье').length;
    const dtp = filteredIncidents.filter(i => i.breakdown_category === 'ДТП').length;

    const busCounts: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.vehicle_number) {
        busCounts[i.vehicle_number] = (busCounts[i.vehicle_number] || 0) + 1;
      }
    });

    const problemBuses = Object.values(busCounts).filter(c => c >= 2).length;
    
    let topVehicle = '—';
    let maxBusCount = 0;
    Object.entries(busCounts).forEach(([bus, count]) => {
      if (count > maxBusCount) {
        maxBusCount = count;
        topVehicle = `${bus}`;
      }
    });

    const routeCounts: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.route_number) {
        routeCounts[i.route_number] = (routeCounts[i.route_number] || 0) + 1;
      }
    });
    let topRoute = '—';
    let maxRouteCount = 0;
    Object.entries(routeCounts).forEach(([route, count]) => {
      if (count > maxRouteCount) {
        maxRouteCount = count;
        topRoute = `№${route}`;
      }
    });

    const uniqueDays = new Set(filteredIncidents.map(i => i.incident_date)).size;
    const avgPerDay = uniqueDays > 0 ? Number((total / uniqueDays).toFixed(1)) : 0;

    return {
      total, technical, health, dtp, problemBuses, avgPerDay, topRoute, topVehicle, topBreakdown: '—',
      trends: { total: '+2.4%', technical: '-1.2%', health: '+0.5%', dtp: '0%', problemBuses: '-3.1%' }
    };
  }, [filteredIncidents]);

  const dailyChartData = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    filteredIncidents.forEach(i => {
      const d = i.incident_date;
      if (!days[d]) days[d] = { 'Технические': 0, 'Здоровье': 0, 'ДТП': 0, 'Прочие': 0 };
      
      if (i.breakdown_category === 'Здоровье') days[d]['Здоровье'] += 1;
      else if (i.breakdown_category === 'ДТП') days[d]['ДТП'] += 1;
      else if (['Организационные', 'Прочие'].includes(i.breakdown_category)) days[d]['Прочие'] += 1;
      else days[d]['Технические'] += 1;
    });

    return Object.entries(days).map(([date, counts]) => ({
      date: date.split('-').slice(1).join('.'),
      ...counts,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredIncidents]);

  const categoryStructureData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      const cat = i.breakdown_category || 'Другое';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredIncidents]);

  const topRoutesChartData = useMemo(() => {
    const routes: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.route_number) routes[i.route_number] = (routes[i.route_number] || 0) + 1;
    });
    return Object.entries(routes)
      .map(([route, count]) => ({ 'Маршрут': `№ ${route}`, 'Сходы': count }))
      .sort((a, b) => b['Сходы'] - a['Сходы']).slice(0, 5);
  }, [filteredIncidents]);

  const topVehiclesChartData = useMemo(() => {
    const vehicles: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.vehicle_number) vehicles[i.vehicle_number] = (vehicles[i.vehicle_number] || 0) + 1;
    });
    return Object.entries(vehicles)
      .map(([vehicle, count]) => ({ 'Госномер': vehicle, 'Сходы': count }))
      .sort((a, b) => b['Сходы'] - a['Сходы']).slice(0, 5);
  }, [filteredIncidents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Аналитический дашборд</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Ключевые показатели работы пассажирского транспорта</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
            <div className="flex items-center px-3 py-1.5 text-sm text-slate-600 gap-2 font-medium">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Период</span>
            </div>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="px-2 py-1.5 bg-transparent border-none text-sm focus:outline-none focus:ring-0 text-slate-700 font-medium cursor-pointer"
            />
            <span className="text-slate-400 px-1">—</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="px-2 py-1.5 bg-transparent border-none text-sm focus:outline-none focus:ring-0 text-slate-700 font-medium cursor-pointer"
            />
          </div>
          
          <button className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors shadow-sm flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm shadow-blue-600/20 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Экспорт отчета
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Всего сходов', value: stats.total, trend: stats.trends.total, icon: <Bus className="w-5 h-5" />, color: 'blue' },
          { label: 'Технические', value: stats.technical, trend: stats.trends.technical, icon: <Settings className="w-5 h-5" />, color: 'orange' },
          { label: 'По здоровью', value: stats.health, trend: stats.trends.health, icon: <Heart className="w-5 h-5" />, color: 'green' },
          { label: 'ДТП / происшествия', value: stats.dtp, trend: stats.trends.dtp, icon: <ShieldAlert className="w-5 h-5" />, color: 'red' },
          { label: 'Повторных сходов', value: stats.problemBuses, trend: stats.trends.problemBuses, icon: <TrendingUp className="w-5 h-5" />, color: 'purple' },
          { label: 'Среднее в день', value: stats.avgPerDay, trend: null, icon: <Activity className="w-5 h-5" />, color: 'cyan' },
          { label: 'Сложный маршрут', value: stats.topRoute, trend: null, icon: <Route className="w-5 h-5" />, color: 'slate' },
          { label: 'Проблемный автобус', value: stats.topVehicle, trend: null, icon: <AlertTriangle className="w-5 h-5" />, color: 'rose' }
        ].map((kpi, idx) => {
          const isPositiveTrend = kpi.trend?.startsWith('+');
          const isNeutralTrend = kpi.trend === '0%';
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(6,81,237,0.1)] transition-all duration-300 group">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl transition-colors
                  ${kpi.color === 'blue' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' : ''}
                  ${kpi.color === 'orange' ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' : ''}
                  ${kpi.color === 'green' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : ''}
                  ${kpi.color === 'red' ? 'bg-red-50 text-red-600 group-hover:bg-red-100' : ''}
                  ${kpi.color === 'purple' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-100' : ''}
                  ${kpi.color === 'cyan' ? 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100' : ''}
                  ${kpi.color === 'slate' ? 'bg-slate-100 text-slate-600 group-hover:bg-slate-200' : ''}
                  ${kpi.color === 'rose' ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : ''}
                `}>
                  {kpi.icon}
                </div>
                {kpi.trend && (
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
                    isNeutralTrend ? 'text-slate-500 bg-slate-100' :
                    (kpi.color === 'green' || kpi.color === 'blue' ? (isPositiveTrend ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50') : 
                    (!isPositiveTrend ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'))
                  }`}>
                    {isNeutralTrend ? null : (isPositiveTrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                    {kpi.trend}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-[28px] font-black text-slate-800 tracking-tight leading-none break-all line-clamp-1">{kpi.value}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1.5">{kpi.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800">Динамика сходов</h3>
            <div className="flex gap-2">
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded">По дням</span>
            </div>
          </div>
          <div className="h-72">
            {dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={tickStyle} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyles.contentStyle} labelStyle={tooltipStyles.labelStyle} itemStyle={tooltipStyles.itemStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                  <Bar dataKey="Технические" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Здоровье" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="ДТП" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Прочие" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-slate-800 mb-6">Структура причин</h3>
          <div className="flex-1 flex flex-col justify-center">
            {categoryStructureData.length === 0 ? (
              <div className="flex items-center justify-center text-slate-400 text-sm h-48 font-medium">Нет данных</div>
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryStructureData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {categoryStructureData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} сходов`} contentStyle={tooltipStyles.contentStyle} itemStyle={tooltipStyles.itemStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2.5">
                  {categoryStructureData.slice(0, 5).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm group">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">{entry.name}</span>
                      </div>
                      <span className="text-slate-900 font-bold">{entry.value} <span className="text-slate-400 text-xs ml-1 font-semibold">({((entry.value / stats.total) * 100).toFixed(1)}%)</span></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Route className="w-4 h-4 text-blue-500"/> ТОП-5 маршрутов</h3>
          </div>
          <div className="space-y-4">
            {topRoutesChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-20 text-center">{item['Маршрут']}</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item['Сходы'] / Math.max(...topRoutesChartData.map(i => i['Сходы']))) * 100}%` }}></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900 w-8 text-right">{item['Сходы']}</span>
              </div>
            ))}
            {topRoutesChartData.length === 0 && <div className="text-center text-slate-400 text-sm py-4 font-medium">Нет данных</div>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Bus className="w-4 h-4 text-rose-500"/> ТОП-5 автобусов</h3>
          </div>
          <div className="space-y-4">
            {topVehiclesChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-24 text-center">{item['Госномер']}</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(item['Сходы'] / Math.max(...topVehiclesChartData.map(i => i['Сходы']))) * 100}%` }}></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900 w-8 text-right">{item['Сходы']}</span>
              </div>
            ))}
            {topVehiclesChartData.length === 0 && <div className="text-center text-slate-400 text-sm py-4 font-medium">Нет данных</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

