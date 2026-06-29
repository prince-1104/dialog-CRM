"use client";
import React, { useEffect, useState } from 'react';
import { listScripts, createScript, deleteScript, formatError } from '../lib/api';
import { Plus, X, FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

const TYPE_BADGE: Record<string, string> = {
  sales: 'badge-emerald',
  support: 'badge-sky',
  ai: 'badge-violet',
};

export const ScriptsView: React.FC = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'sales', language: 'english',
    steps: [{ step_number: 1, title: '', question: '', content: '' }]
  });

  const load = async () => {
    try { setLoading(true); setScripts(await listScripts()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addStep = () => setForm({ ...form, steps: [...form.steps, { step_number: form.steps.length + 1, title: '', question: '', content: '' }] });
  const updateStep = (i: number, field: string, value: string) => {
    const steps = [...form.steps]; (steps[i] as any)[field] = value; setForm({ ...form, steps });
  };
  const handleCreate = async () => {
    try {
      // Optimistic add
      const tempId = `temp-${Date.now()}`;
      const tempScript = { ...form, id: tempId, steps: form.steps.map((s,i) => ({ ...s, id: `ts-${i}` })) };
      setScripts(prev => [tempScript, ...prev]);
      setShowCreate(false);
      setForm({ name: '', type: 'sales', language: 'english', steps: [{ step_number: 1, title: '', question: '', content: '' }] });
      const real = await createScript(form);
      setScripts(prev => prev.map(s => s.id === tempId ? real : s));
    } catch (e: any) { alert(formatError(e)); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Call Scripts</h1>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{scripts.length} scripts configured</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Script</button>
      </div>

      <div className="space-y-3">
          {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 flex items-center gap-4">
              <div className="shimmer rounded-xl h-10 w-10" />
              <div className="flex-1 space-y-2">
                <div className="shimmer rounded h-4 w-40" />
                <div className="shimmer rounded h-3 w-24" />
              </div>
            </div>
          ))
        ) : scripts.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16" style={{ color: '#334155' }}>
            <FileText size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p className="text-sm font-medium">No scripts yet</p>
            <p className="text-xs mt-1">Create your first call script to get started</p>
          </div>
        ) : scripts.map(s => (
          <div key={s.id} className="card overflow-hidden" style={{ transition: 'border-color 0.2s' }}>
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="w-full flex items-center justify-between p-5 text-left"
              style={{ background: expanded === s.id ? 'rgba(139,92,246,0.05)' : 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className="stat-icon stat-violet" style={{ width: 42, height: 42 }}><FileText size={17} /></div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{s.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${TYPE_BADGE[s.type] || 'badge-zinc'}`} style={{ fontSize: '0.6rem' }}>{s.type}</span>
                    <span className="badge badge-zinc" style={{ fontSize: '0.6rem' }}>{s.language}</span>
                    <span className="text-[10px]" style={{ color: '#475569' }}>{s.steps?.length || 0} steps</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-danger" style={{ padding: '5px 8px' }}
                  onClick={e => {
                    e.stopPropagation();
                    setConfirmCfg({
                      isOpen: true,
                      title: 'Delete Script',
                      message: `Are you sure you want to permanently delete the call script "${s.name}"? This action cannot be undone.`,
                      expectedValue: s.name,
                      onConfirm: async () => {
                        setConfirmCfg(prev => ({ ...prev, isOpen: false }));
                        setScripts(prev => prev.filter(x => x.id !== s.id));
                        try { await deleteScript(s.id); }
                        catch { load(); }
                      }
                    });
                  }}
                >
                  <Trash2 size={12} />
                </button>
                {expanded === s.id
                  ? <ChevronDown size={16} style={{ color: '#475569' }} />
                  : <ChevronRight size={16} style={{ color: '#475569' }} />}
              </div>
            </button>

            {expanded === s.id && (s.steps?.length > 0) && (
              <div className="border-t p-5 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {s.steps.map((step: any) => (
                  <div key={step.id} className="card p-4" style={{ background: 'rgba(139,92,246,0.04)', borderColor: 'rgba(139,92,246,0.12)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-violet" style={{ fontSize: '0.6rem' }}>Step {step.step_number}</span>
                      {step.title && <span className="text-sm font-semibold text-slate-200">{step.title}</span>}
                    </div>
                    {step.question && <p className="text-sm text-slate-400 italic mb-1">"{step.question}"</p>}
                    {step.content && <p className="text-xs" style={{ color: '#475569' }}>{step.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center py-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="card glass-lg rounded-2xl p-6 w-full max-w-lg space-y-4 my-auto fade-in-up" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Create Call Script</h2>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Define steps for your agents to follow</p>
              </div>
              <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => setShowCreate(false)}><X size={15} /></button>
            </div>
            <div className="divider" />
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Script Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Pitch v2" className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field" style={{ cursor: 'pointer' }}>
                  {['sales', 'support', 'ai'].map(t => <option key={t} value={t} style={{ background: '#0d1120' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Language</label>
                <input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} placeholder="english" className="input-field" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: '#64748b' }}>Script Steps</label>
                <button className="text-xs font-semibold" style={{ color: '#8b5cf6' }} onClick={addStep}>+ Add Step</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {form.steps.map((step, i) => (
                  <div key={i} className="card p-3 space-y-2" style={{ background: 'rgba(139,92,246,0.04)', borderColor: 'rgba(139,92,246,0.12)' }}>
                    <p className="text-[10px] font-mono font-bold" style={{ color: '#8b5cf6' }}>STEP {step.step_number}</p>
                    <input value={step.title} onChange={e => updateStep(i, 'title', e.target.value)} placeholder="Step title" className="input-field" style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
                    <input value={step.question} onChange={e => updateStep(i, 'question', e.target.value)} placeholder="Question to ask (optional)" className="input-field" style={{ padding: '6px 10px', fontSize: '0.8rem' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleCreate}><Plus size={14} /> Create Script</button>
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
