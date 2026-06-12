import axios from 'axios';

// API Client pointing to backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to inject the token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Auto-login function to bootstrap authentication
export async function bootstrapAuth() {
  if (typeof window === 'undefined') return;
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admindev@local.com',
      password: 'admin123',
      workspace_slug: 'dialog-dev'
    });
    const { access_token, refresh_token, user, workspace } = response.data;
    localStorage.setItem('accessToken', access_token);
    localStorage.setItem('refreshToken', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('workspace', JSON.stringify(workspace));
    console.log('Successfully bootstrapped authentication.');
  } catch (error) {
    console.error('Failed to bootstrap authentication:', error);
  }
}

// Response interceptor to handle token expiry / auto login on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await bootstrapAuth();
      const token = localStorage.getItem('accessToken');
      if (token) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

// High-fidelity Interfaces
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'unqualified' | 'customer' | 'churned';
  source: string;
  tags: string[];
  owner: string;
  company?: string;
  createdAt: string;
  notes?: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stageId: string; // new, qualified, proposal, negotiation, won, lost
  contactId: string;
  contactName: string;
  companyName: string;
  status: 'active' | 'won' | 'lost' | 'open';
  probability: number;
  expectedCloseDate: string;
}

export interface PipelineStage {
  id: string;
  title: string;
  deals: Deal[];
  color: string;
}

export interface CrmAgent {
  id: string;
  name: string;
  voice: string;
  llmModel: string;
  prompt: string;
  temperature: number;
  speakingRate: number;
  assignedCampaignsCount: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'syncing' | 'active';
  totalLeads: number;
  calledCount: number;
  connectedCount: number;
  conversionCount: number;
  createdAt: string;
}

export interface CallLog {
  id: string;
  contactId: string;
  contactName: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'failed' | 'no-answer' | 'busy' | 'initiating' | 'ringing' | 'in_progress' | 'transferred' | 'ended';
  duration: number; // in seconds
  cost: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  agentName: string;
  createdAt: string;
  summary: string;
  transcription: { role: 'agent' | 'customer'; text: string; time: string }[];
}

// Mapping Utilities
export function mapBackendContact(c: any): Contact {
  return {
    id: c.id,
    name: `${c.first_name} ${c.last_name || ''}`.trim(),
    email: c.email || '',
    phone: c.phone || '',
    status: c.status,
    source: c.source === 'manual' ? 'Web Inbound' : c.source === 'api' ? 'API Partner' : c.source,
    tags: c.tags || [],
    owner: 'Sarah AI',
    company: c.company || 'Independent',
    createdAt: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    notes: c.custom_fields?.notes || ''
  };
}

export function mapBackendDeal(d: any, contacts: Contact[] = []): Deal {
  const contact = contacts.find(c => c.id === d.contact_id) || {};
  return {
    id: d.id,
    title: d.title,
    value: parseFloat(d.value),
    stageId: d.stage_id,
    contactId: d.contact_id,
    contactName: contact.name || 'Unknown Contact',
    companyName: contact.company || 'Independent',
    status: d.status === 'open' ? 'active' : d.status,
    probability: d.probability,
    expectedCloseDate: d.expected_close_date || d.created_at?.split('T')[0] || ''
  };
}

