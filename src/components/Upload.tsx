// src/components/Upload.tsx
import React, { useState, useMemo } from 'react';
import { Incident, Breakdown, Driver, Vehicle, User } from '../types';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Play, Save, Clipboard } from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';

// Helper to auto-decode array buffers to string (supports Windows-1251 and UTF-8)
function decodeText(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Russian text in UTF-8 uses 2-byte sequences starting with 0xD0 or 0xD1, 
  // followed by 0x80 to 0xBF.
  // Russian text in Windows-1251 consists of single-byte characters in 0xC0 to 0xFF.
  let d0d1Count = 0;
  let cp1251CyrillicCount = 0;
  
  for (let i = 0; i < uint8Array.length; i++) {
    const b = uint8Array[i];
    if (b === 0xD0 || b === 0xD1) {
      if (i + 1 < uint8Array.length && uint8Array[i+1] >= 0x80 && uint8Array[i+1] <= 0xBF) {
        d0d1Count++;
      }
    }
    if (b >= 0xC0 && b <= 0xFF) {
      cp1251CyrillicCount++;
    }
  }
  
  // If we find typical UTF-8 Cyrillic sequences, we decode as utf-8
  if (d0d1Count > 5) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
  }
  
  // If we find significantly more CP1251 characters, decode as windows-1251
  if (cp1251CyrillicCount > d0d1Count * 2 && cp1251CyrillicCount > 5) {
    try {
      const decoder = new TextDecoder('windows-1251');
      return decoder.decode(uint8Array);
    } catch (e) {
      // Fallback
    }
  }
  
  // Default to utf-8
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(uint8Array);
}

interface UploadProps {
  breakdowns: Breakdown[];
  drivers: Driver[];
  vehicles: Vehicle[];
  currentUser?: User;
  onBulkAddIncidents: (incidents: Omit<Incident, 'id'>[]) => void;
}

interface ParsedRow {
  date: string;
  column: string;
  route: string;
  run: string;
  vehicle: string;
  driverTab: string;
  driverName: string;
  departure: string;
  report: string;
  returnDepot: string;
  restart: string;
  reason: string;
  note?: string;
  healthReason?: string;
  suggestedBreakdown: Breakdown;
  confidence: 'high' | 'medium' | 'low';
}

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

// Subset of user's uploaded data as a prebuilt demo dataset
const USER_DATASET_DEMO = `№п/п;Дата;Колонна;Маршрут;Выход;Гос.№ т/с;Табельный номер водителя;Ф.И.О. водителя ;Планируемое время выезда;Время схода (когда сообщил);Время заезда в парк;Время выхода;Причина схода ;Примечание;Сход с линии по состоянию здоровья (причина);Замена ТС
1;01.06.2026;2;208;8;;4400;Гальченко Д.В.;6:14:00;;к/с 21:12;;по семейным обстоятельствам;;;
2;01.06.2026;2;31;6;;4125;Семенова Л.В.;7:24:00;;к/с 22:12;;заболел водитель;;;
3;01.06.2026;2;15;1;;3627;Мустафаев Ч.И.;4:35:00;;к/с 19:14;;плохое самочувствие;;высокое давление;
4;01.06.2026;1;36;1;о005ср;4031;Самохвалов А.В.;4:37:00;;;6:20:00;проспал;;;
5;01.06.2026;2;110;1;;120;Жаров А.С.;5:00:00;;к/с 20:00;;плохое самочувствие;;высокое давление;
6;01.06.2026;2;222;3;о058ср;937;Рыбаков А.А.;5:30:00;;;5:00:00;переведен на 110/1;;;
7;01.06.2026;1;21;11;о137ср;1091;Голубев П.Ю.;;5:07:00;5:31:00;7:00:00;подвеска;;;
8;01.06.2026;1;9;12;о086ср;2471;Бойков Д.С.;;5:10:00;5:13:00;6:10:00;двери;;;
9;01.06.2026;3;106;2;;4649;Родичев Е.А;5:24:00;;к/с 19:21;;не допущен медиком;;;
10;01.06.2026;2;51;9;н739ср;4122;Филиппов С.Ю.;5:06:00;;;;водитель проспал, пульс;;;0-23
11;02.06.2026;3;205;1;н680ср;3624;Бочаров Е.А.;;10:20:00;18:07:00;;греется;п/л закрыт 18:07;;к/с19:07
12;02.06.2026;1;36;10;н741ср;1254;Плотников М.Ю.;;16:54:00;18:00:00;;греется двс,плохое самочувствие;;головная боль;к/с 22:18
13;03.06.2026;2;228;1;с009ср;772;Матинян Э.Ж.;;11:40:00;12:10:00;;по здоровью;пл в 12,10;;кс 19:46
14;04.06.2026;3;2;9;с033ср;1359;Векшина Н.В.;;;13:12:00;;плохое самочувствие;закрыла п/л в 13:23;температура;к/с 21:13`;

