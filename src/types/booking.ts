export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export type Service = {
  id: string;
  name: string;
  description: string;
  fixedPrice: number;
  durationMinutes: number;
  isActive: boolean;
};

export type AppointmentRequest = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleVin: string;
  notes?: string;
  serviceId: string;
  requestedDate: string;
  requestedTime: string;
  status: AppointmentStatus;
  createdAt: string;
};

export type BusinessSettings = {
  workdayStart: string;
  workdayEnd: string;
  globalBufferMinutes: number;
};
