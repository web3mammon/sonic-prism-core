// Voice AI related types

export interface VoiceAIClient {
  id: string;
  user_id: string;
  client_id: string;
  region: string;
  industry: string;
  business_name: string;
  status: 'active' | 'inactive' | 'starting' | 'stopping' | 'error';
  phone_number?: string;
  channel_type?: 'phone' | 'website' | 'both';
  voice_id?: string;  // Top-level field (matches database schema)
  call_transfer_number?: string;
  call_transfer_enabled?: boolean;

  // Actual database fields (config column dropped Oct 29, 2025)
  system_prompt?: string;
  greeting_message?: string;
  business_hours?: any;  // JSONB - business hours schedule
  timezone?: string;  // IANA timezone

  // Trial tracking
  trial_calls?: number;
  trial_calls_used?: number;
  trial_conversations?: number;
  trial_conversations_used?: number;
  trial_starts_at?: string;
  trial_ends_at?: string;

  created_at: string;
  updated_at: string;
}

export interface CallSession {
  id: string;
  client_id: string;
  call_sid: string;
  caller_number?: string;
  status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  transcript: any[];
  transcript_summary?: string;
  recording_url?: string;
  cost_amount: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AudioFile {
  id: string;
  client_id: string;
  file_name: string;
  file_path: string;
  file_type: 'tts_generated' | 'uploaded' | 'system';
  voice_id?: string;
  text_content?: string;
  duration_ms?: number;
  file_size_bytes?: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SMSLog {
  id: string;
  client_id: string;
  phone_number: string;
  message_type: 'payment_link' | 'onboarding' | 'appointment' | 'follow_up' | 'custom';
  message_content: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  twilio_sid?: string;
  cost_amount: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface PhoneNumber {
  id: string;
  phone_number: string;
  twilio_sid: string;
  region: string;
  status: 'available' | 'assigned' | 'reserved' | 'suspended';
  assigned_client_id?: string;
  assigned_at?: string;
  purchase_date: string;
  monthly_cost: number;
  metadata: Record<string, any>;
}

export interface VoiceAIStats {
  totalClients: number;
  activeClients: number;
  activeCalls: number;
  todayRevenue: number;
  totalCalls: number;
  avgCallDuration: number;
  successRate: number;
}