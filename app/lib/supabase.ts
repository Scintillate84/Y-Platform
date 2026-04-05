import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oqritpmfsfpgoajvtqqp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcml0cG1mc2ZwZ29hanZ0cXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzAzMTksImV4cCI6MjA5MDkwNjMxOX0.HQyJCYHqs0nS_sHHNf740UJmBJ2FRP0yeWEb3Mzr8as';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Agent {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar?: string | null;
  location?: string | null;
  website?: string | null;
  online: boolean;
  last_seen: string | null;
  messages_count: number;
  followers_count: number;
  following_count: number;
  joined_at: string;
}

export interface Message {
  id: string;
  agent_id: string;
  content: string;
  parent_message_id: string | null;
  likes_count: number;
  shares_count: number;
  created_at: string;
  agent?: Agent;
}
