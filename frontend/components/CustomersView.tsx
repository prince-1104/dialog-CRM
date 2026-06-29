"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { listCustomers, createCustomer, deleteCustomer, createCustomerNote, listCustomerNotes, formatError } from '../lib/api';
import { Plus, Search, X, Users, MessageSquare, Trash2, Phone, Mail, Building2, ArrowRight, ExternalLink } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

const STATUS_BADGE: Record<string, string> = {
  new: 'badge-sky',
  active: 'badge-emerald',
  inactive: 'badge-zinc',
  converted: 'badge-violet',
};

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [confirmCfg, setConfirmCfg] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    expectedValue: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    expectedValue: '',
    onConfirm: () => {},
  });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', address: '' });

  const load = useCallback(async (q = search) => {
    try {
      setLoading(true);
      setCustomers(await listCustomers({ search: q || undefined }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(''); }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const handleCreate = async () => {
    try {
      setSaving(true);
      // Optimistic: show new customer immediately
      const tempId = `temp-${Date.now()}`;
      const tempCustomer = { ...form, id: tempId, status: 'new', total_calls: 0 };
      setCustomers(prev => [tempCustomer, ...prev]);
      setShowCreate(false);
      setForm({ name: '', phone: '', email: '', company: '', address: '' });
      const real = await createCustomer(form);
      setCustomers(prev => prev.map(c => c.id === tempId ? real : c));
    }
    catch (e: any) { alert(formatError(e)); load(''); }
    finally { setSaving(false); }
  };

  const viewCustomer = async (c: any) => {
    setSelected(c);
    try { setNotes(await listCustomerNotes(c.id)); } catch { setNotes([]); }
  };

  const addNote = async () => {
    if (!selected || !noteText.trim()) return;
    await createCustomerNote(selected.id, noteText);
    setNoteText('');
    setNotes(await listCustomerNotes(selected.id));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">CRM Customers</h1>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{customers.length} contacts in database</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569', pointerEvents: 'none' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email…"
          className="input-field pl-10"
          style={{ maxWidth: 420 }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Company</th>
              <th>Status</th>
              <th>Calls</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="shimmer rounded h-4 w-full max-w-[100px]" /></td>
                  ))}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#475569' }}>
                  <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p className="text-sm font-medium">No customers found</p>
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} onClick={() => viewCustomer(c)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontSize: '0.7rem' }}>
                        {c.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="font-semibold text-slate-200">{c.name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs">{c.phone || '—'}</span></td>
                  <td style={{ color: '#64748b' }}>{c.email || '—'}</td>
                  <td style={{ color: '#64748b' }}>{c.company || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[c.status] || 'badge-zinc'}`}>{c.status || 'new'}</span></td>
                  <td style={{ fontFamily: 'monospace' }}>{c.total_calls ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={e => { e.stopPropagation(); viewCustomer(c); }}>
                        <ExternalLink size={12} /> View
                      </button>
                      <button
                        className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmCfg({
                            isOpen: true,
                            title: 'Delete Customer',
                            message: `Are you sure you want to permanently delete the CRM customer "${c.name}"? This action cannot be undone.`,
                            expectedValue: c.name,
                            onConfirm: async () => {
                              setConfirmCfg(prev => ({ ...prev, isOpen: false }));
                              setCustomers(prev => prev.filter(x => x.id !== c.id));
                              try { await deleteCustomer(c.id); }
                              catch { load(''); }
                            }
                          });
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="card glass-lg rounded-2xl p-6 w-full max-w-md space-y-4 fade-in-up" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Add Customer</h2>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Create a new CRM contact</p>
              </div>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowCreate(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="divider" />
            <div className="space-y-3">
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'John Smith' },
                { label: 'Phone', key: 'phone', placeholder: '+1 234 567 8900' },
                { label: 'Email', key: 'email', placeholder: 'john@example.com' },
                { label: 'Company', key: 'company', placeholder: 'Acme Corp' },
                { label: 'Address', key: 'address', placeholder: '123 Main St, City' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? 'Saving…' : <><Plus size={14} /> Add Customer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
          <div
            className="h-full overflow-y-auto flex flex-col"
            style={{ width: 420, background: '#0d1120', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-lg" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}>
                    {selected.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{selected.name}</h2>
                    <span className={`badge ${STATUS_BADGE[selected.status] || 'badge-zinc'} mt-1`}>{selected.status || 'new'}</span>
                  </div>
                </div>
                <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setSelected(null)}><X size={16} /></button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="p-5 space-y-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { icon: Phone, label: 'Phone', value: selected.phone },
                { icon: Mail, label: 'Email', value: selected.email },
                { icon: Building2, label: 'Company', value: selected.company },
              ].map(({ icon: Icon, label, value }) => value ? (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <Icon size={14} style={{ color: '#8b5cf6' }} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>{label}</p>
                    <p className="text-xs text-slate-300 font-mono">{value}</p>
                  </div>
                </div>
              ) : null)}
              <div className="flex gap-2 text-xs" style={{ color: '#475569' }}>
                <span>Calls: <strong className="text-slate-300">{selected.total_calls || 0}</strong></span>
                {selected.last_disposition && <><span>·</span><span>Last: <strong className="text-slate-300">{selected.last_disposition}</strong></span></>}
              </div>
            </div>

            {/* Notes */}
            <div className="flex-1 p-5 flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: '#64748b' }}>
                <MessageSquare size={12} /> Notes
              </h3>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: '#334155' }}>No notes yet</p>
                ) : notes.map((n: any) => (
                  <div key={n.id} className="card p-3">
                    <p className="text-sm text-slate-300">{n.content}</p>
                    <p className="text-[10px] mt-1.5" style={{ color: '#334155' }}>{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Write a note…"
                  className="input-field"
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                />
                <button className="btn-primary shrink-0" onClick={addNote} style={{ padding: '0 14px' }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmCfg.isOpen}
        title={confirmCfg.title}
        message={confirmCfg.message}
        expectedValue={confirmCfg.expectedValue}
        isDestructive={true}
        onConfirm={confirmCfg.onConfirm}
        onCancel={() => setConfirmCfg(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
