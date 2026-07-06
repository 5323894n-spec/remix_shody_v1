import React, { useMemo } from 'react';
import { Incident } from '../types';
import { ShieldCheck, AlertCircle, CheckCircle, Clock, UserCheck, AlertTriangle } from 'lucide-react';

interface DataQualityProps {
  incidents: Incident[];
}

export default function DataQuality({ incidents }: DataQualityProps) {
  const auditResults = useMemo(() => {
    let totalIssues = 0;
    const issuesList: Array<{
      incident: Incident;
      problems: string[];
    }> = [];

    incidents.forEach(i => {
      const problems: string[] = [];

      // Check 1: Missing critical times
      if (!i.departure_time || !i.incident_report_time) {
        problems.push('Отсутствует время выезда или время сообщения схода');
      }
      
      // Check 2: Missing driver details
      if (!i.driver_name || i.driver_name === 'Не указан' || !i.driver_tab_number) {
        problems.push('Не заполнены ФИО или табельный номер водителя');
      }

      // Check 3: General/unclassified breakdown code
      if (i.breakdown_code === 'BRK-013' || i.breakdown_name.includes('Прочее')) {
        problems.push('Использован общий/неклассифицированный код неисправности ("Прочие")');
      }

      // Check 4: Return times missing on closed status
      if (i.status === 'закрыт' && !i.return_to_depot_time && !i.restart_time) {
        problems.push('Сход закрыт, но не указано время возврата в парк или повторного выхода');
      }

      if (problems.length > 0) {
        totalIssues += problems.length;
        issuesList.push({ incident: i, problems });
      }
    });

    const overallScore = incidents.length > 0 
      ? Math.max(0, Math.round(((incidents.length - issuesList.length) / incidents.length) * 100))
      : 100;

    return {
      totalIssues,
      issuesList,
      overallScore
    };
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <span>🛡️</span> Контроль качества данных
        </h1>
        <p className="text-sm text-slate-500 mt-1">Автоматический аудит полноты и корректности заполнения журнала сходов</p>
      </div>

      {/* Overview Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`p-4 rounded-full ${auditResults.overallScore >= 90 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Индекс чистоты данных</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{auditResults.overallScore}%</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-full bg-slate-100 text-slate-600">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Корректные записи</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{incidents.length - auditResults.issuesList.length} / {incidents.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`p-4 rounded-full ${auditResults.totalIssues > 0 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Выявлено замечаний</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{auditResults.totalIssues}</h3>
          </div>
        </div>
      </div>

      {/* Detailed Issues List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-150">
          <h3 className="text-sm font-bold text-slate-800">📋 Перечень замечаний к заполнению</h3>
          <p className="text-xs text-slate-500 mt-1">Ниже представлены записи схода с пропущенными или некорректно заполненными реквизитами</p>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {auditResults.issuesList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <ShieldCheck className="w-12 h-12 text-green-500" />
              <p className="font-bold text-slate-700 mt-2">Все данные заполнены идеально!</p>
              <p className="text-xs text-slate-400">В системе отсутствуют пропуски и некорректные коды неисправностей.</p>
            </div>
          ) : (
            auditResults.issuesList.map(({ incident, problems }) => (
              <div key={incident.id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Запись #{incident.id}</span>
                    <span className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono uppercase">{incident.vehicle_number}</span>
                    <span className="text-xs text-slate-400 font-medium">от {incident.incident_date} (Маршрут {incident.route_number})</span>
                  </div>
                  <div className="text-xs text-slate-500 italic">«{incident.original_reason}»</div>
                  
                  {/* Problem warnings */}
                  <div className="space-y-1 mt-2 pl-3 border-l-2 border-amber-400">
                    {problems.map((prob, pi) => (
                      <div key={pi} className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{prob}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-medium self-end md:self-start bg-slate-50 border border-slate-200 rounded px-2.5 py-1">
                  Диспетчер: <span className="font-bold text-slate-700">{incident.dispatcher_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
