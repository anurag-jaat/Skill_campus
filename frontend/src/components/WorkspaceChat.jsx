import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ImageModal from './ImageModal';
import { compressImage } from '../utils/imageCompressor';

/**
 * React component for WorkspaceChat with image attachments and payment updates.
 * @author = kruthinraj
 * @date = 2026-08-29
 */

export default function WorkspaceChat({ listingId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadMessages = async () => {
    try {
      const data = await api.messages.get(listingId);
      setMessages(data.messages);
      setError('');
    } catch (err) {
      if (err.status !== 403) {
        setError('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [listingId]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 120);
      setAttachedImage(compressed);
    } catch (err) {
      setError('Failed to process image attachment');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const hasText = Boolean(content.trim());
    const hasImg = Boolean(attachedImage);
    if ((!hasText && !hasImg) || sending) return;

    setSending(true);
    setError('');

    let finalMessage = content.trim();
    if (attachedImage) {
      finalMessage = `[IMG]${attachedImage}[/IMG]${finalMessage ? '\n' + finalMessage : ''}`;
    }

    try {
      const data = await api.messages.send(listingId, finalMessage);
      setMessages((prev) => [...prev, data.message]);
      setContent('');
      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="card text-center text-sm text-cw-text-3">Loading chat...</div>;

  return (
    <div className="card flex flex-col h-[520px]">
      <div className="flex items-center justify-between mb-3 border-b border-cw-border pb-2">
        <h3 className="font-semibold text-cw-text-1 text-sm flex items-center gap-1.5">
          <span>💬</span>
          <span>Workspace Chat</span>
        </h3>
        <span className="text-[10px] text-cw-text-3">Auto-updates live</span>
      </div>

      {error && <p className="mb-2 text-xs text-red-600 bg-red-50 p-1.5 rounded">{error}</p>}

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-3.5 mb-3 pr-2 custom-scrollbar scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="text-center py-12 space-y-1">
            <p className="text-sm font-medium text-cw-text-2">No messages yet</p>
            <p className="text-xs text-cw-text-3">
              Coordinate task milestones, share UPI receipts, or ask questions here.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.id === user.id;
            const text = msg.content || '';

            // Check if message is a payment notification
            const isPaymentNotice =
              text.includes('Payment Notice:') || text.includes('Payment Confirmed:');

            // Extract image tag if present: [IMG]data:image...[/IMG]
            const imgMatch = text.match(/\[IMG\](data:image\/[^;]+;base64,[^\]]+)\[\/IMG\]/);
            const imageSrc = imgMatch ? imgMatch[1] : null;
            const cleanText = text.replace(/\[IMG\](data:image\/[^;]+;base64,[^\]]+)\[\/IMG\]\n?/, '').trim();

            if (isPaymentNotice) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="rounded-xl bg-cw-bg-alt/90 border border-cw-accent/30 px-3.5 py-2 text-xs text-cw-text-1 max-w-[90%] shadow-sm text-center">
                    <p className="font-medium">{cleanText || text}</p>
                    <span className="text-[10px] text-cw-text-3 mt-1 block">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!isMe && (
                    <span className="text-xs font-semibold text-cw-text-2">
                      {msg.sender.full_name || 'Classmate'}
                    </span>
                  )}
                  <span className="text-[10px] text-cw-text-3">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`rounded-2xl max-w-[85%] text-sm overflow-hidden shadow-sm ${
                    isMe
                      ? 'bg-cw-accent text-white rounded-tr-sm'
                      : 'bg-cw-bg border border-cw-border text-cw-text-1 rounded-tl-sm'
                  }`}
                >
                  {imageSrc && (
                    <div
                      className="cursor-pointer group relative overflow-hidden bg-black/10"
                      onClick={() => setSelectedImage(imageSrc)}
                    >
                      <img
                        src={imageSrc}
                        alt="Chat attachment"
                        className="max-h-48 w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                        Click to view
                      </div>
                    </div>
                  )}

                  {cleanText && (
                    <div className="px-3 py-2 whitespace-pre-wrap break-words">
                      {cleanText}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Preview before sending */}
      {attachedImage && (
        <div className="relative mb-2 inline-block bg-cw-bg-alt p-1.5 rounded-lg border border-cw-border w-fit">
          <img
            src={attachedImage}
            alt="Upload preview"
            className="h-16 w-16 object-cover rounded"
          />
          <button
            type="button"
            onClick={() => {
              setAttachedImage(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-600"
            title="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Form with Attachment Button */}
      <form onSubmit={handleSend} className="flex items-center gap-1.5 pt-2 border-t border-cw-border">
        {/* Attach Image Button */}
        <label
          className="btn-ghost p-2 text-cw-text-3 hover:text-cw-accent cursor-pointer rounded-lg border-cw-border flex items-center justify-center"
          title="Attach payment screenshot or QR code"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={sending}
          />
        </label>

        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message or paste UPI ID..."
          disabled={sending}
          className="flex-1 field py-2 text-sm"
        />

        <button
          type="submit"
          disabled={(!content.trim() && !attachedImage) || sending}
          className="btn-primary py-2 px-3.5 whitespace-nowrap text-sm"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>

      {/* Enlarged image preview modal */}
      {selectedImage && (
        <ImageModal
          src={selectedImage}
          alt="Chat Attachment"
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}
