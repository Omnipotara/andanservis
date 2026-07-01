# Changelog

Initial project documentation.

## Current MVP Update
- Added Supabase-backed booking and hidden admin panel.
- Added admin request approval, rejection, and completed workflow.
- Added conflict handling: approving one request rejects overlapping pending requests.
- Updated public service display to hide prices and durations.
- Added `Ništa od navedenog` as a booking-only service option.
- Added phone and WhatsApp contact details.
- Added optional vehicle year and chassis/VIN fields.
- Added roadmap entry for future SMS reminders.
- Added separate `Upit za cenu` mode in the booking form.

## Security Hardening
- Public booking creation now goes through a validating RPC instead of direct table inserts.
- Added overall booking rate limit: 10 requests per 10 minutes.
- Public users cannot book today or less than 12 hours ahead.
- Public service reads no longer expose prices or durations.
- Public slot availability is calculated by Supabase RPC.
- Removed bundled mock customer appointments from frontend code.