export function mapBackendAgent(a: any): CrmAgent {
  let localConfig = {
    voice: 'alloy-neural',
    llmModel: 'gpt-4o',
    prompt: 'You are Sarah, an empathetic sales representative for Dialog-CRM. Your goal is to qualify lead prospects by assessing their team size, call volume, and current CRM bottlenecks. Be highly professional, listen carefully, do not interrupt, and keep answers concise.',
    temperature: 0.7,
    speakingRate: 1.0,
  };

  if (a.name === 'Sarah AI') {
    localConfig = {
      voice: 'alloy-neural',
      llmModel: 'gpt-4o',
      prompt: 'You are Sarah, an empathetic sales representative for Dialog-CRM. Your goal is to qualify lead prospects by assessing their team size, call volume, and current CRM bottlenecks. Be highly professional, listen carefully, do not interrupt, and keep answers concise.',
      temperature: 0.7,
      speakingRate: 1.0,
    };
  } else if (a.name === 'Max AI') {
    localConfig = {
      voice: 'echo-neural',
      llmModel: 'claude-3-5-sonnet',
      prompt: 'You are Max, a friendly outbound customer success representative. You are reaching out to existing clients to guide them on activating their Call Automation dashboards. Offer to book a 10-minute slot with support if they face issues.',
      temperature: 0.5,
      speakingRate: 1.05,
    };
  } else if (a.name === 'Elena AI') {
    localConfig = {
      voice: 'shimmer-neural',
      llmModel: 'gemini-1.5-pro',
      prompt: 'You are Elena, a billing specialist assistant. Handle inquiries regarding subscription tier upgrades, invoice explanations, and payment failures. You must stay polite, confirm user identity, and provide simple breakdown figures.',
      temperature: 0.2,
      speakingRate: 0.95,
    };
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`agent_config_${a.id}`);
    if (saved) {
      try {
        localConfig = { ...localConfig, ...JSON.parse(saved) };
      } catch (e) {}
    }
  }

  return {
    id: a.id,
    name: a.name,
    voice: localConfig.voice,
    llmModel: localConfig.llmModel,
    prompt: localConfig.prompt,
    temperature: localConfig.temperature,
    speakingRate: localConfig.speakingRate,
    assignedCampaignsCount: 0,
    createdAt: a.created_at ? a.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

export function saveLocalAgentConfig(agentId: string, config: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`agent_config_${agentId}`, JSON.stringify(config));
}

