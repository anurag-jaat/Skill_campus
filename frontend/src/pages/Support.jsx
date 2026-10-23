import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';
import ImageModal from '../components/ImageModal';

/**
 * React page component for Support view.
 * @author = kruthinraj
 * @date = 2026-10-15
 */

const CATEGORIES = [
  { value: 'account', label: 'Account & Verification (.edu domain issues, login, profile)' },
  { value: 'payment_dispute', label: 'Payment / Task Dispute (Freelance deliverables, bids)' },
  { value: 'listing_help', label: 'Listing & Team Finder (Tasks, applications, swaps)' },
  { value: 'bug_report', label: 'Bug Report / Technical Issue' },
  { value: 'feature_request', label: 'Feature Suggestion / Ideas' },
  { value: 'general', label: 'General Inquiry / Guidance' },
  { value: 'other', label: 'Other Issue' },
];

const FAQS = [
  {
    q: 'Why do I need a verified college email address to use SkillBridge?',
    a: 'SkillBridge is an exclusive student community. Requiring verified institutional domains (@college.edu, @university.ac.in, etc.) keeps spammers, bots, and external agencies out, creating a secure environment where students can collaborate and trade safely.',
  },
  {
    q: 'How does skill swapping work without money?',
    a: 'When you create an Exchange listing, you define a skill you can teach (e.g. React.js) and a skill you want to learn (e.g. Figma UI/UX). When a peer accepts your exchange proposal, both of you gain access to a collaborative workspace and private chat to conduct your lessons.',
  },
  {
    q: 'Are there any platform commissions or hidden fees on freelance tasks?',
    a: 'None! SkillBridge charges a 0% platform fee. Traditional freelance sites deduct 15% to 20% of your earnings. On SkillBridge, students keep 100% of the agreed amount.',
  },
  {
    q: 'What should I do if a student does not deliver agreed work or commits a scam?',
    a: 'You can immediately file a Report using the report button on the user profile or task workspace, or submit a support ticket right here. Our moderation team reviews screenshots and chat history to issue warnings, penalize trust scores, or block fraudulent accounts.',
  },
  {
    q: 'How does the Trust Score system work?',
    a: 'Every completed freelance task or skill swap allows both parties to leave a verified rating and review. The Trust Score prominently showcases your reliability and quality to peers across all campus listings.',
  },
  {
    q: 'Can I apply for Team Finder listings from other colleges?',
    a: 'Yes! Team Finder listings for hackathons, research papers, and startups can be open across institutions so you can connect with talented peers beyond your own campus borders.',
  },
];

