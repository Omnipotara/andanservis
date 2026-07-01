alter table public.appointments
alter column vehicle_vin drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_customer_name_length'
  ) then
    alter table public.appointments
    add constraint appointments_customer_name_length
    check (char_length(btrim(customer_name)) between 2 and 120) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_phone_length'
  ) then
    alter table public.appointments
    add constraint appointments_phone_length
    check (char_length(btrim(phone)) between 5 and 40) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_email_format'
  ) then
    alter table public.appointments
    add constraint appointments_email_format
    check (
      char_length(btrim(email)) between 5 and 254
      and btrim(email) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_vehicle_brand_length'
  ) then
    alter table public.appointments
    add constraint appointments_vehicle_brand_length
    check (char_length(btrim(vehicle_brand)) between 1 and 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_vehicle_model_length'
  ) then
    alter table public.appointments
    add constraint appointments_vehicle_model_length
    check (char_length(btrim(vehicle_model)) between 1 and 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_vehicle_year_length'
  ) then
    alter table public.appointments
    add constraint appointments_vehicle_year_length
    check (vehicle_year is null or char_length(btrim(vehicle_year)) <= 20) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_vehicle_vin_length'
  ) then
    alter table public.appointments
    add constraint appointments_vehicle_vin_length
    check (vehicle_vin is null or char_length(btrim(vehicle_vin)) <= 40) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_notes_length'
  ) then
    alter table public.appointments
    add constraint appointments_notes_length
    check (notes is null or char_length(notes) <= 1000) not valid;
  end if;
end $$;

create or replace function public.get_public_services()
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    service.id,
    service.slug,
    service.name,
    service.description,
    service.is_active
  from public.services service
  where service.is_active = true
  order by service.created_at;
$$;

create or replace function public.get_available_appointment_slots(
  p_service_id uuid,
  p_requested_date date
)
returns table (
  available_time time
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_service services%rowtype;
  settings business_settings%rowtype;
  current_local timestamp;
  slot_time time;
  slot_start timestamp;
  slot_end timestamp;
begin
  current_local := timezone('Europe/Belgrade', now());

  if p_requested_date <= current_local::date then
    return;
  end if;

  if exists (
    select 1
    from public.blocked_dates blocked_date
    where blocked_date.date = p_requested_date
  ) then
    return;
  end if;

  select * into target_service
  from public.services
  where id = p_service_id
    and is_active = true;

  if not found then
    return;
  end if;

  select * into settings
  from public.business_settings
  where id = true;

  slot_time := settings.workday_start;

  while (p_requested_date + slot_time)
    + make_interval(mins => target_service.duration_minutes + settings.global_buffer_minutes)
    <= (p_requested_date + settings.workday_end)
  loop
    slot_start := p_requested_date + slot_time;
    slot_end := public.appointment_end_at(
      p_requested_date,
      slot_time,
      target_service.duration_minutes,
      settings.global_buffer_minutes
    );

    if slot_start >= current_local + interval '12 hours'
      and not exists (
        select 1
        from public.appointments appointment
        join public.services service on service.id = appointment.service_id
        where appointment.status = 'approved'
          and appointment.requested_date = p_requested_date
          and appointment.requested_date + appointment.requested_time < slot_end
          and public.appointment_end_at(
            appointment.requested_date,
            appointment.requested_time,
            service.duration_minutes,
            settings.global_buffer_minutes
          ) > slot_start
      )
    then
      available_time := slot_time;
      return next;
    end if;

    slot_time := (slot_time + interval '30 minutes')::time;
  end loop;
end;
$$;

create or replace function public.create_appointment_request(
  p_service_id uuid,
  p_requested_date date,
  p_requested_time time,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_vehicle_brand text,
  p_vehicle_model text,
  p_vehicle_year text default null,
  p_vehicle_vin text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_appointment_id uuid;
  recent_request_count integer;
  target_service services%rowtype;
  requested_start timestamp;
begin
  perform pg_advisory_xact_lock(hashtext('create_appointment_request_rate_limit'));

  select count(*) into recent_request_count
  from public.appointments
  where created_at >= now() - interval '10 minutes';

  if recent_request_count >= 10 then
    raise exception 'Previše zahteva je poslato u kratkom periodu. Pokušajte ponovo kasnije.';
  end if;

  select * into target_service
  from public.services
  where id = p_service_id
    and is_active = true;

  if not found then
    raise exception 'Izabrana usluga nije dostupna.';
  end if;

  requested_start := p_requested_date + p_requested_time;

  if p_requested_date <= timezone('Europe/Belgrade', now())::date
    or requested_start < timezone('Europe/Belgrade', now()) + interval '12 hours'
  then
    raise exception 'Izabrani termin nije dostupan.';
  end if;

  if target_service.slug <> 'nista-od-navedenog'
    and not exists (
      select 1
      from public.get_available_appointment_slots(p_service_id, p_requested_date) slot
      where slot.available_time = p_requested_time
    )
  then
    raise exception 'Izabrani termin nije dostupan.';
  end if;

  insert into public.appointments (
    customer_name,
    phone,
    email,
    vehicle_brand,
    vehicle_model,
    vehicle_year,
    vehicle_vin,
    notes,
    service_id,
    requested_date,
    requested_time,
    status
  )
  values (
    btrim(p_customer_name),
    btrim(p_phone),
    lower(btrim(p_email)),
    btrim(p_vehicle_brand),
    btrim(p_vehicle_model),
    nullif(btrim(coalesce(p_vehicle_year, '')), ''),
    nullif(btrim(coalesce(p_vehicle_vin, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_service_id,
    p_requested_date,
    p_requested_time,
    'pending'
  )
  returning id into new_appointment_id;

  return new_appointment_id;
end;
$$;

drop policy if exists "Public can read active services" on public.services;
drop policy if exists "Guests can create pending appointment requests" on public.appointments;

grant execute on function public.get_public_services() to anon, authenticated;
grant execute on function public.get_available_appointment_slots(uuid, date) to anon, authenticated;
grant execute on function public.create_appointment_request(
  uuid,
  date,
  time,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;
