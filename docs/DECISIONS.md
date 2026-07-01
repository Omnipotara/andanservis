# Decisions

## Current Product Decisions
- Public booking requests are created with `pending` status.
- Public booking requests are created through `create_appointment_request`, not direct table inserts.
- Public booking is rate-limited to 10 total requests per 10 minutes.
- Public users cannot book today or less than 12 hours ahead.
- Pending requests do not block availability.
- Multiple customers can request the same pending slot.
- Only approved appointments block time slots.
- Approving one appointment automatically rejects other pending appointments that conflict with the approved occupied time.
- Approved appointments can be marked as `completed` when the work is finished.
- Public service cards do not show prices or service durations.
- Public service loading uses a safe RPC that does not expose prices or durations.
- The booking form has a separate `Upit za cenu` option below a separator.
- `Upit za cenu` hides date/time fields and requires vehicle year and chassis/VIN.
- `Upit za cenu` is stored using the internal `Ništa od navedenog` service, which is not shown in the public service-card section.
- The public admin login is hidden behind `/andanadminstrana`.
- Admins can open request details to see phone, email, vehicle details, date, time, and notes.
- Admin requests are grouped by status: pending, approved, completed, rejected.

## Business Details
- Phone number: `+381 63 8207512`.
- Address, final logo, and final brand colors are future content updates.
- Current logo placeholder is a red square with `AS`.
- WhatsApp contact is available from public contact areas.

## Booking Form
- Customer name, phone, email, vehicle brand, and vehicle model are required.
- Vehicle year and chassis/VIN number are optional.
- For `Upit za cenu`, vehicle year and chassis/VIN number are required.
- Date display in the admin panel uses Serbian readable format, for example `01. jul 2026.`.

## Database And Supabase
- Supabase is the source of truth for services, appointments, business settings, and admin access.
- Admin access is controlled through Supabase Auth plus the `admin_users` table.
- Migration `20260701090000_booking_admin_updates.sql` adds `completed`, `vehicle_vin`, `complete_appointment`, and `Ništa od navedenog`.
- Migration `20260701110000_security_hardening.sql` adds public-safe service/slot/booking RPCs, removes public direct appointment inserts, hides service prices from public reads, and adds booking validation.
- Migration `20260701143000_price_inquiry_rpc.sql` updates public booking RPC behavior for `Upit za cenu`.
- Migrations through `20260701090000_booking_admin_updates.sql` have been run in Supabase.
- Migrations through `20260701110000_security_hardening.sql` have been run in Supabase.
- `20260701143000_price_inquiry_rpc.sql` must be run before deploying the `Upit za cenu` mode.

## Future Decisions
- Email notifications are a future phase.
- SMS reminders are a future phase and should be implemented through backend/cron, not the React frontend.
- SMS reminder target behavior: every 4 hours, if there is at least one `pending` request, send `Imate zahteve za servis na sajtu.` to the service phone.
