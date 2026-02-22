import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';

function PaymentModal({ payment, weddingId, onClose, onSaved }) {
  const isEdit = !!payment;
  const [form, setForm] = useState({ title: payment?.title || '', amount: payment?.amount || '', dueDate: payment?.dueDate?.slice(0, 10) || '', notes: payment?.notes || '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) await api.patch(`/payments/${payment.id}`, form);
      else await api.post(`/payments/wedding/${weddingId}`, form);
      toast.success('Zapisano');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd'); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-lg mb-4">{isEdit ? 'Edytuj płatność' : 'Nowa płatność'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="label">Tytuł *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Kwota (zł) *</label><input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div><label className="label">Termin</label><input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <div><label className="label">Notatki</label><textarea className="input resize-none h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center">Zapisz</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [wedding, setWedding] = useState(null);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [modal, setModal] = useState(null);
  const fileRefs = useRef({});
  const isAdmin = user?.role === 'admin';
  const canEdit = ['admin', 'coordinator'].includes(user?.role);

  useEffect(() => {
    api.get('/weddings/my').then((res) => {
      setWedding(res.data);
      return api.get(`/payments/wedding/${res.data.id}`);
    }).then((res) => { setPayments(res.data.payments); setSummary(res.data.summary); }).catch(console.error);
  }, []);

  const refresh = () => api.get(`/payments/wedding/${wedding.id}`).then((res) => { setPayments(res.data.payments); setSummary(res.data.summary); });

  const markPaid = async (id, paid) => {
    try {
      await api.patch(`/payments/${id}/mark-paid`, { paid });
      toast.success(paid ? 'Oznaczono jako zapłacone' : 'Cofnięto płatność');
      refresh();
    } catch { toast.error('Błąd'); }
  };

  const uploadInvoice = async (id, file) => {
    const fd = new FormData();
    fd.append('invoice', file);
    try {
      await api.post(`/payments/${id}/invoice`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Faktura dodana');
      refresh();
    } catch { toast.error('Błąd uploadu faktury'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Harmonogram płatności</h1>
        {canEdit && <button onClick={() => setModal('new')} className="btn-primary">+ Dodaj płatność</button>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center"><div className="text-xl font-bold text-gray-800">{Number(summary.total || 0).toLocaleString('pl')} zł</div><div className="text-sm text-gray-500">Łączna kwota</div></div>
        <div className="card text-center"><div className="text-xl font-bold text-green-600">{Number(summary.paid || 0).toLocaleString('pl')} zł</div><div className="text-sm text-gray-500">Zapłacono</div></div>
        <div className="card text-center"><div className="text-xl font-bold text-rose-600">{Number(summary.balance || 0).toLocaleString('pl')} zł</div><div className="text-sm text-gray-500">Saldo do zapłaty</div></div>
      </div>

      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className={`card flex items-center gap-4 border-l-4 ${p.status === 'paid' ? 'border-green-400' : 'border-red-300'}`}>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{p.title}</p>
              <p className="text-2xl font-bold text-gray-900">{Number(p.amount).toLocaleString('pl')} zł</p>
              {p.dueDate && <p className="text-sm text-gray-400">Termin: {format(new Date(p.dueDate), 'dd.MM.yyyy')}</p>}
              {p.paidAt && <p className="text-xs text-green-600">Zapłacono: {format(new Date(p.paidAt), 'dd.MM.yyyy')}</p>}
              {p.notes && <p className="text-xs text-gray-400 italic">{p.notes}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {p.status === 'paid' ? '✓ Zapłacone' : '✗ Niezapłacone'}
              </span>
              {isAdmin && (
                <button onClick={() => markPaid(p.id, p.status !== 'paid')} className="btn-secondary text-xs px-3 py-1">
                  {p.status === 'paid' ? 'Cofnij' : 'Oznacz jako zapłacone'}
                </button>
              )}
              {isAdmin && (
                <>
                  <input ref={(el) => (fileRefs.current[p.id] = el)} type="file" accept=".pdf" className="hidden" onChange={(e) => { if (e.target.files[0]) uploadInvoice(p.id, e.target.files[0]); e.target.value = ''; }} />
                  <button onClick={() => fileRefs.current[p.id]?.click()} className="text-xs text-gray-400 hover:text-gray-700 underline">{p.invoicePath ? '📎 Zmień fakturę' : '📎 Dodaj fakturę'}</button>
                  {p.invoicePath && <a href={p.invoicePath} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">Pobierz fakturę</a>}
                </>
              )}
              {canEdit && <button onClick={() => setModal(p)} className="text-xs text-gray-400 hover:text-gray-700 underline">Edytuj</button>}
            </div>
          </div>
        ))}
        {payments.length === 0 && <div className="card text-center text-gray-400">Brak płatności.</div>}
      </div>

      {modal && (
        <PaymentModal
          payment={modal === 'new' ? null : modal}
          weddingId={wedding?.id}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
}
