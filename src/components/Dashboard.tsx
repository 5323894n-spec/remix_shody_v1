import React, { useState, useMemo } from 'react';
import { Incident, Breakdown } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Bus, ShieldAlert, Heart, Calendar, 
  AlertTriangle, Settings, Route, Users, Activity 
} from 'lucide-react';

interface DashboardProps {
  incidents: Incident[];
  breakdowns: Breakdown[];
  theme?: 'light' | 'cosmic' | 'cyber';
}

const COLORS = ['#1F3864', '#C55A11', '#C00000', '#2E7D32', '#7B1FA2', '#F57C00', '#0097A7', '#689F38'];

export default function Dashboard({ incidents, breakdowns, theme = 'light' }: DashboardProps) {
  // Theme styling overrides for Recharts components
  const tickStyle = useMemo(() => ({
    fill: theme === 'light' ? '#64748b' : theme === 'cosmic' ? '#94a3b8' : '#8ba2b5',
    fontSize: 11
  }), [theme]);

  const tooltipStyles = useMemo(() => {
    if (theme === 'light') {
      return {
        contentStyle: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' },
        labelStyle: { fontWeight: 'bold', color: '#0f172a' },
        itemStyle: { color: '#0f172a' }
      };
    } else if (theme === 'cosmic') {
      return {
        contentStyle: { backgroundColor: '#151f32', borderColor: '#1e293b', borderRadius: '8px' },
        labelStyle: { fontWeight: 'bold', color: '#ffffff' },
        itemStyle: { color: '#cbd5e1' }
      };
    } else {
      return {
        contentStyle: { backgroundColor: '#111518', borderColor: '#1e252c', borderRadius: '8px' },
        labelStyle: { fontWeight: 'bold', color: '#f0fdf4' },
        itemStyle: { color: '#ccdce8' }
      };
    }
  }, [theme]);

  // Date Range state
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

  // Filter incidents based on date range
  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const d = i.incident_date;
      return d >= startDate && d <= endDate;
    });
  }, [incidents, startDate, endDate]);

  // Compute stats
  const stats = useMemo(() => {
    const total = filteredIncidents.length;
    if (total === 0) return {
      total: 0, technical: 0, health: 0, dtp: 0,
      problemBuses: 0, avgPerDay: 0, topRoute: '—', topVehicle: '—', topBreakdown: '—'
    };

    // Technical categories: not 'Здоровье', 'ДТП', 'Организационные'
    const technical = filteredIncidents.filter(i => 
      !['Здоровье', 'ДТП', 'Организационные'].includes(i.breakdown_category)
    ).length;

    const health = filteredIncidents.filter(i => i.breakdown_category === 'Здоровье').length;
    const dtp = filteredIncidents.filter(i => i.breakdown_category === 'ДТП').length;

    // Bus stats
    const busCounts: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.vehicle_number) {
        busCounts[i.vehicle_number] = (busCounts[i.vehicle_number] || 0) + 1;
      }
    });

    const problemBuses = Object.values(busCounts).filter(c => c >= 2).length;
    
    // Top problematic bus
    let topVehicle = '—';
    let maxBusCount = 0;
    Object.entries(busCounts).forEach(([bus, count]) => {
      if (count > maxBusCount) {
        maxBusCount = count;
        topVehicle = `${bus} (${count} сходов)`;
      }
    });

    // Top route
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
        topRoute = `Маршрут №${route} (${count} сходов)`;
      }
    });

    // Top Breakdown name
    const bdownCounts: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.breakdown_name) {
        bdownCounts[i.breakdown_name] = (bdownCounts[i.breakdown_name] || 0) + 1;
      }
    });
    let topBreakdown = '—';
    let maxBdownCount = 0;
    Object.entries(bdownCounts).forEach(([name, count]) => {
      if (count > maxBdownCount) {
        maxBdownCount = count;
        topBreakdown = `${name} (${count} раз)`;
      }
    });

    // Daily average
    const uniqueDays = new Set(filteredIncidents.map(i => i.incident_date)).size;
    const avgPerDay = uniqueDays > 0 ? Number((total / uniqueDays).toFixed(1)) : 0;

    return {
      total, technical, health, dtp, problemBuses, avgPerDay, topRoute, topVehicle, topBreakdown
    };
  }, [filteredIncidents]);

  // Chart data: By day
  const dailyChartData = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    filteredIncidents.forEach(i => {
      const d = i.incident_date;
      if (!days[d]) {
        days[d] = { 'Технические': 0, 'Здоровье': 0, 'ДТП': 0, 'Организ': 0, 'Прочие': 0 };
      }
      
      if (i.breakdown_category === 'Здоровье') {
        days[d]['Здоровье'] += 1;
      } else if (i.breakdown_category === 'ДТП') {
        days[d]['ДТП'] += 1;
      } else if (i.breakdown_category === 'Организационные') {
        days[d]['Организ'] += 1;
      } else if (i.breakdown_category === 'Прочие') {
        days[d]['Прочие'] += 1;
      } else {
        days[d]['Технические'] += 1;
      }
    });

    return Object.entries(days).map(([date, counts]) => ({
      date: date.split('-').slice(1).join('.'), // Format MM.DD
      ...counts,
      'Всего сходов': Object.values(counts).reduce((a, b) => a + b, 0)
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredIncidents]);

  // Chart data: Structure of categories
  const categoryStructureData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      const cat = i.breakdown_category || 'Другое';
      cats[cat] = (cats[cat] || 0) + 1;
    });

    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredIncidents]);

  // Chart data: Top 10 routes
  const topRoutesChartData = useMemo(() => {
    const routes: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.route_number) {
        routes[i.route_number] = (routes[i.route_number] || 0) + 1;
      }
    });
    return Object.entries(routes)
      .map(([route, count]) => ({ 'Маршрут': `М-т ${route}`, 'Сходы': count }))
      .sort((a, b) => b['Сходы'] - a['Сходы'])
      .slice(0, 10);
  }, [filteredIncidents]);

  // Chart data: Top 10 vehicles
  const topVehiclesChartData = useMemo(() => {
    const vehicles: Record<string, number> = {};
    filteredIncidents.forEach(i => {
      if (i.vehicle_number) {
        vehicles[i.vehicle_number] = (vehicles[i.vehicle_number] || 0) + 1;
      }
    });
    return Object.entries(vehicles)
      .map(([vehicle, count]) => ({ 'Госномер': vehicle, 'Сходы': count }))
      .sort((a, b) => b['Сходы'] - a['Сходы'])
      .slice(0, 10);
  }, [filteredIncidents]);

  // Chart data: Top 10 breakdowns
  const topBreakdownsChartData = useMemo(() => {
    const bdowns: Record<string, { count: number; category: string }> = {};
    filteredIncidents.forEach(i => {
      if (i.breakdown_name) {
        if (!bdowns[i.breakdown_name]) {
          bdowns[i.breakdown_name] = { count: 0, category: i.breakdown_category };
        }
        bdowns[i.breakdown_name].count += 1;
      }
    });
    return Object.entries(bdowns)
      .map(([name, d]) => ({ 'Поломка': name, 'Сходы': d.count, 'Категория': d.category }))
      .sort((a, b) => b['Сходы'] - a['Сходы'])
      .slice(0, 10);
  }, [filteredIncidents]);

  return (
    <div className="space-y-6">
      {/* Header and Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <span>🏠</span> Главная панель
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ключевые показатели работы пассажирского транспорта</p>
        </div>
        
        {/* Date pickers */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Период:</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <span className="text-slate-400">—</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" /> Ключевые показатели
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Всего сходов</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.total}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-orange-50 text-orange-700 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Технические</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.technical}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-green-50 text-green-700 rounded-lg">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">По здоровью</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.health}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">ДТП / происшествия</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.dtp}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Повторных сходов</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.problemBuses}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Среднее в день</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.avgPerDay}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Сложный маршрут</p>
              <h3 className="text-sm font-bold text-slate-800 mt-1 break-all line-clamp-2">{stats.topRoute}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Сложный автобус</p>
              <h3 className="text-sm font-bold text-slate-800 mt-1 break-all line-clamp-2">{stats.topVehicle}</h3>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-slate-600">
          Самая частая неисправность: <strong className="text-slate-800">{stats.topBreakdown}</strong>
        </div>
      </div>

      {/* Row 1 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">📈 Количество сходов по дням</h3>
          <div className="h-80">
            {dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Нет данных за выбранный период</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <XAxis dataKey="date" tick={tickStyle} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                  <YAxis allowDecimals={false} tick={tickStyle} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                  <Tooltip 
                    contentStyle={tooltipStyles.contentStyle} 
                    labelStyle={tooltipStyles.labelStyle} 
                    itemStyle={tooltipStyles.itemStyle} 
                    wrapperStyle={{ fontSize: 12 }} 
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Технические" stackId="a" fill="#1F3864" />
                  <Bar dataKey="Здоровье" stackId="a" fill="#2E7D32" />
                  <Bar dataKey="ДТП" stackId="a" fill="#C00000" />
                  <Bar dataKey="Организ" stackId="a" fill="#C55A11" />
                  <Bar dataKey="Прочие" stackId="a" fill="#7B1FA2" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Structure Category Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">🍕 Структура причин сходов</h3>
          <div className="h-80 flex flex-col md:flex-row items-center justify-center gap-4">
            {categoryStructureData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Нет данных за выбранный период</div>
            ) : (
              <>
                <div className="h-56 w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStructureData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryStructureData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `${value} сходов`}
                        contentStyle={tooltipStyles.contentStyle} 
                        labelStyle={tooltipStyles.labelStyle} 
                        itemStyle={tooltipStyles.itemStyle} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="flex-1 space-y-2 max-h-64 overflow-y-auto w-full px-2">
                  {categoryStructureData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs border-b border-slate-50 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-slate-600 font-medium truncate max-w-[140px]">{entry.name}</span>
                      </div>
                      <span className="text-slate-800 font-semibold">{entry.value} ({((entry.value / stats.total) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Routes Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">🚌 ТОП-10 маршрутов по сходам</h3>
          <div className="h-80">
            {topRoutesChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRoutesChartData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={tickStyle} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                  <YAxis dataKey="Маршрут" type="category" tick={tickStyle} width={70} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                  <Tooltip 
                    contentStyle={tooltipStyles.contentStyle} 
                    labelStyle={tooltipStyles.labelStyle} 
                    itemStyle={tooltipStyles.itemStyle} 
                    wrapperStyle={{ fontSize: 12 }} 
                  />
                  <Bar dataKey="Сходы" fill="#C55A11" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Buses Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">🚍 ТОП-10 проблемных автобусов</h3>
          <div className="h-80">
            {topVehiclesChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVehiclesChartData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={tickStyle} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                  <YAxis dataKey="Госномер" type="category" tick={tickStyle} width={90} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                  <Tooltip 
                    contentStyle={tooltipStyles.contentStyle} 
                    labelStyle={tooltipStyles.labelStyle} 
                    itemStyle={tooltipStyles.itemStyle} 
                    wrapperStyle={{ fontSize: 12 }} 
                  />
                  <Bar dataKey="Сходы" fill="#C00000" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Breakdowns Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">⚠️ ТОП-10 неисправностей и поломок</h3>
        <div className="h-96">
          {topBreakdownsChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topBreakdownsChartData} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={tickStyle} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                <YAxis dataKey="Поломка" type="category" tick={{ ...tickStyle, fontSize: 10 }} width={160} stroke={theme === 'light' ? '#cbd5e1' : '#334155'} />
                <Tooltip 
                  contentStyle={tooltipStyles.contentStyle} 
                  labelStyle={tooltipStyles.labelStyle} 
                  itemStyle={tooltipStyles.itemStyle} 
                  wrapperStyle={{ fontSize: 12 }} 
                />
                <Bar dataKey="Сходы" fill="#1F3864" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