export function mapBackendCampaign(c: any, agents: CrmAgent[] = []): Campaign {
  const agent = agents[0] || {};
  return {
    id: c.id,
    name: c.name,
    agentId: agent.id || '',
    agentName: agent.name || 'Sarah AI',
    status: c.status,
    totalLeads: c.total_contacts,
    calledCount: c.stat_called,
    connectedCount: c.stat_answered,
    conversionCount: c.stat_interested,
    createdAt: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

export function mapBackendCall(c: any, contacts: Contact[] = []): CallLog {
  const contact = contacts.find(con => con.id === c.contact_id) || {};
  const sentiment = c.detected_intent === 'interested' ? 'positive' : c.detected_intent === 'not_interested' ? 'negative' : 'neutral';
  
  const transcription = (c.live_transcript || []).map((t: any) => ({
    role: t.role === 'assistant' ? 'agent' : 'customer',
    text: t.content,
    time: t.timestamp || '0:00'
  }));

  return {
    id: c.id,
    contactId: c.contact_id || '',
    contactName: contact.name || `Phone ${c.phone}`,
    phoneNumber: c.phone,
    direction: c.direction,
    status: c.status === 'ended' ? 'completed' : c.status,
    duration: c.duration_seconds || 0,
    cost: parseFloat(c.billed_cost_usd || c.estimated_cost_usd || '0.00'),
    sentiment: sentiment,
    agentName: 'Sarah AI',
    createdAt: c.created_at ? c.created_at.replace('T', ' ').substring(0, 16) : '',
    summary: c.ai_summary || 'No summary available.',
    transcription: transcription.length > 0 ? transcription : [
      { role: 'agent', text: 'Hello! This is Sarah speaking.', time: '0:02' }
    ]
  };
}

// REAL API FUNCTIONS
export async function getContacts(): Promise<Contact[]> {
  try {
    const res = await apiClient.get('/contacts?limit=100');
    return (res.data.items || []).map(mapBackendContact);
  } catch (error) {
    console.error('getContacts failed, returning mock.', error);
    return mockContacts;
  }
}

export async function createContact(data: { name: string; email: string; phone: string; company?: string }): Promise<Contact> {
  const names = data.name.split(' ');
  const first_name = names[0];
  const last_name = names.slice(1).join(' ') || '';
  
  const res = await apiClient.post('/contacts', {
    first_name,
    last_name,
    email: data.email,
    phone: data.phone,
    company: data.company || 'Independent',
    status: 'new',
    source: 'manual'
  });
  return mapBackendContact(res.data);
}

export async function getPipelines(): Promise<any[]> {
  try {
    const res = await apiClient.get('/pipelines');
    return res.data;
  } catch (error) {
    console.error('getPipelines failed.', error);
    return [];
  }
}

export async function getDeals(): Promise<Deal[]> {
  try {
    const contacts = await getContacts();
    const res = await apiClient.get('/deals');
    return (res.data || []).map((d: any) => mapBackendDeal(d, contacts));
  } catch (error) {
    console.error('getDeals failed, returning mock.', error);
    return mockDeals;
  }
}

export async function createDeal(data: { title: string; value: number; contactId: string; stageId: string }): Promise<Deal> {
  const pipelines = await getPipelines();
  const defaultPipelineId = pipelines[0]?.id;
  if (!defaultPipelineId) throw new Error('No sales pipeline found.');

  const res = await apiClient.post('/deals', {
    title: data.title,
    value: data.value,
    contact_id: data.contactId,
    pipeline_id: defaultPipelineId,
    stage_id: data.stageId,
    currency: 'USD',
    probability: 40
  });

  const contacts = await getContacts();
  return mapBackendDeal(res.data, contacts);
}

export async function updateDealStage(dealId: string, stageId: string, status: string): Promise<Deal> {
  const res = await apiClient.patch(`/deals/${dealId}`, {
    stage_id: stageId,
    status: status === 'active' ? 'open' : status
  });
  const contacts = await getContacts();
  return mapBackendDeal(res.data, contacts);
}

export async function getAgents(): Promise<CrmAgent[]> {
  try {
    const res = await apiClient.get('/agents');
    return (res.data || []).map(mapBackendAgent);
  } catch (error) {
    console.error('getAgents failed, returning mock.', error);
    return mockAgents;
  }
}

export async function createAgent(data: { name: string; phone: string; specialization: string; intents: string[] }): Promise<CrmAgent> {
  const res = await apiClient.post('/agents', {
    name: data.name,
    phone: data.phone,
    specialization: data.specialization,
    intents: data.intents,
    max_concurrent_calls: 3
  });
  return mapBackendAgent(res.data);
}

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    const agents = await getAgents();
    const res = await apiClient.get('/campaigns');
    return (res.data || []).map((c: any) => mapBackendCampaign(c, agents));
  } catch (error) {
    console.error('getCampaigns failed, returning mock.', error);
    return mockCampaigns;
  }
}

export async function createCampaign(data: { name: string; description: string; contactPhones: string[] }): Promise<Campaign> {
  const contactsPayload = data.contactPhones.map(phone => ({ phone, firstName: 'Contact' }));
  const res = await apiClient.post('/campaigns', {
    name: data.name,
    description: data.description,
    contacts: contactsPayload,
    start_time: '09:00',
    end_time: '18:00',
    timezone: 'Asia/Kolkata',
    max_concurrent_calls: 2
  });
  
  const agents = await getAgents();
  return mapBackendCampaign(res.data, agents);
}

export async function getCalls(): Promise<CallLog[]> {
  try {
    const contacts = await getContacts();
    const res = await apiClient.get('/calls');
    return (res.data || []).map((c: any) => mapBackendCall(c, contacts));
  } catch (error) {
    console.error('getCalls failed, returning mock.', error);
    return mockCalls;
  }
}

export async function initiateCall(contactId: string, agentId?: string): Promise<any> {
  const res = await apiClient.post(`/contacts/${contactId}/call`, {
    transfer_rules: {
      intents: ['billing', 'complaint', 'pricing_query'],
      max_ai_turns: 8,
      human_request_threshold: 2
    },
    extra_metadata: {}
  });
  return res.data;
}

export async function getAnalyticsOverview() {
  const res = await apiClient.get('/analytics/overview');
  return res.data;
}

