import { useEffect, useState } from 'react';
import api from '../services/api';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAuth } from '../store/AuthContext';

function StatCard({ icon, label, value, sub, color = 'rose' }) {
  const colors = {
    rose: 'bg-rose-50 text-rose-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weddings, setWeddings] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'couple') {
      api.get('/weddings/my')
        .then((res) => setData(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      // admin/coordinator - pobierz listę wesel
      api.get('/weddings')
        .then((res) => setWeddings(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="text-center py-12 text-gray-400">Ładowanie...</div>;

  // Admin/coordinator dashboard
  if (user?.role !== 'couple') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard icon="💍" label="Zarejestrowane wesela" value={weddings.length} color="rose" />
          <StatCard icon="👥" label="Łącznie gości" value={weddings.reduce((s, w) => s + (w._count?.guests || 0), 0)} color="blue" />
          <StatCard icon="📅" label="Najbliższe wesele" value={weddings.filter(w => new Date(w.weddingDate) > new Date()).length > 0 ? format(new Date(weddings.filter(w => new Date(w.weddingDate) > new Date()).sort((a,b) => new Date(a.weddingDate)-new Date(b.weddingDate))[0]?.weddingDate), 'dd.MM.yyyy') : 'Brak'} color="green" />
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Zarejestrowane wesela</h2>
          {weddings.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Brak zarejestrowanych wesel. Dodaj pierwszą parę w panelu Zarządzanie.</p>
          ) : (
            <div className="space-y-3">
              {weddings.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{w.brideName} i {w.groomName}</p>
                    <p className="text-sm text-gray-500">📅 {format(new Date(w.weddingDate), 'dd MMMM yyyy', { locale: pl })}</p>
                  </div>
                  <span className="text-sm text-gray-500">{w._count?.guests || 0} gości</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-center py-12 text-gray-400">Nie znaleziono danych wesela.</div>;

  const { dashboard, weddingDate } = data;
  const formattedDate = format(new Date(weddingDate), 'dd MMMM yyyy', { locale: pl });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Witajcie! 💐</h1>
          <p className="text-gray-500 mt-1">Data ślubu: <span className="font-semibold text-rose-700">{formattedDate}</span></p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-rose-600">{dashboard.daysToWedding}</div>
          <div className="text-sm text-gray-500">dni do ślubu</div>
        </div>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-700">Postęp przygotowań</h3>
          <span className="text-rose-600 font-bold text-lg">{dashboard.progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-gradient-to-r from-rose-400 to-rose-600 h-3 rounded-full transition-all duration-500" style={{ width: `${dashboard.progressPercent}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Zaproszeni goście" value={dashboard.guestCount} color="blue" />
        <StatCard icon="💰" label="Saldo do zapłaty" value={`${Number(dashboard.balance).toLocaleString('pl')} zł`} color="yellow" />
        <StatCard icon="✅" label="Etapy ukończone" value={`${dashboard.progressPercent}%`} color="green" />
        <StatCard icon="💌" label="Wiadomości" value={dashboard.lastMessage ? '1 nowa' : 'Brak'} color="rose" />
      </div>

      {/* Next task and last message */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">📌 Najbliższe zadanie</h3>
          {dashboard.nextTask ? (
            <div className="space-y-2">
              <p className="font-medium text-gray-800">{dashboard.nextTask.title}</p>
              {dashboard.nextTask.dueDate && (
                <p className="text-sm text-gray-500">Termin: {format(new Date(dashboard.nextTask.dueDate), 'dd MMM yyyy', { locale: pl })}</p>
              )}
              {dashboard.nextTask.notes && <p className="text-sm text-gray-400 italic">{dashboard.nextTask.notes}</p>}
            </div>
          ) : (
            <p className="text-gray-400">Wszystkie zadania ukończone! 🎉</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">💬 Ostatnia wiadomość</h3>
          {dashboard.lastMessage ? (
            <div>
              <p className="text-sm font-medium text-gray-600">{dashboard.lastMessage.sender?.name}</p>
              <p className="text-gray-700 mt-1">{dashboard.lastMessage.content}</p>
              <p className="text-xs text-gray-400 mt-2">{format(new Date(dashboard.lastMessage.createdAt), 'dd.MM.yyyy HH:mm')}</p>
            </div>
          ) : (
            <p className="text-gray-400">Brak wiadomości.</p>
          )}
        </div>
      </div>
    </div>
  );
}
