import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Jeśli konto istnieje, wysłano instrukcje resetowania');
    } catch {
      toast.error('Wystąpił błąd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Reset hasła</h2>
          {sent ? (
            <p className="text-green-700 bg-green-50 p-4 rounded-lg text-sm">Sprawdź skrzynkę e-mail – wysłaliśmy link do resetowania hasła.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Adres e-mail</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">{loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}</button>
            </form>
          )}
          <div className="mt-4 text-center"><Link to="/login" className="text-sm text-rose-600 hover:underline">← Wróć do logowania</Link></div>
        </div>
      </div>
    </div>
  );
}
