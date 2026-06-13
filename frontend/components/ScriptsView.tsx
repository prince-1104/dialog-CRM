"use client";
import React, { useEffect, useState } from 'react';
import { listScripts, createScript, deleteScript } from '../lib/api';
import { Plus, X, FileText, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export const ScriptsView: React.FC = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'sales', language: 'english', steps: [{ step_number: 1, title: '', question: '', content: '' }] });

  useEffect(() => { load(); }, []);
  const load = async () => { try { setScripts(await listScripts()); } catch (e) { console.error(e); } };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { step_number: form.steps.length + 1, title: '', question: '', content: '' }] });
  };

  const updateStep = (index: number, field: string, value: string) => {
    const steps = [...form.steps];
    (steps[index] as any)[field] = value;
    setForm({ ...form, steps });
  };

  const handleCreate = async () => {
    try {
      await createScript(form);
      setShowCreate(false);
      setForm({ name: '', type: 'sales', language: 'english', steps: [{ step_number: 1, title: '', question: '', content: '' }] });
      load();
    } catch (e: any) { alert(e?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Call Scripts</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium"><Plus className="h-4 w-4" /> New Script</button>
      </div>

      <div className="space-y-3">
        {scripts.map((s) => (
          <div key={s.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="w-full flex items-center justify-between p-5 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">{s.name}</h3>
                  <p className="text-xs text-zinc-500 capitalize">{s.type} - {s.language} - {s.steps?.length || 0} steps</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={async (e) => { e.stopPropagation(); if (confirm('Delete?')) { await deleteScript(s.id); load(); }}} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                {expanded === s.id ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
              </div>
            </button>
            {expanded === s.id && s.steps?.length > 0 && (
              <div className="border-t border-zinc-800 p-5 space-y-3">
                {s.steps.map((step: any, i: number) => (
                  <div key={step.id} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] bg-purple-500/10 text-purple-300 rounded border border-purple-500/20">Step {step.step_number}</span>
                      <span className="text-sm font-medium text-zinc-200">{step.title}</span>
                    </div>
                    {step.question && <p className="text-sm text-zinc-400 italic">"{step.question}"</p>}
                    {step.content && <p className="text-xs text-zinc-500 mt-1">{step.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {scripts.length === 0 && <div className="text-center text-zinc-500 py-12">No scripts created yet.</div>}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg space-y-4 my-auto">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-zinc-100">Create Script</h2><button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-zinc-400" /></button></div>
            <div><label className="block text-xs text-zinc-400 mb-1">Script Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-zinc-400 mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200"><option value="sales">Sales</option><option value="support">Support</option><option value="ai">AI</option></select></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Language</label><input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none" /></div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-zinc-400">Steps</label>
              {form.steps.map((step, i) => (
                <div key={i} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] text-purple-400 font-mono">Step {step.step_number}</p>
                  <input value={step.title} onChange={(e) => updateStep(i, 'title', e.target.value)} placeholder="Step title" className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none" />
                  <input value={step.question} onChange={(e) => updateStep(i, 'question', e.target.value)} placeholder="Question to ask" className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none" />
                </div>
              ))}
              <button onClick={addStep} className="text-xs text-purple-400 hover:text-purple-300">+ Add Step</button>
            </div>
            <button onClick={handleCreate} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold">Create Script</button>
          </div>
        </div>
      )}
    </div>
  );
};
