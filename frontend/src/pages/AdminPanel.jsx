import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import AdminActionModal from '../components/AdminActionModal';
import ImageModal from '../components/ImageModal';

/**
 * React page component for AdminPanel view.
 * @author = kruthinraj
 * @date = 2026-09-03
 */

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'online' | 'today' | 'offline' | 'blocked'
  const [userSort, setUserSort] = useState('recent_seen'); // 'recent_seen' | 'oldest_seen' | 'newest_joined' | 'name' | 'warnings'
  const [refreshingUsers, setRefreshingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [collegeRequests, setCollegeRequests] = useState([]);
  const [collegeSubTab, setCollegeSubTab] = useState('requests'); // 'requests' | 'colleges'
  const [requestsFilter, setRequestsFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [actionBusyId, setActionBusyId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newCollege, setNewCollege] = useState({ domain: '', name: '' });

  // Support chat state
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [supportReply, setSupportReply] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('all');
  const [sendingSupportReply, setSendingSupportReply] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatMessagesEndRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [modalAction, setModalAction] = useState('warn'); // 'warn' | 'block' | 'unblock'
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, reportsData, collegesData, supportData, requestsData] = await Promise.all([
        api.admin.getUsers(),
        api.admin.getReports(),
        api.admin.getColleges(),
        api.support.getAllTickets().catch(() => ({ tickets: [] })),
        api.admin.getCollegeRequests().catch(() => ({ requests: [] })),
      ]);
      setUsers(usersData.users);
      setReports(reportsData.reports);
      setColleges(collegesData.colleges);
      setSupportTickets(supportData.tickets || []);
      setCollegeRequests(requestsData.requests || []);
    } catch (err) {
      if (err.status === 403) {
        navigate('/');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time live auto-refresh for online and active students every 15 seconds
  useEffect(() => {
    if (activeTab !== 'users') return;
    const interval = setInterval(() => {
      api.admin.getUsers().then((data) => {
        if (data?.users) setUsers(data.users);
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleManualRefreshUsers = async () => {
    setRefreshingUsers(true);
    try {
      const data = await api.admin.getUsers();
      if (data?.users) setUsers(data.users);
    } catch (_) {}
    finally {
      setRefreshingUsers(false);
    }
  };

  const loadTicketMessages = async (ticketId, isSilent = false) => {
    if (!isSilent) setLoadingMessages(true);
    try {
      const data = await api.support.getMessages(ticketId);
      setSelectedTicket(data.ticket);
      setTicketMessages(data.messages || []);
    } catch (err) {
      if (!isSilent) alert('Failed to load ticket messages: ' + err.message);
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'support' || !selectedTicketId) return;
    loadTicketMessages(selectedTicketId);
    const interval = setInterval(() => {
      loadTicketMessages(selectedTicketId, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, selectedTicketId]);

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollTop = chatMessagesEndRef.current.scrollHeight;
    }
  }, [ticketMessages]);

  const handleSelectTicket = (t) => {
    setSelectedTicketId(t.id);
    loadTicketMessages(t.id);
  };

  const handleSendSupportReply = async (e) => {
    e.preventDefault();
    if (!supportReply.trim() || !selectedTicketId || sendingSupportReply) return;
    setSendingSupportReply(true);
    try {
      const data = await api.support.sendMessage(selectedTicketId, supportReply);
      setTicketMessages((prev) => [...prev, data.message]);
      setSupportReply('');
      setSupportTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicketId
            ? {
                ...t,
                status: t.status === 'open' ? 'in_progress' : t.status,
                last_message: supportReply,
                last_message_at: new Date().toISOString(),
                last_message_is_admin: true,
              }
            : t
        )
      );
      if (selectedTicket && selectedTicket.status === 'open') {
        setSelectedTicket((prev) => ({ ...prev, status: 'in_progress' }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingSupportReply(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      await api.support.updateStatus(ticketId, newStatus);
      setSelectedTicket((prev) => (prev?.id === ticketId ? { ...prev, status: newStatus } : prev));
      setSupportTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSupportTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to permanently delete this support ticket?')) return;
    try {
      await api.support.deleteTicket(ticketId);
      setSupportTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
        setSelectedTicket(null);
        setTicketMessages([]);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWarn = async (id, name) => {
    if (!window.confirm(`Are you sure you want to warn ${name}?`)) return;
    try {
      await api.admin.warnUser(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to ignore/delete this report?')) return;
    try {
      await api.admin.deleteReport(reportId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTakeDownPost = async (listingId, reportId) => {
    if (!window.confirm('Are you sure you want to take down this post permanently?')) return;
    try {
      await api.admin.deleteListing(listingId);
      await api.admin.deleteReport(reportId); // Also delete the report since the post is gone
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddCollege = async (e) => {
    e.preventDefault();
    try {
      await api.admin.createCollege(newCollege);
      setNewCollege({ domain: '', name: '' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCollege = async (domain) => {
    if (!window.confirm(`Are you sure you want to delete ${domain}? This will permanently delete all users and posts from this college.`)) return;
    try {
      await api.admin.deleteCollege(domain);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApproveCollegeRequest = async (req) => {
    if (!window.confirm(`Approve ${req.college_name} (@${req.college_domain})?\n\nThis will add @${req.college_domain} to the active colleges directory and send an automated notification email to ${req.example_email}.`)) {
      return;
    }
    setActionBusyId(req.id);
    try {
      const res = await api.admin.approveCollegeRequest(req.id);
      alert(res.message || 'College approved! Notification email sent to student.');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve college request');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOpenRejectModal = (req) => {
    setRequestToReject(req);
    setRejectionReason('Thank you for your interest in SkillBridge. At this time, we are unable to verify or support this domain. We will keep your request on file as we expand.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!requestToReject) return;
    setActionBusyId(requestToReject.id);
    try {
      const res = await api.admin.rejectCollegeRequest(requestToReject.id, rejectionReason.trim());
      alert(res.message || 'Request rejected and notification email dispatched.');
      setRejectModalOpen(false);
      setRequestToReject(null);
      setRejectionReason('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to reject college request');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteCollegeRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this college request record?')) return;
    try {
      await api.admin.deleteCollegeRequest(id);
      setCollegeRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete request');
    }
  };

  const openActionModal = (u, action) => {
    setModalUser(u);
    setModalAction(action);
    setModalOpen(true);
  };

  const confirmAction = async (userId, payload) => {
    if (modalAction === 'warn') {
      await api.admin.warnUser(userId, payload);
    } else if (modalAction === 'block') {
      await api.admin.blockUser(userId, payload);
    } else if (modalAction === 'unblock') {
      await api.admin.unblockUser(userId, payload);
    }
    loadData();
  };

  // Helper to format last seen with relative time and detailed timestamp
  const formatLastSeen = (timestamp, isOnlineExplicit) => {
    if (!timestamp) {
      return {
        status: 'Never seen',
        relative: 'Never seen',
        full: 'No activity recorded yet',
        isOnline: false,
        isToday: false,
      };
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return {
        status: 'Unknown',
        relative: 'Unknown',
        full: '',
        isOnline: false,
        isToday: false,
      };
    }

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    const full = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const isOnline = isOnlineExplicit || diffMin <= 10;
    const isToday =
      diffHours < 24 &&
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isOnline) {
      return {
        status: 'Online Now',
        relative: diffMin < 1 ? 'Online now' : `Active ${diffMin}m ago`,
        full,
        isOnline: true,
        isToday: true,
      };
    }

    if (diffMin < 60) {
      return {
        status: `Seen ${diffMin}m ago`,
        relative: `${diffMin}m ago`,
        full,
        isOnline: false,
        isToday: true,
      };
    }

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) {
      return {
        status: `Today, ${timeStr}`,
        relative: `Today at ${timeStr}`,
        full,
        isOnline: false,
        isToday: true,
      };
    }

    if (diffDays <= 1) {
      return {
        status: `Yesterday, ${timeStr}`,
        relative: `Yesterday at ${timeStr}`,
        full,
        isOnline: false,
        isToday: false,
      };
    }

    if (diffDays <= 7) {
      return {
        status: `${diffDays}d ago`,
        relative: `${diffDays} days ago`,
        full,
        isOnline: false,
        isToday: false,
      };
    }

    return {
      status: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      relative: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      full,
      isOnline: false,
      isToday: false,
    };
  };

  // Derive real-time active, online, and last seen status for each user
  const processedUsers = users.map((u) => {
    const lastSeen = u.last_seen_at || u.last_login_at || u.updated_at || u.created_at;
    const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(u.created_at || 0);
    const now = Date.now();
    const diffMs = Math.max(0, now - lastSeenDate.getTime());
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Real-time online: active within last 10 minutes
    const isOnlineNow = !u.is_blocked && (Boolean(u.is_online) || diffMinutes <= 10);
    // Active today: seen in the last 24 hours
    const isSeenToday = !u.is_blocked && (Boolean(u.is_seen_today) || diffHours < 24);
    // Offline: not seen in the last 24 hours
    const isOffline = !u.is_blocked && !isOnlineNow && !isSeenToday;

    return {
      ...u,
      resolved_last_seen: lastSeen,
      is_online_now: isOnlineNow,
      is_seen_today: isSeenToday,
      is_offline: isOffline,
      diff_minutes: diffMinutes,
      diff_hours: diffHours,
      diff_days: diffDays,
    };
  });

  const totalUsersCount = processedUsers.length;
  const totalOnlineCount = processedUsers.filter((u) => u.is_online_now).length;
  const totalSeenTodayCount = processedUsers.filter((u) => u.is_seen_today && !u.is_online_now).length;
  const totalOfflineCount = processedUsers.filter((u) => u.is_offline).length;
  const totalBlockedCount = processedUsers.filter((u) => u.is_blocked).length;

  // Filter users based on searchQuery and userFilter
  const filteredUsers = processedUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.roll_number || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (userFilter === 'online') return u.is_online_now;
    if (userFilter === 'today') return u.is_seen_today;
    if (userFilter === 'offline') return u.is_offline;
    if (userFilter === 'blocked') return u.is_blocked;
    return true; // 'all'
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSort === 'recent_seen') {
      const aTime = a.resolved_last_seen ? new Date(a.resolved_last_seen).getTime() : 0;
      const bTime = b.resolved_last_seen ? new Date(b.resolved_last_seen).getTime() : 0;
      return bTime - aTime;
    }
    if (userSort === 'oldest_seen') {
      const aTime = a.resolved_last_seen ? new Date(a.resolved_last_seen).getTime() : 0;
      const bTime = b.resolved_last_seen ? new Date(b.resolved_last_seen).getTime() : 0;
      return aTime - bTime;
    }
    if (userSort === 'newest_joined') {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    }
    if (userSort === 'name') {
      return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
    }
    if (userSort === 'warnings') {
      return (b.warnings_count || 0) - (a.warnings_count || 0);
    }
    return 0;
  });

  const renderUsersTab = () => (
    <div className="space-y-6">
      {/* 4 Interactive KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: All Students */}
        <div
          onClick={() => setUserFilter('all')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border ${
            userFilter === 'all'
              ? 'border-cw-accent shadow-md bg-cw-accent/5 ring-2 ring-cw-accent/20'
              : 'border-cw-border hover:border-cw-accent/40 hover:bg-cw-bg-alt/30'
          }`}
        >
          <div className="flex items-center justify-between text-cw-text-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">All Students</span>
            <span className="text-lg" role="img" aria-label="Students">👥</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-cw-text-1">
            {totalUsersCount}
          </div>
          <p className="text-xs text-cw-text-3 mt-1">Total registered accounts</p>
        </div>

        {/* Card 2: Online Now / Current Active */}
        <div
          onClick={() => setUserFilter('online')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border ${
            userFilter === 'online'
              ? 'border-emerald-500 shadow-md bg-emerald-500/5 ring-2 ring-emerald-500/20'
              : 'border-cw-border hover:border-emerald-500/40 hover:bg-cw-bg-alt/30'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Online Now</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            {totalOnlineCount}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Active Now
            </span>
          </div>
          <p className="text-xs text-cw-text-3 mt-1">Active in last 10 minutes</p>
        </div>

        {/* Card 3: Active Today */}
        <div
          onClick={() => setUserFilter('today')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border ${
            userFilter === 'today'
              ? 'border-amber-500 shadow-md bg-amber-500/5 ring-2 ring-amber-500/20'
              : 'border-cw-border hover:border-amber-500/40 hover:bg-cw-bg-alt/30'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Today</span>
            <span className="text-lg" role="img" aria-label="Clock">🕒</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {totalSeenTodayCount}
          </div>
          <p className="text-xs text-cw-text-3 mt-1">Seen in the last 24 hours</p>
        </div>

        {/* Card 4: Offline / Inactive */}
        <div
          onClick={() => setUserFilter('offline')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border ${
            userFilter === 'offline'
              ? 'border-slate-500 shadow-md bg-slate-500/5 ring-2 ring-slate-500/20'
              : 'border-cw-border hover:border-slate-500/40 hover:bg-cw-bg-alt/30'
          }`}
        >
          <div className="flex items-center justify-between text-cw-text-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Offline</span>
            <span className="text-lg" role="img" aria-label="Offline">💤</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-cw-text-2">
            {totalOfflineCount}
          </div>
          <p className="text-xs text-cw-text-3 mt-1">No activity today</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-cw-bg-alt/60 rounded-xl border border-cw-border text-xs">
          {[
            { key: 'all', label: 'All Students', count: totalUsersCount },
            {
              key: 'online',
              label: 'Online Now',
              count: totalOnlineCount,
              dot: 'bg-emerald-500',
              pulse: true,
            },
            {
              key: 'today',
              label: 'Active Today',
              count: totalSeenTodayCount,
              dot: 'bg-amber-500',
            },
            {
              key: 'offline',
              label: 'Offline',
              count: totalOfflineCount,
              dot: 'bg-slate-400',
            },
            {
              key: 'blocked',
              label: 'Blocked',
              count: totalBlockedCount,
              dot: 'bg-red-500',
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setUserFilter(item.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                userFilter === item.key
                  ? 'bg-cw-surface text-cw-text-1 shadow-sm font-semibold'
                  : 'text-cw-text-2 hover:text-cw-text-1'
              }`}
            >
              {item.dot && (
                <span
                  className={`w-2 h-2 rounded-full ${item.dot} ${item.pulse ? 'animate-pulse' : ''}`}
                />
              )}
              <span>{item.label}</span>
              <span className="text-xs text-cw-text-3">({item.count})</span>
            </button>
          ))}
        </div>

        {/* Search, Sort, and Live Refresh Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search student, email, roll no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field text-xs py-2 w-full sm:w-56"
          />

          <select
            value={userSort}
            onChange={(e) => setUserSort(e.target.value)}
            className="field text-xs py-2 w-full sm:w-44 bg-cw-surface"
          >
            <option value="recent_seen">🟢 Online / Recent First</option>
            <option value="oldest_seen">💤 Longest Offline First</option>
            <option value="newest_joined">📅 Newest Registered</option>
            <option value="name">🔤 Name (A - Z)</option>
            <option value="warnings">⚠️ Most Warnings</option>
          </select>

          <button
            type="button"
            onClick={handleManualRefreshUsers}
            disabled={refreshingUsers}
            title="Refresh student status now"
            className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 border border-cw-border rounded-lg text-cw-text-2 hover:text-cw-text-1"
          >
            <span className={refreshingUsers ? 'animate-spin inline-block' : 'inline-block'}>
              🔄
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-cw-surface rounded-xl border border-cw-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-cw-text-2">
            <thead className="bg-cw-bg-alt text-xs uppercase text-cw-text-3 border-b border-cw-border">
              <tr>
                <th className="px-4 py-3.5 sm:px-6 font-semibold">Student / User</th>
                <th className="px-4 py-3.5 font-semibold">Roll No</th>
                <th className="px-4 py-3.5 font-semibold">Current Status</th>
                <th className="px-4 py-3.5 font-semibold">Last Seen</th>
                <th className="px-4 py-3.5 font-semibold">Joined Date</th>
                <th className="px-4 py-3.5 font-semibold">Trust Score</th>
                <th className="px-4 py-3.5 font-semibold">Warnings</th>
                <th className="px-4 py-3.5 sm:px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cw-border">
              {sortedUsers.map((u) => {
                const seenInfo = formatLastSeen(u.resolved_last_seen, u.is_online_now);
                const initials = (u.full_name || u.email || '?')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <tr key={u.id} className="hover:bg-cw-bg-alt/40 transition-colors">
                    {/* User column */}
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cw-accent to-cw-accent-light text-white font-semibold text-xs flex items-center justify-center flex-shrink-0">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          {u.is_online_now && !u.is_blocked && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-cw-surface" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-cw-text-1 truncate max-w-[180px]">
                            {u.full_name || 'Anonymous Student'}
                          </div>
                          <div className="text-xs text-cw-text-3 truncate max-w-[180px]">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Roll No */}
                    <td className="px-4 py-3.5 font-mono text-xs">
                      {u.roll_number ? (
                        <span className="px-2 py-0.5 rounded bg-cw-bg-alt border border-cw-border text-cw-text-2">
                          {u.roll_number}
                        </span>
                      ) : (
                        <span className="text-cw-text-3">-</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      {u.is_blocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Blocked
                        </span>
                      ) : u.is_online_now ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Online Now
                        </span>
                      ) : u.is_seen_today ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Seen Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cw-bg-alt text-cw-text-3 border border-cw-border">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Offline
                        </span>
                      )}
                    </td>

                    {/* Last Seen */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col" title={`Exact full timestamp: ${seenInfo.full}`}>
                        <span
                          className={`text-xs flex items-center gap-1 ${
                            seenInfo.isOnline
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : seenInfo.isToday
                              ? 'text-cw-text-1 font-medium'
                              : 'text-cw-text-3 font-normal'
                          }`}
                        >
                          {seenInfo.isOnline && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          {seenInfo.status}
                        </span>
                        <span className="text-[11px] text-cw-text-3 font-normal truncate max-w-[140px]">
                          {seenInfo.full}
                        </span>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="px-4 py-3.5 text-xs text-cw-text-3 whitespace-nowrap">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>

                    {/* Trust Score */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-cw-text-1">
                        {u.rating_average ? Number(u.rating_average).toFixed(1) : '-'}
                      </span>{' '}
                      <span className="text-xs text-cw-text-3">({u.rating_count || 0})</span>
                    </td>

                    {/* Warnings */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.warnings_count > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-cw-bg-alt text-cw-text-3'
                        }`}
                      >
                        {u.warnings_count || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 sm:px-6 text-right space-x-2 whitespace-nowrap">
                      {!u.is_blocked ? (
                        <>
                          <button
                            onClick={() => openActionModal(u, 'warn')}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                          >
                            Warn
                          </button>
                          <button
                            onClick={() => openActionModal(u, 'block')}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          >
                            Block
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openActionModal(u, 'unblock')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        >
                          Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-cw-text-3">
                    <p className="font-semibold text-cw-text-2">No students found.</p>
                    <p className="text-xs mt-1">Try adjusting your search query or filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBlockedTab = () => {
    return renderUsersTab();
  };

  const renderReportsTab = () => (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <div className="p-8 text-center text-cw-text-2 bg-cw-surface rounded-xl border border-cw-border">
          No reports submitted yet.
        </div>
      ) : (
        reports.map(r => (
          <div key={r.id} className="card p-6 border-l-4 border-l-red-500">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-1 rounded">
                  {r.reason.replace('_', ' ')}
                </span>
                <p className="mt-3 text-sm text-cw-text-1 whitespace-pre-line">{r.description}</p>
              </div>
              <span className="text-xs text-cw-text-3">{new Date(r.created_at).toLocaleString()}</span>
            </div>

            {r.proof_url && (
              <div className="mt-4">
                <p className="text-xs font-medium text-cw-text-3 mb-2">Attached Proof:</p>
                <div onClick={() => setFullscreenImage(r.proof_url)}>
                  <img src={r.proof_url} alt="Proof" className="max-h-48 rounded border border-cw-border object-cover cursor-zoom-in" />
                </div>
              </div>
            )}

            {r.listing_id && (
              <div className="mt-4 p-3 bg-cw-bg-alt/50 rounded-lg border border-cw-border">
                <p className="text-xs font-semibold text-cw-text-3 uppercase tracking-wider mb-1">Reported Post</p>
                <p className="text-sm font-medium text-cw-text-1">
                  {r.listing_title ? `"${r.listing_title}"` : <span className="italic text-cw-text-3">Post already deleted</span>}
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-cw-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm">
              <div className="text-cw-text-2">
                Reported <span className="font-semibold text-cw-text-1">{r.reported_name || r.reported_email}</span>
                {' by '}
                <span className="font-semibold text-cw-text-1">{r.reporter_name || r.reporter_email}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openActionModal({ id: r.reported_user_id, full_name: r.reported_name, email: r.reported_email }, 'warn')}
                  className="btn-ghost py-1.5 px-3 text-xs"
                >
                  Warn User
                </button>
                {r.listing_id && r.listing_title && (
                  <button
                    onClick={() => handleTakeDownPost(r.listing_id, r.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    Take Down Post
                  </button>
                )}
                <button
                  onClick={() => handleDeleteReport(r.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cw-bg-alt text-cw-text-2 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Ignore
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCollegesTab = () => {
    const pendingRequests = collegeRequests.filter((r) => r.status === 'pending');
    const approvedRequests = collegeRequests.filter((r) => r.status === 'approved');
    const rejectedRequests = collegeRequests.filter((r) => r.status === 'rejected');

    const filteredRequests = collegeRequests.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        (r.college_name || '').toLowerCase().includes(q) ||
        (r.college_domain || '').toLowerCase().includes(q) ||
        (r.example_email || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (requestsFilter === 'all') return true;
      return r.status === requestsFilter;
    });

    const filteredColleges = colleges.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.domain || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6">
        {/* Sub Navigation */}
        <div className="flex items-center justify-between border-b border-cw-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollegeSubTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                collegeSubTab === 'requests'
                  ? 'bg-cw-accent text-white shadow-sm'
                  : 'bg-cw-surface border border-cw-border text-cw-text-2 hover:text-cw-text-1 hover:bg-cw-bg-alt'
              }`}
            >
              <span>🎓 Student Access Requests</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  collegeSubTab === 'requests'
                    ? 'bg-white/25 text-white'
                    : pendingRequests.length > 0
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-cw-bg-alt text-cw-text-3'
                }`}
              >
                {pendingRequests.length > 0 ? `${pendingRequests.length} pending` : collegeRequests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCollegeSubTab('colleges')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                collegeSubTab === 'colleges'
                  ? 'bg-cw-accent text-white shadow-sm'
                  : 'bg-cw-surface border border-cw-border text-cw-text-2 hover:text-cw-text-1 hover:bg-cw-bg-alt'
              }`}
            >
              <span>🏛️ Approved Colleges</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  collegeSubTab === 'colleges' ? 'bg-white/25 text-white' : 'bg-cw-bg-alt text-cw-text-3'
                }`}
              >
                {colleges.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-cw-text-3 hidden sm:block">
            {collegeSubTab === 'requests'
              ? `${collegeRequests.length} total request(s) received`
              : `${colleges.length} approved university domain(s)`}
          </div>
        </div>

        {/* SUBTAB 1: REQUESTS */}
        {collegeSubTab === 'requests' && (
          <div className="space-y-4">
            {/* Context Explanation Callout */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cw-accent/10 via-purple-500/10 to-transparent border border-cw-accent/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-cw-text-1 flex items-center gap-2">
                  <span>📬</span> Prospective Campus Applications
                </h4>
                <p className="text-xs text-cw-text-2 mt-0.5">
                  When you approve a request, the university domain is immediately added to the system and an automated confirmation email is sent to the student so they can register.
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRequestsFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  requestsFilter === 'all'
                    ? 'bg-cw-text-1 text-cw-bg font-semibold'
                    : 'bg-cw-surface border border-cw-border text-cw-text-2 hover:bg-cw-bg-alt'
                }`}
              >
                All ({collegeRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestsFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  requestsFilter === 'pending'
                    ? 'bg-amber-500 text-white font-semibold'
                    : 'bg-cw-surface border border-cw-border text-amber-600 dark:text-amber-400 hover:bg-cw-bg-alt'
                }`}
              >
                <span>⏳ Pending Review</span>
                <span className="font-bold">({pendingRequests.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestsFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  requestsFilter === 'approved'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-cw-surface border border-cw-border text-emerald-600 dark:text-emerald-400 hover:bg-cw-bg-alt'
                }`}
              >
                <span>✓ Approved</span>
                <span className="font-bold">({approvedRequests.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestsFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  requestsFilter === 'rejected'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'bg-cw-surface border border-cw-border text-red-600 dark:text-red-400 hover:bg-cw-bg-alt'
                }`}
              >
                <span>✕ Rejected</span>
                <span className="font-bold">({rejectedRequests.length})</span>
              </button>
            </div>

            {/* Requests Table */}
            <div className="overflow-x-auto bg-cw-surface rounded-xl border border-cw-border shadow-sm">
              <table className="w-full text-left text-sm text-cw-text-2">
                <thead className="bg-cw-bg-alt text-xs uppercase text-cw-text-3 font-semibold border-b border-cw-border">
                  <tr>
                    <th className="px-6 py-3.5">College &amp; Domain</th>
                    <th className="px-6 py-3.5">Requester Contact</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Details / Notes</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cw-border">
                  {filteredRequests.map((r) => {
                    const isBusy = actionBusyId === r.id;
                    return (
                      <tr key={r.id} className="hover:bg-cw-bg-alt/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-cw-text-1">{r.college_name}</div>
                          <div className="font-mono text-xs text-cw-accent mt-0.5 font-medium">
                            @{r.college_domain}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`mailto:${r.example_email}`}
                            className="font-medium text-cw-text-1 hover:underline flex items-center gap-1 text-xs"
                          >
                            ✉️ {r.example_email}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {r.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending
                            </span>
                          )}
                          {r.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              ✓ Approved
                            </span>
                          )}
                          {r.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              ✕ Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs text-xs">
                          {r.notes ? (
                            <div className="text-cw-text-2 italic">&ldquo;{r.notes}&rdquo;</div>
                          ) : (
                            <span className="text-cw-text-3">—</span>
                          )}
                          {r.admin_reply && (
                            <div className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                              <strong>Decision note:</strong> {r.admin_reply}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-cw-text-3 whitespace-nowrap">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {r.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleApproveCollegeRequest(r)}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isBusy ? 'Processing…' : '✓ Approve & Email'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleOpenRejectModal(r)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  ✕ Reject
                                </button>
                              </>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleDeleteCollegeRequest(r.id)}
                              title="Delete request record"
                              className="p-1.5 rounded-lg text-cw-text-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-cw-text-3">
                        <div className="text-3xl mb-2">🎓</div>
                        <p className="font-medium text-cw-text-2">No college requests found.</p>
                        <p className="text-xs text-cw-text-3 mt-1">
                          {requestsFilter !== 'all'
                            ? `There are no ${requestsFilter} requests right now.`
                            : 'When students request access for unlisted universities, they will appear here.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 2: APPROVED COLLEGES DIRECTORY */}
        {collegeSubTab === 'colleges' && (
          <div className="space-y-6">
            <div className="bg-cw-surface p-6 rounded-xl border border-cw-border shadow-sm">
              <h3 className="text-lg font-semibold text-cw-text-1 mb-1">Add a New College Manually</h3>
              <p className="text-xs text-cw-text-3 mb-4">
                Manually whitelist a university domain to allow students with that email domain to register immediately.
              </p>
              <form onSubmit={handleAddCollege} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-cw-text-2 mb-1">
                    College Domain (e.g. stanford.edu)
                  </label>
                  <input
                    type="text"
                    required
                    className="field w-full"
                    value={newCollege.domain}
                    onChange={(e) =>
                      setNewCollege({
                        ...newCollege,
                        domain: e.target.value.toLowerCase().replace(/^@+/, ''),
                      })
                    }
                    placeholder="mit.edu or vit.ac.in"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-cw-text-2 mb-1">College Full Name</label>
                  <input
                    type="text"
                    required
                    className="field w-full"
                    value={newCollege.name}
                    onChange={(e) => setNewCollege({ ...newCollege, name: e.target.value })}
                    placeholder="Massachusetts Institute of Technology"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="btn-primary py-2 px-6">
                    + Add College
                  </button>
                </div>
              </form>
            </div>

            <div className="overflow-x-auto bg-cw-surface rounded-xl border border-cw-border shadow-sm">
              <table className="w-full text-left text-sm text-cw-text-2">
                <thead className="bg-cw-bg-alt text-xs uppercase text-cw-text-3 font-semibold border-b border-cw-border">
                  <tr>
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-6 py-4">College Name</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cw-border">
                  {filteredColleges.map((c) => (
                    <tr key={c.id || c.domain} className="hover:bg-cw-bg-alt/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-cw-accent whitespace-nowrap">
                        @{c.domain}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-cw-text-1">{c.name}</td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteCollege(c.domain)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredColleges.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-cw-text-3">
                        No approved colleges found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const openTicketsCount = supportTickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  ).length;

  const filteredTickets = supportTickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (t.subject || '').toLowerCase().includes(q) ||
      (t.user?.full_name || '').toLowerCase().includes(q) ||
      (t.user?.email || '').toLowerCase().includes(q) ||
      (t.user?.roll_number || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q);

    if (supportStatusFilter === 'all') return matchesQuery;
    return matchesQuery && t.status === supportStatusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      case 'in_progress':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30';
      case 'resolved':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      case 'closed':
      default:
        return 'bg-cw-bg-alt text-cw-text-3 border border-cw-border';
    }
  };

  const getCategoryLabel = (category) => {
    const map = {
      account: 'Account & Verification',
      payment_dispute: 'Payment / Dispute',
      bug_report: 'Bug Report',
      feature_request: 'Feature Request',
      listing_help: 'Listing & Bids',
      general: 'General Inquiry',
      other: 'Other',
    };
    return map[category] || category;
  };

  const renderSupportTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets list */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex flex-col gap-2">
            <input
              type="search"
              placeholder="Search by student, subject, roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field w-full text-sm"
            />
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['all', 'open', 'in_progress', 'resolved', 'closed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSupportStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-colors ${
                    supportStatusFilter === filter
                      ? 'bg-cw-accent text-white shadow-sm'
                      : 'bg-cw-surface hover:bg-cw-bg-alt text-cw-text-2 border border-cw-border'
                  }`}
                >
                  {filter === 'all'
                    ? `All (${supportTickets.length})`
                    : `${filter.replace('_', ' ')} (${
                        supportTickets.filter((t) => t.status === filter).length
                      })`}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {filteredTickets.length === 0 ? (
              <div className="card text-center py-12 text-sm text-cw-text-3">
                No support tickets found matching your filter.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicketId === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`card p-4 cursor-pointer transition-all border text-left ${
                      isSelected
                        ? 'border-cw-accent shadow-md bg-cw-accent/5'
                        : 'border-cw-border hover:border-cw-accent/40 hover:bg-cw-bg-alt/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(
                          ticket.status
                        )}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-cw-text-3 whitespace-nowrap">
                        {new Date(ticket.updated_at || ticket.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-cw-text-1 line-clamp-1 mb-1">
                      {ticket.subject}
                    </h4>

                    <p className="text-xs text-cw-text-2 line-clamp-2 mb-3">
                      {ticket.last_message || ticket.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-cw-text-3 pt-2 border-t border-cw-border/60">
                      <span className="font-medium text-cw-text-1 truncate max-w-[160px]">
                        {ticket.user?.full_name || 'Student'}
                        {ticket.user?.roll_number ? ` • ${ticket.user.roll_number}` : ''}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-cw-accent">
                        {getCategoryLabel(ticket.category)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat & Ticket Management */}
        <div className="lg:col-span-7">
          {!selectedTicketId ? (
            <div className="card h-[620px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-cw-border">
              <div className="w-16 h-16 rounded-2xl bg-cw-bg-alt text-3xl flex items-center justify-center mb-4">
                💬
              </div>
              <h3 className="text-lg font-semibold text-cw-text-1 mb-1">Support Live Desk</h3>
              <p className="text-sm text-cw-text-2 max-w-sm">
                Select any support ticket on the left to read student queries, view attached proof, and chat in real-time.
              </p>
            </div>
          ) : (
            <div className="card h-[620px] flex flex-col p-0 overflow-hidden border border-cw-border shadow-sm">
              {/* Header */}
              <div className="p-4 border-b border-cw-border bg-cw-bg-alt/70 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-cw-text-1 truncate">
                      {selectedTicket?.subject || 'Support Ticket'}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(
                        selectedTicket?.status || 'open'
                      )}`}
                    >
                      {(selectedTicket?.status || 'open').replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-cw-text-2 mt-0.5">
                    From:{' '}
                    <span className="font-semibold text-cw-text-1">
                      {selectedTicket?.creator?.full_name || selectedTicket?.user?.full_name || 'Student'}
                    </span>{' '}
                    ({selectedTicket?.creator?.email || selectedTicket?.user?.email})
                    {selectedTicket?.creator?.roll_number && (
                      <span className="ml-1 text-cw-text-3">• Roll: {selectedTicket.creator.roll_number}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket?.status || 'open'}
                    onChange={(e) => handleUpdateTicketStatus(selectedTicketId, e.target.value)}
                    className="field text-xs py-1.5 px-2 bg-cw-surface font-medium cursor-pointer"
                  >
                    <option value="open">Status: Open</option>
                    <option value="in_progress">Status: In Progress</option>
                    <option value="resolved">Status: Resolved</option>
                    <option value="closed">Status: Closed</option>
                  </select>

                  <button
                    onClick={() => handleDeleteSupportTicket(selectedTicketId)}
                    title="Delete ticket"
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Initial Issue Details Pill/Accordion */}
              <div className="px-4 py-2.5 bg-cw-bg border-b border-cw-border text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-cw-text-2 truncate">
                  <span className="font-semibold text-cw-accent uppercase text-[10px] tracking-wider">
                    {getCategoryLabel(selectedTicket?.category)}
                  </span>
                  <span className="text-cw-border">|</span>
                  <span className="truncate">{selectedTicket?.description}</span>
                </div>
                {selectedTicket?.proof_url && (
                  <button
                    onClick={() => setFullscreenImage(selectedTicket.proof_url)}
                    className="text-xs font-semibold text-cw-accent hover:underline whitespace-nowrap flex items-center gap-1"
                  >
                    📷 View Proof
                  </button>
                )}
              </div>

              {/* Chat Message Stream */}
              <div
                ref={chatMessagesEndRef}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-cw-surface"
              >
                {loadingMessages && ticketMessages.length === 0 ? (
                  <div className="text-center py-10 text-xs text-cw-text-3">
                    Loading conversation...
                  </div>
                ) : ticketMessages.length === 0 ? (
                  <div className="text-center py-10 text-xs text-cw-text-3">
                    No messages yet in this ticket.
                  </div>
                ) : (
                  ticketMessages.map((msg) => {
                    const isAdmin = msg.is_admin;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-cw-text-2">
                            {isAdmin ? '🛡️ Support Admin' : msg.sender?.full_name || 'Student'}
                          </span>
                          <span className="text-[10px] text-cw-text-3">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                            isAdmin
                              ? 'bg-freelance text-white rounded-tr-sm shadow-sm'
                              : 'bg-cw-bg-alt border border-cw-border text-cw-text-1 rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {msg.attachment_url && (
                          <div className="mt-2">
                            <img
                              src={msg.attachment_url}
                              alt="Attachment"
                              onClick={() => setFullscreenImage(msg.attachment_url)}
                              className="max-h-36 rounded-lg border border-cw-border object-cover cursor-zoom-in"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Form */}
              <form
                onSubmit={handleSendSupportReply}
                className="p-3 border-t border-cw-border bg-cw-bg-alt/50 flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Type reply to student..."
                  value={supportReply}
                  onChange={(e) => setSupportReply(e.target.value)}
                  disabled={sendingSupportReply}
                  className="flex-1 field py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={!supportReply.trim() || sendingSupportReply}
                  className="btn-primary py-2 px-5 whitespace-nowrap text-sm"
                >
                  {sendingSupportReply ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cw-text-1">Admin Panel</h1>
          <p className="text-sm text-cw-text-3">SkillBridge System Administration</p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="border-b border-cw-border">
        <nav className="-mb-px flex flex-wrap gap-4 sm:gap-8 px-2 sm:px-0">
          <button
            onClick={() => { setActiveTab('users'); setUserFilter('all'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users' && userFilter === 'all'
                ? 'border-cw-accent text-cw-accent font-semibold'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            All Students ({totalUsersCount})
          </button>
          <button
            onClick={() => { setActiveTab('users'); setUserFilter('online'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'users' && userFilter === 'online'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Online Now ({totalOnlineCount})
          </button>
          <button
            onClick={() => { setActiveTab('users'); setUserFilter('today'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'users' && userFilter === 'today'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Active Today ({totalSeenTodayCount})
          </button>
          <button
            onClick={() => { setActiveTab('users'); setUserFilter('offline'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'users' && userFilter === 'offline'
                ? 'border-slate-500 text-slate-600 dark:text-slate-400 font-semibold'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Offline ({totalOfflineCount})
          </button>
          <button
            onClick={() => { setActiveTab('users'); setUserFilter('blocked'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'users' && userFilter === 'blocked'
                ? 'border-red-500 text-red-500 font-semibold'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            Blocked ({totalBlockedCount})
          </button>
          <button
            onClick={() => { setActiveTab('reports'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'reports'
                ? 'border-cw-accent text-cw-accent font-semibold'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => { setActiveTab('support'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'support'
                ? 'border-cw-accent text-cw-accent'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            Support Chats ({openTicketsCount})
            {openTicketsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-cw-accent animate-pulse" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('colleges'); setSearchQuery(''); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'colleges'
                ? 'border-cw-accent text-cw-accent font-semibold'
                : 'border-transparent text-cw-text-2 hover:text-cw-text-1 hover:border-cw-border'
              }`}
          >
            <span>Colleges &amp; Requests ({colleges.length})</span>
            {collegeRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {collegeRequests.filter(r => r.status === 'pending').length} new
              </span>
            )}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="py-12 text-center text-cw-text-3">Loading admin data...</div>
      ) : (
        <div className="mt-6">
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'blocked' && renderBlockedTab()}
          {activeTab === 'reports' && renderReportsTab()}
          {activeTab === 'support' && renderSupportTab()}
          {activeTab === 'colleges' && renderCollegesTab()}
        </div>
      )}


      <AdminActionModal
        isOpen={modalOpen}
        user={modalUser}
        actionType={modalAction}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmAction}
      />

      {fullscreenImage && (
        <ImageModal src={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}

      {/* REJECTION EMAIL MODAL */}
      {rejectModalOpen && requestToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-cw-surface rounded-2xl border border-cw-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-cw-text-1 flex items-center gap-2">
                <span className="text-red-500">✕</span> Reject College Request
              </h3>
              <button
                type="button"
                onClick={() => { setRejectModalOpen(false); setRequestToReject(null); }}
                className="text-cw-text-3 hover:text-cw-text-1 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-cw-text-2">
              An automated notification email will be dispatched to{' '}
              <strong className="text-cw-text-1 font-semibold">{requestToReject.example_email}</strong> detailing the decision.
            </p>

            <div className="p-3 bg-cw-bg-alt rounded-xl text-xs space-y-1.5 border border-cw-border">
              <div className="flex justify-between">
                <span className="text-cw-text-3">University:</span>
                <span className="font-semibold text-cw-text-1">{requestToReject.college_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cw-text-3">Domain:</span>
                <span className="font-mono font-semibold text-cw-accent">@{requestToReject.college_domain}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cw-text-2 mb-1">
                  Reason for rejection (will be included in automated email)
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="field text-sm w-full"
                  placeholder="Explain why this college request cannot be approved at this time..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRejectModalOpen(false); setRequestToReject(null); }}
                  className="btn-ghost text-xs py-2 px-4 text-cw-text-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusyId === requestToReject.id}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  {actionBusyId === requestToReject.id ? 'Sending notification email…' : 'Send Rejection Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
