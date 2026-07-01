import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCheck,
  Disc3,
  Droplets,
  Lightbulb,
  MessageCircle,
  LogOut,
  MapPin,
  Menu,
  Phone,
  ScanSearch,
  ShieldCheck,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import heroImage from './assets/workshop-hero.png';
import { initialAppointments } from './data/appointments';
import {
  businessDetails,
  businessSettings as fallbackBusinessSettings,
  services as fallbackServices,
} from './data/business';
import {
  getCurrentAdminUser,
  signInAdmin,
  signOutAdmin,
  type AdminUser,
} from './services/authService';
import {
  approveAppointmentRequest,
  completeAppointmentRequest,
  createAppointmentRequest,
  getAdminAppointments,
  getApprovedAppointmentSlots,
  getAvailableAppointmentSlots,
  getBusinessSettings,
  getServices,
  isSupabaseConfigured,
  rejectAppointmentRequest,
} from './services/bookingService';
import type { AppointmentRequest, BusinessSettings, Service } from './types/booking';
import {
  appointmentsConflict,
  getAvailableSlots,
  getService,
  statusLabel,
} from './utils/booking';

const navItems = [
  { id: 'pocetna', label: 'Početna' },
  { id: 'usluge', label: 'Usluge' },
  { id: 'zakazivanje', label: 'Zakazivanje' },
  { id: 'kontakt', label: 'Kontakt' },
];

const adminPath = '/andanadminstrana';
const priceInquiryOptionValue = '__price_inquiry__';
const priceInquiryServiceSlug = 'nista-od-navedenog';

const heroHighlights = [
  {
    title: 'Jasan zahtev',
    text: 'Pošaljite podatke i servis pregleda upit.',
    icon: ShieldCheck,
  },
  {
    title: 'Kontrola termina',
    text: 'Termin je zauzet tek kada ga admin odobri.',
    icon: CalendarCheck,
  },
  {
    title: 'Lokalni servis',
    text: 'Fokus na Novu Pazovu i okolinu.',
    icon: MapPin,
  },
];

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const today = formatInputDate(new Date());
const minimumRequestDate = formatInputDate(addDays(new Date(), 1));
const priceInquiryRequestDate = formatInputDate(addDays(new Date(), 2));

type BookingForm = {
  serviceId: string;
  requestedDate: string;
  requestedTime: string;
  customerName: string;
  phone: string;
  email: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleVin: string;
  notes: string;
};

type AdminLoginForm = {
  email: string;
  password: string;
};

const emptyForm: BookingForm = {
  serviceId: fallbackServices[0]?.id ?? '',
  requestedDate: minimumRequestDate,
  requestedTime: '',
  customerName: '',
  phone: '',
  email: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleYear: '',
  vehicleVin: '',
  notes: '',
};

const adminStatusFilters = [
  { status: 'pending', label: 'Na čekanju' },
  { status: 'approved', label: 'Odobreno' },
  { status: 'completed', label: 'Završeno' },
  { status: 'rejected', label: 'Odbijeno' },
] as const;

const emptyAdminLoginForm: AdminLoginForm = {
  email: '',
  password: '',
};

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const normalizeServiceName = (value: string) => value.trim().toLocaleLowerCase('sr-RS');

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isBookingStartAllowed = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return false;
  }

  if (date <= today) {
    return false;
  }

  const bookingStart = new Date(year, month - 1, day, hours, minutes);
  const minimumStart = new Date();
  minimumStart.setHours(minimumStart.getHours() + 12);

  return bookingStart >= minimumStart;
};

const formatDisplayDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat('sr-Latn-RS', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

const getServiceIcon = (serviceName: string): LucideIcon => {
  const normalizedName = normalizeServiceName(serviceName);

  if (normalizedName.includes('dijagnostika')) {
    return ScanSearch;
  }

  if (normalizedName.includes('kočnica')) {
    return Disc3;
  }

  if (normalizedName.includes('farova')) {
    return Lightbulb;
  }

  if (normalizedName.includes('mali servis')) {
    return Droplets;
  }

  return Wrench;
};

function App() {
  const isAdminRoute = window.location.pathname === adminPath;
  const [menuOpen, setMenuOpen] = useState(false);
  const [appServices, setAppServices] = useState<Service[]>(fallbackServices);
  const [businessSettings, setBusinessSettings] =
    useState<BusinessSettings>(fallbackBusinessSettings);
  const [appointments, setAppointments] = useState<AppointmentRequest[]>(initialAppointments);
  const [availabilityAppointments, setAvailabilityAppointments] =
    useState<AppointmentRequest[]>(initialAppointments);
  const [remoteAvailableSlots, setRemoteAvailableSlots] = useState<string[]>([]);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [backendStatus, setBackendStatus] = useState(
    isSupabaseConfigured ? 'Sistem za zakazivanje se učitava...' : 'Lokalni pregled je aktivan.',
  );
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminForm, setAdminForm] = useState<AdminLoginForm>(emptyAdminLoginForm);
  const [adminStatus, setAdminStatus] = useState(
    isSupabaseConfigured
      ? 'Prijavi se kao admin da vidiš i odobravaš zahteve.'
      : 'Lokalni admin pregled je aktivan.',
  );
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAdminStatus, setActiveAdminStatus] =
    useState<AppointmentRequest['status']>('pending');
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const selectedService =
    appServices.find((service) => service.id === form.serviceId) ?? appServices[0];
  const priceInquiryService = appServices.find((service) => service.slug === priceInquiryServiceSlug);
  const isPriceInquiry = form.serviceId === priceInquiryOptionValue;
  const publicServices = appServices.filter((service) => service.slug !== priceInquiryServiceSlug);
  const canManageAppointments = !isSupabaseConfigured || Boolean(adminUser);

  useEffect(() => {
    let isMounted = true;

    const loadBookingData = async () => {
      if (!isSupabaseConfigured) {
        return;
      }

      try {
        const [remoteServices, remoteSettings, approvedSlots] = await Promise.all([
          getServices(),
          getBusinessSettings(),
          getApprovedAppointmentSlots(),
        ]);
        const adminAppointments = await getAdminAppointments().catch(() => null);

        if (!isMounted) {
          return;
        }

        setAppServices(remoteServices);
        setBusinessSettings(remoteSettings);
        setAppointments(adminAppointments ?? initialAppointments);
        setAvailabilityAppointments(adminAppointments ?? approvedSlots);
        setForm((current) => ({
          ...current,
          serviceId: remoteServices[0]?.id ?? current.serviceId,
        }));
        setBackendStatus('Sistem za zakazivanje je spreman.');
        setAdminStatus(
          adminAppointments
            ? 'Admin sesija je aktivna. Zahtevi su učitani iz baze.'
            : 'Prijavi se kao admin da vidiš i odobravaš zahteve.',
        );

        const currentAdmin = await getCurrentAdminUser();

        if (currentAdmin && isMounted) {
          const signedInAppointments = await getAdminAppointments();
          setAdminUser(currentAdmin);
          setAppointments(signedInAppointments);
          setAvailabilityAppointments(signedInAppointments);
          setAdminStatus('Admin sesija je aktivna. Zahtevi su učitani iz baze.');
        }
      } catch {
        if (isMounted) {
          setBackendStatus('Sistem trenutno koristi lokalni prikaz podataka.');
        }
      }
    };

    void loadBookingData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !selectedService || isPriceInquiry) {
      setRemoteAvailableSlots([]);
      return;
    }

    let isMounted = true;

    const loadAvailableSlots = async () => {
      try {
        const slots = await getAvailableAppointmentSlots(selectedService.id, form.requestedDate);

        if (isMounted) {
          setRemoteAvailableSlots(slots);
        }
      } catch {
        if (isMounted) {
          setRemoteAvailableSlots([]);
        }
      }
    };

    void loadAvailableSlots();

    return () => {
      isMounted = false;
    };
  }, [form.requestedDate, isPriceInquiry, selectedService]);

  const availableSlots = useMemo(() => {
    if (!selectedService || isPriceInquiry) {
      return [];
    }

    if (isSupabaseConfigured) {
      return remoteAvailableSlots;
    }

    return getAvailableSlots(
      selectedService,
      form.requestedDate,
      availabilityAppointments,
      businessSettings,
      appServices,
    ).filter((slot) => isBookingStartAllowed(form.requestedDate, slot));
  }, [
    appServices,
    availabilityAppointments,
    businessSettings,
    form.requestedDate,
    isPriceInquiry,
    remoteAvailableSlots,
    selectedService,
  ]);

  useEffect(() => {
    if (isPriceInquiry || !form.requestedTime || availableSlots.includes(form.requestedTime)) {
      return;
    }

    setForm((current) => ({
      ...current,
      requestedTime: '',
    }));
  }, [availableSlots, form.requestedTime, isPriceInquiry]);

  const pendingCount = appointments.filter((appointment) => appointment.status === 'pending').length;
  const approvedCount = appointments.filter((appointment) => appointment.status === 'approved').length;
  const completedCount = appointments.filter((appointment) => appointment.status === 'completed').length;
  const rejectedCount = appointments.filter((appointment) => appointment.status === 'rejected').length;
  const statusCounts = {
    pending: pendingCount,
    approved: approvedCount,
    completed: completedCount,
    rejected: rejectedCount,
  };
  const filteredAppointments = appointments
    .filter((appointment) => appointment.status === activeAdminStatus)
    .sort((first, second) => {
      if (activeAdminStatus === 'pending') {
        return second.createdAt.localeCompare(first.createdAt);
      }

      return `${first.requestedDate} ${first.requestedTime}`.localeCompare(
        `${second.requestedDate} ${second.requestedTime}`,
      );
    });

  const updateForm = (key: keyof BookingForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'serviceId' || key === 'requestedDate' ? { requestedTime: '' } : {}),
    }));
  };

  const updateAdminForm = (key: keyof AdminLoginForm, value: string) => {
    setAdminForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const refreshAdminAppointments = async () => {
    const remoteAppointments = await getAdminAppointments();
    setAppointments(remoteAppointments);
    setAvailabilityAppointments(remoteAppointments);
  };

  const submitAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAdminSubmitting(true);
    setAdminStatus('Prijava je u toku...');

    try {
      const admin = await signInAdmin(adminForm.email, adminForm.password);

      if (!admin) {
        throw new Error('Admin prijava trenutno nije dostupna.');
      }

      setAdminUser(admin);
      setAdminForm(emptyAdminLoginForm);
      await refreshAdminAppointments();
      setAdminStatus('Admin je prijavljen. Zahtevi su učitani iz baze.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Prijava nije uspela.';
      setAdminStatus(message);
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleAdminSignOut = async () => {
    try {
      await signOutAdmin();
      setAdminUser(null);
      setAdminStatus('Odjavljen si. Prijavi se kao admin za upravljanje zahtevima.');
      const approvedSlots = await getApprovedAppointmentSlots();
      setAppointments(initialAppointments);
      setAvailabilityAppointments(approvedSlots);
    } catch {
      setAdminStatus('Odjava nije uspela. Pokušaj ponovo.');
    }
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (isPriceInquiry && !priceInquiryService) {
      setBackendStatus('Upit za cenu trenutno nije dostupan. Pokušaj ponovo kasnije.');
      setIsSubmitting(false);
      return;
    }

    if (isPriceInquiry && (!form.vehicleYear.trim() || !form.vehicleVin.trim())) {
      setBackendStatus('Za upit za cenu unesite godište i broj šasije.');
      setIsSubmitting(false);
      return;
    }

    if (!isPriceInquiry && !isBookingStartAllowed(form.requestedDate, form.requestedTime)) {
      setBackendStatus('Izaberite termin koji nije danas i koji je najmanje 12 sati unapred.');
      setIsSubmitting(false);
      return;
    }

    if (isSupabaseConfigured && !isUuid(isPriceInquiry ? priceInquiryService?.id ?? '' : form.serviceId)) {
      setBackendStatus('Usluge se još učitavaju. Osvežite stranicu i pokušajte ponovo.');
      setIsSubmitting(false);
      return;
    }

    const requestDate = isPriceInquiry ? priceInquiryRequestDate : form.requestedDate;
    const requestTime = isPriceInquiry ? '08:00' : form.requestedTime;
    const requestNotes = isPriceInquiry
      ? ['Upit za cenu.', form.notes.trim()].filter(Boolean).join(' ')
      : form.notes || undefined;

    const request: AppointmentRequest = {
      id: `REQ-${Math.floor(2000 + Math.random() * 7000)}`,
      customerName: form.customerName,
      phone: form.phone,
      email: form.email,
      vehicleBrand: form.vehicleBrand,
      vehicleModel: form.vehicleModel,
      vehicleYear: form.vehicleYear,
      vehicleVin: form.vehicleVin,
      notes: requestNotes,
      serviceId: isPriceInquiry ? priceInquiryService?.id ?? form.serviceId : form.serviceId,
      requestedDate: requestDate,
      requestedTime: requestTime,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await createAppointmentRequest(request);
      setAppointments((current) => [request, ...current]);
      setAvailabilityAppointments((current) => [request, ...current]);
      setForm((current) => ({
        ...emptyForm,
        serviceId: appServices[0]?.id ?? current.serviceId,
        requestedDate: minimumRequestDate,
      }));
      setBackendStatus(
        isSupabaseConfigured
          ? 'Zahtev je poslat i čeka odobrenje.'
          : 'Zahtev je dodat u lokalni pregled.',
      );
    } catch {
      setBackendStatus('Zahtev nije poslat. Proveri podešavanja i pokušaj ponovo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveAppointment = async (appointmentId: string) => {
    const approved = appointments.find((appointment) => appointment.id === appointmentId);

    if (!approved) {
      return;
    }

    try {
      await approveAppointmentRequest(appointmentId);
      if (isSupabaseConfigured) {
        await refreshAdminAppointments();
        setAdminStatus('Zahtev je odobren. Konfliktni pending zahtevi su odbijeni.');
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Proveri da li je korisnik admin.';
      setAdminStatus(`Odobravanje nije uspelo. ${message}`);
      return;
    }

    setAppointments((current) =>
      current.map((appointment) => {
        if (appointment.id === appointmentId) {
          return { ...appointment, status: 'approved' };
        }

        if (
          appointment.status === 'pending' &&
          appointmentsConflict(approved, appointment, appServices, businessSettings)
        ) {
          return { ...appointment, status: 'rejected' };
        }

        return appointment;
      }),
    );
    setAvailabilityAppointments((current) =>
      current.map((appointment) => {
        if (appointment.id === appointmentId) {
          return { ...appointment, status: 'approved' };
        }

        if (
          appointment.status === 'pending' &&
          appointmentsConflict(approved, appointment, appServices, businessSettings)
        ) {
          return { ...appointment, status: 'rejected' };
        }

        return appointment;
      }),
    );
  };

  const completeAppointment = async (appointmentId: string) => {
    try {
      await completeAppointmentRequest(appointmentId);
      if (isSupabaseConfigured) {
        await refreshAdminAppointments();
        setActiveAdminStatus('completed');
        setExpandedAppointmentId(null);
        setAdminStatus('Posao je označen kao završen.');
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Proveri da li je korisnik admin.';
      setAdminStatus(`Završavanje nije uspelo. ${message}`);
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: 'completed' } : appointment,
      ),
    );
    setAvailabilityAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: 'completed' } : appointment,
      ),
    );
    setActiveAdminStatus('completed');
    setExpandedAppointmentId(null);
    setAdminStatus('Posao je označen kao završen.');
  };

  const rejectAppointment = async (appointmentId: string) => {
    try {
      await rejectAppointmentRequest(appointmentId);
      if (isSupabaseConfigured) {
        await refreshAdminAppointments();
        setAdminStatus('Zahtev je odbijen.');
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Proveri da li je korisnik admin.';
      setAdminStatus(`Odbijanje nije uspelo. ${message}`);
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: 'rejected' } : appointment,
      ),
    );
    setAvailabilityAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: 'rejected' } : appointment,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-paper text-graphite">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-graphite/90 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            className="group flex items-center gap-3 text-left"
            onClick={() => {
              if (isAdminRoute) {
                window.location.href = '/';
                return;
              }

              scrollToSection('pocetna');
            }}
            type="button"
          >
            <BrandMark />
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.18em]">
                Andan
              </span>
              <span className="block text-xs text-steel">Autoservis Nova Pazova</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {isAdminRoute ? (
              <button
                className="px-4 py-2 text-sm font-medium text-white/78 transition hover:text-white"
                onClick={() => {
                  window.location.href = '/';
                }}
                type="button"
              >
                Javni sajt
              </button>
            ) : (
              navItems.map((item) => (
                <button
                  className={`px-4 py-2 text-sm font-medium transition ${
                    item.id === 'zakazivanje'
                      ? 'rounded-sm bg-ember text-white hover:bg-red-700'
                      : 'text-white/78 hover:text-white'
                  }`}
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))
            )}
          </nav>

          <button
            aria-label="Otvori navigaciju"
            className="grid h-10 w-10 place-items-center rounded-sm border border-white/15 lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-graphite px-4 py-3 lg:hidden">
            {(isAdminRoute ? [{ id: '/', label: 'Javni sajt' }] : navItems).map((item) => (
              <button
                className="block w-full px-2 py-3 text-left text-sm text-white/82"
                key={item.id}
                onClick={() => {
                  if (isAdminRoute) {
                    window.location.href = '/';
                  } else {
                    scrollToSection(item.id);
                  }
                  setMenuOpen(false);
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main>
        {!isAdminRoute && (
          <>
        <section
          className="relative min-h-[760px] overflow-hidden bg-graphite pt-24 text-white"
          id="pocetna"
        >
          <img
            alt="Moderan auto servis sa vozilom na dizalici"
            className="absolute inset-0 h-full w-full object-cover"
            src={heroImage}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-graphite via-graphite/86 to-graphite/22" />
          <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center px-4 pb-24 pt-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-mint">
                Auto servis Nova Pazova
              </p>
              <h1 className="text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
                Andan Autoservis
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/78">
                Profesionalno održavanje vozila i jednostavan zahtev za termin. Prvi cilj je
                pouzdan servis, bez nepotrebnog čekanja.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-ember px-6 text-sm font-bold text-white transition hover:bg-red-700"
                  onClick={() => scrollToSection('zakazivanje')}
                  type="button"
                >
                  Zatraži termin <ArrowRight size={18} />
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-white/18 px-6 text-sm font-bold text-white transition hover:bg-white/10"
                  onClick={() => scrollToSection('usluge')}
                  type="button"
                >
                  Pogledaj usluge <Wrench size={18} />
                </button>
              </div>
            </div>
          </div>
          <div className="relative mx-auto -mt-20 grid max-w-7xl gap-3 px-4 pb-8 sm:grid-cols-3 sm:px-6 lg:px-8">
            {heroHighlights.map(({ icon: Icon, text, title }) => (
              <div
                className="grid grid-cols-[2.75rem_1fr] gap-4 border border-white/12 bg-white/8 p-5 backdrop-blur"
                key={title}
              >
                <span className="grid h-11 w-11 place-items-center rounded-sm bg-white/10 text-mint">
                  <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/68">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-paper py-20" id="usluge">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-ember">Usluge</p>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">
                Najtraženiji radovi servisa.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {publicServices.map((service) => {
                const ServiceIcon = getServiceIcon(service.name);

                return (
                  <article
                    className="rounded-sm border border-black/10 bg-white p-6 shadow-sm"
                    key={service.id}
                  >
                    <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-sm bg-graphite text-white">
                      <ServiceIcon size={22} />
                    </div>
                    <h3 className="text-xl font-black">{service.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-black/62">{service.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20" id="zakazivanje">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-ember">
                Zakazivanje
              </p>
              <h2 className="mt-3 text-4xl font-black sm:text-5xl">Pošalji zahtev za termin.</h2>
              <p className="mt-5 text-base leading-7 text-black/64">
                Slobodni termini se računaju samo prema odobrenim zakazivanjima. Više klijenata
                može poslati zahtev za isti termin, a potvrda stiže tek nakon pregleda servisa.
              </p>
            </div>

            <form className="mt-10 rounded-sm border border-black/10 bg-paper p-5 sm:p-7" onSubmit={submitRequest}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="field md:col-span-2">
                  Usluga
                  <select value={form.serviceId} onChange={(event) => updateForm('serviceId', event.target.value)}>
                    {publicServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                    <option disabled value="">
                      ━━━━━━━━━━━━━━━━━━━
                    </option>
                    <option value={priceInquiryOptionValue}>Upit za cenu</option>
                  </select>
                </label>
                {!isPriceInquiry && (
                  <>
                    <label className="field">
                      Datum
                      <input
                        min={minimumRequestDate}
                        type="date"
                        value={form.requestedDate}
                        onChange={(event) => updateForm('requestedDate', event.target.value)}
                      />
                    </label>
                    <label className="field">
                      Termin
                      <select
                        required
                        value={form.requestedTime}
                        onChange={(event) => updateForm('requestedTime', event.target.value)}
                      >
                        <option value="">Izaberite vreme</option>
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <fieldset className="grid gap-4 border-t border-black/10 pt-5 md:col-span-2 md:grid-cols-2">
                  <legend className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-steel">
                    O klijentu
                  </legend>
                  <label className="field">
                    Ime i prezime
                    <input required value={form.customerName} onChange={(event) => updateForm('customerName', event.target.value)} />
                  </label>
                  <label className="field">
                    Telefon
                    <input required value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
                  </label>
                  <label className="field md:col-span-2">
                    Email
                    <input required type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
                  </label>
                </fieldset>

                <fieldset className="grid gap-4 border-t border-black/10 pt-5 md:col-span-2 md:grid-cols-2">
                  <legend className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-steel">
                    O vozilu
                  </legend>
                  <label className="field">
                    Marka vozila
                    <input required value={form.vehicleBrand} onChange={(event) => updateForm('vehicleBrand', event.target.value)} />
                  </label>
                  <label className="field">
                    Model
                    <input required value={form.vehicleModel} onChange={(event) => updateForm('vehicleModel', event.target.value)} />
                  </label>
                  <label className="field">
                    {isPriceInquiry ? 'Godište' : 'Godište (opcionalno)'}
                    <input
                      required={isPriceInquiry}
                      value={form.vehicleYear}
                      onChange={(event) => updateForm('vehicleYear', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    {isPriceInquiry ? 'Broj šasije' : 'Broj šasije (opcionalno)'}
                    <input
                      required={isPriceInquiry}
                      value={form.vehicleVin}
                      onChange={(event) => updateForm('vehicleVin', event.target.value)}
                    />
                  </label>
                </fieldset>

                <label className="field md:col-span-2">
                  Napomena
                  <textarea rows={4} value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} />
                </label>
              </div>
              <button
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-graphite px-5 text-sm font-bold text-white transition hover:bg-asphalt disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Slanje zahteva...' : 'Pošalji zahtev'} <ArrowRight size={18} />
              </button>
              <p className="mt-3 text-sm font-semibold text-black/58">{backendStatus}</p>
            </form>
          </div>
        </section>

          </>
        )}

        {isAdminRoute && (
        <section className="flex min-h-screen items-start justify-center bg-graphite px-4 py-24 text-white sm:px-6 lg:px-8" id="admin">
          <div className="w-full max-w-5xl">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-mint">Admin panel</p>
                <h2 className="mt-3 text-4xl font-black sm:text-5xl">Pregled zahteva.</h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/58">
                  {adminStatus}
                </p>
              </div>
              {canManageAppointments && (
                <div className="grid grid-cols-2 gap-3 sm:min-w-96">
                  <Stat label="Na čekanju" value={pendingCount.toString()} />
                  <Stat label="Odobreno" value={approvedCount.toString()} />
                  <Stat label="Završeno" value={completedCount.toString()} />
                  <Stat label="Odbijeno" value={rejectedCount.toString()} />
                </div>
              )}
            </div>

            {!canManageAppointments ? (
              <form
                className="mx-auto mt-10 grid w-full max-w-xl gap-4 border border-white/12 bg-white/[0.06] p-5 sm:p-7"
                onSubmit={submitAdminLogin}
              >
                <label className="field field-dark">
                  Admin email
                  <input
                    autoComplete="email"
                    required
                    type="email"
                    value={adminForm.email}
                    onChange={(event) => updateAdminForm('email', event.target.value)}
                  />
                </label>
                <label className="field field-dark">
                  Lozinka
                  <input
                    autoComplete="current-password"
                    required
                    type="password"
                    value={adminForm.password}
                    onChange={(event) => updateAdminForm('password', event.target.value)}
                  />
                </label>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-mint px-5 text-sm font-bold text-graphite transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isAdminSubmitting}
                  type="submit"
                >
                  {isAdminSubmitting ? 'Prijava...' : 'Prijavi se kao admin'}
                </button>
              </form>
            ) : (
              <>
                {adminUser && (
                  <div className="mt-8 flex flex-col justify-between gap-3 border border-white/12 bg-white/[0.06] p-4 sm:flex-row sm:items-center">
                    <p className="text-sm font-semibold text-white/68">
                      Prijavljen admin: <span className="text-white">{adminUser.email}</span>
                    </p>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-white/12 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                      onClick={handleAdminSignOut}
                      type="button"
                    >
                      Odjavi se <LogOut size={17} />
                    </button>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-2">
                  {adminStatusFilters.map((filter) => (
                    <button
                      className={`rounded-sm px-4 py-2 text-sm font-bold transition ${
                        activeAdminStatus === filter.status
                          ? 'bg-mint text-graphite'
                          : 'border border-white/12 text-white/68 hover:bg-white/10 hover:text-white'
                      }`}
                      key={filter.status}
                      onClick={() => {
                        setActiveAdminStatus(filter.status);
                        setExpandedAppointmentId(null);
                      }}
                      type="button"
                    >
                      {filter.label} ({statusCounts[filter.status]})
                    </button>
                  ))}
                </div>

                <div className="mt-6 grid gap-4">
              {filteredAppointments.map((appointment) => {
                const service = getService(appointment.serviceId, appServices);
                const appointmentIsPriceInquiry = service?.slug === priceInquiryServiceSlug;
                const appointmentKind = appointmentIsPriceInquiry ? 'Upit za cenu' : service?.name;
                const isExpanded = expandedAppointmentId === appointment.id;

                return (
                  <article className="rounded-sm border border-white/12 bg-white/[0.06] p-5" key={appointment.id}>
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-black">{appointment.customerName}</p>
                          <span className={`status status-${appointment.status}`}>
                            {statusLabel[appointment.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/68">
                          {appointmentKind}
                          {!appointmentIsPriceInquiry &&
                            ` · ${formatDisplayDate(appointment.requestedDate)} u ${appointment.requestedTime}`}
                          {' · '}
                          {appointment.vehicleBrand} {appointment.vehicleModel}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="h-10 rounded-sm border border-white/12 px-3 text-sm font-bold text-white transition hover:bg-white/10"
                          onClick={() =>
                            setExpandedAppointmentId((current) =>
                              current === appointment.id ? null : appointment.id,
                            )
                          }
                          type="button"
                        >
                          {isExpanded ? 'Sakrij' : 'Detalji'}
                        </button>
                        <button
                          aria-label="Odobri zahtev"
                          className="grid h-10 w-10 place-items-center rounded-sm bg-mint text-graphite disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={appointment.status !== 'pending'}
                          onClick={() => approveAppointment(appointment.id)}
                          type="button"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          aria-label="Odbij zahtev"
                          className="grid h-10 w-10 place-items-center rounded-sm bg-ember text-white disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={appointment.status !== 'pending'}
                          onClick={() => rejectAppointment(appointment.id)}
                          type="button"
                        >
                          <X size={18} />
                        </button>
                        <button
                          aria-label="Završi posao"
                          className="grid h-10 w-10 place-items-center rounded-sm bg-white text-graphite disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={appointment.status !== 'approved'}
                          onClick={() => completeAppointment(appointment.id)}
                          title={
                            appointment.status === 'approved'
                              ? 'Označi posao kao završen'
                              : 'Dostupno samo za odobrene zahteve'
                          }
                          type="button"
                        >
                          <CheckCheck size={18} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-5 grid gap-3 border-t border-white/12 pt-5 text-sm text-white/68 md:grid-cols-2">
                        <AdminDetail label="Telefon" value={appointment.phone} />
                        <AdminDetail label="Email" value={appointment.email} />
                        <AdminDetail label="Marka" value={appointment.vehicleBrand} />
                        <AdminDetail label="Model" value={appointment.vehicleModel} />
                        <AdminDetail label="Godište" value={appointment.vehicleYear || 'Nije uneto'} />
                        <AdminDetail label="Broj šasije" value={appointment.vehicleVin || 'Nije uneto'} />
                        {!appointmentIsPriceInquiry && (
                          <>
                            <AdminDetail label="Datum" value={formatDisplayDate(appointment.requestedDate)} />
                            <AdminDetail label="Termin" value={appointment.requestedTime} />
                          </>
                        )}
                        <AdminDetail
                          label="Napomena"
                          value={appointment.notes || 'Nema napomene'}
                          wide
                        />
                      </div>
                    )}
                  </article>
                );
                  })}

                  {filteredAppointments.length === 0 && (
                    <div className="border border-white/12 bg-white/[0.06] p-5 text-sm font-semibold text-white/58">
                      Nema zahteva u ovoj kategoriji.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
        )}

        {!isAdminRoute && (
        <section className="bg-paper py-20" id="kontakt">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-ember">Kontakt</p>
              <h2 className="mt-3 text-4xl font-black sm:text-5xl">Detalji se dodaju iz jednog izvora.</h2>
              <p className="mt-5 text-base leading-7 text-black/64">
                Podaci za telefon, adresu, radno vreme, logo i boje trenutno čekaju unos u
                dokumentu poslovnih detalja. Kada se popuni, isti podaci se prenose kroz ceo sajt.
              </p>
            </div>
            <div className="grid gap-3">
              <InfoRow icon={<Phone size={19} />} label="Telefon" value={businessDetails.phone} />
              <InfoRow icon={<MapPin size={19} />} label="Lokacija" value={`${businessDetails.city}, ${businessDetails.country}`} />
              <a
                className="flex items-center gap-4 border border-black/10 bg-white p-4 transition hover:border-emerald-500/40 hover:bg-emerald-50"
                href={businessDetails.whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-graphite text-white">
                  <MessageCircle size={19} />
                </span>
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.2em] text-steel">
                    WhatsApp
                  </span>
                  <span className="mt-1 block font-bold">Pošalji poruku</span>
                </span>
              </a>
            </div>
          </div>
        </section>
        )}
      </main>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 border border-black/10 bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-graphite text-white">
        {icon}
      </span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-[0.2em] text-steel">{label}</span>
        <span className="mt-1 block font-bold">{value}</span>
      </span>
    </div>
  );
}

function AdminDetail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'md:col-span-2' : undefined}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-ember"
    >
      <span className="absolute bottom-1 left-1.5 text-sm font-black leading-none text-white">
        AS
      </span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/12 bg-white/[0.06] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/46">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

export default App;
