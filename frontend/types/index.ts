export type UserRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
export type WorkspacePlan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  dialog_base_url?: string;
  dialog_webhook_registered: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  workspace_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export type ContactSource = 'manual' | 'import' | 'api' | 'campaign';
export type ContactStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'customer' | 'churned';
export type CallOutcome = 'answered' | 'no_answer' | 'busy' | 'failed';

export interface Contact {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
  company?: string;
  designation?: string;
  source: ContactSource;
  tags: string[];
  custom_fields: Record<string, any>;
  lead_score: number;
  status: ContactStatus;
  assigned_to_id?: string;
  pipeline_id?: string;
  pipeline_stage_id?: string;
  last_called_at?: string;
  last_call_outcome?: CallOutcome;
  call_count: number;
  notes_count: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  workspace_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  stages: PipelineStage[];
}

export type DealStatus = 'open' | 'won' | 'lost';

export interface Deal {
  id: string;
  workspace_id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  assigned_to_id?: string;
  status: DealStatus;
  lost_reason?: string;
  created_at: string;
  updated_at: string;
}

export type CallDirection = 'outbound' | 'inbound';
export type CallStatus = 'initiating' | 'ringing' | 'in_progress' | 'transferred' | 'ended' | 'failed';
export type CallTransferType = 'cold' | 'warm';

export interface TranscriptTurn {
  role: 'agent' | 'user' | 'assistant' | 'human';
  content: string;
  timestamp: string;
  language: string;
}

export interface Call {
  id: string;
  workspace_id: string;
  contact_id?: string;
  campaign_id?: string;
  dialog_call_id: number;
  dialog_call_sid?: string;
  initiated_by_id?: string;
  phone: string;
  direction: CallDirection;
  status: CallStatus;
  outcome?: string;
  duration_seconds?: number;
  detected_intent?: string;
  intent_confidence?: number;
  was_transferred: boolean;
  transferred_to_agent_id?: string;
  transfer_reason?: string;
  transcript?: string;
  ai_summary?: string;
  live_transcript: TranscriptTurn[];
  estimated_cost_usd?: number;
  billed_cost_usd?: number;
  dialog_stream_url?: string;
  metadata: Record<string, any>;
  call_transfer_type?: CallTransferType;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CrmAgent {
  id: string;
  workspace_id: string;
  user_id?: string;
  dialog_crm_agent_id: string;
  name: string;
  phone: string;
  specialization?: string;
  intents: string[];
  max_concurrent_calls: number;
  is_available: boolean;
  dialog_synced: boolean;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'syncing' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignContactStatus = 'pending' | 'calling' | 'called_answered' | 'called_no_answer' | 'called_busy' | 'failed';

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  dialog_campaign_id?: number;
  status: CampaignStatus;
  total_contacts: number;
  stat_called: number;
  stat_answered: number;
  stat_interested: number;
  stat_not_interested: number;
  stat_transferred: number;
  stat_no_answer: number;
  start_time: string;
  end_time: string;
  timezone: string;
  max_concurrent_calls: number;
  created_by_id: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  contact_id: string;
  workspace_id: string;
  call_id?: string;
  status: CampaignContactStatus;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | 'call_made'
  | 'call_received'
  | 'call_missed'
  | 'note_added'
  | 'status_changed'
  | 'stage_moved'
  | 'deal_created'
  | 'deal_won'
  | 'deal_lost'
  | 'contact_imported'
  | 'campaign_enrolled'
  | 'intent_detected'
  | 'transfer_made';

export interface Activity {
  id: string;
  workspace_id: string;
  contact_id?: string;
  deal_id?: string;
  call_id?: string;
  user_id?: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Note {
  id: string;
  workspace_id: string;
  contact_id?: string;
  deal_id?: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
