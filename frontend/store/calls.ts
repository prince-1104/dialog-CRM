import { create } from 'zustand';
import { Call, CallStatus, TranscriptTurn } from '../types';

interface CallsState {
  activeCalls: Record<string, Call>;
  addActiveCall: (call: Call) => void;
  updateCallStatus: (callId: string, status: CallStatus) => void;
  addTranscriptTurn: (callId: string, turn: TranscriptTurn) => void;
  updateCallIntent: (callId: string, intent: string, confidence: number) => void;
  setCallDetails: (callId: string, details: Partial<Call>) => void;
  removeActiveCall: (callId: string) => void;
  clearAllCalls: () => void;
}

export const useCallsStore = create<CallsState>((set) => ({
  activeCalls: {},

  addActiveCall: (call: Call) => {
    set((state) => ({
      activeCalls: {
        ...state.activeCalls,
        [call.id]: call,
      },
    }));
  },

  updateCallStatus: (callId: string, status: CallStatus) => {
    set((state) => {
      const call = state.activeCalls[callId];
      if (!call) return state;
      return {
        activeCalls: {
          ...state.activeCalls,
          [callId]: {
            ...call,
            status,
          },
        },
      };
    });
  },

  addTranscriptTurn: (callId: string, turn: TranscriptTurn) => {
    set((state) => {
      const call = state.activeCalls[callId];
      if (!call) return state;
      
      const turns = [...(call.live_transcript || [])];
      turns.push(turn);
      
      return {
        activeCalls: {
          ...state.activeCalls,
          [callId]: {
            ...call,
            live_transcript: turns,
          },
        },
      };
    });
  },

  updateCallIntent: (callId: string, intent: string, confidence: number) => {
    set((state) => {
      const call = state.activeCalls[callId];
      if (!call) return state;
      return {
        activeCalls: {
          ...state.activeCalls,
          [callId]: {
            ...call,
            detected_intent: intent,
            intent_confidence: confidence,
          },
        },
      };
    });
  },

  setCallDetails: (callId: string, details: Partial<Call>) => {
    set((state) => {
      const call = state.activeCalls[callId];
      if (!call) return state;
      return {
        activeCalls: {
          ...state.activeCalls,
          [callId]: {
            ...call,
            ...details,
          },
        },
      };
    });
  },

  removeActiveCall: (callId: string) => {
    set((state) => {
      const activeCalls = { ...state.activeCalls };
      delete activeCalls[callId];
      return { activeCalls };
    });
  },

  clearAllCalls: () => {
    set({ activeCalls: {} });
  },
}));
