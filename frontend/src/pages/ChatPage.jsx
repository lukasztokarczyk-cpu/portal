import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { format } from 'date-fns';

export default function ChatPage() {
  const { user } = useAuth();
  const [weddings, setWeddings] = useState([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  const isCouple = user?.role === 'couple';

  useEffect(() => {
    if (isCouple) {
      api.get('/weddings/my').then((res) => {
        setSelectedWeddingId(res.data.id);
      }).catch(console.error);
    } else {
      api.get('/weddings').then((res) => {
        setWeddings(res.data);
        if (res.data.length > 0) setSelectedWeddingId(res.data[0].id);
      }).catch(console.error);
    }
  }, [isCouple]);

  useEffect(() => {
    if (!selectedWeddingId) return;
    api.get(`/messages/wedding/${selectedWeddingId}`).then((res) => {
      setMessages(res.data.messages);
      if (res.data.unreadCount > 0) api.patch(`/messages/wedding/${selectedWeddingId}/mark-read`);
    }).catch(console.error);
  }, [selectedWeddingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedWeddingId) return;
    const interval = setInterval(() => {
      api.get(`/messages/wedding/${selectedWeddingId}`).then((res) => {
        setMessages(res.data.messages);
        if (res.data.unreadCount > 0) api.patch(`/messages/wedding/${selectedWeddingId}/mark-read`);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedWeddingId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    const fd = new FormData();
    fd.append('content', content);
    if (fileRef.current?.files[0]) fd.append('attachment', fileRef.current.files[0]);
    try {
      const res = await api.post(`/messages/wedding/${selectedWeddingId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) => [...prev, res.data]);
      setContent('');
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      toast.error('Błąd wysyłania');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Wiadomości</h1>
        {!isCouple && weddings.length > 0 && (
          <select
            className="input w-auto"
            value={selectedWeddingId || ''}
            onChange={(e) => setSelectedWeddingId(e.target.value)}
          >
            {weddings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.brideName} i {w.groomName} ({new Date(w.weddingDate).toLocaleDateString('pl-PL')})
              </option>
            ))}
          </select>
        )}
      </div>

      {!selectedWeddingId ? (
        <div className="text-center py-12 text-gray-400">Brak wesela do wyświetlenia.</div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 py-8">Brak wiadomości. Napisz pierwszą!</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMine && <span className="text-xs text-gray-400 mb-1 ml-1">{msg.sender?.name}</span>}
                    <div className={`px-4 py-3 rounded-2xl text-sm ${isMine ? 'bg-rose-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                      <p>{msg.content}</p>
                      {msg.attachment && (
                        <a href={msg.attachment} target="_blank" rel="noreferrer" className={`text-xs underline mt-1 block ${isMine ? 'text-rose-100' : 'text-blue-500'}`}>
                          📎 Załącznik
                        </a>
                      )}
                    </div>
                    <span className={`text-xs text-gray-400 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="card flex gap-3 items-end p-3">
            <div className="flex-1">
              <textarea
                className="input resize-none h-16"
                placeholder="Napisz wiadomość..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" className="hidden" />
              <button type="button" onClick={() => fileRef.current.click()} className="btn-secondary text-sm px-3 py-2">📎</button>
              <button type="submit" disabled={sending || !content.trim()} className="btn-primary text-sm px-4 py-2">{sending ? '...' : '➤'}</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
