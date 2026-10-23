import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { triggerAppRefresh } from '../hooks/useLiveRefresh';
import ImageModal from './ImageModal';

/**
 * React component for CampusSettlementCard (Direct UPI & Cash Settlement).
 * Handles PhonePe security guidelines, instant real-time sync, and completed task states.
 * 
 * @author = kruthinraj
 * @date = 2026-10-16
 */

export default function CampusSettlementCard({
  listing,
  acceptedBid,
  currentUser,
  isOwner,
  freelancer,
  onNotifyChat,
}) {
  const amount = acceptedBid?.amount || listing.budget || 0;
  const isFreelancer = currentUser && freelancer && currentUser.id === freelancer.id;
  const isTaskCompleted = listing.status === 'completed';

  // Local settlement state key per listing
  const storageKey = `skillbridge_settlement_${listing.id}`;

  const [settlement, setSettlement] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      status: 'pending', // 'pending' | 'sent' | 'confirmed'
      method: 'upi',     // 'upi' | 'cash'
      upiId: freelancer?.upi_id || '',
      qrUrl: freelancer?.upi_qr_url || '',
    };
  });

  // Track user-selected method tab ('upi' | 'cash')
  const [selectedMethod, setSelectedMethod] = useState(() => settlement.method || 'upi');

  // Track receiving UPI ID
  const [activeUpi, setActiveUpi] = useState(() => {
    return (
      settlement.upiId ||
      freelancer?.upi_id ||
      (freelancer?.id ? localStorage.getItem(`skillbridge_upi_${freelancer.id}`) : '') ||
      ''
    );
  });

  const [customUpi, setCustomUpi] = useState(activeUpi);
  const [editingUpi, setEditingUpi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [upiNotice, setUpiNotice] = useState('');
  const [completingTask, setCompletingTask] = useState(false);

  // If the listing itself is completed, treat settlement as confirmed
  const isSettled = isTaskCompleted || settlement.status === 'confirmed';

  // Persist settlement changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settlement));
    } catch (_) {}
  }, [settlement, storageKey]);

  // Keep selectedMethod aligned with settlement method if updated
  useEffect(() => {
    if (settlement.method) {
      setSelectedMethod(settlement.method);
    }
  }, [settlement.method]);

  // Real-time backend settlement polling (every 3s just like WorkspaceChat)
  useEffect(() => {
    let isMounted = true;
    const fetchSettlement = async () => {
      try {
        const res = await api.listings.getSettlement(listing.id);
        if (!isMounted) return;
        if (res?.settlement) {
          const s = res.settlement;
          setSettlement((prev) => {
            if (prev.status !== s.status || prev.method !== s.method) {
              return { ...prev, status: s.status, method: s.method || prev.method };
            }
            return prev;
          });
          if (s.method) setSelectedMethod(s.method);
          if (s.upi_id && !activeUpi) {
            setActiveUpi(s.upi_id);
            setCustomUpi(s.upi_id);
          }
        }
      } catch (_) {}
    };

    fetchSettlement();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        fetchSettlement();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [listing.id]);

  // Sync if freelancer prop changes
  useEffect(() => {
    if (freelancer?.upi_id) {
      setActiveUpi(freelancer.upi_id);
      setCustomUpi(freelancer.upi_id);
      setSettlement((prev) => ({ ...prev, upiId: freelancer.upi_id }));
    }
    if (freelancer?.upi_qr_url) {
      setSettlement((prev) => ({ ...prev, qrUrl: freelancer.upi_qr_url }));
    }
  }, [freelancer?.upi_id, freelancer?.upi_qr_url]);

  // Freshly fetch freelancer's profile from backend to ensure UPI ID is populated
  useEffect(() => {
    let isMounted = true;
    const targetId = freelancer?.id;
    if (!targetId) return;

    // Check local fallback first
    const cachedUpi = localStorage.getItem(`skillbridge_upi_${targetId}`);
    if (cachedUpi && !activeUpi) {
      setActiveUpi(cachedUpi);
      setCustomUpi(cachedUpi);
      setSettlement((prev) => ({ ...prev, upiId: cachedUpi }));
    }

    // Query public user profile
    api.users
      .get(targetId)
      .then((res) => {
        if (!isMounted) return;
        const profile = res?.user || res;
        if (profile?.upi_id) {
          setActiveUpi(profile.upi_id);
          setCustomUpi(profile.upi_id);
          setSettlement((prev) => ({ ...prev, upiId: profile.upi_id }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [freelancer?.id]);

  const handleCopyUpi = () => {
    const upiToCopy = (customUpi || activeUpi || settlement.upiId || '').trim();
    if (!upiToCopy) return;
    navigator.clipboard.writeText(upiToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUpi = (e) => {
    e.preventDefault();
    const clean = customUpi.trim();
    setActiveUpi(clean);
    setSettlement((prev) => ({ ...prev, upiId: clean }));
    setEditingUpi(false);
    if (freelancer?.id) {
      localStorage.setItem(`skillbridge_upi_${freelancer.id}`, clean);
    }
    api.listings.updateSettlement(listing.id, { upi_id: clean }).catch(() => {});
    triggerAppRefresh();
    if (onNotifyChat && clean) {
      onNotifyChat(`💳 Freelancer updated receiving UPI ID to: ${clean}`);
    }
  };

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setSettlement((prev) => ({ ...prev, qrUrl: dataUrl }));
      triggerAppRefresh();
      if (onNotifyChat) {
        onNotifyChat(`📷 Freelancer uploaded a UPI QR Code for payment.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Mark payment as sent
  const handleMarkAsSent = (method) => {
    const chosenMethod = method || selectedMethod;
    const updated = { ...settlement, status: 'sent', method: chosenMethod };
    setSettlement(updated);
    setSelectedMethod(chosenMethod);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    // Save to shared backend settlement store
    api.listings.updateSettlement(listing.id, { status: 'sent', method: chosenMethod }).catch(() => {});
    triggerAppRefresh();

    if (onNotifyChat) {
      const msg =
        chosenMethod === 'cash'
          ? `💵 Payment Notice: Task owner marked ₹${amount} as paid in Cash. Please verify and confirm below!`
          : `💳 Payment Notice: Task owner marked ₹${amount} as sent via UPI. Please check your GPay/PhonePe and confirm!`;
      onNotifyChat(msg);
    }
  };

  // Switch payment method at any time
  const handleSwitchMethod = (newMethod) => {
    setSelectedMethod(newMethod);
    const updated = { ...settlement, method: newMethod };
    setSettlement(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    // Save to shared backend settlement store
    api.listings.updateSettlement(listing.id, { status: settlement.status || 'sent', method: newMethod }).catch(() => {});
    triggerAppRefresh();

    if (onNotifyChat) {
      const msg =
        newMethod === 'cash'
          ? `🔄 Payment Update: Task owner changed settlement method to 💵 Cash in Person (₹${amount}).`
          : `🔄 Payment Update: Task owner changed settlement method to 💳 UPI Transfer (₹${amount}).`;
      onNotifyChat(msg);
    }
  };

  // Reset payment status back to pending
  const handleResetToPending = () => {
    const updated = { ...settlement, status: 'pending' };
    setSettlement(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    api.listings.updateSettlement(listing.id, { status: 'pending' }).catch(() => {});
    triggerAppRefresh();
    if (onNotifyChat) {
      onNotifyChat(`ℹ️ Payment status was reset to Pending by the task owner.`);
    }
  };

  // Freelancer confirms receipt
  const handleConfirmReceived = () => {
    const updated = { ...settlement, status: 'confirmed' };
    setSettlement(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    api.listings.updateSettlement(listing.id, { status: 'confirmed' }).catch(() => {});
    triggerAppRefresh();
    if (onNotifyChat) {
      onNotifyChat(
        `✅ Payment Confirmed: Freelancer verified that ₹${amount} has been received successfully! Task is ready for completion.`
      );
    }
  };

  // Mark task completed and close
  const handleCompleteTask = async () => {
    setCompletingTask(true);
    try {
      await api.listings.setStatus(listing.id, 'completed');
      const updated = { ...settlement, status: 'confirmed' };
      setSettlement(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (_) {}
      api.listings.updateSettlement(listing.id, { status: 'confirmed' }).catch(() => {});
      triggerAppRefresh();
      if (onNotifyChat) {
        onNotifyChat(`🎉 Task Completed: Task has been marked as completed and closed by the owner.`);
      }
    } catch (err) {
      alert(err.message || 'Failed to complete task.');
    } finally {
      setCompletingTask(false);
    }
  };

  const effectiveUpi = (activeUpi || customUpi || settlement.upiId || '').trim();
  const effectiveQr = settlement.qrUrl;

  // Clean UPI link without restrictive amount/note flags (prevents PhonePe security block on personal VPAs)
  const cleanUpiLink = effectiveUpi
    ? `upi://pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(
        freelancer?.full_name || 'Freelancer'
      )}`
    : null;

  // Amount-specified deep link for Google Pay / Paytm
  const fullUpiLink = effectiveUpi
    ? `upi://pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(
        freelancer?.full_name || 'Freelancer'
      )}&am=${amount}&cu=INR`
    : null;

  // Live dynamic UPI QR code fallback (PhonePe in-app QR scanner NEVER blocks this)
  const dynamicQrUrl = fullUpiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
        fullUpiLink
      )}`
    : null;

  const displayQr = effectiveQr || dynamicQrUrl;

  // PhonePe / UPI launch with security fallback
  const handleOpenPhonePeOrUpi = () => {
    setUpiNotice('');
    if (!effectiveUpi) {
      setUpiNotice("Freelancer hasn't added a UPI ID yet. You can copy or ask in chat.");
      return;
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // Use clean intent without pre-filled amount to prevent PhonePe fraud engine block
      window.location.href = cleanUpiLink;
    } else {
      setShowQrModal(true);
    }
  };

  // Google Pay direct deep link
  const handleOpenGPay = () => {
    if (!effectiveUpi) return;
    const gpayUrl = `tez://upi/pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(
      freelancer?.full_name || 'Freelancer'
    )}&am=${amount}&cu=INR`;
    window.location.href = gpayUrl;
  };

  return (
    <div className="card border-cw-accent/30 bg-gradient-to-b from-cw-surface to-cw-bg-alt/60 p-4 space-y-4 shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 border-b border-cw-border/60 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">🤝</span>
            <h4 className="font-bold text-cw-text-1 text-sm">Direct Campus Settlement</h4>
          </div>
          <p className="text-[11px] text-cw-text-3 mt-0.5">
            Peer-to-peer settlement &bull; 0% platform fee
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            isSettled
              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
              : settlement.status === 'sent'
              ? 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
              : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
          }`}
        >
          {isSettled
            ? '✓ Settled & Closed'
            : settlement.status === 'sent'
            ? `Marked as Sent (${settlement.method === 'cash' ? 'Cash' : 'UPI'})`
            : 'Payment Pending'}
        </span>
      </div>

      {/* Agreed Settlement Amount */}
      <div className="rounded-xl bg-cw-surface p-3 border border-cw-border flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-cw-text-3 uppercase tracking-wider">
            Agreed Bid Amount
          </span>
          <div className="text-2xl font-extrabold text-cw-text-1">₹{amount}</div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-cw-text-3 block">Task Recipient</span>
          <span className="text-xs font-semibold text-cw-text-1 truncate max-w-[140px] block">
            {freelancer?.full_name || 'Freelancer'}
          </span>
        </div>
      </div>

      {/* CASE 1: TASK IS COMPLETED OR SETTLEMENT IS CONFIRMED */}
      {isSettled ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base flex-shrink-0">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-sm text-cw-text-1">
                {isTaskCompleted ? 'Task Closed & Completed' : 'Payment Verified & Settled'}
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                ₹{amount} settled via{' '}
                {settlement.method === 'cash' ? '💵 Cash in Person' : '💳 UPI Transfer'}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-cw-surface p-3 border border-cw-border/60 text-xs text-cw-text-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-cw-text-3">Final Amount:</span>
              <span className="font-extrabold text-cw-text-1">₹{amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cw-text-3">Payment Method:</span>
              <span className="font-semibold text-cw-text-1 capitalize">
                {settlement.method === 'cash' ? 'Cash in Person' : 'UPI Transfer'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cw-text-3">Settlement Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ✓ Fully Verified (0% Platform Fee)
              </span>
            </div>
          </div>

          {/* Owner completion action if listing not marked completed yet */}
          {isOwner && !isTaskCompleted && (
            <button
              type="button"
              onClick={handleCompleteTask}
              disabled={completingTask}
              className="btn-primary w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow"
            >
              <span>🎉</span>
              <span>{completingTask ? 'Closing Task…' : 'Close Task & Leave Review'}</span>
            </button>
          )}

          {isTaskCompleted && (
            <p className="text-[11px] text-cw-text-3 text-center pt-1">
              This task is officially closed. Please check the review section below to view or submit feedback.
            </p>
          )}
        </div>
      ) : (
        /* CASE 2: ACTIVE SETTLEMENT (PENDING OR SENT) */
        <div className="space-y-4">
          {/* FREELANCER VIEW: Manage receiving info & confirm payment */}
          {isFreelancer && (
            <div className="space-y-3">
              <div className="rounded-lg bg-cw-bg-alt/80 p-3 border border-cw-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cw-text-1">Your Receiving UPI</span>
                  <button
                    type="button"
                    onClick={() => setEditingUpi(!editingUpi)}
                    className="text-[11px] text-cw-accent font-medium hover:underline"
                  >
                    {editingUpi ? 'Cancel' : effectiveUpi ? 'Edit UPI' : '+ Add UPI ID'}
                  </button>
                </div>

                {editingUpi ? (
                  <form onSubmit={handleSaveUpi} className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. name@okhdfcbank"
                      value={customUpi}
                      onChange={(e) => setCustomUpi(e.target.value)}
                      className="field py-1 text-xs flex-1"
                      required
                    />
                    <button type="submit" className="btn-primary py-1 px-3 text-xs">
                      Save
                    </button>
                  </form>
                ) : effectiveUpi ? (
                  <div className="flex items-center justify-between bg-cw-surface px-2.5 py-1.5 rounded border border-cw-border">
                    <code className="text-xs font-mono font-medium text-cw-text-1">
                      {effectiveUpi}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="text-[11px] text-cw-text-3 hover:text-cw-accent"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-cw-text-3">
                    No UPI ID added yet. Add it so the task poster can pay you via GPay/PhonePe!
                  </p>
                )}

                {/* QR Code section */}
                <div className="pt-2 flex items-center justify-between border-t border-cw-border/50 text-xs">
                  <span className="text-cw-text-2">UPI QR Code:</span>
                  <div className="flex items-center gap-2">
                    {displayQr && (
                      <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="text-xs text-cw-accent font-medium hover:underline"
                      >
                        Preview QR
                      </button>
                    )}
                    <label className="text-xs text-cw-accent hover:underline cursor-pointer">
                      {effectiveQr ? 'Change Custom QR' : '+ Upload Custom QR'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Freelancer Confirmation Button */}
              <button
                type="button"
                onClick={handleConfirmReceived}
                className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow"
              >
                <span>✓</span>
                <span>Confirm Payment Received (₹{amount})</span>
              </button>
            </div>
          )}

          {/* POSTER VIEW: Choose Method & Pay */}
          {isOwner && (
            <div className="space-y-3">
              {/* Method Selection Tabs */}
              <div>
                <label className="text-xs font-semibold text-cw-text-1 block mb-1.5">
                  Choose Payment Method:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: UPI */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod('upi');
                      if (settlement.status === 'sent' && settlement.method !== 'upi') {
                        handleSwitchMethod('upi');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedMethod === 'upi'
                        ? 'border-cw-accent bg-cw-accent/10 shadow-sm ring-1 ring-cw-accent'
                        : 'border-cw-border bg-cw-surface hover:bg-cw-bg-alt/70 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base">💳</span>
                      {selectedMethod === 'upi' && (
                        <span className="text-[10px] font-bold text-cw-accent bg-cw-surface px-1.5 py-0.5 rounded-full border border-cw-accent/30">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <div className="text-xs font-bold text-cw-text-1">Pay via UPI</div>
                      <div className="text-[10px] text-cw-text-3">PhonePe / GPay / Paytm</div>
                    </div>
                  </button>

                  {/* Option 2: Cash */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod('cash');
                      if (settlement.status === 'sent' && settlement.method !== 'cash') {
                        handleSwitchMethod('cash');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500'
                        : 'border-cw-border bg-cw-surface hover:bg-cw-bg-alt/70 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base">💵</span>
                      {selectedMethod === 'cash' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-cw-surface px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <div className="text-xs font-bold text-cw-text-1">Cash in Person</div>
                      <div className="text-[10px] text-cw-text-3">Handover on Campus</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* ACTIVE METHOD DETAILS */}
              {selectedMethod === 'upi' ? (
                <div className="rounded-xl bg-cw-bg-alt/90 p-3 border border-cw-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cw-text-1 flex items-center gap-1.5">
                      <span>💳</span>
                      <span>UPI Payment Options</span>
                    </span>
                    {effectiveUpi && (
                      <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="text-xs text-cw-accent font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>📷</span>
                        <span>Show QR Code</span>
                      </button>
                    )}
                  </div>

                  {/* UPI ID Display & Copy Button */}
                  {effectiveUpi ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-cw-surface px-3 py-2 rounded-lg border border-cw-border">
                        <div>
                          <span className="text-[10px] text-cw-text-3 uppercase font-medium block">
                            Freelancer UPI ID
                          </span>
                          <code className="text-xs font-mono font-bold text-cw-text-1 select-all">
                            {effectiveUpi}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="btn-ghost py-1 px-2.5 text-xs font-bold text-cw-accent hover:bg-cw-bg-alt border border-cw-accent/30"
                        >
                          {copied ? '✓ Copied!' : '📋 Copy UPI ID'}
                        </button>
                      </div>

                      {/* PhonePe Security Bypass Tips */}
                      <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2 text-[11px] text-indigo-700 dark:text-indigo-300 space-y-1">
                        <div className="font-semibold flex items-center gap-1">
                          <span>🛡️</span>
                          <span>PhonePe Security Notice:</span>
                        </div>
                        <p>
                          If PhonePe blocks direct browser links for security reasons:
                        </p>
                        <ol className="list-decimal pl-4 space-y-0.5 text-[10.5px]">
                          <li>
                            Tap <strong>Copy UPI ID</strong> above
                          </li>
                          <li>
                            Open PhonePe ➔ tap <strong>To UPI ID</strong> ➔ paste &amp; enter <strong>₹{amount}</strong>
                          </li>
                          <li>
                            Or tap <strong>Scan QR</strong> below (PhonePe scanner always accepts QR codes)
                          </li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-400 space-y-2">
                      <p>
                        Freelancer hasn't added a UPI ID to their profile yet. You can enter it manually below:
                      </p>
                      <form onSubmit={handleSaveUpi} className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. mobile@upi or name@okhdfcbank"
                          value={customUpi}
                          onChange={(e) => setCustomUpi(e.target.value)}
                          className="field py-1 text-xs flex-1"
                        />
                        <button type="submit" className="btn-primary py-1 px-2.5 text-xs">
                          Set UPI
                        </button>
                      </form>
                    </div>
                  )}

                  {upiNotice && (
                    <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      {upiNotice}
                    </p>
                  )}

                  {/* Direct Payment Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleOpenPhonePeOrUpi}
                        className="btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        title="Opens PhonePe / Default UPI App"
                      >
                        <span>⚡</span>
                        <span>Pay with UPI App</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenGPay}
                        className="btn-ghost py-2.5 text-xs font-bold border-cw-border flex items-center justify-center gap-1.5 hover:bg-cw-surface"
                        title="Opens Google Pay"
                      >
                        <span>🟢</span>
                        <span>Google Pay</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="btn-ghost py-2 text-xs text-center border-cw-border flex items-center justify-center gap-1.5"
                      >
                        <span>📷</span>
                        <span>Scan Dynamic QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkAsSent('upi')}
                        className="btn-ghost py-2 text-xs text-center border-cw-border text-emerald-600 hover:text-emerald-700 font-semibold flex items-center justify-center gap-1"
                      >
                        <span>✓</span>
                        <span>Mark as Paid (UPI)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* CASH IN PERSON DETAILS & ACTIONS */
                <div className="rounded-xl bg-cw-bg-alt/90 p-3 border border-cw-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">💵</span>
                    <span className="text-xs font-bold text-cw-text-1">Cash in Person Handover</span>
                  </div>

                  <div className="rounded-lg bg-cw-surface p-2.5 border border-cw-border text-xs text-cw-text-2 space-y-1">
                    <p>
                      Hand over <strong>₹{amount}</strong> directly to{' '}
                      <strong className="text-cw-text-1">
                        {freelancer?.full_name || 'the freelancer'}
                      </strong>{' '}
                      on campus during work delivery.
                    </p>
                    <p className="text-[11px] text-cw-text-3">
                      Campus-isolated settlement &bull; Zero online transactions needed
                    </p>
                  </div>

                  {/* Mark as Paid via Cash Button */}
                  <button
                    type="button"
                    onClick={() => handleMarkAsSent('cash')}
                    className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <span>✓</span>
                    <span>Mark as Paid in Cash (₹{amount})</span>
                  </button>
                </div>
              )}

              {/* STATUS NOTICES & SWITCHABLE TOGGLE */}
              {settlement.status === 'sent' && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {settlement.method === 'cash'
                        ? '💵 Marked as Paid via Cash'
                        : '💳 Marked as Paid via UPI'}
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      Awaiting Confirmation
                    </span>
                  </div>

                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    You marked ₹{amount} as paid via{' '}
                    <strong className="uppercase">{settlement.method}</strong>. Waiting for the
                    freelancer to confirm receipt in their dashboard.
                  </p>

                  {/* SWITCH METHOD CONTROLS: Switchable at any time */}
                  <div className="pt-1.5 border-t border-blue-500/20 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-cw-text-3">Need to switch method?</span>
                    <div className="flex items-center gap-2">
                      {settlement.method === 'cash' ? (
                        <button
                          type="button"
                          onClick={() => handleSwitchMethod('upi')}
                          className="text-xs font-bold text-cw-accent hover:underline flex items-center gap-1 bg-cw-surface px-2.5 py-1 rounded border border-cw-accent/40 shadow-xs"
                        >
                          <span>🔄</span>
                          <span>Switch to Paid via UPI</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchMethod('cash')}
                          className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 bg-cw-surface px-2.5 py-1 rounded border border-emerald-500/40 shadow-xs"
                        >
                          <span>🔄</span>
                          <span>Switch to Paid via Cash</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleResetToPending}
                        className="text-[11px] text-cw-text-3 hover:text-cw-text-1 hover:underline"
                        title="Reset back to pending"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helpful Tip */}
      <p className="text-[10px] text-cw-text-3 text-center border-t border-cw-border/40 pt-2">
        Tip: You can also attach payment screenshots or QR images directly in the Workspace Chat below.
      </p>

      {/* Dynamic & Custom UPI QR Modal */}
      {showQrModal && displayQr && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-cw-surface border border-cw-border p-5 sm:p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 text-cw-text-3 hover:text-cw-text-1 p-1.5 rounded-lg hover:bg-cw-bg-alt transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cw-text-3">
                Scan &amp; Pay with PhonePe / GPay / Paytm
              </span>
              <h3 className="text-2xl font-black text-cw-text-1 mt-0.5">₹{amount}</h3>
              <p className="text-xs text-cw-text-2 mt-0.5">
                Payee: <strong className="text-cw-text-1">{freelancer?.full_name || 'Freelancer'}</strong>
              </p>
            </div>

            {/* QR Image in high-contrast white card */}
            <div className="mx-auto w-52 h-52 sm:w-64 sm:h-64 bg-white p-3 rounded-2xl shadow-inner border border-gray-200 flex items-center justify-center">
              <img
                src={displayQr}
                alt={`UPI QR Code for ${freelancer?.full_name || 'Freelancer'}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* UPI ID with copy */}
            {effectiveUpi && (
              <div className="flex items-center justify-between bg-cw-bg-alt px-3 py-2 rounded-lg border border-cw-border text-xs">
                <span className="text-cw-text-3 text-[11px]">UPI ID:</span>
                <code className="font-mono font-bold text-cw-text-1 select-all">{effectiveUpi}</code>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-cw-accent font-semibold text-[11px] hover:underline"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}

            {/* PhonePe scanner reminder */}
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              💡 PhonePe in-app camera scanner accepts this QR code without any security restrictions.
            </p>

            {/* Direct Pay button & Mark Paid */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleOpenPhonePeOrUpi}
                className="btn-primary w-full py-2.5 text-xs text-center block font-bold"
              >
                ⚡ Open in UPI App
              </button>

              {isOwner && !isSettled && (
                <button
                  type="button"
                  onClick={() => {
                    handleMarkAsSent('upi');
                    setShowQrModal(false);
                  }}
                  className="btn-ghost w-full py-1.5 text-xs border-cw-border"
                >
                  Mark as Paid via UPI
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
