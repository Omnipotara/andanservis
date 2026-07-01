import { businessSettings as fallbackBusinessSettings, services as fallbackServices } from '../data/business';
import { initialAppointments } from '../data/appointments';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppointmentRequest, BusinessSettings, Service } from '../types/booking';
import type { Database } from '../types/database';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type BusinessSettingsRow = Database['public']['Tables']['business_settings']['Row'];
type PublicServiceRow = Database['public']['Functions']['get_public_services']['Returns'][number];

export type BookingRequestInput = Omit<AppointmentRequest, 'id' | 'status' | 'createdAt'>;

const normalizeTime = (time: string) => time.slice(0, 5);

const mapPublicService = (service: PublicServiceRow): Service => ({
  id: service.id,
  slug: service.slug,
  name: service.name,
  description: service.description,
  isActive: service.is_active,
});

const mapBusinessSettings = (settings: BusinessSettingsRow): BusinessSettings => ({
  workdayStart: normalizeTime(settings.workday_start),
  workdayEnd: normalizeTime(settings.workday_end),
  globalBufferMinutes: settings.global_buffer_minutes,
});

const mapAppointment = (appointment: AppointmentRow): AppointmentRequest => ({
  id: appointment.id,
  customerName: appointment.customer_name,
  phone: appointment.phone,
  email: appointment.email,
  vehicleBrand: appointment.vehicle_brand,
  vehicleModel: appointment.vehicle_model,
  vehicleYear: appointment.vehicle_year ?? '',
  vehicleVin: appointment.vehicle_vin ?? '',
  notes: appointment.notes ?? undefined,
  serviceId: appointment.service_id,
  requestedDate: appointment.requested_date,
  requestedTime: normalizeTime(appointment.requested_time),
  status: appointment.status,
  createdAt: appointment.created_at,
});

export const getServices = async () => {
  if (!supabase) {
    return fallbackServices;
  }

  const { data, error } = await supabase.rpc('get_public_services');

  if (error) {
    throw error;
  }

  return data.map(mapPublicService);
};

export const getBusinessSettings = async () => {
  if (!supabase) {
    return fallbackBusinessSettings;
  }

  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('id', true)
    .single();

  if (error) {
    throw error;
  }

  return mapBusinessSettings(data);
};

export const getAdminAppointments = async () => {
  if (!supabase) {
    return initialAppointments;
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(mapAppointment);
};

export const getApprovedAppointmentSlots = async (): Promise<AppointmentRequest[]> => {
  if (!supabase) {
    return initialAppointments.filter((appointment) => appointment.status === 'approved');
  }

  const { data, error } = await supabase.rpc('get_approved_appointment_slots');

  if (error) {
    throw error;
  }

  return data.map((appointment) => ({
    id: appointment.id,
    customerName: '',
    phone: '',
    email: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleVin: '',
    serviceId: appointment.service_id,
    requestedDate: appointment.requested_date,
    requestedTime: normalizeTime(appointment.requested_time),
    status: 'approved',
    createdAt: appointment.created_at,
  }));
};

export const getAvailableAppointmentSlots = async (serviceId: string, requestedDate: string) => {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_available_appointment_slots', {
    p_requested_date: requestedDate,
    p_service_id: serviceId,
  });

  if (error) {
    throw error;
  }

  return data.map((slot) => normalizeTime(slot.available_time));
};

export const createAppointmentRequest = async (request: BookingRequestInput) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc('create_appointment_request', {
    p_customer_name: request.customerName,
    p_email: request.email,
    p_notes: request.notes ?? null,
    p_phone: request.phone,
    p_requested_date: request.requestedDate,
    p_requested_time: request.requestedTime,
    p_service_id: request.serviceId,
    p_vehicle_brand: request.vehicleBrand,
    p_vehicle_model: request.vehicleModel,
    p_vehicle_vin: request.vehicleVin || null,
    p_vehicle_year: request.vehicleYear || null,
  });

  if (error) {
    throw error;
  }
};

export const approveAppointmentRequest = async (appointmentId: string) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc('approve_appointment', {
    target_appointment_id: appointmentId,
  });

  if (error) {
    throw error;
  }
};

export const rejectAppointmentRequest = async (appointmentId: string) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc('reject_appointment', {
    target_appointment_id: appointmentId,
  });

  if (error) {
    throw error;
  }
};

export const completeAppointmentRequest = async (appointmentId: string) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc('complete_appointment', {
    target_appointment_id: appointmentId,
  });

  if (error) {
    throw error;
  }
};

export { isSupabaseConfigured };