export async function getAnalyticsCalls() {
  const res = await apiClient.get('/analytics/calls');
  return res.data;
}

export async function getAnalyticsLeads() {
  const res = await apiClient.get('/analytics/leads');
  return res.data;
}

// Dialog Integration
export interface DialogConfigPayload {
  dialog_base_url: string;
  dialog_api_key: string;
}

export interface DialogConfigResponse {
  connected: boolean;
  webhook_url: string;
}

export interface DialogTestResponse {
  connected: boolean;
  error?: string;
}

export async function configureDialog(payload: DialogConfigPayload): Promise<DialogConfigResponse> {
  const res = await apiClient.patch('/workspace/dialog', payload);
  return res.data;
}

export async function testDialogConnection(): Promise<DialogTestResponse> {
  const res = await apiClient.get('/workspace/dialog/test');
  return res.data;
}

// Human Agents (Sales Executives)
export interface HumanAgent {
  id: string;
  workspace_id: string;
  user_id: string | null;
  agent_type: 'ai' | 'human';
  name: string;
  email: string | null;
  phone: string;
  specialization: string | null;
  intents: string[];
  max_concurrent_calls: number;
  is_available: boolean;
  availability_status: 'online' | 'away' | 'offline';
  dialog_synced: boolean;
  total_calls_handled: number;
  total_talk_time_seconds: number;
  successful_transfers: number;
  failed_transfers: number;
  last_active_at: string | null;
  avg_handle_time_seconds: number;
  transfer_success_rate: number;
  user_email: string | null;
  user_is_active: boolean | null;
  user_last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface HumanAgentCreatePayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  specialization?: string;
  intents?: string[];
  max_concurrent_calls?: number;
}

export async function getHumanAgents(): Promise<HumanAgent[]> {
  try {
    const res = await apiClient.get('/agents/human');
    return res.data;
  } catch (error) {
    console.error('getHumanAgents failed:', error);
    return [];
  }
}

export async function createHumanAgent(payload: HumanAgentCreatePayload): Promise<HumanAgent> {
  const res = await apiClient.post('/agents/human', payload);
  return res.data;
}

export async function updateHumanAgentStatus(agentId: string, status: 'online' | 'away' | 'offline'): Promise<HumanAgent> {
  const res = await apiClient.patch(`/agents/human/${agentId}/status`, { availability_status: status });
  return res.data;
}

export async function updateHumanAgent(agentId: string, data: { name?: string; phone?: string; specialization?: string; intents?: string[]; max_concurrent_calls?: number }): Promise<HumanAgent> {
  const res = await apiClient.patch(`/agents/human/${agentId}`, data);
  return res.data;
}

export async function deleteHumanAgent(agentId: string): Promise<void> {
  await apiClient.delete(`/agents/human/${agentId}`);
}

export async function getHumanAgentMetrics(agentId: string): Promise<any> {
  const res = await apiClient.get(`/agents/human/${agentId}/metrics`);
  return res.data;
}

// Workspace Members
export interface WorkspaceMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export async function getWorkspaceMembers(): Promise<WorkspaceMember[]> {
  try {
    const res = await apiClient.get('/workspace/members');
    return res.data;
  } catch (error) {
    console.error('getWorkspaceMembers failed:', error);
    return [];
  }
}

export async function inviteTeamMember(email: string, role: string): Promise<any> {
  const res = await apiClient.post('/auth/invite', { email, role });
  return res.data;
}

export async function removeTeamMember(userId: string): Promise<void> {
  await apiClient.delete(`/workspace/members/${userId}`);
}

// ============================================================================
// HIGH FIDELITY MOCK DATA (Fallback and simulation)
// ============================================================================

