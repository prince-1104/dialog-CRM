"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  mockAgents, CrmAgent, getAgents, createAgent, saveLocalAgentConfig,
  HumanAgent, getHumanAgents, createHumanAgent, updateHumanAgentStatus, deleteHumanAgent
} from '../lib/api';
import { 
  Bot, 
  Cpu, 
  MessageSquareCode, 
  Plus,
  Save,
  CheckCircle,
  Volume2,
  Square,
  Users,
  UserPlus,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  Shield,
  Trash2,
  X,
  Headphones,
  PhoneCall,
  CircleDot,
  Eye,
  EyeOff
} from 'lucide-react';

// ============================================================================
// VOICE PREVIEW COMPONENTS (for AI tab)
// ============================================================================

const VOICE_PREVIEW_SAMPLES: Record<string, string> = {
  'alloy-neural': "Hello! This is a preview of the Alloy voice. I'm designed to sound conversational and balanced, perfect for natural sales interactions.",
  'echo-neural': "Hey there! You're hearing the Echo voice. I bring a deep, clear tone that's ideal for confident outbound communications.",
  'shimmer-neural': "Hi! This is the Shimmer voice speaking. I offer a warm, professional tone that works beautifully for customer support.",
  'fable-neural': "Hello! This is the Fable voice. I have a friendly, approachable accent that makes every conversation feel welcoming.",
};

