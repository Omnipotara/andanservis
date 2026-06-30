create extension if not exists pgcrypto;

create type appointment_status as enum ('pending', 'approved', 'rejected');

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  fixed_price integer not null check (fixed_price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_settings (
  id boolean primary key default true,
  workday_start time not null default '08:00',
  workday_end time not null default '17:00',
  global_buffer_minutes integer not null default 20 check (global_buffer_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_settings_single_row check (id)
);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  email text not null,
  vehicle_brand text not null,
  vehicle_model text not null,
  vehicle_year text,
  notes text,
  service_id uuid not null references public.services(id),
  requested_date date not null,
  requested_time time not null,
  status appointment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_status_date_idx on public.appointments (status, requested_date);
create index appointments_service_date_time_idx on public.appointments (
  service_id,
  requested_date,
  requested_time
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create trigger business_settings_set_updated_at
before update on public.business_settings
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function public.appointment_end_at(
  appointment_date date,
  appointment_time time,
  duration_minutes integer,
  buffer_minutes integer
)
returns timestamp
language sql
immutable
as $$
  select (appointment_date + appointment_time) + make_interval(mins => duration_minutes + buffer_minutes);
$$;

create or replace function public.approve_appointment(target_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_record appointments%rowtype;
  target_service services%rowtype;
  settings business_settings%rowtype;
  target_start timestamp;
  target_end timestamp;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve appointments';
  end if;

  select * into target_record
  from public.appointments
  where id = target_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  select * into target_service
  from public.services
  where id = target_record.service_id;

  select * into settings
  from public.business_settings
  where id = true;

  target_start := target_record.requested_date + target_record.requested_time;
  target_end := public.appointment_end_at(
    target_record.requested_date,
    target_record.requested_time,
    target_service.duration_minutes,
    settings.global_buffer_minutes
  );

  update public.appointments
  set status = 'approved'
  where id = target_appointment_id;

  update public.appointments appointment
  set status = 'rejected'
  from public.services service
  where appointment.service_id = service.id
    and appointment.id <> target_appointment_id
    and appointment.status = 'pending'
    and appointment.requested_date = target_record.requested_date
    and appointment.requested_date + appointment.requested_time < target_end
    and public.appointment_end_at(
      appointment.requested_date,
      appointment.requested_time,
      service.duration_minutes,
      settings.global_buffer_minutes
    ) > target_start;
end;
$$;

create or replace function public.reject_appointment(target_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject appointments';
  end if;

  update public.appointments
  set status = 'rejected'
  where id = target_appointment_id;
end;
$$;

create or replace function public.get_approved_appointment_slots()
returns table (
  id uuid,
  service_id uuid,
  requested_date date,
  requested_time time,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    appointment.id,
    appointment.service_id,
    appointment.requested_date,
    appointment.requested_time,
    appointment.created_at
  from public.appointments appointment
  where appointment.status = 'approved';
$$;

alter table public.services enable row level security;
alter table public.business_settings enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.appointments enable row level security;

grant execute on function public.get_approved_appointment_slots() to anon, authenticated;

create policy "Public can read active services"
on public.services for select
using (is_active = true);

create policy "Admins can manage services"
on public.services for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read business settings"
on public.business_settings for select
using (true);

create policy "Admins can manage business settings"
on public.business_settings for all
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read blocked dates"
on public.blocked_dates for select
using (true);

create policy "Admins can manage blocked dates"
on public.blocked_dates for all
using (public.is_admin())
with check (public.is_admin());

create policy "Guests can create pending appointment requests"
on public.appointments for insert
with check (status = 'pending');

create policy "Admins can read appointments"
on public.appointments for select
using (public.is_admin());

create policy "Admins can update appointments"
on public.appointments for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete appointments"
on public.appointments for delete
using (public.is_admin());

insert into public.business_settings (id, workday_start, workday_end, global_buffer_minutes)
values (true, '08:00', '17:00', 20)
on conflict (id) do nothing;

insert into public.services (slug, name, description, fixed_price, duration_minutes, is_active)
values
  (
    'mali-servis',
    'Mali servis',
    'Zamena ulja i filtera uz osnovnu kontrolu vozila pre povratka na put.',
    8500,
    90,
    true
  ),
  (
    'dijagnostika',
    'Auto dijagnostika',
    'Precizno očitavanje grešaka i pregled sistema pre većih intervencija.',
    3500,
    45,
    true
  ),
  (
    'kocnice',
    'Zamena kočnica',
    'Pregled i zamena diskova, pločica i pratećih elemenata kočionog sistema.',
    6000,
    120,
    true
  ),
  (
    'farovi',
    'Čišćenje farova',
    'Poliranje i zaštita farova za bolju vidljivost i uredniji izgled vozila.',
    4500,
    75,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  fixed_price = excluded.fixed_price,
  duration_minutes = excluded.duration_minutes,
  is_active = excluded.is_active;
