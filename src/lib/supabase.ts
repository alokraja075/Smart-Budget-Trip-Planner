import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          origin: string;
          destination: string;
          start_date: string;
          end_date: string;
          currency: string;
          total_budget: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
      };
      budgets: {
        Row: {
          id: string;
          trip_id: string;
          category: 'transport' | 'stay' | 'activity' | 'misc';
          cap: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
      prefs: {
        Row: {
          id: string;
          trip_id: string;
          weight_cost: number;
          weight_time: number;
          weight_comfort: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['prefs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['prefs']['Insert']>;
      };
      segments: {
        Row: {
          id: string;
          trip_id: string;
          type: 'transport' | 'stay' | 'activity';
          title: string;
          provider: string;
          start_ts: string;
          end_ts: string;
          duration_min: number;
          comfort_score: number;
          price: number;
          currency: string;
          locked: boolean;
          status: string;
          meta: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['segments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['segments']['Insert']>;
      };
      quotes: {
        Row: {
          id: string;
          segment_id: string | null;
          trip_id: string;
          type: 'transport' | 'stay' | 'activity';
          source: string;
          price: number;
          currency: string;
          duration_min: number;
          comfort_score: number;
          options: Record<string, any>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          trip_id: string;
          kind: 'delay' | 'weather' | 'price_change' | 'fx_change';
          payload: Record<string, any>;
          severity: 'info' | 'warning' | 'critical';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
    };
  };
};