export default function Support() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user ? 'create' : 'faq'); // 'create' | 'chats' | 'faq'
  
  // Ticket form state
  const [category, setCategory] = useState('account');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [proofUrl, setProofUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [createdTicketId, setCreatedTicketId] = useState(null);

  // My Tickets & Chat state
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [activeChatTicket, setActiveChatTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReply, setChatReply] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Modal / visual
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Fetch user tickets
  const fetchMyTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const data = await api.support.myTickets();
      setMyTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyTickets();
    }
  }, [user]);

  // Load active ticket chat
  const loadTicketChat = async (ticketId, isSilent = false) => {
    if (!isSilent) setChatLoading(true);
    try {
      const data = await api.support.getMessages(ticketId);
      setActiveChatTicket(data.ticket);
      setChatMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setChatLoading(false);
    }
  };

  // Poll chat when a ticket is opened
  useEffect(() => {
    if (activeTab !== 'chats' || !selectedTicketId) return;
    loadTicketChat(selectedTicketId);
    const interval = setInterval(() => {
      loadTicketChat(selectedTicketId, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, selectedTicketId]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollTop = chatBottomRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setTicketError('');
    try {
      const compressedDataUrl = await compressImage(file, 250);
      setProofUrl(compressedDataUrl);
    } catch (err) {
      setTicketError(err.message || 'Failed to process screenshot');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingTicket(true);
    setTicketError('');

    try {
      const data = await api.support.createTicket({
        category,
        subject,
        description,
        priority,
        proof_url: proofUrl,
      });

      setCreatedTicketId(data.ticket.id);
      setSubject('');
      setDescription('');
      setProofUrl(null);
      fetchMyTickets();
    } catch (err) {
      setTicketError(err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatReply.trim() || !selectedTicketId || sendingChat) return;

    setSendingChat(true);
    try {
      const data = await api.support.sendMessage(selectedTicketId, chatReply);
      setChatMessages((prev) => [...prev, data.message]);
      setChatReply('');
      // update ticket status locally if needed
      setMyTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicketId
            ? { ...t, last_message: chatReply, last_message_at: new Date().toISOString() }
            : t
        )
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingChat(false);
    }
  };

  const handleResolveTicket = async (ticketId, newStatus) => {
    try {
      await api.support.updateStatus(ticketId, newStatus);
      setActiveChatTicket((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setMyTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert(err.message);
    }
  };

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

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in py-6">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cw-accent/10 text-cw-accent border border-cw-accent/20">
          <span className="w-1.5 h-1.5 rounded-full bg-cw-accent animate-ping" />
          SkillBridge Help & Support Desk
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-cw-text-1 tracking-tight">
          How Can We Help You Today?
        </h1>
        <p className="text-base text-cw-text-2 max-w-xl mx-auto">
          Get direct assistance with account verification, task disputes, platform questions, or talk live with the support team.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-cw-border justify-center gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('create'); setCreatedTicketId(null); }}
          className={`pb-3 px-3 sm:px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'create'
              ? 'border-cw-accent text-cw-accent'
              : 'border-transparent text-cw-text-2 hover:text-cw-text-1'
          }`}
        >
          <span>✍️</span> Submit a Ticket
        </button>

        <button
          onClick={() => {
            setActiveTab('chats');
            if (myTickets.length > 0 && !selectedTicketId) {
              setSelectedTicketId(myTickets[0].id);
            }
          }}
          className={`pb-3 px-3 sm:px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'chats'
              ? 'border-cw-accent text-cw-accent'
              : 'border-transparent text-cw-text-2 hover:text-cw-text-1'
          }`}
        >
          <span>💬</span> My Support Chats
          {myTickets.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-cw-bg-alt text-cw-text-2 font-mono">
              {myTickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`pb-3 px-3 sm:px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'faq'
              ? 'border-cw-accent text-cw-accent'
              : 'border-transparent text-cw-text-2 hover:text-cw-text-1'
          }`}
        >
          <span>📚</span> Knowledge Base & FAQs
        </button>
      </div>

      {/* TAB 1: Submit Ticket */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {!user ? (
            <div className="card text-center p-8 border-cw-border space-y-4">
              <div className="w-12 h-12 bg-cw-accent/10 text-cw-accent rounded-full flex items-center justify-center text-xl mx-auto">
                🔒
              </div>
              <h3 className="text-lg font-bold text-cw-text-1">Sign In to Open a Support Ticket</h3>
              <p className="text-sm text-cw-text-2 max-w-md mx-auto">
                To submit a support ticket and chat with our team, please sign in with your verified college account.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link to="/login" className="btn-primary py-2 px-6 text-sm">
                  Sign in
                </Link>
                <button onClick={() => setActiveTab('faq')} className="btn-ghost py-2 px-6 text-sm">
                  View FAQs
                </button>
              </div>
            </div>
          ) : createdTicketId ? (
            <div className="card text-center p-8 border-cw-border space-y-4 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto">
                ✓
              </div>
              <h3 className="text-xl font-bold text-cw-text-1">Support Ticket Created!</h3>
              <p className="text-sm text-cw-text-2 max-w-md mx-auto">
                Your ticket has been logged into our support queue. You can now chat directly with our team in your ticket dashboard.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedTicketId(createdTicketId);
                    setActiveTab('chats');
                    setCreatedTicketId(null);
                  }}
                  className="btn-primary py-2 px-6 text-sm"
                >
                  Open Live Chat
                </button>
                <button
                  onClick={() => setCreatedTicketId(null)}
                  className="btn-ghost py-2 px-6 text-sm"
                >
                  Submit Another Ticket
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateTicket} className="card p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-cw-text-1">Submit an Inquiry or Report</h2>
                <p className="text-xs text-cw-text-2 mt-1">
                  Our campus support team investigates issues and responds directly to your ticket chat.
                </p>
              </div>

              {ticketError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-sm text-red-600 dark:text-red-400">
                  {ticketError}
                </div>
              )}

              <div>
                <label className="label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="field bg-cw-bg"
                  required
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Issue completing freelance milestone or domain verification"
                  className="field"
                  minLength={3}
                  maxLength={150}
                />
              </div>

              <div>
                <label className="label">Detailed Explanation</label>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide all relevant details, task links, or context so our support desk can resolve this quickly."
                  className="field leading-relaxed"
                  minLength={10}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="field bg-cw-bg"
                  >
                    <option value="low">Low (General guidance)</option>
                    <option value="medium">Medium (Standard request)</option>
                    <option value="high">High (Active task blockage)</option>
                    <option value="urgent">Urgent (Scam or security issue)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Screenshot / Proof (Optional)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="btn-ghost text-xs py-2 px-3 border border-cw-border"
                    >
                      {uploadingImage ? 'Compressing...' : '📎 Attach Image'}
                    </button>
                    {proofUrl && (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        Attached ✓
                        <button
                          type="button"
                          onClick={() => setProofUrl(null)}
                          className="text-cw-text-3 hover:text-red-500 ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {proofUrl && (
                <div className="mt-2">
                  <p className="text-xs text-cw-text-3 mb-1">Attached Preview:</p>
                  <img
                    src={proofUrl}
                    alt="Proof"
                    onClick={() => setFullscreenImage(proofUrl)}
                    className="max-h-32 rounded-lg border border-cw-border object-cover cursor-zoom-in"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submittingTicket || uploadingImage}
                className="btn-primary w-full py-2.5 font-semibold text-sm"
              >
                {submittingTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: My Support Chats */}
      {activeTab === 'chats' && (
        <div>
          {!user ? (
            <div className="card text-center p-8 max-w-md mx-auto space-y-4">
              <h3 className="text-lg font-bold text-cw-text-1">Sign in to view your chats</h3>
              <p className="text-sm text-cw-text-2">
                Sign in with your verified college email to view your tickets and active chats.
              </p>
              <Link to="/login" className="btn-primary py-2 px-6 text-sm inline-block">
                Sign in
              </Link>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="card text-center py-12 max-w-md mx-auto space-y-4 border-dashed border-2 border-cw-border">
              <div className="w-12 h-12 bg-cw-bg-alt rounded-full flex items-center justify-center text-2xl mx-auto">
                📭
              </div>
              <h3 className="text-lg font-bold text-cw-text-1">No Support Tickets Yet</h3>
              <p className="text-sm text-cw-text-2">
                You have not opened any support requests. If you ever need help or run into issues, submit a ticket anytime.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="btn-primary py-2 px-6 text-sm"
              >
                Submit a Ticket
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: List of tickets */}
              <div className="lg:col-span-5 space-y-2.5 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-sm font-bold text-cw-text-1">Your Tickets ({myTickets.length})</h3>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-xs font-semibold text-cw-accent hover:underline"
                  >
                    + New Ticket
                  </button>
                </div>

                {myTickets.map((ticket) => {
                  const isSelected = selectedTicketId === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        loadTicketChat(ticket.id);
                      }}
                      className={`card p-4 cursor-pointer transition-all border text-left ${
                        isSelected
                          ? 'border-cw-accent bg-cw-accent/5 shadow-md'
                          : 'border-cw-border hover:border-cw-accent/40 hover:bg-cw-bg-alt/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(
                            ticket.status
                          )}`}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-cw-text-3">
                          {new Date(ticket.updated_at || ticket.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-cw-text-1 line-clamp-1 mb-1">
                        {ticket.subject}
                      </h4>

                      <p className="text-xs text-cw-text-2 line-clamp-2 mb-2">
                        {ticket.last_message || ticket.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-cw-text-3 pt-2 border-t border-cw-border/60">
                        <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                        {ticket.has_admin_reply && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span>🛡️</span> Team replied
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Chat Box */}
              <div className="lg:col-span-7">
                {!selectedTicketId ? (
                  <div className="card h-[620px] flex items-center justify-center text-center p-8 border-dashed border-2 border-cw-border">
                    <p className="text-sm text-cw-text-3">
                      Select a support ticket from the list to view your chat with our team.
                    </p>
                  </div>
                ) : (
                  <div className="card h-[620px] flex flex-col p-0 overflow-hidden border border-cw-border shadow-sm">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-cw-border bg-cw-bg-alt/70 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-cw-text-1 truncate max-w-sm">
                            {activeChatTicket?.subject || 'Support Chat'}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(
                              activeChatTicket?.status || 'open'
                            )}`}
                          >
                            {(activeChatTicket?.status || 'open').replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-cw-text-3 mt-0.5">
                          Ticket #{selectedTicketId.slice(0, 8)} • Priority: {activeChatTicket?.priority || 'medium'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeChatTicket?.status !== 'resolved' ? (
                          <button
                            onClick={() => handleResolveTicket(selectedTicketId, 'resolved')}
                            className="btn-ghost py-1 px-3 text-xs text-emerald-600 border border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            ✓ Mark Resolved
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResolveTicket(selectedTicketId, 'open')}
                            className="btn-ghost py-1 px-3 text-xs text-amber-600 border border-amber-500/30 hover:bg-amber-50"
                          >
                            Reopen Ticket
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Initial Description Banner */}
                    <div className="px-4 py-2.5 bg-cw-bg border-b border-cw-border text-xs flex items-center justify-between gap-2">
                      <p className="text-cw-text-2 truncate">
                        <span className="font-semibold text-cw-text-1">Issue: </span>
                        {activeChatTicket?.description}
                      </p>
                      {activeChatTicket?.proof_url && (
                        <button
                          onClick={() => setFullscreenImage(activeChatTicket.proof_url)}
                          className="text-xs font-semibold text-cw-accent hover:underline whitespace-nowrap"
                        >
                          View Attachment
                        </button>
                      )}
                    </div>

                    {/* Messages Area */}
                    <div
                      ref={chatBottomRef}
                      className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-cw-surface"
                    >
                      {chatLoading && chatMessages.length === 0 ? (
                        <div className="text-center py-10 text-xs text-cw-text-3">
                          Loading messages...
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center py-10 text-xs text-cw-text-3">
                          Ticket opened. Our team will review your request and reply shortly!
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isSupport = msg.is_admin;
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isSupport ? 'items-start' : 'items-end'}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-semibold text-cw-text-2">
                                  {isSupport ? '🛡️ SkillBridge Support Team' : 'You'}
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
                                  isSupport
                                    ? 'bg-cw-bg-alt border border-cw-border text-cw-text-1 rounded-tl-sm'
                                    : 'bg-freelance text-white rounded-tr-sm shadow-sm'
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

                    {/* Reply Input */}
                    <form
                      onSubmit={handleSendChatMessage}
                      className="p-3 border-t border-cw-border bg-cw-bg-alt/50 flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Reply to support team..."
                        value={chatReply}
                        onChange={(e) => setChatReply(e.target.value)}
                        disabled={sendingChat}
                        className="flex-1 field py-2 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={!chatReply.trim() || sendingChat}
                        className="btn-primary py-2 px-5 whitespace-nowrap text-sm"
                      >
                        {sendingChat ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FAQ */}
      {activeTab === 'faq' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-cw-text-1">Frequently Asked Questions</h2>
            <p className="text-sm text-cw-text-2 mt-1">
              Quick answers about campus verification, task deliverables, zero-fee policy, and community safety.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="card border border-cw-border p-4 transition-all cursor-pointer hover:border-cw-accent/40"
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-base font-semibold text-cw-text-1">{faq.q}</h3>
                    <span className="text-cw-accent text-lg font-bold">
                      {isOpen ? '−' : '+'}
                    </span>
                  </div>
                  {isOpen && (
                    <p className="mt-3 text-sm text-cw-text-2 leading-relaxed border-t border-cw-border/60 pt-3">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card text-center p-6 mt-8 bg-cw-bg-alt/40 border-cw-border space-y-2">
            <h4 className="font-semibold text-cw-text-1">Still need personalized help?</h4>
            <p className="text-xs text-cw-text-2">
              Our support desk is always active for verified students.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('create')}
                className="btn-primary py-2 px-6 text-xs"
              >
                Open a Support Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
        <ImageModal src={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}
    </div>
  );
}
