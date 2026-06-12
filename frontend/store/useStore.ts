import { create } from 'zustand';

export type TabType = 'dashboard' | 'contacts' | 'pipelines' | 'agents' | 'campaigns' | 'calls' | 'settings';

export interface CallTranscript {
  sender: 'agent' | 'customer' | 'system';
  text: string;
  timestamp: string;
}

export interface ActiveCall {
  id: string;
  contactId: string;
  contactName: string;
  phoneNumber: string;
  status: 'dialing' | 'active' | 'hangup' | 'incoming';
  direction: 'inbound' | 'outbound';
  duration: number;
  transcripts: CallTranscript[];
  agentName: string;
  isSimulation?: boolean;
}

interface AppState {
  activeTab: TabType;
  activeWorkspaceId: string;
  activeWorkspaceName: string;
  userPlan: 'Free' | 'Pro' | 'Enterprise';
  
  // Drawer/Details states
  selectedContactId: string | null;
  selectedCallId: string | null;
  
  // Active Call Session
  activeCall: ActiveCall | null;
  
  // Setters
  setActiveTab: (tab: TabType) => void;
  setWorkspace: (id: string, name: string, plan: 'Free' | 'Pro' | 'Enterprise') => void;
  setSelectedContactId: (id: string | null) => void;
  setSelectedCallId: (id: string | null) => void;
  
  // Active Call Actions
  startSimulatedCall: (contactId: string, contactName: string, phoneNumber: string, agentName: string, direction?: 'inbound' | 'outbound') => void;
  startRealCall: (callId: string, contactId: string, contactName: string, phoneNumber: string, agentName: string) => void;
  receiveSimulatedCall: (contactName: string, phoneNumber: string, agentName: string) => void;
  answerIncomingCall: () => void;
  endCall: () => void;
  updateCallDuration: () => void;
  addTranscriptSegment: (segment: CallTranscript) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  activeWorkspaceId: 'ws-1',
  activeWorkspaceName: 'Acme SaaS Corp',
  userPlan: 'Pro',
  selectedContactId: null,
  selectedCallId: null,
  activeCall: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setWorkspace: (id, name, plan) => set({ activeWorkspaceId: id, activeWorkspaceName: name, userPlan: plan }),
  setSelectedContactId: (id) => set({ selectedContactId: id }),
  setSelectedCallId: (id) => set({ selectedCallId: id }),

  startSimulatedCall: (contactId, contactName, phoneNumber, agentName, direction = 'outbound') => {
    const newCall: ActiveCall = {
      id: `call-${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      contactName,
      phoneNumber,
      status: 'dialing',
      direction,
      duration: 0,
      transcripts: [
        { sender: 'system', text: `Initiating outbound call via ${agentName}...`, timestamp: '00:00' }
      ],
      agentName,
      isSimulation: true
    };
    set({ activeCall: newCall });
  },

  startRealCall: (callId, contactId, contactName, phoneNumber, agentName) => {
    const newCall: ActiveCall = {
      id: callId,
      contactId,
      contactName,
      phoneNumber,
      status: 'dialing',
      direction: 'outbound',
      duration: 0,
      transcripts: [
        { sender: 'system', text: `Connecting outbound voice agent: ${agentName}...`, timestamp: '00:00' }
      ],
      agentName,
      isSimulation: false
    };
    set({ activeCall: newCall });
  },

  receiveSimulatedCall: (contactName, phoneNumber, agentName) => {
    const newCall: ActiveCall = {
      id: `call-${Math.random().toString(36).substr(2, 9)}`,
      contactId: `c-${Math.random().toString(36).substr(2, 9)}`,
      contactName,
      phoneNumber,
      status: 'incoming',
      direction: 'inbound',
      duration: 0,
      transcripts: [
        { sender: 'system', text: `Incoming call routed to AI Agent: ${agentName}`, timestamp: '00:00' }
      ],
      agentName,
      isSimulation: true
    };
    set({ activeCall: newCall });
  },

  answerIncomingCall: () => {
    set((state) => {
      if (!state.activeCall) return {};
      return {
        activeCall: {
          ...state.activeCall,
          status: 'active',
          transcripts: [
            ...state.activeCall.transcripts,
            { sender: 'system', text: 'Call answered. AI Agent is speaking...', timestamp: '00:00' }
          ]
        }
      };
    });
  },

  endCall: () => {
    set((state) => {
      if (!state.activeCall) return {};
      return {
        activeCall: {
          ...state.activeCall,
          status: 'hangup',
          transcripts: [
            ...state.activeCall.transcripts,
            { sender: 'system', text: 'Call ended by representative.', timestamp: '00:00' }
          ]
        }
      };
    });
    // Auto clear call widget after 3 seconds
    setTimeout(() => {
      set((state) => {
        if (state.activeCall?.status === 'hangup') {
          return { activeCall: null };
        }
        return {};
      });
    }, 3000);
  },

  updateCallDuration: () => {
    set((state) => {
      if (!state.activeCall || state.activeCall.status !== 'active') return {};
      return {
        activeCall: {
          ...state.activeCall,
          duration: state.activeCall.duration + 1
        }
      };
    });
  },

  addTranscriptSegment: (segment) => {
    set((state) => {
      if (!state.activeCall) return {};
      return {
        activeCall: {
          ...state.activeCall,
          transcripts: [...state.activeCall.transcripts, segment]
        }
      };
    });
  }
}));
