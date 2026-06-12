import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useCallsStore } from '../store/calls';
import { useNotificationsStore } from '../store/notifications';
import { useStore } from '../store/useStore';
import { CallStatus } from '../types';

export const useWebSocket = () => {
  const { workspace, accessToken } = useAuthStore();
  const { 
    updateCallStatus, 
    addTranscriptTurn, 
    updateCallIntent, 
    removeActiveCall, 
    setCallDetails 
  } = useCallsStore();
  
  const { addNotification } = useNotificationsStore();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!workspace?.id || !accessToken) return;

    // Use default values matching Nginx reverse proxy schema if undefined
    const defaultWsBase = typeof window !== 'undefined' 
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` 
      : 'ws://localhost/ws';
      
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || defaultWsBase;
    const wsUrl = `${wsBase}/${workspace.id}?token=${accessToken}`;
    
    logger_log(`Connecting to WebSocket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      logger_log('WS connection established successfully');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, callId, data } = message;
        if (!type || !callId) return;

        switch (type) {
          case 'call.ringing': {
            updateCallStatus(callId, 'ringing');
            addNotification(`Call ringing: ${data.phone}`, 'info');
            const activeCall = useStore.getState().activeCall;
            if (activeCall && activeCall.id === callId) {
              useStore.setState({ activeCall: { ...activeCall, status: 'dialing' } });
            }
            break;
          }

          case 'call.turn': {
            addTranscriptTurn(callId, {
              role: data.role,
              content: data.content,
              timestamp: new Date().toISOString(),
              language: data.language || 'en',
            });
            const activeCall = useStore.getState().activeCall;
            if (activeCall && activeCall.id === callId) {
              if (activeCall.status !== 'active') {
                useStore.setState({ activeCall: { ...activeCall, status: 'active' } });
              }
              const role = data.role === 'assistant' || data.role === 'agent' ? 'agent' : 'customer';
              useStore.getState().addTranscriptSegment({
                sender: role,
                text: data.content,
                timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
              });
            }
            break;
          }

          case 'call.intent':
            updateCallIntent(callId, data.intent, data.confidence);
            addNotification(`Detected customer intent: ${data.intent} (${Math.round(data.confidence * 100)}%)`, 'success');
            break;

          case 'call.transferring':
            setCallDetails(callId, {
              status: 'transferred',
              was_transferred: true,
              transfer_reason: data.reason,
            });
            addNotification(`Call is transferring to human agent. Reason: ${data.reason}`, 'warning');
            break;

          case 'call.transferred':
            updateCallStatus(callId, 'transferred');
            addNotification('Call transfer complete', 'success');
            break;

          case 'call.ended': {
            updateCallStatus(callId, 'ended');
            addNotification(`Call ended. Outcome: ${data.outcome}`, 'info');
            const activeCall = useStore.getState().activeCall;
            if (activeCall && activeCall.id === callId) {
              useStore.getState().endCall();
            }
            // Remove active call after 15 seconds to allow summary viewing
            setTimeout(() => {
              removeActiveCall(callId);
            }, 15000);
            break;
          }

          case 'call.error':
            updateCallStatus(callId, 'failed');
            addNotification(`Call failure: ${data.error}`, 'error');
            break;

          case 'agent.availability':
            addNotification(`Agent ${data.name} is now ${data.isAvailable ? 'online' : 'offline'}`, 'info');
            break;

          case 'notification':
            addNotification(data.message, data.severity || 'info');
            break;

          default:
            logger_log(`Unhandled websocket message type: ${type}`);
        }
      } catch (err) {
        console.error('Error parsing websocket payload:', err);
      }
    };

    socket.onclose = () => {
      logger_log('WS connection closed');
    };

    socket.onerror = (err) => {
      console.error('WS error:', err);
    };

    return () => {
      socket.close();
    };
  }, [workspace?.id, accessToken]);

  function logger_log(msg: string) {
     console.log(`[WS-Hook] ${msg}`);
  }

  return socketRef.current;
};
