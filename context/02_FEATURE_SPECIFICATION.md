# Feature Specification

## Public Pages
- Home
- About
- Booking
- Contact

## Booking
- Select service
- Select available slot
- Enter customer and vehicle information
- Submit appointment request
- Submit appointment request through validating RPC
- Only approved appointments block availability
- Multiple pending requests can exist for the same slot
- Approving one request automatically rejects conflicting pending requests
- Approved requests can be marked as completed by admin
- Vehicle year and chassis/VIN are optional
- Public bookings are limited to 10 total submissions per 10 minutes
- Public bookings cannot be for today or less than 12 hours ahead

## Emails
- New request to service (future phase)
- Request received confirmation (future phase)
- Approved notification (future phase)
- Rejected notification (future phase)

## SMS
- Pending request reminders are a future phase
- Reminder target behavior: every 4 hours, if pending requests exist, notify the service phone

## Admin
- Manage services
- Manage working hours
- Manage booking requests
- Manage availability
- View request details
- Mark approved work as completed
