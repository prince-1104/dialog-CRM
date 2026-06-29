"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  expectedValue: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  expectedValue,
  placeholder = "Type here...",
  confirmText = "Confirm Action",
  cancelText = "Cancel",
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [mounted, setMounted] = useState(false);

  // Reset input value when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isValid = inputValue.trim() === expectedValue.trim();

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="card glass-lg rounded-2xl p-6 w-full max-w-md space-y-5 fade-in-up"
        style={{
          border: `1px solid ${isDestructive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${isDestructive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
            }}
          >
            <AlertTriangle size={20} style={{ color: isDestructive ? '#ef4444' : '#f59e0b' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="divider" style={{ background: 'rgba(255,255,255,0.06)', height: 1 }} />

        {/* Form Input Area */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400">
            To confirm this action, please type <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded text-[11px] border border-white/10 select-all">{expectedValue}</span> in the box below:
          </label>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="input-field w-full text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all"
            style={{
              background: 'rgba(5, 8, 16, 0.4)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              fontSize: '0.85rem',
              resize: 'none',
              padding: '10px 12px',
              fontFamily: 'inherit',
              borderRadius: '10px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && isValid) {
                e.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 justify-center"
            style={{ borderRadius: 10 }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={!isValid}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              borderRadius: 10,
              background: isValid
                ? isDestructive
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(255, 255, 255, 0.05)',
              color: isValid ? 'white' : 'rgba(255, 255, 255, 0.25)',
              cursor: isValid ? 'pointer' : 'not-allowed',
              border: isValid ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: isValid
                ? isDestructive
                  ? '0 4px 12px rgba(239,68,68,0.2)'
                  : '0 4px 12px rgba(245,158,11,0.2)'
                : 'none',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
