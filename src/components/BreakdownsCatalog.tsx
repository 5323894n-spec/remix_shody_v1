import React, { useState } from 'react';
import { Breakdown, Criticality, User } from '../types';
import { Plus, Edit3, Trash2, Save, X, Settings } from 'lucide-react';

interface BreakdownsCatalogProps {
  breakdowns: Breakdown[];
  currentUser: User;
  onAddBreakdown: (b: Omit<Breakdown, 'id'>) => void;
  onUpdateBreakdown: (id: number, updated: Partial<Breakdown>) => void;
  onDeleteBreakdown: (id: number) => void;
}

export default function BreakdownsCatalog({
  breakdowns, currentUser, onAddBreakdown, onUpdateBreakdown, onDeleteBreakdown
}: BreakdownsCatalogProps) {
  // Tab states
  const [activeTab, setActiveTab] = useState<'view' | 'add' | 'edit'>('view');
  
  // New breakdown form state
  const [newCode, setNewCode] = useState(`BRK-${(breakdowns.length + 1).toString().padStart(3, '0')}`);
  const [newCategory, setNewCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newCrit, setNewCrit] = useState<Criticality>('Средняя');
  const [newDept, setNewDept] = useState('');

  // Editing state
  const [selectedCodeToEdit, setSelectedCodeToEdit] = useState('');
  const [editForm, setEditForm] = useState<Partial<Breakdown>>({});

  const isAdmin = currentUser.role === 'admin';

  const handleSelectCodeToEdit = (code: string) => {
    setSelectedCodeToEdit(code);
    const item = breakdowns.find(b => b.breakdown_code === code);
    if (item) {
      setEditForm({ ...item });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newName || !newCode) {
      alert('Пожалуйста, заполните Код, Категорию и Наименование поломки.');
      return;
    }

    onAddBreakdown({
      breakdown_code: newCode,
      category: newCategory,
      breakdown_name: newName,
      keywords: newKeywords,
      criticality: newCrit,
      responsible_department: newDept,
      status: 'активная'
    });

    // Reset and alert
    alert('Поломка успешно добавлена в справочник.');
    setNewCode(`BRK-${(breakdowns.length + 2).toString().padStart(3, '0')}`);
    setNewCategory('');
    setNewName('');
    setNewKeywords('');
    setNewCrit('Средняя');
    setNewDept('');
    setActiveTab('view');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = breakdowns.find(b => b.breakdown_code === selectedCodeToEdit);
    if (item && editForm) {
      onUpdateBreakdown(item.id, editForm);
      alert('Изменения сохранены.');
      setSelectedCodeToEdit('');
      setEditForm({});
      setActiveTab('view');
    }
  };

  const handleDeleteItem = (id: number, code: string) => {
    if (window.confirm(`Вы уверены, что хотите НАВСЕГДА удалить поломку ${code} из справочника?`)) {
      onDeleteBreakdown(id);
      setSelectedCodeToEdit('');
      setEditForm({});
      alert('Поломка удалена из справочника.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <span>🔧</span> База основных поломок
          </h1>
          <p className="text-sm text-slate-500 mt-1">Нормативно-справочный классификатор технических неисправностей</p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('view')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'view' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Справочник
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'add' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              ➕ Добавить
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              ✏️ Редактировать
            </button>
          </div>
        )}
      </div>

      {activeTab === 'view' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider">Код</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider">Группа / Категория</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider">Наименование поломки</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider">Ключевые слова для поиска</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider">Критичность</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider">Служба</th>
                  <th className="px-5 py-3 text-xs uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdowns.map(b => (
                  <tr key={b.breakdown_code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-blue-700">{b.breakdown_code}</td>
                    <td className="px-5 py-3 text-slate-500 font-medium">{b.category}</td>
                    <td className="px-5 py-3 text-slate-800 font-semibold text-xs">{b.breakdown_name}</td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono truncate max-w-xs" title={b.keywords}>
                      {b.keywords}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.criticality === 'Критическая' ? 'bg-red-50 text-red-700 border-red-100' :
                        b.criticality === 'Высокая' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        b.criticality === 'Средняя' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        b.criticality === 'Низкая' ? 'bg-green-50 text-green-700 border-green-100' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {b.criticality}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 font-medium">{b.responsible_department}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === 'активная' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isAdmin && (
            <div className="bg-slate-50 text-xs text-center text-slate-500 py-3.5 border-t border-slate-200">
              Редактирование справочника причин заблокировано (Доступно только Администраторам)
            </div>
          )}
        </div>
      )}

      {/* Add breakdown tab */}
      {activeTab === 'add' && isAdmin && (
        <form onSubmit={handleAddSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">➕ Добавление новой поломки</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Код неисправности</label>
              <input
                type="text"
                required
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Группа / Категория</label>
              <input
                type="text"
                required
                placeholder="Двигатель, Электрика, Ходовая часть..."
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Наименование поломки</label>
              <input
                type="text"
                required
                placeholder="Полное название технической поломки..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Ключевые слова для поиска (через запятую)</label>
              <input
                type="text"
                placeholder="ремень, антифриз, течь, лопнул, закипел..."
                value={newKeywords}
                onChange={e => setNewKeywords(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Критичность поломки</label>
              <select
                value={newCrit}
                onChange={e => setNewCrit(e.target.value as Criticality)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Критическая">Критическая (Немедленный сход)</option>
                <option value="Высокая">Высокая</option>
                <option value="Средняя">Средняя</option>
                <option value="Низкая">Низкая</option>
                <option value="Требует проверки">Требует проверки</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Ответственная служба / Участок</label>
              <input
                type="text"
                placeholder="Ремонтная зона, Тормозной участок..."
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm cursor-pointer"
            >
              Зарегистрировать поломку
            </button>
          </div>
        </form>
      )}

      {/* Edit breakdown tab */}
      {activeTab === 'edit' && isAdmin && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <label className="text-xs font-bold text-slate-600 block">Шаг 1: Выберите код поломки для редактирования</label>
            <select
              value={selectedCodeToEdit}
              onChange={e => handleSelectCodeToEdit(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-80"
            >
              <option value="">-- Выберите из списка --</option>
              {breakdowns.map(b => (
                <option key={b.breakdown_code} value={b.breakdown_code}>({b.breakdown_code}) {b.breakdown_name}</option>
              ))}
            </select>
          </div>

          {selectedCodeToEdit && editForm.id && (
            <form onSubmit={handleEditSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-700">✏️ Шаг 2: Внесение изменений</h3>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(editForm.id!, editForm.breakdown_code!)}
                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 rounded-md transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Удалить безвозвратно</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Наименование поломки</label>
                  <input
                    type="text"
                    required
                    value={editForm.breakdown_name || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, breakdown_name: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Группа / Категория</label>
                  <input
                    type="text"
                    required
                    value={editForm.category || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500">Ключевые слова для поиска</label>
                  <input
                    type="text"
                    value={editForm.keywords || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, keywords: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Критичность поломки</label>
                  <select
                    value={editForm.criticality || 'Средняя'}
                    onChange={e => setEditForm(prev => ({ ...prev, criticality: e.target.value as Criticality }))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Критическая">Критическая</option>
                    <option value="Высокая">Высокая</option>
                    <option value="Средняя">Средняя</option>
                    <option value="Низкая">Низкая</option>
                    <option value="Требует проверки">Требует проверки</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Служба / Участок</label>
                  <input
                    type="text"
                    value={editForm.responsible_department || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, responsible_department: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Активность</label>
                  <select
                    value={editForm.status || 'активная'}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as 'активная' | 'архивная' }))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="активная">активная</option>
                    <option value="архивная">архивная (отключена)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm cursor-pointer"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
