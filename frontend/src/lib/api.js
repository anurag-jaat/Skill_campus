/**
 * Library utility for api.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:4000' : '';

export const BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/+$/, '');
const TOKEN_KEY = 'skillbridge.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const cleanErrorMessage = (msg) => {
  if (!msg || typeof msg !== 'string') return 'An unexpected error occurred. Please try again.';
  if (
    /<[a-z][\s\S]*>/i.test(msg) ||
    msg.includes('<!DOCTYPE') ||
    msg.includes('<html') ||
    msg.includes('<body') ||
    /521|502|503|504|cloudflare|web server is down/i.test(msg) ||
    /database service is unavailable/i.test(msg)
  ) {
    return 'The API or database service is unavailable. Check that the backend is running, VITE_API_URL is correct, and the database is reachable.';
  }
  return msg;
};

export class ApiError extends Error {
  constructor(status, message, details) {
    // When the server returns field-level validation details, append them
    // to the message so the UI shows what actually went wrong.
    const sanitized = cleanErrorMessage(message);
    const fullMessage =
      Array.isArray(details) && details.length
        ? `${sanitized}: ${details.map((d) => `${d.field ? d.field + ' – ' : ''}${d.message}`).join(', ')}`
        : sanitized;
    super(fullMessage);
    this.status = status;
    this.details = details;
  }
}

/**
 * Single place every network call goes through: attaches the JWT, parses the
 * response and turns a non-2xx into a throwable ApiError.
 */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'Cannot reach the SkillBridge API. Start the backend server and check VITE_API_URL.'
    );
  }

  let payload = {};
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => ({}));
  } else {
    const rawText = await response.text().catch(() => '');
    throw new ApiError(
      response.status || 502,
      cleanErrorMessage(rawText || 'The API returned an unexpected response. Check VITE_API_URL.')
    );
  }

  if (!response.ok) {
    // An expired or tampered token should not leave the UI in a signed-in state.
    if (response.status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new Event('unauthorized'));
    }
    const rawError = payload.error || response.statusText || 'Request failed';
    throw new ApiError(response.status, cleanErrorMessage(rawError), payload.details);
  }

  return payload;
}