export default function Upload({ breakdowns, drivers, vehicles, currentUser, onBulkAddIncidents }: UploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [activeInputMethod, setActiveInputMethod] = useState<'upload' | 'paste'>('upload');

  // Auto classification engine
  const classifyReason = (text: string): { breakdown: Breakdown; confidence: 'high' | 'medium' | 'low' } => {
    if (!text) {
      const defaultB = breakdowns.find(b => b.breakdown_code === 'BRK-013')!;
      return { breakdown: defaultB, confidence: 'low' };
    }

    const query = text.toLowerCase();
    let bestMatch: Breakdown | null = null;
    let maxScore = 0;

    for (const b of breakdowns) {
      let score = 0;
      
      // Match keywords
      const kwList = b.keywords.split(',').map(k => k.trim().toLowerCase());
      kwList.forEach(kw => {
        if (kw && query.includes(kw)) {
          score += 5; // high weight for keyword matches
        }
      });

      // Match category/name directly
      if (b.breakdown_name.toLowerCase().split(' ').some(word => word.length > 4 && query.includes(word))) {
        score += 2;
      }
      if (b.category.toLowerCase().split(' ').some(word => word.length > 4 && query.includes(word))) {
        score += 1;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = b;
      }
    }

    const defaultBreakdown = breakdowns.find(b => b.breakdown_code === 'BRK-013')!;
    if (!bestMatch || maxScore === 0) {
      return { breakdown: defaultBreakdown, confidence: 'low' };
    }

    const confidence = maxScore >= 10 ? 'high' : maxScore >= 5 ? 'medium' : 'low';
    return { breakdown: bestMatch, confidence };
  };

  const parseAndClassify = (sourceName: string, rawText: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const lines = rawText.split(/\r?\n/);
        if (lines.length === 0) {
          alert('Файл пуст');
          setIsProcessing(false);
          return;
        }

        // Find the index of the header line
        let headerIndex = -1;
        let delimiter = ';';
        let headers: string[] = [];

        // Scan lines to find header
        for (let i = 0; i < Math.min(20, lines.length); i++) {
          const line = lines[i];
          if (line.includes('Дата') && line.includes('Маршрут')) {
            headerIndex = i;
            if (line.includes(';')) {
              delimiter = ';';
            } else if (line.includes(',')) {
              delimiter = ',';
            } else if (line.includes('\t')) {
              delimiter = '\t';
            }
            headers = line.split(delimiter).map(h => h.trim().toLowerCase());
            break;
          }
        }

        // Default headers fallback if not found
        if (headerIndex === -1) {
          // Check if first line contains semicolon
          const firstLine = lines[0] || '';
          if (firstLine.includes(';')) delimiter = ';';
          else if (firstLine.includes(',')) delimiter = ',';
          else if (firstLine.includes('\t')) delimiter = '\t';

          headers = [
            '№п/п', 'дата', 'колонна', 'маршрут', 'выход', 'гос.№ т/с', 'табельный номер водителя', 'ф.и.о. водителя',
            'планируемое время выезда', 'время схода', 'время заезда в парк', 'время выхода', 'причина схода',
            'примечание', 'сход с линии по состоянию здоровья', 'замена тс'
          ];
        }

        const getIndex = (keywords: string[]) => {
          return headers.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
        };

        const dateIdx = getIndex(['дата', 'date']);
        const columnIdx = getIndex(['колонна', 'column', 'отряд']);
        const routeIdx = getIndex(['маршрут', 'route']);
        const runIdx = getIndex(['выход', 'выходов', 'run']);
        const vehicleIdx = getIndex(['гос.№', 'госномер', 'гос №', 'т/с', 'тс', 'vehicle']);
        const driverTabIdx = getIndex(['табельный', 'таб', 'tab']);
        const driverNameIdx = getIndex(['ф.и.о', 'фио', 'водитель', 'driver']);
        const departureIdx = getIndex(['планируемое время выезда', 'план выезда', 'выезд', 'departure']);
        const reportIdx = getIndex(['время схода', 'схода', 'report']);
        const returnDepotIdx = getIndex(['заезда в парк', 'заезд', 'depot', 'return']);
        const restartIdx = getIndex(['время выхода', 'выхода', 'restart']);
        const reasonIdx = getIndex(['причина схода', 'причина', 'reason']);
        const noteIdx = getIndex(['примечание', 'note']);
        const healthIdx = getIndex(['здоровья', 'здоровье', 'health']);
        const replacementIdx = getIndex(['замена тс', 'замена']);

        const results: ParsedRow[] = [];
        const startIdx = headerIndex === -1 ? 0 : headerIndex + 1;

        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Skip repeated headers
          if (line.includes('Дата') && line.includes('Маршрут')) continue;
          if (line.includes('Column2') && line.includes('Column3')) continue;

          const cols = line.split(delimiter).map(c => c.trim().replace(/^"(.*)"$/, '$1')); // remove outer quotes
          if (cols.length < 3) continue;

          const getValue = (idx: number, fallback: string = '') => {
            if (idx === -1 || idx >= cols.length) return fallback;
            return cols[idx];
          };

          const rawDate = getValue(dateIdx);
          if (!rawDate || rawDate.toLowerCase() === 'дата') continue;

          // Convert DD.MM.YYYY to YYYY-MM-DD
          let formattedDate = rawDate;
          if (rawDate.includes('.')) {
            const dateParts = rawDate.split('.');
            if (dateParts.length === 3) {
              const day = dateParts[0].padStart(2, '0');
              const month = dateParts[1].padStart(2, '0');
              const year = dateParts[2];
              formattedDate = `${year}-${month}-${day}`;
            }
          }

          const columnVal = getValue(columnIdx);
          let normalizedColumn = columnVal;
          if (columnVal && !columnVal.toLowerCase().includes('колонна')) {
            normalizedColumn = `Колонна №${columnVal}`;
          }

          const reasonVal = getValue(reasonIdx);
          const noteVal = getValue(noteIdx);
          const healthReason = getValue(healthIdx);
          const replacementVal = getValue(replacementIdx);

          // Build full note
          let combinedNote = noteVal;
          if (replacementVal) {
            combinedNote = combinedNote ? `${combinedNote}; Замена ТС: ${replacementVal}` : `Замена ТС: ${replacementVal}`;
          }

          // Classify the reason
          const { breakdown, confidence } = classifyReason(reasonVal || healthReason || 'Сход по неуказанной причине');

          let suggestedBreakdown = breakdown;
          let finalConfidence = confidence;

          // Override for health reason
          if (healthReason) {
            const healthB = breakdowns.find(b => b.category === 'Здоровье');
            if (healthB) {
              suggestedBreakdown = healthB;
              finalConfidence = 'high';
            }
          }

          // Match driver tab or try to find by name if tab is empty
          let driverTab = getValue(driverTabIdx);
          let driverName = getValue(driverNameIdx);
          if (driverTab) {
            const drv = drivers.find(d => d.tab_number === driverTab);
            if (drv) driverName = drv.name;
          } else if (driverName) {
            const drv = drivers.find(d => d.name.toLowerCase().includes(driverName.toLowerCase()));
            if (drv) driverTab = drv.tab_number;
          }

          results.push({
            date: formattedDate,
            column: normalizedColumn || 'Колонна №1',
            route: getValue(routeIdx),
            run: getValue(runIdx),
            vehicle: getValue(vehicleIdx),
            driverTab: driverTab || 'Не указан',
            driverName: driverName || 'Не указан',
            departure: getValue(departureIdx),
            report: getValue(reportIdx),
            returnDepot: getValue(returnDepotIdx),
            restart: getValue(restartIdx),
            reason: reasonVal || healthReason || 'Сход по причине',
            note: combinedNote,
            healthReason: healthReason,
            suggestedBreakdown,
            confidence: finalConfidence
          });
        }

        if (results.length === 0) {
          alert('Не удалось распарсить строки из файла. Проверьте формат разделителей (; или ,).');
        } else {
          setFileName(sourceName);
          setParsedData(results);
        }
      } catch (err) {
        console.error(err);
        alert('Произошла ошибка при анализе файла: ' + (err as Error).message);
      } finally {
        setIsProcessing(false);
      }
    }, 600);
  };

  const runClassification = (fileName: string, rawRows: any[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      const processed = rawRows.map(r => {
        const drv = drivers.find(d => d.tab_number === r.driverTab);
        const driverName = drv ? drv.name : 'Не указан';
        const { breakdown, confidence } = classifyReason(r.reason);
        return {
          ...r,
          driverName,
          suggestedBreakdown: breakdown,
          confidence
        };
      });

      setFileName(fileName);
      setParsedData(processed);
      setIsProcessing(false);
    }, 600);
  };

  // Pre-built Demo Files to instantly showcase the classification engine
  const demoFiles = [
    {
      name: 'сходы_дневная_смена_06_07.xlsx',
      rows: [
        { date: '2026-07-06', column: 'Колонна №1', route: '2', run: '3', vehicle: 'А012АА178', driverTab: '1021', departure: '05:40', report: '08:15', returnDepot: '09:10', restart: '12:00', reason: 'сильно кипит мотор в пробке парит антифриз наружу' },
        { date: '2026-07-06', column: 'Колонна №2', route: '24', run: '5', vehicle: 'В123ВВ178', driverTab: '1023', departure: '06:15', report: '09:40', returnDepot: '10:30', restart: '', reason: 'водитель смирнов почувствовал острую боль в груди высокое давление 170/110' },
        { date: '2026-07-06', column: 'Колонна №1', route: '130', run: '1', vehicle: 'С234СС178', driverTab: '1022', departure: '05:20', report: '14:50', returnDepot: '15:40', restart: '', reason: 'прокол заднего левого колеса на трамвайных путях' },
        { date: '2026-07-06', column: 'Колонна №3', route: '200', run: '9', vehicle: 'К456КК178', driverTab: '1025', departure: '06:45', report: '10:12', returnDepot: '', restart: '11:00', reason: 'неисправность электрики фар не горит ближний свет' }
      ]
    },
    {
      name: 'рапорты_сходов_07_07.csv',
      rows: [
        { date: '2026-07-07', column: 'Колонна №1', route: '130', run: '2', vehicle: 'Е345ЕЕ178', driverTab: '1024', departure: '06:00', report: '07:45', returnDepot: '08:40', restart: '', reason: 'притер легковую audi на повороте дтп ждем дпс' },
        { date: '2026-07-07', column: 'Колонна №3', route: '300', run: '4', vehicle: 'М567ММ178', driverTab: '1026', departure: '06:30', report: '12:15', returnDepot: '13:00', restart: '14:50', reason: 'заклинило заднюю пассажирскую дверь не закрывается' },
        { date: '2026-07-07', column: 'Колонна №1', route: '2', run: '5', vehicle: 'А012АА178', driverTab: '1021', departure: '05:40', report: '16:10', returnDepot: '17:00', restart: '', reason: 'уходит воздух из пневмосистемы упала задняя часть кузова' }
      ]
    }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const reader = new FileReader();
      
      if (isXlsx) {
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
            parseAndClassify(file.name, csvText);
          } catch (err) {
            console.error(err);
            alert('Не удалось обработать Excel файл: ' + (err as Error).message);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (arrayBuffer) {
            const text = decodeText(arrayBuffer);
            parseAndClassify(file.name, text);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const reader = new FileReader();
      
      if (isXlsx) {
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
            parseAndClassify(file.name, csvText);
          } catch (err) {
            console.error(err);
            alert('Не удалось обработать Excel файл: ' + (err as Error).message);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (arrayBuffer) {
            const text = decodeText(arrayBuffer);
            parseAndClassify(file.name, text);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) {
      alert('Пожалуйста, вставьте CSV-данные.');
      return;
    }
    parseAndClassify('Вставленный_текст.csv', pasteText);
  };

  const handleSaveToJournal = () => {
    if (parsedData.length === 0) return;

    const formattedIncidents: Omit<Incident, 'id'>[] = parsedData.map(p => {
      // Safely parse date for weekday lookup
      let weekday = 'Понедельник';
      try {
        const d = new Date(p.date);
        if (!isNaN(d.getTime())) {
          weekday = WEEKDAYS[d.getDay()];
        }
      } catch (err) {}

      return {
        incident_date: p.date,
        weekday,
        column_number: p.column,
        route_number: p.route,
        run_number: p.run,
        vehicle_number: p.vehicle,
        driver_tab_number: p.driverTab,
        driver_name: p.driverName,
        departure_time: p.departure,
        incident_report_time: p.report,
        return_to_depot_time: p.returnDepot,
        restart_time: p.restart,
        original_reason: p.reason,
        breakdown_code: p.suggestedBreakdown.breakdown_code,
        breakdown_category: p.suggestedBreakdown.category,
        breakdown_name: p.suggestedBreakdown.breakdown_name,
        criticality: p.suggestedBreakdown.criticality,
        note: p.note || '',
        health_reason: p.healthReason || (p.suggestedBreakdown.category === 'Здоровье' ? p.reason : ''),
        dispatcher_name: currentUser?.name || 'Система',
        status: p.suggestedBreakdown.category === 'Здоровье' ? 'требует проверки' : 'закрыт',
        source_file: fileName
      };
    });

    onBulkAddIncidents(formattedIncidents);
    
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    alert(`Успешно импортировано и классифицировано ${parsedData.length} сходов с линии!`);
    setParsedData([]);
    setFileName('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <span>📤</span> Импорт рапортов и классификация
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Загружайте диспетчерские выгрузки в формате Excel или CSV. Нейросетевой парсер автоматически сопоставит текстовые рапорты с официальным классификатором поломок.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Method Selector Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-px mb-4">
            <button
              type="button"
              onClick={() => setActiveInputMethod('upload')}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeInputMethod === 'upload'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Загрузить .csv / .txt файл
            </button>
            <button
              type="button"
              onClick={() => setActiveInputMethod('paste')}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeInputMethod === 'paste'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Вставить текст вручную
            </button>
          </div>

          {activeInputMethod === 'upload' ? (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`bg-white border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400'
              }`}
            >
              <input 
                type="file" 
                id="file-upload-input" 
                accept=".csv,.xlsx,.xls,.txt" 
                onChange={handleFileChange}
                className="hidden" 
              />
              
              <div className="flex flex-col items-center justify-center space-y-3">
                <UploadCloud className={`w-12 h-12 ${dragActive ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Перетащите диспетчерский файл сюда</p>
                  <p className="text-xs text-slate-400">Поддерживаются форматы Excel (.xlsx, .xls) и плоский CSV</p>
                </div>
                <label 
                  htmlFor="file-upload-input" 
                  className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer transition-colors"
                >
                  Выбрать файл на ПК
                </label>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasteSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clipboard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Вставьте данные реестра сходов (CSV-формат с разделителем ";"):</span>
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="№п/п;Дата;Колонна;Маршрут;Выход;Гос.№ т/с;Табельный номер водителя;Ф.И.О. водителя ;Планируемое время выезда;Время схода..."
                  className="w-full h-44 text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Распарсить и запустить ИИ-классификацию
                </button>
              </div>
            </form>
          )}

          {/* Classification results */}
          {isProcessing && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              <p className="text-sm font-bold text-slate-700">Искусственный интеллект сопоставляет ключевые слова рапортов...</p>
            </div>
          )}

          {parsedData.length > 0 && !isProcessing && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Файл: <strong className="font-mono text-xs">{fileName}</strong></span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Классифицировано строк: {parsedData.length}</p>
                </div>

                <button
                  onClick={handleSaveToJournal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить {parsedData.length} записей в журнал</span>
                </button>
              </div>

              {/* Parsed Rows Grid */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {parsedData.map((row, index) => {
                  const confColors = {
                    high: 'bg-green-100 text-green-800 border-green-200',
                    medium: 'bg-amber-100 text-amber-800 border-amber-200',
                    low: 'bg-rose-100 text-rose-800 border-rose-200'
                  };

                  const confLabels = {
                    high: 'Высокое совпадение',
                    medium: 'Среднее',
                    low: 'Проверьте вручную'
                  };

                  return (
                    <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 pb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-800">№{index + 1}</span>
                          <span className="font-semibold text-slate-400">{row.date}</span>
                          <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-700 uppercase font-bold text-[10px]">{row.vehicle}</span>
                          <span className="text-slate-500 font-medium">Маршрут {row.route} (выход {row.run})</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          Водитель: <span className="font-bold text-slate-700">{row.driverName}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: Raw log text */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Исходный текст диспетчера:</span>
                          <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2 italic font-medium leading-relaxed">
                            «{row.reason}»
                          </div>
                        </div>

                        {/* Right: AI Classified suggestion */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Рекомендованный код неисправности:</span>
                          <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-start gap-2">
                            <div className="font-mono text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black shrink-0">{row.suggestedBreakdown.breakdown_code}</div>
                            <div>
                              <div className="text-xs font-bold text-blue-900 leading-snug">{row.suggestedBreakdown.breakdown_name}</div>
                              <div className="text-[10px] text-blue-600 font-medium mt-1">Раздел: {row.suggestedBreakdown.category} | Критичность: {row.suggestedBreakdown.criticality}</div>
                            </div>
                          </div>
                          
                          {/* Confidence level */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold">Уверенность ИИ-фильтра:</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${confColors[row.confidence]}`}>
                              {confLabels[row.confidence]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Instructions & Quick Demo Column */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">💡 Быстрый демо-запуск</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              У вас нет под рукой готового диспетчерского файла? Нажмите на любую кнопку ниже, чтобы загрузить реалистичный демо-файл и посмотреть, как работает искусственная разметка сходов:
            </p>
            
            <div className="space-y-2 pt-1">
              {demoFiles.map((df, dfi) => (
                <button
                  key={dfi}
                  type="button"
                  onClick={() => runClassification(df.name, df.rows)}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2.5 transition-all text-xs flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-700 group-hover:text-blue-600 truncate max-w-[180px]">{df.name}</div>
                    <div className="text-[10px] text-slate-400">{df.rows.length} записей рапортов</div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => parseAndClassify('сходы_июнь_пользователь.csv', USER_DATASET_DEMO)}
                className="w-full text-left bg-blue-50/50 hover:bg-blue-50 border border-blue-200 rounded-lg p-2.5 transition-all text-xs flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-blue-800 group-hover:text-blue-900 truncate max-w-[180px]">сходы_июнь_пользователь.csv</div>
                  <div className="text-[10px] text-blue-500 font-semibold">Настоящий реестр (14 сходов)</div>
                </div>
                <Play className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700 transition-colors" />
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800 text-sm">📘 Спецификация файла</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Для корректной загрузки выгрузок структура файла должна включать следующие колонки:
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-disc font-medium">
              <li><strong>Дата</strong> — ГГГГ-ММ-ДД</li>
              <li><strong>Колонна</strong> — Колонна №1/2/3</li>
              <li><strong>Маршрут</strong> — Номер маршрута</li>
              <li><strong>Госномер</strong> — Госномер автобуса</li>
              <li><strong>Табельный водителя</strong> — Код водителя</li>
              <li><strong>Описание причины</strong> — Текстовый рапорт</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
