import { create } from 'zustand';
import api from '../utils/api';

const useNotificationStore = create((set, get) => ({
  unreadMessages: 0,
  newMatches: 0,
  pendingInvites: 0,
  totalBadge: 0,
  latestUnread: [],
  lastNotification: null,
  _prevTotal: 0,
  _polling: false,
  _activeMatchId: null, // Welcher Chat ist gerade offen

  // Setzt den aktiven Chat (wird von ChatScreen aufgerufen)
  setActiveChat: (matchId) => set({ _activeMatchId: matchId }),
  clearActiveChat: () => set({ _activeMatchId: null }),

  startPolling: () => {
    if (get()._polling) return;
    set({ _polling: true });

    const poll = async () => {
      const token = localStorage.getItem('sw_token');
      if (!token) return;

      try {
        const { data } = await api.get('/notifications/status');
        const total = data.unreadMessages + data.newMatches + data.pendingInvites;

        const prev = get()._prevTotal;
        const activeMatchId = get()._activeMatchId;

        if (total > prev && total > 0) {
          let notification = null;

          if (data.latestUnread.length > 0) {
            const latest = data.latestUnread[0];

            // NICHT anzeigen wenn der User gerade in diesem Chat ist
            if (latest.match_id !== activeMatchId) {
              notification = {
                id: Date.now(),
                sender: latest.sender_name,
                content: latest.message_type === 'invite' ? '🎉 Einladung erhalten!' : latest.content,
                matchId: latest.match_id,
                type: latest.message_type,
              };
            }
          } else if (data.newMatches > get().newMatches) {
            notification = {
              id: Date.now(),
              sender: 'SaiHello',
              content: 'Neues Match! Schau nach wer dich gefunden hat.',
              matchId: null,
              type: 'match',
            };
          }

          if (notification) {
            set({ lastNotification: notification });
            setTimeout(() => set({ lastNotification: null }), 5000);

            // Browser Push Notification (wenn erlaubt)
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(notification.sender, {
                  body: notification.content,
                  icon: '/favicon.ico',
                  tag: 'saihello-' + notification.matchId,
                });
              } catch(e) {}
            }
          }
        }

        set({
          ...data,
          totalBadge: total,
          _prevTotal: total,
        });
      } catch (err) {}
    };

    poll();
    setInterval(poll, 3000);
  },

  // Browser Push Permission anfragen
  requestPushPermission: async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  },

  dismissNotification: () => set({ lastNotification: null }),
}));

export default function useNotifications() {
  const store = useNotificationStore();

  if (!store._polling && localStorage.getItem('sw_token')) {
    store.startPolling();
    // Push Permission anfragen nach kurzer Verzögerung
    setTimeout(() => store.requestPushPermission(), 3000);
  }

  return store;
}