export const mockContacts: Contact[] = [
  { id: 'c-1', name: 'John Peterson', email: 'john@petersonlabs.io', phone: '+1 (555) 019-2834', status: 'qualified', source: 'Web Inbound', tags: ['Enterprise', 'Automotive'], owner: 'Sarah AI', company: 'Peterson Labs', createdAt: '2026-06-01' },
  { id: 'c-2', name: 'Melissa Vance', email: 'melissa@vanceinc.com', phone: '+1 (555) 014-9982', status: 'customer', source: 'Cold Outreach', tags: ['Mid-Market', 'Tech'], owner: 'Max AI', company: 'Vance Inc.', createdAt: '2026-05-28' },
  { id: 'c-3', name: 'Alistair Thorne', email: 'alistair@thorne.co.uk', phone: '+44 20 7946 0958', status: 'new', source: 'Referral', tags: ['Partner', 'Logistics'], owner: 'Elena AI', company: 'Thorne Logistics', createdAt: '2026-06-07' },
  { id: 'c-4', name: 'Samantha Reyes', email: 'sam@reyes-design.com', phone: '+1 (555) 018-4729', status: 'contacted', source: 'LinkedIn Outbound', tags: ['SMB', 'Design'], owner: 'Sarah AI', company: 'Reyes Design', createdAt: '2026-06-05' },
  { id: 'c-5', name: 'David Kim', email: 'd.kim@hypercloud.net', phone: '+82 2-312-3456', status: 'qualified', source: 'API Partner', tags: ['Enterprise', 'Cloud'], owner: 'Max AI', company: 'Hyper Cloud LLC', createdAt: '2026-06-03' },
  { id: 'c-6', name: 'Emma Watson', email: 'emma@watsonfinance.com', phone: '+1 (555) 013-1122', status: 'unqualified', source: 'Google Ads', tags: ['SMB', 'Finance'], owner: 'Elena AI', company: 'Watson Finance', createdAt: '2026-05-15' },
  { id: 'c-7', name: 'Carlos Mendez', email: 'carlos@mendez-dev.es', phone: '+34 91 372 8292', status: 'nurturing', source: 'Newsletter', tags: ['Developer', 'Web3'], owner: 'Sarah AI', company: 'Mendez Dev Studio', createdAt: '2026-06-02' }
];

export const mockDeals: Deal[] = [
  { id: 'd-1', title: '50 Seats Enterprise Upgrade', value: 24000, stageId: 'proposal', contactId: 'c-1', contactName: 'John Peterson', companyName: 'Peterson Labs', status: 'active', probability: 70, expectedCloseDate: '2026-06-30' },
  { id: 'd-2', title: 'Cloud Infrastructure Migration', value: 85000, stageId: 'negotiation', contactId: 'c-5', contactName: 'David Kim', companyName: 'Hyper Cloud LLC', status: 'active', probability: 90, expectedCloseDate: '2026-06-25' },
  { id: 'd-3', title: 'SMB Annual License Plan', value: 4800, stageId: 'qualified', contactId: 'c-4', contactName: 'Samantha Reyes', companyName: 'Reyes Design', status: 'active', probability: 40, expectedCloseDate: '2026-07-15' },
  { id: 'd-4', title: 'CRM Voicemail Setup Pilot', value: 1200, stageId: 'new', contactId: 'c-3', contactName: 'Alistair Thorne', companyName: 'Thorne Logistics', status: 'active', probability: 20, expectedCloseDate: '2026-08-01' },
  { id: 'd-5', title: 'Logistics Fleet Inbound Support', value: 45000, stageId: 'won', contactId: 'c-2', contactName: 'Melissa Vance', companyName: 'Vance Inc.', status: 'won', probability: 100, expectedCloseDate: '2026-06-05' }
];