const AnimatedWaveform: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    let running = true;
    const animate = () => {
      if (!running) return;
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const bars = 28;
  return (
    <div className="flex items-end justify-center gap-[2px] h-10">
      {Array.from({ length: bars }).map((_, i) => {
        const h = isPlaying
          ? Math.max(3, Math.abs(Math.sin((i * 0.7) + tick * 0.08) * Math.cos(i * 0.3 + tick * 0.05)) * 32 + 4)
          : 3;
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-[height] duration-100 ${
              isPlaying
                ? 'bg-gradient-to-t from-purple-600 via-violet-500 to-fuchsia-400'
                : 'bg-zinc-800'
            }`}
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AgentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'human'>('ai');

  // AI Agent state
  const [agents, setAgents] = useState<CrmAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  // Human Agent state
  const [humanAgents, setHumanAgents] = useState<HumanAgent[]>([]);
  const [humanLoading, setHumanLoading] = useState(true);
  const [showAddHumanModal, setShowAddHumanModal] = useState(false);
  const [selectedHumanId, setSelectedHumanId] = useState<string | null>(null);

  // Add human form state
  const [newHumanName, setNewHumanName] = useState('');
  const [newHumanEmail, setNewHumanEmail] = useState('');
  const [newHumanPhone, setNewHumanPhone] = useState('');
  const [newHumanPassword, setNewHumanPassword] = useState('');
  const [newHumanSpecialization, setNewHumanSpecialization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Voice preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Load AI agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoading(true);
        const data = await getAgents();
        setAgents(data);
        if (data.length > 0) setSelectedAgentId(data[0].id);
      } catch (err) {
        console.error('Failed to load agents:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAgents();
  }, []);

  // Load human agents
  useEffect(() => {
    const loadHumanAgents = async () => {
      try {
        setHumanLoading(true);
        const data = await getHumanAgents();
        setHumanAgents(data);
      } catch (err) {
        console.error('Failed to load human agents:', err);
      } finally {
        setHumanLoading(false);
      }
    };
    loadHumanAgents();
  }, []);

  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const selectedHuman = humanAgents.find(h => h.id === selectedHumanId);

  const updateActiveAgentField = (field: keyof CrmAgent, value: string | number) => {
    setAgents(prev => prev.map(a => a.id === selectedAgentId ? { ...a, [field]: value } : a));
  };

  // Voice preview functions
  const getBrowserVoice = useCallback((voiceId: string): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) return null;
    const preferenceMap: Record<string, string[]> = {
      'alloy-neural': ['Microsoft Zira', 'Zira', 'Google US English', 'Samantha', 'en-US'],
      'echo-neural': ['Microsoft David', 'David', 'Google UK English Male', 'Daniel', 'en-GB'],
      'shimmer-neural': ['Microsoft Hazel', 'Hazel', 'Google UK English Female', 'Kate', 'en-AU'],
      'fable-neural': ['Microsoft Mark', 'Mark', 'Google UK English Male', 'Oliver', 'en-GB'],
    };
    const prefs = preferenceMap[voiceId] || [];
    for (const pref of prefs) {
      const found = voices.find(v => v.name.includes(pref));
      if (found) return found;
    }
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    return englishVoices[0] || voices[0];
  }, []);

  const stopPreview = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
    setIsPreviewPlaying(false);
    setPreviewVoice(null);
  }, []);

  const playPreview = useCallback((voiceId: string, rate: number) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const text = VOICE_PREVIEW_SAMPLES[voiceId] || "Hello! This is a voice preview.";
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getBrowserVoice(voiceId);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = voiceId === 'echo-neural' ? 0.85 : voiceId === 'shimmer-neural' ? 1.1 : 1.0;
    utterance.onstart = () => { setIsPreviewPlaying(true); setPreviewVoice(voiceId); };
    utterance.onend = () => { setIsPreviewPlaying(false); setPreviewVoice(null); };
    utterance.onerror = () => { setIsPreviewPlaying(false); setPreviewVoice(null); };
    synthRef.current.speak(utterance);
  }, [getBrowserVoice]);

  const handleCreateAgent = async () => {
    try {
      const created = await createAgent({ name: 'New Custom AI Agent', phone: '+1413632720', specialization: 'Outbound sales routing', intents: ['greeting', 'product_inquiry'] });
      const fullAgent = { ...created, voice: 'alloy-neural', llmModel: 'gpt-4o', prompt: 'You are a professional assistant.', temperature: 0.5, speakingRate: 1.0 };
      saveLocalAgentConfig(created.id, { voice: 'alloy-neural', llmModel: 'gpt-4o', prompt: 'You are a professional assistant.', temperature: 0.5, speakingRate: 1.0 });
      setAgents([...agents, fullAgent]);
      setSelectedAgentId(created.id);
    } catch (err) {
      console.error('Failed to create agent:', err);
      alert('Failed to create AI agent.');
    }
  };

  const handleSave = () => {
    if (activeAgent) {
      saveLocalAgentConfig(activeAgent.id, { voice: activeAgent.voice, llmModel: activeAgent.llmModel, prompt: activeAgent.prompt, temperature: activeAgent.temperature, speakingRate: activeAgent.speakingRate });
    }
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 2000);
  };

  // Human agent handlers
  const handleCreateHuman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHumanName || !newHumanEmail || !newHumanPhone || !newHumanPassword) return;
    try {
      setCreateLoading(true);
      const created = await createHumanAgent({
        name: newHumanName,
        email: newHumanEmail,
        phone: newHumanPhone,
        password: newHumanPassword,
        specialization: newHumanSpecialization || undefined,
      });
      setHumanAgents([...humanAgents, created]);
      setShowAddHumanModal(false);
      setNewHumanName(''); setNewHumanEmail(''); setNewHumanPhone(''); setNewHumanPassword(''); setNewHumanSpecialization('');
    } catch (err: any) {
      console.error('Failed to create human agent:', err);
      alert(err?.response?.data?.detail || 'Failed to create sales executive.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (agentId: string, newStatus: 'online' | 'away' | 'offline') => {
    try {
      const updated = await updateHumanAgentStatus(agentId, newStatus);
      setHumanAgents(prev => prev.map(a => a.id === agentId ? updated : a));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteHuman = async (agentId: string) => {
    if (!confirm('Are you sure you want to remove this sales executive? Their user account will be deactivated.')) return;
    try {
      await deleteHumanAgent(agentId);
      setHumanAgents(prev => prev.filter(a => a.id !== agentId));
      if (selectedHumanId === agentId) setSelectedHumanId(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  useEffect(() => { return () => { if (synthRef.current) synthRef.current.cancel(); }; }, []);

  if (loading && humanLoading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center text-zinc-500 font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Syncing Agent Settings...</span>
        </div>
      </div>
    );
  }

  const voiceOptions = [
    { id: 'alloy-neural', label: 'Alloy', desc: 'Conversational / Balanced', gender: 'Neural Female' },
    { id: 'echo-neural', label: 'Echo', desc: 'Deep / Clear', gender: 'Neural Male' },
    { id: 'shimmer-neural', label: 'Shimmer', desc: 'Warm / Professional', gender: 'Neural Female' },
    { id: 'fable-neural', label: 'Fable', desc: 'Accent / Friendly', gender: 'Neural Male' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-500';
      case 'offline': return 'bg-zinc-600';
      default: return 'bg-zinc-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
      case 'away': return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
      case 'offline': return 'bg-zinc-900 text-zinc-500 border-zinc-800';
      default: return 'bg-zinc-900 text-zinc-500 border-zinc-800';
    }
  };

  const formatTalkTime = (seconds: number) => {
    if (seconds === 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Aggregate metrics
  const totalHumanOnline = humanAgents.filter(a => a.availability_status === 'online').length;
  const totalCallsHandled = humanAgents.reduce((sum, a) => sum + a.total_calls_handled, 0);
  const totalTalkTime = humanAgents.reduce((sum, a) => sum + a.total_talk_time_seconds, 0);

  return (
    <div className="h-[calc(100vh-6rem)] text-left flex flex-col overflow-hidden">
      {/* Tab Header */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
            activeTab === 'ai'
              ? 'bg-purple-600/10 border-purple-500/30 text-purple-300'
              : 'bg-zinc-950/30 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          AI Voice Agents
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${activeTab === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-600'}`}>
            {agents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('human')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
            activeTab === 'human'
              ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300'
              : 'bg-zinc-950/30 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Sales Executives
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${activeTab === 'human' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
            {humanAgents.length}
          </span>
          {totalHumanOnline > 0 && (
            <span className="flex items-center gap-1 text-[9px] bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-800/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {totalHumanOnline} online
            </span>
          )}
        </button>
      </div>

      {/* ================================================================== */}
      {/* AI VOICE AGENTS TAB */}
      {/* ================================================================== */}
      {activeTab === 'ai' && (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Sidebar: AI Agents list */}
          <div className="w-64 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
              <span className="text-xs font-bold text-zinc-200">AI Call Agents</span>
              <button onClick={handleCreateAgent} className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all" title="Create Agent">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedAgentId === agent.id 
                      ? 'bg-purple-600/10 border-purple-500/30 text-purple-250' 
                      : 'bg-zinc-900/20 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg bg-zinc-900 border ${selectedAgentId === agent.id ? 'border-purple-500/40 text-purple-400' : 'border-zinc-800 text-zinc-500'}`}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-zinc-200 truncate">{agent.name}</h4>
                    <span className="text-[9px] font-mono text-zinc-550 block mt-0.5 uppercase tracking-wider">{agent.llmModel}</span>
                    <span className="text-[9px] text-zinc-500 block mt-1">Active in {agent.assignedCampaignsCount} campaigns</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: AI Agent Config */}
          {activeAgent && (
            <div className="flex-1 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-purple-400" />
                  <h3 className="text-sm font-bold text-zinc-200">Agent Architect & Voice Settings</h3>
                </div>
                <div className="flex items-center gap-3">
                  {isSavedAlert && (
                    <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                      <CheckCircle className="h-3 w-3" /> Changes Saved
                    </span>
                  )}
                  <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md shadow-purple-950/20">
                    <Save className="h-3.5 w-3.5" /><span>Deploy Changes</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Agent Identity Name</label>
                    <input type="text" value={activeAgent.name} onChange={(e) => updateActiveAgentField('name', e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-purple-500/50 rounded-xl text-xs text-zinc-200 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">LLM Engine Model</label>
                    <select value={activeAgent.llmModel} onChange={(e) => updateActiveAgentField('llmModel', e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-350 focus:border-purple-500/50 rounded-xl text-xs outline-none transition-all">
                      <option value="gpt-4o">OpenAI GPT-4o (High-fidelity sales)</option>
                      <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                      <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                      <option value="llama-3-70b">Meta Llama 3 70b</option>
                    </select>
                  </div>
                </div>

                {/* Voice Cards */}
                <div className="space-y-3">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3" /> Synthesized Speech Voice
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {voiceOptions.map((voice) => {
                      const isSelected = activeAgent.voice === voice.id;
                      const isThisPlaying = isPreviewPlaying && previewVoice === voice.id;
                      return (
                        <div key={voice.id} onClick={() => updateActiveAgentField('voice', voice.id)}
                          className={`relative group cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
                            isSelected ? 'bg-purple-600/10 border-purple-500/40 ring-1 ring-purple-500/20' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                          }`}>
                          {isSelected && <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-purple-600 rounded-full border-2 border-zinc-950"><CheckCircle className="h-2.5 w-2.5 text-white" /></div>}
                          <div className="space-y-1 mb-3">
                            <h4 className={`text-xs font-bold ${isSelected ? 'text-purple-300' : 'text-zinc-300'}`}>{voice.label}</h4>
                            <p className="text-[9px] text-zinc-500">{voice.desc}</p>
                            <span className={`inline-block text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${voice.gender.includes('Female') ? 'bg-pink-950/40 text-pink-400 border border-pink-800/30' : 'bg-sky-950/40 text-sky-400 border border-sky-800/30'}`}>{voice.gender}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); if (isThisPlaying) { stopPreview(); } else { updateActiveAgentField('voice', voice.id); playPreview(voice.id, activeAgent.speakingRate); } }}
                              className={`shrink-0 p-1.5 rounded-lg transition-all ${isThisPlaying ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'}`}
                              title={isThisPlaying ? 'Stop preview' : 'Preview voice'}>
                              {isThisPlaying ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                            </button>
                            <div className="flex-1 overflow-hidden">
                              {isThisPlaying ? <AnimatedWaveform isPlaying={true} /> : (
                                <div className="flex items-end gap-[2px] h-10">{Array.from({ length: 28 }).map((_, i) => (<div key={i} className="w-[3px] rounded-full bg-zinc-800" style={{ height: `${Math.max(3, Math.abs(Math.sin(i * 0.6)) * 10 + 3)}px` }} />))}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {isPreviewPlaying && previewVoice && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-purple-950/20 border border-purple-900/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="relative"><div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" /><div className="absolute inset-0 h-2 w-2 bg-purple-500 rounded-full animate-ping opacity-40" /></div>
                        <span className="text-[11px] text-purple-300 font-medium">Playing <span className="font-bold">{voiceOptions.find(v => v.id === previewVoice)?.label}</span> preview</span>
                      </div>
                      <button onClick={stopPreview} className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-purple-400 bg-purple-600/10 border border-purple-500/20 rounded-lg hover:bg-purple-600/20 transition-all"><Square className="h-2.5 w-2.5" />Stop</button>
                    </div>
                  )}
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-850">
                    <div className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="font-bold text-zinc-400">Speaking Rate</span><span className="font-mono text-purple-400">{activeAgent.speakingRate}x</span></div>
                      <input type="range" min="0.8" max="1.3" step="0.05" value={activeAgent.speakingRate} onChange={(e) => updateActiveAgentField('speakingRate', parseFloat(e.target.value))} className="w-full accent-purple-500 bg-zinc-950 h-1 rounded" /></div>
                    <div className="space-y-1"><div className="flex items-center justify-between text-xs"><span className="font-bold text-zinc-400">LLM Temperature</span><span className="font-mono text-purple-400">{activeAgent.temperature}</span></div>
                      <input type="range" min="0.1" max="1.0" step="0.05" value={activeAgent.temperature} onChange={(e) => updateActiveAgentField('temperature', parseFloat(e.target.value))} className="w-full accent-purple-500 bg-zinc-950 h-1 rounded" /></div>
                  </div>
                  <div className="space-y-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-850">
                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-zinc-400">Quick Voice Test</span><span className="text-[9px] text-zinc-600 font-mono">Browser TTS</span></div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Click below to hear <span className="text-purple-400 font-semibold">{activeAgent.name}</span> with the current settings.</p>
                    <button onClick={() => { if (isPreviewPlaying) { stopPreview(); } else { playPreview(activeAgent.voice, activeAgent.speakingRate); } }}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${isPreviewPlaying ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-750 hover:border-zinc-600'}`}>
                      {isPreviewPlaying ? <><Square className="h-3.5 w-3.5" />Stop Preview</> : <><Volume2 className="h-3.5 w-3.5" />Play Voice Preview</>}
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1"><MessageSquareCode className="h-3.5 w-3.5" /> Agent Prompts & Context Guide</label>
                    <span className="text-[9px] text-zinc-500">Variables: {"{contact_name}"}, {"{company_name}"}</span>
                  </div>
                  <textarea rows={9} value={activeAgent.prompt} onChange={(e) => updateActiveAgentField('prompt', e.target.value)}
                    className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 focus:border-purple-500/50 outline-none leading-relaxed font-mono"
                    placeholder="Write detailed instructions for the AI representative..." />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* HUMAN SALES EXECUTIVES TAB */}
      {/* ================================================================== */}
      {activeTab === 'human' && (
        <div className="flex-1 flex flex-col gap-5 overflow-hidden">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/30"><Users className="h-4 w-4 text-emerald-400" /></div>
              <div><p className="text-lg font-bold text-zinc-200">{humanAgents.length}</p><p className="text-[10px] text-zinc-500 font-mono uppercase">Total Executives</p></div>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/30"><CircleDot className="h-4 w-4 text-emerald-400" /></div>
              <div><p className="text-lg font-bold text-emerald-400">{totalHumanOnline}</p><p className="text-[10px] text-zinc-500 font-mono uppercase">Currently Online</p></div>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/30"><PhoneCall className="h-4 w-4 text-purple-400" /></div>
              <div><p className="text-lg font-bold text-zinc-200">{totalCallsHandled}</p><p className="text-[10px] text-zinc-500 font-mono uppercase">Total Calls Handled</p></div>
            </div>
            <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-violet-950/40 border border-violet-800/30"><Clock className="h-4 w-4 text-violet-400" /></div>
              <div><p className="text-lg font-bold text-zinc-200">{formatTalkTime(totalTalkTime)}</p><p className="text-[10px] text-zinc-500 font-mono uppercase">Total Talk Time</p></div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex gap-5 overflow-hidden">
            {/* Agents Table */}
            <div className="flex-1 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-200">Sales Executive Team</h3>
                </div>
                <button onClick={() => setShowAddHumanModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-950/20">
                  <UserPlus className="h-3.5 w-3.5" /><span>Add Executive</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {humanLoading ? (
                  <div className="flex items-center justify-center h-32 text-zinc-500 text-xs">Loading...</div>
                ) : humanAgents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                    <Users className="h-10 w-10 text-zinc-700 mb-3" />
                    <p className="text-sm font-medium text-zinc-400">No sales executives added yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Create your first sales executive to handle transferred calls from Dialog AI.</p>
                    <button onClick={() => setShowAddHumanModal(true)} className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all">
                      <UserPlus className="h-3.5 w-3.5" /> Add First Executive
                    </button>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[10px] font-mono tracking-wider text-zinc-500 uppercase bg-zinc-950/15">
                        <th className="py-3 px-4 font-semibold">Name & Contact</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-center">Calls</th>
                        <th className="py-3 px-4 font-semibold text-center">Talk Time</th>
                        <th className="py-3 px-4 font-semibold text-center">Avg Handle</th>
                        <th className="py-3 px-4 font-semibold text-center">Success %</th>
                        <th className="py-3 px-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/50">
                      {humanAgents.map((agent) => (
                        <tr key={agent.id}
                          onClick={() => setSelectedHumanId(agent.id === selectedHumanId ? null : agent.id)}
                          className={`text-xs hover:bg-zinc-900/20 cursor-pointer transition-colors ${selectedHumanId === agent.id ? 'bg-emerald-950/5 border-l-2 border-l-emerald-500' : ''}`}>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-emerald-950/20">
                                  {agent.name[0]}
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-950 ${getStatusColor(agent.availability_status)}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-zinc-200">{agent.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{agent.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={agent.availability_status}
                              onChange={(e) => handleStatusChange(agent.id, e.target.value as any)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border outline-none cursor-pointer ${getStatusBadge(agent.availability_status)}`}>
                              <option value="online">🟢 Online</option>
                              <option value="away">🟡 Away</option>
                              <option value="offline">⚫ Offline</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-300">{agent.total_calls_handled}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-zinc-400">{formatTalkTime(agent.total_talk_time_seconds)}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-zinc-400">{agent.avg_handle_time_seconds > 0 ? `${Math.round(agent.avg_handle_time_seconds)}s` : '—'}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`font-mono font-bold ${agent.transfer_success_rate >= 80 ? 'text-emerald-400' : agent.transfer_success_rate >= 50 ? 'text-amber-400' : 'text-zinc-500'}`}>
                              {agent.transfer_success_rate > 0 ? `${agent.transfer_success_rate}%` : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDeleteHuman(agent.id)} className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all" title="Remove agent">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Detail Panel for selected human */}
            {selectedHuman && (
              <div className="w-80 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">Agent Details</span>
                  <button onClick={() => setSelectedHumanId(null)} className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                  {/* Profile header */}
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-emerald-950/30 mb-3">
                      {selectedHuman.name[0]}
                    </div>
                    <h3 className="text-base font-bold text-zinc-200">{selectedHuman.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{selectedHuman.email}</p>
                    <span className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border ${getStatusBadge(selectedHuman.availability_status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(selectedHuman.availability_status)}`} />
                      {selectedHuman.availability_status.toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between"><span className="text-zinc-500">Phone</span><span className="text-zinc-300 font-mono">{selectedHuman.phone}</span></div>
                    <div className="flex items-center justify-between"><span className="text-zinc-500">Specialization</span><span className="text-zinc-300">{selectedHuman.specialization || '—'}</span></div>
                    <div className="flex items-center justify-between"><span className="text-zinc-500">Max Concurrent</span><span className="text-zinc-300 font-mono">{selectedHuman.max_concurrent_calls}</span></div>
                    <div className="flex items-center justify-between"><span className="text-zinc-500">Dialog Synced</span>
                      <span className={`text-[10px] font-bold ${selectedHuman.dialog_synced ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedHuman.dialog_synced ? '✓ Synced' : '⚠ Pending'}</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1.5 mb-3"><TrendingUp className="h-3 w-3" /> Performance Metrics</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl text-center">
                        <p className="text-lg font-bold text-zinc-200">{selectedHuman.total_calls_handled}</p>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase mt-0.5">Calls</p>
                      </div>
                      <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl text-center">
                        <p className="text-lg font-bold text-zinc-200">{formatTalkTime(selectedHuman.total_talk_time_seconds)}</p>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase mt-0.5">Talk Time</p>
                      </div>
                      <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl text-center">
                        <p className="text-lg font-bold text-zinc-200">{selectedHuman.avg_handle_time_seconds > 0 ? `${Math.round(selectedHuman.avg_handle_time_seconds)}s` : '—'}</p>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase mt-0.5">Avg Handle</p>
                      </div>
                      <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl text-center">
                        <p className={`text-lg font-bold ${selectedHuman.transfer_success_rate >= 80 ? 'text-emerald-400' : selectedHuman.transfer_success_rate >= 50 ? 'text-amber-400' : 'text-zinc-400'}`}>
                          {selectedHuman.transfer_success_rate > 0 ? `${selectedHuman.transfer_success_rate}%` : '—'}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase mt-0.5">Success</p>
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl flex items-center gap-3">
                    <Shield className="h-4 w-4 text-purple-400" />
                    <div>
                      <p className="text-xs font-bold text-zinc-300">Sales Executive</p>
                      <p className="text-[10px] text-zinc-500">Role: Agent • Can receive transferred calls</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ADD HUMAN AGENT MODAL */}
      {/* ================================================================== */}
      {showAddHumanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setShowAddHumanModal(false)} className="absolute right-4 top-4 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-zinc-200 mb-1 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              Add Sales Executive
            </h3>
            <p className="text-xs text-zinc-500 mb-5">This creates a user account + agent profile for call transfers.</p>

            <form onSubmit={handleCreateHuman} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Full Name *</label>
                  <input type="text" required placeholder="e.g. Rahul Sharma" value={newHumanName} onChange={(e) => setNewHumanName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-emerald-500/50" />
                </div>
                <div className="text-left space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Email *</label>
                  <input type="email" required placeholder="e.g. rahul@company.com" value={newHumanEmail} onChange={(e) => setNewHumanEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-emerald-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Phone Number *</label>
                  <input type="text" required placeholder="e.g. +91 9876543210" value={newHumanPhone} onChange={(e) => setNewHumanPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-emerald-500/50" />
                </div>
                <div className="text-left space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Login Password *</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required minLength={6} placeholder="Min 6 chars" value={newHumanPassword} onChange={(e) => setNewHumanPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-9 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-emerald-500/50" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Specialization <span className="text-zinc-700">(optional)</span></label>
                <input type="text" placeholder="e.g. Enterprise Sales, Support Escalations" value={newHumanSpecialization} onChange={(e) => setNewHumanSpecialization(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-emerald-500/50" />
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-xs text-emerald-300/70 flex items-start gap-2">
                <Shield className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">What happens when you add an executive:</p>
                  <ul className="mt-1 space-y-0.5 text-[10px] text-emerald-400/60">
                    <li>• A login account is created with <span className="font-mono font-bold">agent</span> role</li>
                    <li>• They are registered in Dialog for receiving transferred calls</li>
                    <li>• Their metrics will be tracked automatically</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddHumanModal(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={createLoading} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2">
                  {createLoading ? <><div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</> : <><UserPlus className="h-3.5 w-3.5" /> Create Executive</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