export const api = {
  auth: {
    requestOtp: (email) =>
      request('/api/auth/request-otp', { method: 'POST', body: { email }, auth: false }),
    login: (email, password) =>
      request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
    register: (email, password, code, roll_number) =>
      request('/api/auth/register', { method: 'POST', body: { email, password, code, roll_number }, auth: false }),
    resetPassword: (email, code, password) =>
      request('/api/auth/reset-password', { method: 'POST', body: { email, code, password }, auth: false }),
    setPassword: (password) =>
      request('/api/auth/set-password', { method: 'POST', body: { password } }),
    me: () => request('/api/auth/me'),
  },

  users: {
    search: (q) => request(`/api/users/search?q=${encodeURIComponent(q)}`, { auth: false }),
    get: (id) => request(`/api/users/${id}`, { auth: false }),
    updateMe: (patch) => request('/api/users/me', { method: 'PATCH', body: patch }),
    updateAvatar: (avatar_url) =>
      request('/api/users/me/avatar', { method: 'PATCH', body: { avatar_url } }),
  },

  search: {
    all: (q, type = 'all') =>
      request(`/api/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`),
  },

  listings: {
    list: (mode) => request(`/api/listings${mode ? `?mode=${mode}` : ''}`, { auth: false }),
    forOwner: (ownerId) => request(`/api/listings?owner_id=${ownerId}`, { auth: false }),
    get: (id) => request(`/api/listings/${id}`),
    create: (listing) => request('/api/listings', { method: 'POST', body: listing }),
    update: (id, listing) => request(`/api/listings/${id}`, { method: 'PATCH', body: listing }),
    setStatus: (id, status) =>
      request(`/api/listings/${id}/status`, { method: 'PATCH', body: { status } }),
    setWorkerStatus: (id, worker_status) =>
      request(`/api/listings/${id}/worker-status`, { method: 'PATCH', body: { worker_status } }),
    updatePeopleRequired: (id, people_required) =>
      request(`/api/listings/${id}/people`, { method: 'PATCH', body: { people_required } }),
    getSettlement: (id) => request(`/api/listings/${id}/settlement`),
    updateSettlement: (id, settlement) =>
      request(`/api/listings/${id}/settlement`, { method: 'PATCH', body: settlement }),
    delete: (id) => request(`/api/listings/${id}`, { method: 'DELETE' }),
  },

  messages: {
    get: (listingId) => request(`/api/messages/${listingId}`),
    send: (listingId, content) => request(`/api/messages/${listingId}`, { method: 'POST', body: { content } }),
  },

  bids: {
    forListing: (listingId) => request(`/api/bids?listing_id=${listingId}`),
    create: (bid) => request('/api/bids', { method: 'POST', body: bid }),
    edit: (id, data) => request(`/api/bids/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/api/bids/${id}`, { method: 'DELETE' }),
    accept: (id) => request(`/api/bids/${id}/accept`, { method: 'POST' }),
  },

  exchanges: {
    matches: () => request('/api/exchanges/matches'),
    mine: () => request('/api/exchanges'),
    propose: (proposal) => request('/api/exchanges', { method: 'POST', body: proposal }),
    accept: (id) => request(`/api/exchanges/${id}/accept`, { method: 'POST' }),
  },

  teams: {
    list: (listingId) => request(`/api/teams?listing_id=${listingId}`),
    apply: (payload) => request('/api/teams', { method: 'POST', body: payload }),
    accept: (id) => request(`/api/teams/${id}/accept`, { method: 'POST' }),
    remove: (id) => request(`/api/teams/${id}/remove`, { method: 'POST' }),
  },

  reviews: {
    forUser: (userId) => request(`/api/reviews?user_id=${userId}`, { auth: false }),
    create: (review) => request('/api/reviews', { method: 'POST', body: review }),
  },

  dashboard: {
    get: () => request('/api/dashboard'),
  },

  reports: {
    create: (report) => request('/api/reports', { method: 'POST', body: report }),
  },

  notifications: {
    list: () => request('/api/notifications'),
    markRead: () => request('/api/notifications/read', { method: 'PATCH' }),
  },

  admin: {
    getUsers: () => request('/api/admin/users'),
    getReports: () => request('/api/admin/reports'),
    warnUser: (id, payload) => request(`/api/admin/users/${id}/warn`, { method: 'POST', body: payload }),
    blockUser: (id, payload) => request(`/api/admin/users/${id}/block`, { method: 'POST', body: payload }),
    unblockUser: (id, payload) => request(`/api/admin/users/${id}/unblock`, { method: 'POST', body: payload }),
    deleteReport: (id) => request(`/api/admin/reports/${id}`, { method: 'DELETE' }),
    deleteListing: (id) => request(`/api/admin/listings/${id}`, { method: 'DELETE' }),
    getColleges: () => request('/api/admin/colleges'),
    createCollege: (college) => request('/api/admin/colleges', { method: 'POST', body: college }),
    deleteCollege: (domain) => request(`/api/admin/colleges/${encodeURIComponent(domain)}`, { method: 'DELETE' }),
    getCollegeRequests: () => request('/api/admin/college-requests'),
    approveCollegeRequest: (id) => request(`/api/admin/college-requests/${id}/approve`, { method: 'POST' }),
    rejectCollegeRequest: (id, reason) => request(`/api/admin/college-requests/${id}/reject`, { method: 'POST', body: { reason } }),
    deleteCollegeRequest: (id) => request(`/api/admin/college-requests/${id}`, { method: 'DELETE' }),
    getSupportTickets: () => request('/api/support/admin/tickets'),
    deleteSupportTicket: (id) => request(`/api/support/admin/tickets/${id}`, { method: 'DELETE' }),
  },

  colleges: {
    getAll: () => request('/api/colleges', { auth: false }),
    requestAccess: (data) => request('/api/colleges/request', { method: 'POST', body: data, auth: false }),
  },

  support: {
    createTicket: (payload) => request('/api/support/tickets', { method: 'POST', body: payload }),
    myTickets: () => request('/api/support/tickets/mine'),
    getMessages: (ticketId) => request(`/api/support/tickets/${ticketId}/messages`),
    sendMessage: (ticketId, content, attachment_url) =>
      request(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: { content, attachment_url },
      }),
    updateStatus: (ticketId, status) =>
      request(`/api/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    getAllTickets: () => request('/api/support/admin/tickets'),
    deleteTicket: (ticketId) =>
      request(`/api/support/admin/tickets/${ticketId}`, { method: 'DELETE' }),
  },
};
