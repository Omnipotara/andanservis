import { businessSettings as fallbackBusinessSettings, services as fallbackServices } from '../data/business';
import { initialAppointments } from '../data/appointments';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppointmentRequest, BusinessSettings, Service } from '../types/booking';
import type { Database } from '../types/database';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type BusinessSettingsRow = Database['public']['Tables']['business_settings']['Row'];
type ServiceRow = Database['public']['Tables']['services']['Row'];

export type BookingRequestInput = Omit<AppointmentRequest, 'id' | 'status' | 'createdAt'>;

const normalizeTime = (time: string) => time.slice(0, 5);

const mapService = (service: ServiceRow): Service => ({
  id: service.id,
  name: service.name,
  description: service.description,
  fixedPrice: service.fixed_price,
  durationMinutes: service.duration_minutes,
  isActive: service.is_active,
});

const mapBusinessSettings = (settings: BusinessSettingsRow): BusinessSettings => ({
  workdayStart: normalizeTime(settings.workday_start),
  workdayEnd: normalizeTime(settings.workday_end),
  globalBufferMinutes: settings.global_buffer_minutes,
});

const normalizeServiceName = (value: string) => value.trim().toLocaleLowerCase('sr-RS');

const withFallbackServices = (services: Service[]) => {
  const existingServiceNames = new Set(
    services.map((service) => normalizeServiceName(service.name)),
  );
  const missingFallbackServices = fallbackServices.filter(
    (service) => !existingServiceNames.has(normalizeServiceName(service.name)),
  );

  return [...services, ...missingFallbackServices];
};

const mapAppointment = (appointment: AppointmentRow): AppointmentRequest => ({
  id: appointment.id,
  customerName: appointment.customer_name,
  phone: appointment.phone,
  email: appointment.email,
  vehicleBrand: appointment.vehicle_brand,
  vehicleModel: appointment.vehicle_model,
  vehicleYear: appointment.vehicle_year ?? '',
  vehicleVin: appointment.vehicle_vin,
  notes: appointment.notes ?? undefined,
  serviceId: appointment.service_id,
  requestedDate: appointment.requested_date,
  requestedTime: normalizeTime(appointment.requested_time),
  status: appointment.status,
  createdAt: appointment.created_at,
});

const toAppointmentInsert = (request: BookingRequestInput): AppointmentInsert => ({
  customer_name: request.customerName,
  phone: request.phone,
  email: request.email,
  vehicle_brand: request.vehicleBrand,
  vehicle_model: request.vehicleModel,
  vehicle_year: request.vehicleYear ?? null,
  vehicle_vin: request.vehicleVin,
  notes: request.notes ?? null,
  service_id: request.serviceId,
  requested_date: request.requestedDate,
  requested_time: request.requestedTime,
  status: 'pending',
});

export const getServices = async () => {
  if (!supabase) {
    return fallbackServices;
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return withFallbackServices(data.map(mapService));
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

export const createAppointmentRequest = async (request: BookingRequestInput) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('appointments').insert(toAppointmentInsert(request));

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
