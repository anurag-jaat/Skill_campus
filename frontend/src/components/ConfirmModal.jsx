import React from 'react';

/**
 * React component for ConfirmModal.
 * @author = kruthinraj
 * @date = 2026-09-17
 */

export default function ConfirmModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onClose, isDestructive = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-cw-surface border border-cw-border rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-sm text-cw-text-2">{message}</p>
        </div>
        <div className="p-4 bg-cw-bg-alt border-t border-cw-border flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">
            {cancelText}
          </button>
          <button 
            type="button" 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`py-2 px-4 rounded-lg font-medium text-sm text-white transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-cw-accent hover:bg-cw-accent/90'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