export const mockStages: { id: string; title: string; color: string }[] = [
  { id: 'new', title: 'Incoming Lead', color: 'bg-zinc-800 border-zinc-700' },
  { id: 'qualified', title: 'Qualified Prospect', color: 'bg-blue-950/40 border-blue-900/50 text-blue-300' },
  { id: 'proposal', title: 'Proposal Sent', color: 'bg-purple-950/40 border-purple-900/50 text-purple-300' },
  { id: 'negotiation', title: 'Negotiations', color: 'bg-amber-950/40 border-amber-900/50 text-amber-300' },
  { id: 'won', title: 'Closed Won', color: 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' },
  { id: 'lost', title: 'Closed Lost', color: 'bg-rose-950/40 border-rose-900/50 text-rose-300' }
];

export const mockAgents: CrmAgent[] = [
  {
    id: 'a-1',
    name: 'Sarah AI',
    voice: 'alloy-neural',
    llmModel: 'gpt-4o',
    prompt: 'You are Sarah, an empathetic sales representative for Dialog-CRM. Your goal is to qualify lead prospects by assessing their team size, call volume, and current CRM bottlenecks. Be highly professional, listen carefully, do not interrupt, and keep answers concise.',
    temperature: 0.7,
    speakingRate: 1.0,
    assignedCampaignsCount: 2,
    createdAt: '2026-05-10'
  },
  {
    id: 'a-2',
    name: 'Max AI',
    voice: 'echo-neural',
    llmModel: 'claude-3-5-sonnet',
    prompt: 'You are Max, a friendly outbound customer success representative. You are reaching out to existing clients to guide them on activating their Call Automation dashboards. Offer to book a 10-minute slot with support if they face issues.',
    temperature: 0.5,
    speakingRate: 1.05,
    assignedCampaignsCount: 1,
    createdAt: '2026-05-12'
  },
  {
    id: 'a-3',
    name: 'Elena AI',
    voice: 'shimmer-neural',
    llmModel: 'gemini-1.5-pro',
    prompt: 'You are Elena, a billing specialist assistant. Handle inquiries regarding subscription tier upgrades, invoice explanations, and payment failures. You must stay polite, confirm user identity, and provide simple breakdown figures.',
    temperature: 0.2,
    speakingRate: 0.95,
    assignedCampaignsCount: 0,
    createdAt: '2026-05-20'
  }
];

export const mockCampaigns: Campaign[] = [
  { id: 'camp-1', name: 'Q2 Tech Founders Outbound', agentId: 'a-1', agentName: 'Sarah AI', status: 'active', totalLeads: 250, calledCount: 142, connectedCount: 89, conversionCount: 22, createdAt: '2026-06-01' },
  { id: 'camp-2', name: 'Billing Issues Recovery Campaign', agentId: 'a-3', agentName: 'Elena AI', status: 'paused', totalLeads: 45, calledCount: 20, connectedCount: 18, conversionCount: 12, createdAt: '2026-06-05' },
  { id: 'camp-3', name: 'Auto-Renewal Warm Welcome', agentId: 'a-2', agentName: 'Max AI', status: 'completed', totalLeads: 120, calledCount: 120, connectedCount: 94, conversionCount: 68, createdAt: '2026-05-15' }
];

export const mockCalls: CallLog[] = [
  {
    id: 'call-101',
    contactId: 'c-1',
    contactName: 'John Peterson',
    phoneNumber: '+1 (555) 019-2834',
    direction: 'outbound',
    status: 'completed',
    duration: 148,
    cost: 0.22,
    sentiment: 'positive',
    agentName: 'Sarah AI',
    createdAt: '2026-06-08 14:32',
    summary: 'Prospect expressed strong interest in adding 50 more seats to the Enterprise Plan. Inquired about bulk discount rates and API webhook integration details. Sarah suggested an email quote and scheduled a proposal review.',
    transcription: [
      { role: 'agent', text: 'Hello, this is Sarah from Dialog CRM. Am I speaking with John?', time: '0:02' },
      { role: 'customer', text: 'Yes, this is John. What is this regarding?', time: '0:06' },
      { role: 'agent', text: 'I noticed your team recently hit the limits of the growth plan calls. I wanted to see if upgrading to our Enterprise module with custom AI agents would help your workflow.', time: '0:15' },
      { role: 'customer', text: 'Ah, yes! Actually, we were looking into adding 50 more seats. Do you have bulk discount rates for that tier?', time: '0:26' },
      { role: 'agent', text: 'Absolutely. For 50+ seats, we can reduce the base licensing fee by 20% and provide custom SIP trunks. I can email you the full proposal now.', time: '0:38' },
      { role: 'customer', text: 'That sounds perfect. Go ahead and send it to john@petersonlabs.io. I will check it over with the billing team.', time: '0:50' },
      { role: 'agent', text: 'Terrific! I will send that over immediately and schedule a short catch-up for Thursday. Have a wonderful day!', time: '0:59' }
    ]
  },
  {
    id: 'call-102',
    contactId: 'c-2',
    contactName: 'Melissa Vance',
    phoneNumber: '+1 (555) 014-9982',
    direction: 'outbound',
    status: 'completed',
    duration: 84,
    cost: 0.12,
    sentiment: 'neutral',
    agentName: 'Max AI',
    createdAt: '2026-06-08 11:15',
    summary: 'Max followed up on account setup. Melissa stated she is currently too busy but would appreciate a reminder email with setup instructions.',
    transcription: [
      { role: 'agent', text: 'Hi Melissa, Max here from Dialog CRM. I hope you are having a nice Monday.', time: '0:03' },
      { role: 'customer', text: 'Hi Max. Actually, I am in the middle of a release right now. Can we do this later?', time: '0:09' },
      { role: 'agent', text: 'Of course, I completely understand. I will send a quick recap of the setup guide to your email and follow up next week.', time: '0:18' },
      { role: 'customer', text: 'Great, thanks Max. Appreciate it.', time: '0:22' }
    ]
  },
  {
    id: 'call-103',
    contactId: 'c-4',
    contactName: 'Samantha Reyes',
    phoneNumber: '+1 (555) 018-4729',
    direction: 'inbound',
    status: 'completed',
    duration: 215,
    cost: 0.31,
    sentiment: 'negative',
    agentName: 'Elena AI',
    createdAt: '2026-06-07 16:45',
    summary: 'Inbound billing complaint. Customer was charged for a dormant user account. Elena resolved the issue by issuing a credit of $49 back to the card on file, returning the customer to a satisfied state.',
    transcription: [
      { role: 'customer', text: 'Hello, I just saw my credit card statement and I was charged for an extra active user that was deactivated two months ago.', time: '0:05' },
      { role: 'agent', text: 'Hello Samantha. I apologize for the inconvenience. Let me look up your workspace details immediately.', time: '0:14' },
      { role: 'customer', text: 'It should be Reyes Design. The user is greg@reyes-design.com.', time: '0:22' },
      { role: 'agent', text: 'Thank you. I see the logs showing Greg was deactivated in April, but the seat allotment was not updated. I have canceled that seat and processed a credit refund of forty-nine dollars.', time: '0:45' },
      { role: 'customer', text: 'Oh, okay. How long will the refund take to show up?', time: '0:54' },
      { role: 'agent', text: 'It usually takes three to five business days to clear with your bank. I have sent an email confirmation of this transaction.', time: '1:06' },
      { role: 'customer', text: 'Awesome, thanks for fixing that so fast. Goodbye.', time: '1:14' }
    ]
  }
];

export const agentScripts = {
  greetings: [
    "Hello! This is Sarah from Dialog CRM. Hope you are doing great today.",
    "Hi there! Max calling from Dialog CRM. I noticed you were exploring our voice pipelines.",
    "Hello! Welcome to Dialog Billing Support. Elena speaking, how can I assist you today?"
  ],
  responses: [
    "Interesting! Our platform actually integrates AI representatives that can speak with your customers in real time.",
    "Yes, we fully support custom SIP trunk connections and multi-tenant voice logs.",
    "I can definitely set up a custom workflow trigger for your outbound campaigns.",
    "That makes perfect sense. Let me write a note to schedule a follow-up session with our engineering leads.",
    "I understand. We can process a credit adjustment or issue a refund immediately."
  ],
  goodbyes: [
    "Thanks for chatting! I will send over the summary email. Goodbye!",
    "Great speaking with you. Take care and have a wonderful rest of your day!",
    "Thank you for contacting Dialog CRM. Please let us know if you need anything else. Bye!"
  ]
};
