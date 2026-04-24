import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, MessageSquare, Flame, BarChart3, Search, Check, X, Shield, Trash2, ShieldCheck, UserCheck, Clock } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useLanguage from '../../hooks/useLanguage';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-separator rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filter, setFilter] = useState('all'); // all, pending, banned

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      toast.error(t('loadFailed'));
    }
  }, [t]);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: 20, search, filter }
      });
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (err) {
      toast.error(t('loadFailed'));
    }
  }, [page, search, filter, t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === 'users' || tab === 'pending') {
      loadUsers();
    }
  }, [tab, loadUsers]);

  useEffect(() => {
    if (tab === 'pending') {
      setFilter('pending');
    } else if (tab === 'users') {
      setFilter('all');
    }
  }, [tab]);

  async function handleAction(userId, action) {
    try {
      if (action === 'delete') {
        if (!window.confirm(t('adminDeleteConfirm'))) return;
        await api.delete(`/admin/users/${userId}`);
        toast.success(t('adminUserDeleted'));
      } else if (action === 'approve') {
        await api.post(`/admin/users/${userId}/approve`);
        toast.success(t('adminUserApproved'));
      } else if (action === 'ban') {
        await api.patch(`/admin/users/${userId}`, { isBanned: true });
        toast.success(t('adminUserBanned'));
      } else if (action === 'unban') {
        await api.patch(`/admin/users/${userId}`, { isBanned: false });
        toast.success(t('adminUserUnbanned'));
      } else if (action === 'makeAdmin') {
        await api.patch(`/admin/users/${userId}`, { isAdmin: true });
        toast.success(t('adminMadeAdmin'));
      } else if (action === 'removeAdmin') {
        await api.patch(`/admin/users/${userId}`, { isAdmin: false });
        toast.success(t('adminRemovedAdmin'));
      }
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.error || t('requestFailed'));
    }
  }

  const tabs = [
    { key: 'dashboard', label: t('adminDashboard'), icon: <BarChart3 size={16} /> },
    { key: 'users', label: t('adminUsers'), icon: <Users size={16} /> },
    { key: 'pending', label: t('adminPending'), icon: <Clock size={16} /> },
  ];

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-separator px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="text-gray-400 p-1">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-tinder-pink" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('adminPanel')}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                tab === key
                  ? 'bg-tinder-pink/10 text-tinder-pink'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-elevated'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Dashboard Tab */}
        {tab === 'dashboard' && stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Users size={20} className="text-blue-600" />}
              label={t('adminTotalUsers')}
              value={stats.totalUsers}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              icon={<Clock size={20} className="text-amber-600" />}
              label={t('adminPendingUsers')}
              value={stats.pendingUsers}
              color="bg-amber-100 dark:bg-amber-900/30"
            />
            <StatCard
              icon={<Flame size={20} className="text-pink-600" />}
              label={t('adminTotalMatches')}
              value={stats.totalMatches}
              color="bg-pink-100 dark:bg-pink-900/30"
            />
            <StatCard
              icon={<BarChart3 size={20} className="text-green-600" />}
              label={t('adminTotalOffers')}
              value={stats.totalOffers}
              color="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
              icon={<MessageSquare size={20} className="text-purple-600" />}
              label={t('adminTotalMessages')}
              value={stats.totalMessages}
              color="bg-purple-100 dark:bg-purple-900/30"
            />
            <StatCard
              icon={<X size={20} className="text-red-600" />}
              label={t('adminBannedUsers')}
              value={stats.bannedUsers}
              color="bg-red-100 dark:bg-red-900/30"
            />
          </div>
        )}

        {/* Users / Pending Tab */}
        {(tab === 'users' || tab === 'pending') && (
          <div>
            {/* Search */}
            {tab === 'users' && (
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('adminSearchPlaceholder')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-separator rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-tinder-pink"
                />
              </div>
            )}

            {/* User List */}
            <div className="space-y-2">
              {users.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">{t('adminNoUsers')}</p>
              )}
              {users.map((u) => (
                <div key={u.id} className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-separator rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tinder-pink to-tinder-orange flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {u.photo ? (
                          <img src={u.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">{u.displayName?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{u.displayName}</p>
                          {u.isAdmin && <Shield size={12} className="text-tinder-pink flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {u.phone} {u.age ? `| ${u.age}` : ''}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {!u.isApproved && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">{t('adminStatusPending')}</span>
                          )}
                          {u.isBanned && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{t('adminStatusBanned')}</span>
                          )}
                          {u.isApproved && !u.isBanned && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{t('adminStatusActive')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!u.isApproved && (
                        <button
                          onClick={() => handleAction(u.id, 'approve')}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                          title={t('adminApprove')}
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      {!u.isBanned ? (
                        <button
                          onClick={() => handleAction(u.id, 'ban')}
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                          title={t('adminBan')}
                        >
                          <X size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(u.id, 'unban')}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                          title={t('adminUnban')}
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {!u.isAdmin ? (
                        <button
                          onClick={() => handleAction(u.id, 'makeAdmin')}
                          className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
                          title={t('adminMakeAdmin')}
                        >
                          <ShieldCheck size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(u.id, 'removeAdmin')}
                          className="p-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition"
                          title={t('adminRemoveAdmin')}
                        >
                          <Shield size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(u.id, 'delete')}
                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                        title={t('adminDelete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalUsers > 20 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-separator rounded-lg disabled:opacity-40"
                >
                  {t('back')}
                </button>
                <span className="text-sm text-gray-500">{page} / {Math.ceil(totalUsers / 20)}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(totalUsers / 20)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-separator rounded-lg disabled:opacity-40"
                >
                  {t('adminNext')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
