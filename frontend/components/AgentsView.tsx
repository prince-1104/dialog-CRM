"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mockAgents, CrmAgent, getAgents, createAgent, saveLocalAgentConfig } from '../lib/api';
import { 
  Bot, 
  Cpu, 
  MessageSquareCode, 
  Plus,
  Save,
  CheckCircle,
  Volume2,
  VolumeX,
  Square
} from 'lucide-react';

// Voice preview sample lines per voice
const VOICE_PREVIEW_SAMPLES: Record<string, string> = {
  'alloy-neural': "Hello! This is a preview of the Alloy voice. I'm designed to sound conversational and balanced, perfect for natural sales interactions.",
  'echo-neural': "Hey there! You're hearing the Echo voice. I bring a deep, clear tone that's ideal for confident outbound communications.",
  'shimmer-neural': "Hi! This is the Shimmer voice speaking. I offer a warm, professional tone that works beautifully for customer support.",
  'fable-neural': "Hello! This is the Fable voice. I have a friendly, approachable accent that makes every conversation feel welcoming.",
};

// Waveform visualizer component
const WaveformVisualizer: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const bars = 24;
  return (
    <div className="flex items-center gap-[2px] h-8 px-1">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-150 ${
            isPlaying
              ? 'bg-gradient-to-t from-purple-600 to-violet-400'
              : 'bg-zinc-800'
          }`}
          style={{
            height: isPlaying
              ? `${Math.max(4, Math.sin((i * 0.8) + (Date.now() * 0.003)) * 14 + 16)}px`
              : '4px',
            animationName: isPlaying ? 'waveBar' : 'none',
            animationDuration: `${0.4 + Math.random() * 0.4}s`,
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'ease-in-out',
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
};

// Animated waveform that re-renders while playing
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

export const AgentsView: React.FC = () => {
  const [agents, setAgents] = useState<CrmAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  // Voice preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoading(true);
        const data = await getAgents();
        setAgents(data);
        if (data.length > 0) {
          setSelectedAgentId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load agents:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAgents();
  }, []);

  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const updateActiveAgentField = (field: keyof CrmAgent, value: string | number) => {
    setAgents(prev => prev.map(a => {
      if (a.id === selectedAgentId) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  // Map our voice IDs to the best matching browser SpeechSynthesis voice
  const getBrowserVoice = useCallback((voiceId: string): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) return null;

    // Preference mapping: try to pick a good match
    const preferenceMap: Record<string, string[]> = {
      'alloy-neural': ['Microsoft Zira', 'Zira', 'Google US English', 'Samantha', 'Karen', 'en-US'],
      'echo-neural': ['Microsoft David', 'David', 'Google UK English Male', 'Daniel', 'en-GB'],
      'shimmer-neural': ['Microsoft Hazel', 'Hazel', 'Google UK English Female', 'Kate', 'Moira', 'en-AU'],
      'fable-neural': ['Microsoft Mark', 'Mark', 'Google UK English Male', 'Oliver', 'en-GB'],
    };

    const prefs = preferenceMap[voiceId] || [];

    // Try exact name match
    for (const pref of prefs) {
      const found = voices.find(v => v.name.includes(pref));
      if (found) return found;
    }

    // Fallback: male for echo/fable, female for alloy/shimmer
    const isMale = voiceId === 'echo-neural' || voiceId === 'fable-neural';
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));

    if (isMale) {
      const male = englishVoices.find(v =>
        v.name.toLowerCase().includes('male') ||
        v.name.includes('David') ||
        v.name.includes('Mark') ||
        v.name.includes('Daniel')
      );
      if (male) return male;
    } else {
      const female = englishVoices.find(v =>
        v.name.toLowerCase().includes('female') ||
        v.name.includes('Zira') ||
        v.name.includes('Samantha') ||
        v.name.includes('Karen')
      );
      if (female) return female;
    }

    return englishVoices[0] || voices[0];
  }, []);

  const stopPreview = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPreviewPlaying(false);
    setPreviewVoice(null);
    utteranceRef.current = null;
  }, []);

  const playPreview = useCallback((voiceId: string, rate: number) => {
    if (!synthRef.current) return;

    // Stop any current playback
    synthRef.current.cancel();

    const text = VOICE_PREVIEW_SAMPLES[voiceId] || "Hello! This is a voice preview sample for this synthesized speech voice.";
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Ensure voices are loaded
    const trySpeak = () => {
      const voice = getBrowserVoice(voiceId);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = rate;
      utterance.pitch = voiceId === 'echo-neural' ? 0.85 : voiceId === 'shimmer-neural' ? 1.1 : 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsPreviewPlaying(true);
        setPreviewVoice(voiceId);
      };
      utterance.onend = () => {
        setIsPreviewPlaying(false);
        setPreviewVoice(null);
      };
      utterance.onerror = () => {
        setIsPreviewPlaying(false);
        setPreviewVoice(null);
      };

      synthRef.current!.speak(utterance);
    };

    // Voices may not be loaded yet
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        trySpeak();
        speechSynthesis.onvoiceschanged = null;
      };
    } else {
      trySpeak();
    }
  }, [getBrowserVoice]);

  const handleCreateAgent = async () => {
    try {
      const created = await createAgent({
        name: 'New Custom AI Agent',
        phone: '+1413632720',
        specialization: 'Outbound sales routing',
        intents: ['greeting', 'product_inquiry']
      });

      const fullAgent = {
        ...created,
        voice: 'alloy-neural',
        llmModel: 'gpt-4o',
        prompt: 'You are a professional assistant representing our workspace team. Keep responses friendly, helpful, and concise.',
        temperature: 0.5,
        speakingRate: 1.0
      };

      saveLocalAgentConfig(created.id, {
        voice: 'alloy-neural',
        llmModel: 'gpt-4o',
        prompt: 'You are a professional assistant representing our workspace team. Keep responses friendly, helpful, and concise.',
        temperature: 0.5,
        speakingRate: 1.0
      });

      setAgents([...agents, fullAgent]);
      setSelectedAgentId(created.id);
    } catch (err) {
      console.error('Failed to create agent:', err);
      alert('Failed to create agent in CRM database.');
    }
  };

  const handleSave = () => {
    if (activeAgent) {
      saveLocalAgentConfig(activeAgent.id, {
        voice: activeAgent.voice,
        llmModel: activeAgent.llmModel,
        prompt: activeAgent.prompt,
        temperature: activeAgent.temperature,
        speakingRate: activeAgent.speakingRate
      });
    }
    setIsSavedAlert(true);
    setTimeout(() => {
      setIsSavedAlert(false);
    }, 2000);
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  if (loading) {
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

  return (
    <div className="h-[calc(100vh-6rem)] text-left flex gap-6 overflow-hidden">
      {/* Left Sidebar: Agents list */}
      <div className="w-64 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
          <span className="text-xs font-bold text-zinc-200">AI Call Agents</span>
          <button 
            onClick={handleCreateAgent}
            className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
            title="Create Agent"
          >
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
                <span className="text-[9px] text-zinc-500 block mt-1">
                  Active in {agent.assignedCampaignsCount} campaigns
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: Agent Configurations */}
      <div className="flex-1 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden">
        {/* Detail Panel Header */}
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
            <button 
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md shadow-purple-950/20"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Deploy Changes</span>
            </button>
          </div>
        </div>

        {/* Configuration Forms */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field: Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Agent Identity Name</label>
              <input 
                type="text" 
                value={activeAgent.name}
                onChange={(e) => updateActiveAgentField('name', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-purple-500/50 rounded-xl text-xs text-zinc-200 outline-none transition-all"
              />
            </div>

            {/* Field: LLM Model */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">LLM Engine Model</label>
              <select 
                value={activeAgent.llmModel}
                onChange={(e) => updateActiveAgentField('llmModel', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-350 focus:border-purple-500/50 rounded-xl text-xs outline-none transition-all"
              >
                <option value="gpt-4o">OpenAI GPT-4o (High-fidelity sales)</option>
                <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet (Logic/Reasoning)</option>
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Multilingual Support)</option>
                <option value="llama-3-70b">Meta Llama 3 70b (Cost-effective open model)</option>
              </select>
            </div>
          </div>

          {/* Voice Selection with Preview */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1.5">
              <Volume2 className="h-3 w-3" /> Synthesized Speech Voice
            </label>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {voiceOptions.map((voice) => {
                const isSelected = activeAgent.voice === voice.id;
                const isThisPlaying = isPreviewPlaying && previewVoice === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => updateActiveAgentField('voice', voice.id)}
                    className={`relative group cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
                      isSelected
                        ? 'bg-purple-600/10 border-purple-500/40 ring-1 ring-purple-500/20'
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-purple-600 rounded-full border-2 border-zinc-950">
                        <CheckCircle className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}

                    {/* Voice info */}
                    <div className="space-y-1 mb-3">
                      <h4 className={`text-xs font-bold ${isSelected ? 'text-purple-300' : 'text-zinc-300'}`}>
                        {voice.label}
                      </h4>
                      <p className="text-[9px] text-zinc-500">{voice.desc}</p>
                      <span className={`inline-block text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        voice.gender.includes('Female')
                          ? 'bg-pink-950/40 text-pink-400 border border-pink-800/30'
                          : 'bg-sky-950/40 text-sky-400 border border-sky-800/30'
                      }`}>
                        {voice.gender}
                      </span>
                    </div>

                    {/* Waveform + Play Button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isThisPlaying) {
                            stopPreview();
                          } else {
                            // First select this voice
                            updateActiveAgentField('voice', voice.id);
                            playPreview(voice.id, activeAgent.speakingRate);
                          }
                        }}
                        className={`shrink-0 p-1.5 rounded-lg transition-all ${
                          isThisPlaying
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 group-hover:bg-zinc-750'
                        }`}
                        title={isThisPlaying ? 'Stop preview' : 'Preview voice'}
                      >
                        {isThisPlaying ? (
                          <Square className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </button>

                      <div className="flex-1 overflow-hidden">
                        {isThisPlaying ? (
                          <AnimatedWaveform isPlaying={true} />
                        ) : (
                          <div className="flex items-end gap-[2px] h-10">
                            {Array.from({ length: 28 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-[3px] rounded-full bg-zinc-800"
                                style={{ height: `${Math.max(3, Math.abs(Math.sin(i * 0.6)) * 10 + 3)}px` }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Now Playing banner */}
            {isPreviewPlaying && previewVoice && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-purple-950/20 border border-purple-900/30 rounded-xl animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 h-2 w-2 bg-purple-500 rounded-full animate-ping opacity-40" />
                  </div>
                  <span className="text-[11px] text-purple-300 font-medium">
                    Playing <span className="font-bold">{voiceOptions.find(v => v.id === previewVoice)?.label}</span> voice preview
                  </span>
                </div>
                <button
                  onClick={stopPreview}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-purple-400 bg-purple-600/10 border border-purple-500/20 rounded-lg hover:bg-purple-600/20 transition-all"
                >
                  <Square className="h-2.5 w-2.5" />
                  Stop
                </button>
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-850">
              {/* Speaking speed rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-400">Speaking Rate</span>
                  <span className="font-mono text-purple-400">{activeAgent.speakingRate}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.8" 
                  max="1.3" 
                  step="0.05"
                  value={activeAgent.speakingRate}
                  onChange={(e) => updateActiveAgentField('speakingRate', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-zinc-950 h-1 rounded"
                />
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-400">LLM Temperature (Creativity)</span>
                  <span className="font-mono text-purple-400">{activeAgent.temperature}</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.05"
                  value={activeAgent.temperature}
                  onChange={(e) => updateActiveAgentField('temperature', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-zinc-950 h-1 rounded"
                />
              </div>
            </div>

            {/* Quick preview for current voice with custom text */}
            <div className="space-y-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-850">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Quick Voice Test</span>
                <span className="text-[9px] text-zinc-600 font-mono">Uses browser TTS engine</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Click below to hear how <span className="text-purple-400 font-semibold">{activeAgent.name}</span> sounds 
                with the current voice and speed settings.
              </p>
              <button
                onClick={() => {
                  if (isPreviewPlaying) {
                    stopPreview();
                  } else {
                    // Use the agent's prompt as a preview, trimmed
                    const previewText = activeAgent.prompt.length > 200
                      ? activeAgent.prompt.substring(0, 200) + '...'
                      : activeAgent.prompt;
                    playPreview(activeAgent.voice, activeAgent.speakingRate);
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isPreviewPlaying
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-750 hover:border-zinc-600'
                }`}
              >
                {isPreviewPlaying ? (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    Play Voice Preview
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prompt Instruction TextArea */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1">
                <MessageSquareCode className="h-3.5 w-3.5" /> Agent Prompts & Context Guide
              </label>
              <span className="text-[9px] text-zinc-500">Variables supported: {"{contact_name}"}, {"{company_name}"}</span>
            </div>
            <textarea
              rows={9}
              value={activeAgent.prompt}
              onChange={(e) => updateActiveAgentField('prompt', e.target.value)}
              className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-200 placeholder-zinc-600 focus:border-purple-500/50 outline-none leading-relaxed font-mono"
              placeholder="Write detailed instructions for the AI representative..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
