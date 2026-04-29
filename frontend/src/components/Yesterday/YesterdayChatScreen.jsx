import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send } from 'lucide-react';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';

export default function YesterdayChatScreen() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const msgCountRef = useRef(0);

  useEffect(() => {
    loadChat();
    pollRef.current = setInterval(pollMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [chatId]);

  useEffect(() => {
    if (messages.length > msgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    msgCountRef.current = messages.length;
  }, [messages]);

  async function loadChat() {
    try {
      const { data } = await api.get(`/yesterday/chats/${chatId}/messages`);
      setOtherUser(data.chat.otherUser);
      setMessages(data.messages);
      msgCountRef.current = data.messages.length;
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function pollMessages() {
    try {
      const { data } = await api.get(`/yesterday/chats/${chatId}/messages`);
      if (data.messages.length !== msgCountRef.current) {
        setMessages(data.messages);
      }
    } catch (err) {}
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const { data } = await api.post(`/yesterday/chats/${chatId}/messages`, { content });
      setMessages(prev => [...prev, { ...data, sender_name: user?.displayName }]);
    } catch (err) {
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-dark-bg flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-dark-separator bg-white dark:bg-dark-card">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-elevated">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        {otherUser && (
          <>
            {otherUser.photo_1 ? (
              <img src={otherUser.photo_1} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-base">
                {otherUser.emoji || otherUser.display_name?.[0] || '👤'}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{otherUser.display_name}</p>
              <p className="text-xs text-gray-400">About yesterday</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="w-6 h-6 border-2 border-tinder-pink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Noch keine Nachrichten. Schreib als Erster!</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-tinder-pink text-white rounded-br-sm' : 'bg-gray-100 dark:bg-dark-elevated text-gray-900 dark:text-white rounded-bl-sm'}`}>
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/70 text-right' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="px-4 py-3 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-separator flex gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Nachricht..."
          className="flex-1 bg-gray-100 dark:bg-dark-elevated rounded-2xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-tinder-pink rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition"
        >
          <Send size={16} className="text-white" />
        </button>
      </form>
    </div>
  );
}
