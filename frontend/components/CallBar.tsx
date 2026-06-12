import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  Phone, 
  PhoneOff, 
  MicOff, 
  Volume2, 
  Clock, 
  Sparkles
} from 'lucide-react';

export const CallBar: React.FC = () => {
  const { 
    activeCall, 
    answerIncomingCall, 
    endCall, 
    updateCallDuration, 
    addTranscriptSegment 
  } = useStore();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript box
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeCall?.transcripts]);

  // Duration Timer Effect
  useEffect(() => {
    if (activeCall && activeCall.status === 'active') {
      timerRef.current = setInterval(() => {
        updateCallDuration();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.status]);

  // Dialogue Simulation Effect
  useEffect(() => {
    if (!activeCall || !activeCall.isSimulation) return;

    if (activeCall.status === 'active' && activeCall.transcripts.length <= 2) {
      // Begin sequence of dialogues
      const dialogSequence = [
        { delay: 1500, sender: 'customer' as const, text: "Hello? Who is this?" },
        { delay: 4500, sender: 'agent' as const, text: `Hello! I am ${activeCall.agentName}, your virtual account assistant. I noticed your team had high traffic today on client calls.` },
        { delay: 8500, sender: 'customer' as const, text: "Ah, yes. We are onboarding new agents this week. We might need extra channel bandwidth." },
        { delay: 12500, sender: 'agent' as const, text: "Understood! I have noted this request down. I will expand your concurrent limit allocations to 5 immediately." },
        { delay: 16500, sender: 'customer' as const, text: "Wow, that was fast and super easy! Thank you." },
        { delay: 19500, sender: 'agent' as const, text: "You're very welcome! I will push this update. Have a wonderful day!" },
        { delay: 22000, sender: 'system' as const, text: "Call completed successfully. Sentiment score: Positive (0.94)." }
      ];

      const timers: NodeJS.Timeout[] = [];

      dialogSequence.forEach((item) => {
        const t = setTimeout(() => {
          const formattedTime = formatTime(Math.floor(item.delay / 1000));
          addTranscriptSegment({
            sender: item.sender,
            text: item.text,
            timestamp: formattedTime
          });

          // If it's the last system message, hangup the call automatically after a short delay
          if (item.sender === 'system') {
            setTimeout(() => {
              endCall();
            }, 1500);
          }
        }, item.delay);
        timers.push(t);
      });

      return () => {
        timers.forEach(clearTimeout);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.status]);

  if (!activeCall) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusColor = () => {
    switch (activeCall.status) {
      case 'incoming': return 'border-emerald-500/30 bg-emerald-950/20';
      case 'dialing': return 'border-indigo-500/30 bg-indigo-950/20';
      case 'active': return 'border-purple-500/30 bg-purple-950/20';
      case 'hangup': return 'border-rose-500/30 bg-rose-950/20';
      default: return 'border-zinc-800 bg-zinc-950';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 glass-panel rounded-2xl shadow-2xl z-50 overflow-hidden border transition-all duration-300">
      {/* Visual Status Indicator */}
      <div className={`p-4 border-b border-zinc-900/60 ${getStatusColor()} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow`}>
              {activeCall.contactName[0]}
            </div>
            {activeCall.status === 'active' && (
              <div className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full bg-emerald-500 border border-zinc-900 flex items-center justify-center">
                <Clock className="h-2.5 w-2.5 text-zinc-950 animate-spin-slow" />
              </div>
            )}
          </div>
          <div className="flex flex-col text-left">
            <h4 className="text-xs font-bold text-zinc-200">{activeCall.contactName}</h4>
            <span className="text-[10px] text-zinc-500 font-mono">{activeCall.phoneNumber}</span>
          </div>
        </div>

        {/* Status Label / Waveform */}
        <div className="flex items-center gap-2">
          {activeCall.status === 'active' ? (
            <div className="flex items-center gap-1.5 bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 rounded-full">
              <div className="flex items-center h-4">
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
              </div>
              <span className="text-[10px] font-bold font-mono text-purple-300">{formatTime(activeCall.duration)}</span>
            </div>
          ) : (
            <span className="text-[9px] font-extrabold font-mono uppercase px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 tracking-wider">
              {activeCall.status}
            </span>
          )}
        </div>
      </div>

      {/* Transcription Dialogue Stream Box */}
      <div className="h-44 overflow-y-auto p-4 bg-zinc-950/55 space-y-2.5 scrollbar-thin">
        {activeCall.transcripts.map((t, idx) => {
          if (t.sender === 'system') {
            return (
              <div key={idx} className="flex items-center justify-center">
                <span className="text-[9px] text-zinc-500 font-medium font-mono bg-zinc-900/50 border border-zinc-850 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                  {t.text}
                </span>
              </div>
            );
          }
          const isAgent = t.sender === 'agent';
          return (
            <div key={idx} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">
                  {isAgent ? activeCall.agentName : 'Customer'}
                </span>
                <span className="text-[8px] text-zinc-650 font-mono">{t.timestamp}</span>
              </div>
              <p className={`text-xs px-3 py-1.5 rounded-2xl max-w-[85%] text-left ${
                isAgent 
                  ? 'bg-purple-600/10 border border-purple-500/25 text-purple-200 rounded-tl-none' 
                  : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 rounded-tr-none'
              }`}>
                {t.text}
              </p>
            </div>
          );
        })}
        <div ref={transcriptEndRef} />
      </div>

      {/* Dialer Call Controls */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-center gap-4">
        {activeCall.status === 'incoming' ? (
          <>
            <button 
              onClick={endCall}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg shadow-rose-950/30"
            >
              <PhoneOff className="h-4 w-4" />
              Decline
            </button>
            <button 
              onClick={answerIncomingCall}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg shadow-emerald-950/30 pulse-active"
            >
              <Phone className="h-4 w-4 animate-bounce" />
              Accept
            </button>
          </>
        ) : activeCall.status === 'hangup' ? (
          <div className="w-full flex items-center justify-center py-2 text-xs font-semibold text-zinc-500 animate-pulse font-mono">
            Finalizing logs...
          </div>
        ) : (
          <>
            <button className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
              <MicOff className="h-4 w-4" />
            </button>
            <button className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
              <Volume2 className="h-4 w-4" />
            </button>
            <button 
              onClick={endCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent transition-all shadow shadow-rose-950/20"
            >
              <PhoneOff className="h-4 w-4" />
              Hang Up
            </button>
          </>
        )}
      </div>
    </div>
  );
};
