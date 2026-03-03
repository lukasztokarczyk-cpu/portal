import { useEffect, useState } from 'react';
import api from '../services/api';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

/* ── Stałe zadania do wyboru ── */
const PRESET_TASKS = [
  { title: 'Uzupełnij listę gości', description: 'Dodaj wszystkich zaproszonych gości do systemu wraz z dietą i potwierdzeniem przybycia.' },
  { title: 'Podaj liczbę gości', description: 'Potwierdź ostateczną liczbę osób na weselu (dorośli + dzieci).' },
  { title: 'Wybierz menu', description: 'Wybierz dania z dostępnego menu weselnego dla każdego kursu.' },
  { title: 'Potwierdź plan stołów', description: 'Rozmieść gości na planie stołów i zatwierdź układ sali.' },
  { title: 'Wpłać zaliczkę', description: 'Dokonaj wpłaty zaliczki zgodnie z ustalonym harmonogramem płatności.' },
  { title: 'Potwierdź datę ślubu', description: 'Potwierdź ostateczną datę i godzinę ceremonii.' },
  { title: 'Wybierz dekoracje sali', description: 'Skonsultuj i zatwierdź dekoracje kwiatowe i aranżację sali.' },
  { title: 'Uzupełnij dane do faktury', description: 'Podaj dane do wystawienia faktury za usługi weselne.' },
  { title: 'Wybierz tort weselny', description: 'Zdecyduj o rodzaju, smaku i wyglądzie tortu weselnego.' },
  { title: 'Potwierdź noclegi', description: 'Potwierdź rezerwacje noclegów dla gości przyjeżdżających z daleka.' },
  { title: 'Podaj harmonogram dnia', description: 'Ustal godziny: przyjazd gości, ceremonia, wesele, pierwsze tańce.' },
  { title: 'Sprawdź dokumenty', description: 'Upewnij się że wszystkie dokumenty ślubne są kompletne i gotowe.' },
];

