import { useState, useEffect } from 'react';
import api from '../utils/api';
import useAuthStore from '../context/authStore';

export default function useRoleStatus() {
  const [roleStatus, setRoleStatus] = useState({ mode: 'idle', canSearch: true, canOffer: true });
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) fetchRole();
  }, [token]);

  async function fetchRole() {
    try {
      const { data } = await api.get('/tables/role-status');
      setRoleStatus(data);
    } catch (err) {}
  }

  return { ...roleStatus, refreshRole: fetchRole };
}
