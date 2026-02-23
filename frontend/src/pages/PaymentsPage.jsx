import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const PRESET_TITLES = [
  'Zadatek',
  'II rata',
  'III rata',
  'Płatność końcowa',
  'Sala weselna',
  'Catering',
  'Oprawa muzyczna',
  'Dekoracje',
  'Fotograf',
];

function PaymentModal({ payment, weddingId, onClose, onSaved }) {
  const isEdit = !!payment;
  const [form, setForm] = useState({
    title: payment?.title || '',
    customTitle: '',
    amount: payment?.amount || '',
    dueDate: payment?.dueDate?.slice(0, 10) || '',
    status: payment?.status || 'unpaid',
    notes: payment?.notes || '',
  });
  const [useCustom, setUseCustom] = useState(isEdit && !PRESET_TITLES.includes(payment?.title));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = useCustom ? form.customTitle : form.title;
    if (!title.trim()) return toast.error('Podaj tytuł płatności');
    if (!form.amount) return toast.error('Podaj kwotę');
    try {
      const data = { title, amount: form.amount, dueDate: form.dueDate || null, status: form.status, notes: form.notes };
      if (isEdit) await api.patch(`/payments/${payment.id}`, data);
      else await api.post(`/payments/wedding/${weddingId}`, data);
      toast.success(isEdit ? 'Płatność zaktualizowana' : 'Płatność dodana');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd'); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-lg mb-4">{isEdit ? 'Edytuj płatność' : 'Nowa płatność'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Tytuł */}
          <div>
            <label className="label">Tytuł płatności *</label>
            {!useCustom ? (
              <div className="space-y-2">
                <select className="input w-full" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}>
                  <option value="">— wybierz —</option>
                  {PRESET_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button type="button" onClick={() => setUseCustom(true)} className="text-xs text-rose-500 underline">
                  + Wpisz własny tytuł
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input className="input w-full" placeholder="Wpisz tytuł..." value={form.customTitle}
                  onChange={e => setForm(p => ({ ...p, customTitle: e.target.value }))} />
                <button type="button" onClick={() => setUseCustom(false)} className="text-xs text-gray-400 underline">
                  ← Wróć do listy
                </button>
              </div>
            )}
          </div>

          {/* Kwota i termin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kwota (zł) *</label>
              <input type="number" step="0.01" min="0" className="input w-full" value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Termin płatności</label>
              <input type="date" className="input w-full" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => setForm(p => ({ ...p, status: 'unpaid' }))}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${form.status === 'unpaid' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}
              >
                ✗ Do zapłaty
              </button>
              <button type="button"
                onClick={() => setForm(p => ({ ...p, status: 'paid' }))}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${form.status === 'paid' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
              >
                ✓ Zapłacone
              </button>
            </div>
          </div>

          {/* Notatki */}
          <div>
            <label className="label">Notatki (opcjonalnie)</label>
            <textarea className="input resize-none h-16 w-full" placeholder="np. przelew, gotówka..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1">Zapisz</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const isCouple = user?.role === 'couple';
  const canEdit = ['admin', 'coordinator'].includes(user?.role);

  const [weddings, setWeddings] = useState([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (isCouple) {
      api.get('/weddings/my').then(r => setSelectedWeddingId(r.data.id)).catch(console.error);
    } else {
      api.get('/weddings').then(r => {
        setWeddings(r.data);
        if (r.data[0]) setSelectedWeddingId(r.data[0].id);
      }).catch(console.error);
    }
  }, [isCouple]);

  const refresh = () => {
    if (!selectedWeddingId) return;
    api.get(`/payments/wedding/${selectedWeddingId}`)
      .then(r => { setPayments(r.data.payments); setSummary(r.data.summary); })
      .catch(console.error);
  };

  useEffect(() => { refresh(); }, [selectedWeddingId]);

  const deletePayment = async (id) => {
    if (!confirm('Usunąć tę płatność?')) return;
    try {
      await api.delete(`/payments/${id}`);
      toast.success('Płatność usunięta');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const togglePaid = async (p) => {
    try {
      await api.patch(`/payments/${p.id}`, { status: p.status === 'paid' ? 'unpaid' : 'paid' });
      toast.success(p.status === 'paid' ? 'Oznaczono jako do zapłaty' : 'Oznaczono jako zapłacone');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const paid = payments.filter(p => p.status === 'paid');
  const unpaid = payments.filter(p => p.status !== 'paid');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Płatności</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCouple && weddings.length > 1 && (
            <select className="input w-auto" value={selectedWeddingId || ''} onChange={e => setSelectedWeddingId(e.target.value)}>
              {weddings.map(w => <option key={w.id} value={w.id}>{w.couple?.name || w.couple?.email} • {new Date(w.weddingDate).toLocaleDateString('pl-PL')}</option>)}
            </select>
          )}
          {canEdit && (
            <button onClick={() => setModal('new')} className="btn-primary">+ Dodaj płatność</button>
          )}
        </div>
      </div>

      {/* Podsumowanie */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-xl font-bold text-gray-800">{Number(summary.total || 0).toLocaleString('pl')} zł</div>
          <div className="text-sm text-gray-500">Łączna kwota</div>
        </div>
        <div className="card text-center">
          <div className="text-xl font-bold text-green-600">{Number(summary.paid || 0).toLocaleString('pl')} zł</div>
          <div className="text-sm text-gray-500">✓ Zapłacono</div>
        </div>
        <div className="card text-center">
          <div className="text-xl font-bold text-rose-600">{Number(summary.balance || 0).toLocaleString('pl')} zł</div>
          <div className="text-sm text-gray-500">✗ Do zapłaty</div>
        </div>
      </div>

      {payments.length === 0 && (
        <div className="card text-center text-gray-400 py-10">Brak płatności.</div>
      )}

      {/* Do zapłaty */}
      {unpaid.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Do zapłaty ({unpaid.length})</h2>
          {unpaid.map(p => (
            <PaymentCard key={p.id} payment={p} canEdit={canEdit} onEdit={() => setModal(p)} onDelete={() => deletePayment(p.id)} onToggle={() => togglePaid(p)} />
          ))}
        </div>
      )}

      {/* Zapłacone */}
      {paid.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Zapłacone ({paid.length})</h2>
          {paid.map(p => (
            <PaymentCard key={p.id} payment={p} canEdit={canEdit} onEdit={() => setModal(p)} onDelete={() => deletePayment(p.id)} onToggle={() => togglePaid(p)} />
          ))}
        </div>
      )}

      {modal && (
        <PaymentModal
          payment={modal === 'new' ? null : modal}
          weddingId={selectedWeddingId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
}

function PaymentCard({ payment: p, canEdit, onEdit, onDelete, onToggle }) {
  const isPaid = p.status === 'paid';
  return (
    <div className={`card flex items-center gap-4 border-l-4 ${isPaid ? 'border-green-400' : 'border-rose-300'}`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800">{p.title}</p>
        <p className="text-2xl font-bold text-gray-900">{Number(p.amount).toLocaleString('pl')} zł</p>
        {p.dueDate && (
          <p className="text-sm text-gray-400 mt-0.5">
            Termin: {format(new Date(p.dueDate), 'dd MMMM yyyy', { locale: pl })}
          </p>
        )}
        {p.notes && <p className="text-xs text-gray-400 italic mt-0.5">{p.notes}</p>}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPaid ? '✓ Zapłacone' : '✗ Do zapłaty'}
        </span>
        {canEdit && (
          <>
            <button onClick={onToggle} className="btn-secondary text-xs px-3 py-1">
              {isPaid ? 'Cofnij' : 'Oznacz jako zapłacone'}
            </button>
            <div className="flex gap-2">
              <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-700 underline">Edytuj</button>
              <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-700 underline">Usuń</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