const STATUS_LABELS = {
  open: { label: 'Do zrobienia', color: '#9a9590', bg: '#f3f0eb' },
  in_progress: { label: 'W trakcie', color: '#a07830', bg: '#fdf6e8' },
  completed: { label: 'Ukończone', color: '#3a7a3a', bg: '#f0f7f0' },
};

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card flex items-center gap-4">
      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(176,138,80,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9a9590', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 22, fontFamily: "'Cormorant Garamond',serif", color: '#1c1a17' }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: '#b0ab a5' }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Modal dodawania zadania ── */
function AddTaskModal({ wedding, onClose, onSaved }) {
  const [mode, setMode] = useState('preset'); // preset | custom
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const payload = mode === 'preset' && selectedPreset
      ? { title: selectedPreset.title, description: selectedPreset.description, dueDate: form.dueDate || null, notes: form.notes, status: 'open' }
      : { title: form.title, description: form.description, dueDate: form.dueDate || null, notes: form.notes, status: 'open' };
    if (!payload.title) return toast.error('Wpisz tytuł zadania');
    setSaving(true);
    try {
      await api.post(`/stages/wedding/${wedding.id}`, payload);
      toast.success('Zadanie dodane');
      onSaved();
    } catch { toast.error('Błąd zapisu'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,26,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 4, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e4e0da' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e4e0da' }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#1c1a17', margin: 0 }}>Nowe zadanie</h3>
          <p style={{ fontSize: 12, color: '#9a9590', marginTop: 4 }}>{wedding.couple?.name || wedding.couple?.email}</p>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tryb */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[['preset','📋 Gotowe szablony'],['custom','✏️ Własne']].map(([k,l]) => (
              <button key={k} onClick={() => setMode(k)}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 4, border: `2px solid ${mode===k ? '#b08a50' : '#e4e0da'}`, background: mode===k ? 'rgba(176,138,80,.08)' : '#fff', color: mode===k ? '#b08a50' : '#6b6760', fontSize: 12, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.5px' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Szablony */}
          {mode === 'preset' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {PRESET_TASKS.map((t, i) => (
                <button key={i} onClick={() => setSelectedPreset(t)}
                  style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 4, border: `2px solid ${selectedPreset?.title===t.title ? '#b08a50' : '#e4e0da'}`, background: selectedPreset?.title===t.title ? 'rgba(176,138,80,.07)' : '#fff', cursor: 'pointer', transition: 'all .15s' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1a17', margin: 0 }}>{t.title}</p>
                  <p style={{ fontSize: 11, color: '#9a9590', margin: '2px 0 0' }}>{t.description}</p>
                </button>
              ))}
            </div>
          )}

          {/* Własne */}
          {mode === 'custom' && (
            <>
              <div>
                <label className="label">Tytuł zadania *</label>
                <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="np. Wybierz kwiaty do dekoracji..." />
              </div>
              <div>
                <label className="label">Opis</label>
                <textarea className="input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Szczegółowy opis zadania..." style={{ resize: 'none' }} />
              </div>
            </>
          )}

          {/* Termin + notatka — wspólne */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Termin wykonania</label>
              <input className="input" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </div>
            <div>
              <label className="label">Notatka dla pary</label>
              <input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Dodatkowa wskazówka..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Anuluj</button>
            <button onClick={handleSubmit} disabled={saving || (mode==='preset' && !selectedPreset)} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? 'Zapisywanie...' : '✓ Wyślij zadanie'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Panel pary młodej (szczegóły + zadania) ── */
function WeddingDetail({ wedding, onBack }) {
  const [stages, setStages] = useState([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);

  const fetchStages = () => {
    setLoadingStages(true);
    api.get(`/stages/wedding/${wedding.id}`)
      .then(r => setStages(r.data))
      .catch(console.error)
      .finally(() => setLoadingStages(false));
  };

  useEffect(() => { fetchStages(); }, [wedding.id]);

  const handleStatusChange = async (stage, status) => {
    try {
      await api.patch(`/stages/${stage.id}`, { ...stage, status });
      fetchStages();
    } catch { toast.error('Błąd'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Usunąć zadanie?')) return;
    try { await api.delete(`/stages/${id}`); toast.success('Usunięto'); fetchStages(); }
    catch { toast.error('Błąd'); }
  };

  const daysTo = differenceInDays(new Date(wedding.weddingDate), new Date());
  const done = stages.filter(s => s.status === 'completed').length;
  const pct = stages.length ? Math.round((done / stages.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9a9590', fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', padding: 0 }}>
        ← Powrót do listy
      </button>

      {/* Info o parze */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>{wedding.couple?.name || wedding.couple?.email}</h2>
            <p style={{ fontSize: 13, color: '#9a9590', marginTop: 4 }}>
              📅 {format(new Date(wedding.weddingDate), 'dd MMMM yyyy', { locale: pl })}
              <span style={{ marginLeft: 12, color: daysTo < 30 ? '#c0392b' : '#b08a50', fontWeight: 500 }}>
                {daysTo > 0 ? `${daysTo} dni` : 'już po weselu'}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#1c1a17' }}>{wedding._count?.guests ?? '—'}</div>
              <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9a9590' }}>Gości</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#1c1a17' }}>{pct}%</div>
              <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9a9590' }}>Ukończono</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#1c1a17' }}>{stages.length}</div>
              <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9a9590' }}>Zadań</div>
            </div>
          </div>
        </div>

        {/* Pasek postępu */}
        {stages.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: '#9a9590' }}>
              <span>Postęp przygotowań</span>
              <span>{done} / {stages.length}</span>
            </div>
            <div style={{ height: 4, background: '#f3f0eb', borderRadius: 2 }}>
              <div style={{ height: 4, width: `${pct}%`, background: 'linear-gradient(90deg,#b08a50,#d4af70)', borderRadius: 2, transition: 'width .5s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Zadania */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Przygotowania pary</h2>
        <button onClick={() => setShowAddTask(true)} className="btn-primary">+ Dodaj zadanie</button>
      </div>

      {loadingStages ? (
        <p style={{ textAlign: 'center', color: '#9a9590', padding: 32 }}>Ładowanie...</p>
      ) : stages.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ color: '#9a9590', fontFamily: "'Cormorant Garamond',serif", fontSize: 18 }}>Brak zadań dla tej pary</p>
          <p style={{ color: '#b0ab a4', fontSize: 12, marginTop: 4 }}>Kliknij „Dodaj zadanie" aby wysłać pierwsze przygotowanie</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stages.map(s => {
            const st = STATUS_LABELS[s.status] || STATUS_LABELS.open;
            const overdue = s.dueDate && new Date(s.dueDate) < new Date() && s.status !== 'completed';
            return (
              <div key={s.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1c1a17' }}>{s.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, letterSpacing: '0.5px' }}>{st.label}</span>
                    {overdue && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#fef0f0', color: '#c0392b' }}>⚠ Przeterminowane</span>}
                  </div>
                  {s.description && <p style={{ fontSize: 12, color: '#9a9590', margin: 0 }}>{s.description}</p>}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    {s.dueDate && <span style={{ fontSize: 11, color: overdue ? '#c0392b' : '#b08a50' }}>📅 Termin: {format(new Date(s.dueDate), 'dd MMM yyyy', { locale: pl })}</span>}
                    {s.notes && <span style={{ fontSize: 11, color: '#9a9590' }}>💬 {s.notes}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <select value={s.status} onChange={e => handleStatusChange(s, e.target.value)}
                    style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #e4e0da', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#1c1a17' }}>
                    <option value="open">Do zrobienia</option>
                    <option value="in_progress">W trakcie</option>
                    <option value="completed">Ukończone</option>
                  </select>
                  <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d0a0a0', fontSize: 14, padding: '2px 4px' }} title="Usuń">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddTask && <AddTaskModal wedding={wedding} onClose={() => setShowAddTask(false)} onSaved={() => { setShowAddTask(false); fetchStages(); }} />}
    </div>
  );
}

/* ── Główny komponent ── */
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weddings, setWeddings] = useState([]);
  const [selected, setSelected] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'couple') {
      api.get('/weddings/my').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
    } else {
      api.get('/weddings').then(r => setWeddings(r.data)).catch(console.error).finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#9a9590' }}>Ładowanie...</div>;

  /* ── ADMIN / COORDINATOR ── */
  if (user?.role !== 'couple') {
    if (selected) return <WeddingDetail wedding={selected} onBack={() => setSelected(null)} />;

    const totalGuests = weddings.reduce((s, w) => s + (w._count?.guests || 0), 0);
    const upcoming = weddings.filter(w => new Date(w.weddingDate) > new Date()).sort((a,b) => new Date(a.weddingDate)-new Date(b.weddingDate));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1>Przygotowania</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <StatCard icon="💍" label="Zarejestrowane wesela" value={weddings.length} />
          <StatCard icon="👥" label="Łącznie gości" value={totalGuests} />
          <StatCard icon="📅" label="Najbliższe wesele" value={upcoming[0] ? format(new Date(upcoming[0].weddingDate), 'dd.MM.yyyy') : '—'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Pary Młode</h2>
          <span style={{ fontSize: 11, color: '#9a9590', letterSpacing: '1px', textTransform: 'uppercase' }}>Kliknij parę aby zarządzać zadaniami</span>
        </div>

        {weddings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#9a9590' }}>Brak zarejestrowanych wesel.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weddings.map(w => {
              const daysTo = differenceInDays(new Date(w.weddingDate), new Date());
              return (
                <div key={w.id} onClick={() => setSelected(w)}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all .15s', padding: '16px 20px' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#b08a50'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(176,138,80,.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e4e0da'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(10,14,26,.04)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(176,138,80,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💍</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1a17', margin: 0 }}>{w.couple?.name || w.couple?.email}</p>
                      <p style={{ fontSize: 12, color: '#9a9590', margin: '2px 0 0' }}>
                        {format(new Date(w.weddingDate), 'dd MMMM yyyy', { locale: pl })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#1c1a17' }}>{w._count?.guests ?? 0}</div>
                      <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#9a9590' }}>Gości</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: daysTo < 30 ? '#c0392b' : '#b08a50' }}>
                        {daysTo > 0 ? `${daysTo}d` : '✓'}
                      </div>
                      <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#9a9590' }}>Do ślubu</div>
                    </div>
                    <span style={{ fontSize: 18, color: '#b08a50' }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── PARA MŁODA ── */
  if (!data) return <div style={{ textAlign: 'center', padding: 48, color: '#9a9590' }}>Nie znaleziono danych wesela.</div>;
  const { dashboard, weddingDate } = data;
  const formattedDate = format(new Date(weddingDate), 'dd MMMM yyyy', { locale: pl });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Witajcie! 💐</h1>
          <p style={{ color: '#9a9590', marginTop: 4 }}>Data ślubu: <span style={{ color: '#b08a50', fontWeight: 500 }}>{formattedDate}</span></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 42, color: '#1c1a17', lineHeight: 1 }}>{dashboard.daysToWedding}</div>
          <div style={{ fontSize: 11, color: '#9a9590', letterSpacing: '1px', textTransform: 'uppercase' }}>dni do ślubu</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', color: '#9a9590' }}>Postęp przygotowań</span>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#b08a50' }}>{dashboard.progressPercent}%</span>
        </div>
        <div style={{ height: 4, background: '#f3f0eb', borderRadius: 2 }}>
          <div style={{ height: 4, width: `${dashboard.progressPercent}%`, background: 'linear-gradient(90deg,#b08a50,#d4af70)', borderRadius: 2, transition: 'width .5s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        <StatCard icon="👥" label="Zaproszeni goście" value={dashboard.guestCount} />
        <StatCard icon="💰" label="Saldo do zapłaty" value={`${Number(dashboard.balance).toLocaleString('pl')} zł`} />
        <StatCard icon="✅" label="Postęp" value={`${dashboard.progressPercent}%`} />
        <StatCard icon="💌" label="Wiadomości" value={dashboard.lastMessage ? '1 nowa' : 'Brak'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ margin: '0 0 12px' }}>📌 Najbliższe zadanie</h3>
          {dashboard.nextTask ? (
            <div>
              <p style={{ fontWeight: 500, color: '#1c1a17' }}>{dashboard.nextTask.title}</p>
              {dashboard.nextTask.dueDate && <p style={{ fontSize: 12, color: '#9a9590', marginTop: 4 }}>Termin: {format(new Date(dashboard.nextTask.dueDate), 'dd MMM yyyy', { locale: pl })}</p>}
              {dashboard.nextTask.notes && <p style={{ fontSize: 12, color: '#b08a50', marginTop: 4, fontStyle: 'italic' }}>{dashboard.nextTask.notes}</p>}
            </div>
          ) : <p style={{ color: '#9a9590' }}>Wszystkie zadania ukończone! 🎉</p>}
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 12px' }}>💬 Ostatnia wiadomość</h3>
          {dashboard.lastMessage ? (
            <div>
              <p style={{ fontSize: 12, color: '#9a9590' }}>{dashboard.lastMessage.sender?.name}</p>
              <p style={{ color: '#1c1a17', marginTop: 4 }}>{dashboard.lastMessage.content}</p>
              <p style={{ fontSize: 11, color: '#b0aba4', marginTop: 8 }}>{format(new Date(dashboard.lastMessage.createdAt), 'dd.MM.yyyy HH:mm')}</p>
            </div>
          ) : <p style={{ color: '#9a9590' }}>Brak wiadomości.</p>}
        </div>
      </div>
    </div>
  );
}
