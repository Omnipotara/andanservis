create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read admin users" on public.admin_users;

create policy "Admins can read admin users"
on public.admin_users for select
using (public.is_admin());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.admin_users admin_user
      where admin_user.user_id = auth.uid()
    );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

grant execute on function public.current_user_is_admin() to authenticated;
