import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';

const statusLabels = { open: 'Otwarte', in_progress: 'W trakcie', completed: 'Zakończone' };
const statusClass = { open: 'badge-open', in_progress: 'badge-in-progress', completed: 'badge-completed' };

function StageModal({ stage, weddingId, onClose, onSaved }) {
  const isEdit = !!stage;
  const [form, setForm] = useState({
    title: stage?.title || '',
    description: stage?.description || '',
    status: stage?.status || 'open',
    dueDate: stage?.dueDate ? stage.dueDate.slice(0, 10) : '',
    notes: stage?.notes || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.patch(`/stages/${stage.id}`, form);
        toast.success('Etap zaktualizowany');
      } else {
        await api.post(`/stages/wedding/${weddingId}`, form);
        toast.success('Etap dodany');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Błąd zapisu');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-gray-800 text-lg mb-4">{isEdit ? 'Edytuj etap' : 'Nowy etap'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Tytuł *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Opis</label>
            <textarea className="input resize-none h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="open">Otwarte</option>
                <option value="in_progress">W trakcie</option>
                <option value="completed">Zakończone</option>
              </select>
            </div>
            <div>
              <label className="label">Termin</label>
              <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Notatki</label>
            <textarea className="input resize-none h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">Zapisz</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StagesPage() {
  const { user } = useAuth();
  const isCouple = user?.role === 'couple';
  const canEdit = user?.role !== 'couple';

  const [weddingId, setWeddingId] = useState(null);
  const [weddings, setWeddings] = useState([]);
  const [stages, setStages] = useState([]);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (isCouple) {
      api.get('/weddings/my').then(r => setWeddingId(r.data.id)).catch(console.error);
    } else {
      api.get('/weddings').then(r => {
        setWeddings(r.data);
        if (r.data[0]) setWeddingId(r.data[0].id);
      }).catch(console.error);
    }
  }, [isCouple]);

  const refresh = () => {
    if (!weddingId) return;
    api.get(`/stages/wedding/${weddingId}`).then(r => setStages(r.data)).catch(console.error);
  };

  useEffect(() => { refresh(); }, [weddingId]);

  const handleDelete = async (id) => {
    if (!confirm('Usunąć etap?')) return;
    try {
      await api.delete(`/stages/${id}`);
      toast.success('Etap usunięty');
      refresh();
    } catch { toast.error('Błąd usuwania'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Harmonogram przygotowań</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCouple && weddings.length > 1 && (
            <select className="input w-auto" value={weddingId || ''} onChange={e => setWeddingId(e.target.value)}>
              {weddings.map(w => <option key={w.id} value={w.id}>{w.couple?.name || w.couple?.login}</option>)}
            </select>
          )}
          {canEdit && <button onClick={() => setModal('new')} className="btn-primary">+ Dodaj etap</button>}
        </div>
      </div>

      <div className="space-y-3">
        {stages.length === 0 && <div className="card text-center text-gray-400">Brak etapów.</div>}
        {stages.map((stage) => (
          <div key={stage.id} className="card flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={statusClass[stage.status]}>{statusLabels[stage.status]}</span>
                <h3 className="font-semibold text-gray-800">{stage.title}</h3>
              </div>
              {stage.description && <p className="text-sm text-gray-500">{stage.description}</p>}
              {stage.dueDate && <p className="text-xs text-gray-400 mt-1">📅 Termin: {format(new Date(stage.dueDate), 'dd.MM.yyyy')}</p>}
              {stage.notes && <p className="text-xs text-gray-400 italic mt-1">📝 {stage.notes}</p>}
            </div>
            {canEdit && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setModal(stage)} className="btn-secondary text-xs px-3 py-1.5">Edytuj</button>
                <button onClick={() => handleDelete(stage.id)} className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Usuń</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <StageModal
          stage={modal === 'new' ? null : modal}
          weddingId={weddingId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
}
