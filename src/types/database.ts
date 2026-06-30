import type { AppointmentStatus } from './booking';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          customer_name: string;
          phone: string;
          email: string;
          vehicle_brand: string;
          vehicle_model: string;
          vehicle_year: string | null;
          vehicle_vin: string;
          notes: string | null;
          service_id: string;
          requested_date: string;
          requested_time: string;
          status: AppointmentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          phone: string;
          email: string;
          vehicle_brand: string;
          vehicle_model: string;
          vehicle_year?: string | null;
          vehicle_vin: string;
          notes?: string | null;
          service_id: string;
          requested_date: string;
          requested_time: string;
          status?: AppointmentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_name?: string;
          phone?: string;
          email?: string;
          vehicle_brand?: string;
          vehicle_model?: string;
          vehicle_year?: string | null;
          vehicle_vin?: string;
          notes?: string | null;
          service_id?: string;
          requested_date?: string;
          requested_time?: string;
          status?: AppointmentStatus;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'appointments_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      blocked_dates: {
        Row: {
          id: string;
          date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          date?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      business_settings: {
        Row: {
          id: boolean;
          workday_start: string;
          workday_end: string;
          global_buffer_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          workday_start?: string;
          workday_end?: string;
          global_buffer_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workday_start?: string;
          workday_end?: string;
          global_buffer_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          fixed_price: number;
          duration_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          fixed_price: number;
          duration_minutes: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string;
          fixed_price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<PropertyKey, never>;
    Functions: {
      approve_appointment: {
        Args: {
          target_appointment_id: string;
        };
        Returns: void;
      };
      reject_appointment: {
        Args: {
          target_appointment_id: string;
        };
        Returns: void;
      };
      complete_appointment: {
        Args: {
          target_appointment_id: string;
        };
        Returns: void;
      };
      get_approved_appointment_slots: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          service_id: string;
          requested_date: string;
          requested_time: string;
          created_at: string;
        }[];
      };
      current_user_is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      appointment_status: AppointmentStatus;
    };
    CompositeTypes: Record<PropertyKey, never>;
  };
};
