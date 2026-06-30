import { businessSettings, services } from '../data/business';
import type { AppointmentRequest, Service } from '../types/booking';

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (value: number) => {
  const hours = Math.floor(value / 60).toString().padStart(2, '0');
  const minutes = (value % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(price);

export const getService = (serviceId: string) =>
  services.find((service) => service.id === serviceId);

export const getOccupiedRange = (appointment: AppointmentRequest, service?: Service) => {
  const appointmentService = service ?? getService(appointment.serviceId);
  const start = timeToMinutes(appointment.requestedTime);
  const duration = appointmentService?.durationMinutes ?? 60;

  return {
    start,
    end: start + duration + businessSettings.globalBufferMinutes,
  };
};

export const appointmentsConflict = (
  appointment: AppointmentRequest,
  candidate: AppointmentRequest,
) => {
  if (appointment.requestedDate !== candidate.requestedDate) {
    return false;
  }

  const first = getOccupiedRange(appointment);
  const second = getOccupiedRange(candidate);

  return first.start < second.end && second.start < first.end;
};

export const getAvailableSlots = (
  service: Service,
  date: string,
  appointments: AppointmentRequest[],
) => {
  const slots: string[] = [];
  const slotInterval = 30;
  const start = timeToMinutes(businessSettings.workdayStart);
  const end = timeToMinutes(businessSettings.workdayEnd);
  const required = service.durationMinutes + businessSettings.globalBufferMinutes;
  const approvedAppointments = appointments.filter((appointment) => appointment.status === 'approved');

  for (let value = start; value + required <= end; value += slotInterval) {
    const candidate: AppointmentRequest = {
      id: 'candidate',
      customerName: '',
      phone: '',
      email: '',
      vehicleBrand: '',
      vehicleModel: '',
      serviceId: service.id,
      requestedDate: date,
      requestedTime: minutesToTime(value),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const blocked = approvedAppointments.some((appointment) =>
      appointmentsConflict(appointment, candidate),
    );

    if (!blocked) {
      slots.push(candidate.requestedTime);
    }
  }

  return slots;
};

export const statusLabel = {
  pending: 'Na čekanju',
  approved: 'Odobreno',
  rejected: 'Odbijeno',
} as const;
