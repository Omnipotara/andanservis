import type { BusinessSettings, Service } from '../types/booking';

export const businessDetails = {
  name: 'Andan Autoservis',
  city: 'Nova Pazova',
  country: 'Srbija',
  phone: 'Telefon uskoro',
  email: 'Email uskoro',
  address: 'Adresa uskoro',
  mapsUrl: '#',
  serviceArea: 'Nova Pazova i okolina',
  tone: 'Profesionalno, pouzdano, moderno',
};

export const businessSettings: BusinessSettings = {
  workdayStart: '08:00',
  workdayEnd: '17:00',
  globalBufferMinutes: 20,
};

export const services: Service[] = [
  {
    id: 'mali-servis',
    name: 'Mali servis',
    description: 'Zamena ulja i filtera uz osnovnu kontrolu vozila pre povratka na put.',
    fixedPrice: 8500,
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'dijagnostika',
    name: 'Auto dijagnostika',
    description: 'Precizno očitavanje grešaka i pregled sistema pre većih intervencija.',
    fixedPrice: 3500,
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'kocnice',
    name: 'Zamena kočnica',
    description: 'Pregled i zamena diskova, pločica i pratećih elemenata kočionog sistema.',
    fixedPrice: 6000,
    durationMinutes: 120,
    isActive: true,
  },
  {
    id: 'farovi',
    name: 'Čišćenje farova',
    description: 'Poliranje i zaštita farova za bolju vidljivost i uredniji izgled vozila.',
    fixedPrice: 4500,
    durationMinutes: 75,
    isActive: true,
  },
];

export const seoKeywords = [
  'Auto servis Nova Pazova',
  'Autoservis Nova Pazova',
  'Mali servis Nova Pazova',
  'Dijagnostika Nova Pazova',
  'Zamena kočnica Nova Pazova',
  'Čišćenje farova Nova Pazova',
];
