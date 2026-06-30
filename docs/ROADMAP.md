# Roadmap

MVP
- Public website
- Booking
- Admin

Future
- Reviews
- Gallery
- Blog
- SMS reminders for pending appointment requests
  - Every 4 hours, check if there are appointment requests with `pending` status.
  - If at least one pending request exists, send this SMS to the service phone: "Imate zahteve za servis na sajtu."
  - Implement via backend/cron, for example Vercel Cron + serverless API route or Supabase Edge Function.
  - Use an SMS provider such as Twilio, Infobip, Vonage, or a local SMS gateway.
  - Do not send SMS directly from the React frontend because SMS API keys must stay private.
