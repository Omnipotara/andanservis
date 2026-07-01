# Supabase Setup

## Local Project
Create a Supabase project, then run the SQL in:

`supabase/migrations/20260630133000_initial_schema.sql`

If the project already exists, also run:

`supabase/migrations/20260701090000_booking_admin_updates.sql`

`supabase/migrations/20260701110000_security_hardening.sql`

`supabase/migrations/20260701143000_price_inquiry_rpc.sql`

The migration creates:
- `services`
- `appointments`
- `business_settings`
- `blocked_dates`
- Row Level Security policies
- `get_public_services`, `get_available_appointment_slots`, `create_appointment_request`, `get_approved_appointment_slots`, `approve_appointment`, `reject_appointment`, and `complete_appointment` RPC functions

## Environment Variables
Copy `.env.example` to `.env` and fill:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit `.env`.

## Admin User
Admin access can be controlled with the `admin_users` table. Create a Supabase Auth user, then run this in SQL Editor:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do nothing;
```

Replace `admin@example.com` with the email you created in Authentication.

The older app metadata method also works if available:

```json
{ "role": "admin" }
```

Public visitors can create pending appointment requests only through `create_appointment_request`. Public service reads and availability checks go through safe RPC functions, while only admins can read customer appointment details.

The price inquiry migration updates `create_appointment_request` so `Upit za cenu` can be submitted without a visible date/time slot while still requiring vehicle year and chassis/VIN.

## Booking Rule
Pending requests do not block availability. Approved appointments block time. Calling `approve_appointment` approves one request and automatically rejects pending requests that overlap the approved occupied time.

Admins can mark approved appointments as completed with `complete_appointment`. Public appointment requests require vehicle brand and model; year and chassis/VIN number are optional for regular services and required for `Upit za cenu`.

Public booking security rules:
- Maximum 10 appointment requests can be created every 10 minutes overall.
- Public users cannot book today.
- Public users cannot book less than 12 hours ahead.
- Public users cannot read service prices or durations from the public service RPC.
