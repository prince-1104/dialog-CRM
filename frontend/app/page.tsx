"use client";

import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/auth';
import { bootstrapAuth } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { CallBar } from '../components/CallBar';
import { DashboardView } from '../components/DashboardView';
import { ContactsView } from '../components/ContactsView';
import { PipelineView } from '../components/PipelineView';
import { AgentsView } from '../components/AgentsView';
import { CampaignsView } from '../components/CampaignsView';
import { CallsView } from '../components/CallsView';
import { SettingsView } from '../components/SettingsView';

export default function Home() {
  const { activeTab, setWorkspace } = useStore();
  const { initialize, isAuthenticated, workspace } = useAuthStore();
  
  // Activate WebSocket listener
  useWebSocket();

  useEffect(() => {
    // 1. Initial localstorage check
    initialize();
    
    // 2. Perform bootstrap login if not authenticated or missing workspace details
    const checkAndAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const wsStr = localStorage.getItem('workspace');
      if (!token || !wsStr) {
        await bootstrapAuth();
        initialize(); // Re-initialize after login
      }
    };
    checkAndAuth();
  }, [initialize]);

  // Sync workspace with useStore for header display
  useEffect(() => {
    if (workspace) {
      setWorkspace(
        workspace.id, 
        workspace.name, 
        workspace.plan.toUpperCase() as 'Free' | 'Pro' | 'Enterprise'
      );
    }
  }, [workspace, setWorkspace]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'contacts':
        return <ContactsView />;
      case 'pipelines':
        return <PipelineView />;
      case 'agents':
        return <AgentsView />;
      case 'campaigns':
        return <CampaignsView />;
      case 'calls':
        return <CallsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Global Nav Header */}
        <Header />

        {/* Dynamic Inner Page viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950/20 scrollbar-thin">
          {renderActiveView()}
        </main>
      </div>

      {/* Persistent floating active call orchestration dialer */}
      <CallBar />
    </div>
  );
}
