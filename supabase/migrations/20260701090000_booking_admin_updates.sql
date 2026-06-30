alter type appointment_status add value if not exists 'completed';

alter table public.appointments
add column if not exists vehicle_vin text not null default 'Nije uneto';

create or replace function public.complete_appointment(target_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can complete appointments';
  end if;

  update public.appointments
  set status = 'completed'
  where id = target_appointment_id
    and status = 'approved';
end;
$$;

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
