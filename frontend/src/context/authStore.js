import { create } from 'zustand';
import api from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('sw_user') || 'null'),
  token: localStorage.getItem('sw_token'),
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('sw_token', data.token);
      localStorage.setItem('sw_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      connectSocket();
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err.response?.data?.error || 'Login fehlgeschlagen' };
    }
  },

  register: async (userData) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', userData);
      set({ loading: false });
      return { success: true, pendingVerification: data.pendingVerification };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err.response?.data?.error || 'Registrierung fehlgeschlagen' };
    }
  },

  logout: () => {
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_user');
    disconnectSocket();
    set({ user: null, token: null });
  },

  updateUser: (updates) => {
    const user = { ...get().user, ...updates };
    localStorage.setItem('sw_user', JSON.stringify(user));
    set({ user });
  },

  isLoggedIn: () => !!get().token,
}));

export default useAuthStore;
