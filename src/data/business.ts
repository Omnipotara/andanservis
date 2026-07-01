import type { BusinessSettings, Service } from '../types/booking';

export const businessDetails = {
  name: 'Andan Autoservis',
  city: 'Nova Pazova',
  country: 'Srbija',
  phone: '+381 63 8207512',
  email: 'Email uskoro',
  address: 'Adresa uskoro',
  mapsUrl: '#',
  whatsappUrl:
    'https://wa.me/381638207512?text=Zdravo%2C%20%C5%BEelim%20da%20zaka%C5%BEem%20servis%20u%20Andan%20Autoservisu.',
  serviceArea: 'Nova Pazova i okolina',
};

export const businessSettings: BusinessSettings = {
  workdayStart: '08:00',
  workdayEnd: '17:00',
  globalBufferMinutes: 20,
};

export const services: Service[] = [
  {
    id: 'mali-servis',
    slug: 'mali-servis',
    name: 'Mali servis',
    description: 'Zamena ulja i filtera uz osnovnu kontrolu vozila pre povratka na put.',
    fixedPrice: 8500,
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'dijagnostika',
    slug: 'dijagnostika',
    name: 'Auto dijagnostika',
    description: 'Precizno očitavanje grešaka i pregled sistema pre većih intervencija.',
    fixedPrice: 3500,
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'kocnice',
    slug: 'kocnice',
    name: 'Zamena kočnica',
    description: 'Pregled i zamena diskova, pločica i pratećih elemenata kočionog sistema.',
    fixedPrice: 6000,
    durationMinutes: 120,
    isActive: true,
  },
  {
    id: 'farovi',
    slug: 'farovi',
    name: 'Čišćenje farova',
    description: 'Poliranje i zaštita farova za bolju vidljivost i uredniji izgled vozila.',
    fixedPrice: 4500,
    durationMinutes: 75,
    isActive: true,
  },
  {
    id: 'nista-od-navedenog',
    slug: 'nista-od-navedenog',
    name: 'Ništa od navedenog',
    description: 'Pošaljite upit ako niste sigurni koju uslugu da izaberete.',
    fixedPrice: 0,
    durationMinutes: 30,
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
