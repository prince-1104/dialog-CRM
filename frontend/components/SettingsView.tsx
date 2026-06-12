"use client";

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { configureDialog, testDialogConnection, DialogTestResponse } from '../lib/api';
import { 
  Sparkles, 
  Check, 
  Key, 
  ShieldCheck, 
  Database,
  CheckCircle,
  Link2,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  ExternalLink,
  Zap
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    activeWorkspaceName, 
    userPlan, 
    setWorkspace 
  } = useStore();

  const [workspaceName, setWorkspaceName] = useState(activeWorkspaceName);
  const [isSaved, setIsSaved] = useState(false);

  // Dialog Integration State
  const [dialogBaseUrl, setDialogBaseUrl] = useState('');
  const [dialogApiKey, setDialogApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load saved Dialog config from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('dialog_base_url') || '';
      const savedKeyMask = localStorage.getItem('dialog_api_key_mask') || '';
      const savedWebhook = localStorage.getItem('dialog_webhook_url') || '';
      const savedStatus = localStorage.getItem('dialog_connection_status') || 'idle';
      
      setDialogBaseUrl(savedUrl);
      if (savedKeyMask) {
        setDialogApiKey(savedKeyMask);
      }
      setWebhookUrl(savedWebhook);
      if (savedStatus === 'connected') {
        setConnectionStatus('connected');
      }
    }
  }, []);

  // Test connection on mount if previously connected
  useEffect(() => {
    if (connectionStatus === 'connected') {
      handleTestConnection(true);
    }
  }, []);

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setWorkspace('ws-1', workspaceName, userPlan);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handlePlanUpgrade = (tier: 'Free' | 'Pro' | 'Enterprise') => {
    setWorkspace('ws-1', activeWorkspaceName, tier);
  };

  const handleConfigureDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setErrorMessage('');
    setConnectionStatus('idle');

    try {
      const result = await configureDialog({
        dialog_base_url: dialogBaseUrl,
        dialog_api_key: dialogApiKey,
      });

      if (result.connected) {
        setConnectionStatus('connected');
        setWebhookUrl(result.webhook_url);
        
        // Persist state
        localStorage.setItem('dialog_base_url', dialogBaseUrl);
        localStorage.setItem('dialog_api_key_mask', dialogApiKey.substring(0, 12) + '••••••••');
        localStorage.setItem('dialog_webhook_url', result.webhook_url);
        localStorage.setItem('dialog_connection_status', 'connected');
        
        // Mask the key after saving
        setDialogApiKey(dialogApiKey.substring(0, 12) + '••••••••');
        setShowApiKey(false);
      }
    } catch (error: any) {
      setConnectionStatus('failed');
      const detail = error?.response?.data?.detail || 'Failed to connect to Dialog API. Please verify your credentials.';
      setErrorMessage(detail);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async (silent = false) => {
    setIsTesting(true);
    if (!silent) {
      setErrorMessage('');
    }

    try {
      const result: DialogTestResponse = await testDialogConnection();
      if (result.connected) {
        setConnectionStatus('connected');
        localStorage.setItem('dialog_connection_status', 'connected');
      } else {
        setConnectionStatus('failed');
        if (!silent) {
          setErrorMessage(result.error || 'Connection test failed.');
        }
      }
    } catch (error: any) {
      if (!silent) {
        setConnectionStatus('failed');
        setErrorMessage('Connection test failed. Credentials may be invalid.');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const plans = [
    {
      name: 'Free' as const,
      price: '$0',
      period: 'forever',
      features: [
        '1 Active AI Agent representative',
        '100 calling minutes per month',
        'Standard LLM latency routing',
        'Basic call logs transcript indices'
      ],
      color: 'border-zinc-800 bg-zinc-950/20'
    },
    {
      name: 'Pro' as const,
      price: '$79',
      period: 'workspace / mo',
      features: [
        'Unlimited AI Agents & voice synths',
        '5,000 calling minutes per month',
        'Custom instruction prompt configurations',
        'Real-time WebSocket event integrations',
        'Priority low-latency GPT-4o channels',
        'Sentiment mood logs summaries'
      ],
      color: 'border-purple-500 bg-purple-950/10 shadow-xl shadow-purple-950/10'
    },
    {
      name: 'Enterprise' as const,
      price: '$249',
      period: 'workspace / mo',
      features: [
        'Dedicated SIP trunk channel allocations',
        'Unlimited calling minutes (volume-discounted)',
        'Custom fine-tuned open weights models',
        'HIPAA compliant storage networks',
        'Dedicated SLA assistance contract'
      ],
      color: 'border-zinc-800 bg-zinc-950/20'
    }
  ];

  return (
    <div className="space-y-6 text-left pb-12">
      {/* Workspace settings layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace Form */}
        <div className="lg:col-span-2 bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
            <h3 className="text-sm font-bold text-zinc-200">Workspace Management</h3>
            {isSaved && (
              <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded">
                <CheckCircle className="h-3 w-3" /> Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveWorkspace} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Workspace Identifier</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Call Destination SIP Route (Webhook)</label>
              <input
                type="text"
                readOnly
                value="http://localhost:8000/api/webhooks/voice"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-zinc-500 outline-none select-all font-mono"
              />
            </div>

            <button 
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow shadow-purple-950/20"
            >
              Update Details
            </button>
          </form>
        </div>

        {/* Security / System Keys */}
        <div className="bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 pb-3 border-b border-zinc-900">Security Credentials</h3>
          
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1">
                <Key className="h-3 w-3" /> System Access Token
              </span>
              <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-[10px] text-zinc-500 font-mono truncate">
                7d8bf30a5d2eb4b74e64f7fa873d2a3f01c80f4f7831f24d7756f6ba3a681c2f
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Call Recording Encryption
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                AES-256 Enabled
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1">
                <Database className="h-3 w-3" /> Cloud DB Cluster
              </span>
              <span className="text-zinc-400 font-mono font-semibold text-[10px]">Neon Serverless PostgreSQL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Integration Section */}
      <div className="bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-600/20 to-violet-600/20 border border-purple-500/20">
              <Zap className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Dialog Voice AI Integration</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Connect your Dialog production instance to enable AI calling</p>
            </div>
          </div>
          
          {/* Connection Status Badge */}
          {connectionStatus === 'connected' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 animate-pulse">
              <Wifi className="h-3 w-3" /> Connected
            </span>
          )}
          {connectionStatus === 'failed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-500/20">
              <WifiOff className="h-3 w-3" /> Disconnected
            </span>
          )}
          {connectionStatus === 'idle' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-zinc-900 text-zinc-500 border border-zinc-800">
              <WifiOff className="h-3 w-3" /> Not Configured
            </span>
          )}
        </div>

        <form onSubmit={handleConfigureDialog} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Dialog Base URL
              </label>
              <input
                id="dialog-base-url"
                type="url"
                required
                value={dialogBaseUrl}
                onChange={(e) => { setDialogBaseUrl(e.target.value); setConnectionStatus('idle'); }}
                placeholder="https://dialog.noeticminds.com"
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-zinc-700 font-mono"
              />
              <p className="text-[9px] text-zinc-600">The base URL of your Dialog production deployment</p>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase flex items-center gap-1">
                <Key className="h-3 w-3" /> Dialog API Key
              </label>
              <div className="relative">
                <input
                  id="dialog-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  required
                  value={dialogApiKey}
                  onChange={(e) => { setDialogApiKey(e.target.value); setConnectionStatus('idle'); }}
                  placeholder="dk_live_••••••••••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-zinc-700 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600">Generated from Dialog → Dialer → API Integration</p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Webhook URL Display */}
          {webhookUrl && connectionStatus === 'connected' && (
            <div className="p-3 bg-emerald-950/10 border border-emerald-900/20 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-emerald-500/70 uppercase flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Registered Webhook URL
              </span>
              <p className="text-[11px] text-emerald-400 font-mono select-all break-all">{webhookUrl}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isConnecting || !dialogBaseUrl || !dialogApiKey}
              className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/40 disabled:text-purple-500/50 text-white rounded-xl transition-all shadow shadow-purple-950/20 flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Save & Connect
                </>
              )}
            </button>

            {connectionStatus === 'connected' && (
              <button
                type="button"
                onClick={() => handleTestConnection(false)}
                disabled={isTesting}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all flex items-center gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="h-3.5 w-3.5" />
                    Test Connection
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* SaaS Pricing Plans Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-purple-400" />
          <h3 className="text-sm font-bold text-zinc-200">SaaS License Plans & Tier Billing</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const isCurrent = userPlan === plan.name;
            return (
              <div 
                key={idx} 
                className={`p-6 border rounded-2xl flex flex-col h-[400px] text-left transition-all ${plan.color} ${
                  isCurrent ? 'ring-2 ring-purple-500/40 relative' : ''
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-6 px-3 py-0.5 bg-purple-600 text-[9px] font-black uppercase text-white rounded-full tracking-wider border border-purple-450 glow-purple">
                    Your Current Plan
                  </span>
                )}

                <div className="mb-4">
                  <h4 className="text-sm font-black text-zinc-350">{plan.name} Tier</h4>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-zinc-100">{plan.price}</span>
                    <span className="text-xs text-zinc-550">/ {plan.period}</span>
                  </div>
                </div>

                <div className="space-y-3.5 flex-1 mt-4">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs">
                      <div className="p-0.5 rounded-full bg-purple-600/10 text-purple-400 mt-0.5 border border-purple-500/20">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-zinc-400">{feat}</span>
                    </div>
                  ))}
                </div>

                <button 
                  disabled={isCurrent}
                  onClick={() => handlePlanUpgrade(plan.name)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold mt-6 transition-all ${
                    isCurrent 
                      ? 'bg-purple-950/20 text-purple-400 border border-purple-800/40 cursor-default' 
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {isCurrent ? 'Active Plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
