import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';

const typeLabels = { contract: 'Umowa', annex: 'Aneks', regulations: 'Regulamin', other: 'Inny' };
const typeColors = { contract: 'bg-blue-100 text-blue-700', annex: 'bg-purple-100 text-purple-700', regulations: 'bg-yellow-100 text-yellow-700', other: 'bg-gray-100 text-gray-700' };

export default function DocumentsPage() {
  const { user } = useAuth();
  const [wedding, setWedding] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'contract' });
  const fileRef = useRef();
  const canUpload = ['admin', 'coordinator'].includes(user?.role);

  useEffect(() => {
    api.get('/weddings/my').then((res) => {
      setWedding(res.data);
      return api.get(`/documents/wedding/${res.data.id}`);
    }).then((res) => setDocuments(res.data)).catch(console.error);
  }, []);

  const refresh = () => api.get(`/documents/wedding/${wedding.id}`).then((res) => setDocuments(res.data));

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return toast.error('Wybierz plik');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', form.title);
    fd.append('type', form.type);
    try {
      await api.post(`/documents/wedding/${wedding.id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Dokument przesłany');
      setForm({ title: '', type: 'contract' });
      fileRef.current.value = '';
      refresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Błąd uploadu'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Usunąć dokument?')) return;
    try { await api.delete(`/documents/${id}`); toast.success('Usunięto'); refresh(); }
    catch { toast.error('Błąd'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dokumenty</h1>

      {canUpload && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Prześlij dokument</h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Tytuł *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div><label className="label">Typ</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="contract">Umowa</option>
                  <option value="annex">Aneks</option>
                  <option value="regulations">Regulamin</option>
                  <option value="other">Inny</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Plik (PDF, DOC, DOCX)</label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="input" required />
            </div>
            <button type="submit" disabled={uploading} className="btn-primary">{uploading ? 'Przesyłanie...' : '📤 Prześlij'}</button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {documents.length === 0 && <div className="card text-center text-gray-400">Brak dokumentów.</div>}
        {documents.map((doc) => (
          <div key={doc.id} className="card flex items-center gap-4">
            <div className="text-3xl">📄</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[doc.type]}`}>{typeLabels[doc.type]}</span>
                <p className="font-semibold text-gray-800">{doc.title}</p>
              </div>
              <p className="text-xs text-gray-400">{format(new Date(doc.createdAt), 'dd.MM.yyyy')} • {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ''}</p>
            </div>
            <div className="flex gap-2">
              <a href={`/api/documents/${doc.id}/download`} className="btn-secondary text-sm">⬇️ Pobierz</a>
              {user?.role === 'admin' && <button onClick={() => handleDelete(doc.id)} className="text-xs text-red-400 hover:text-red-700 underline">Usuń</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
