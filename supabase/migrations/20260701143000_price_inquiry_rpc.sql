insert into public.services (slug, name, description, fixed_price, duration_minutes, is_active)
values (
  'nista-od-navedenog',
  'Ništa od navedenog',
  'Pošaljite upit ako niste sigurni koju uslugu da izaberete.',
  0,
  30,
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  fixed_price = excluded.fixed_price,
  duration_minutes = excluded.duration_minutes,
  is_active = excluded.is_active;

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
    raise exception 'Previse zahteva je poslato u kratkom periodu. Pokusajte ponovo kasnije.';
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

  if target_service.slug = 'nista-od-navedenog'
    and (
      nullif(btrim(coalesce(p_vehicle_year, '')), '') is null
      or nullif(btrim(coalesce(p_vehicle_vin, '')), '') is null
    )
  then
    raise exception 'Za upit za cenu unesite godiste i broj sasije.';
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
