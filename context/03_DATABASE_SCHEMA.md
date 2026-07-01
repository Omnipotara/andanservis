# Database Schema

## services
- id
- name
- description
- fixed_price
- duration_minutes
- is_active

## appointments
- id
- customer_name
- phone
- email
- vehicle_brand
- vehicle_model
- vehicle_year (optional)
- vehicle_vin (optional)
- notes
- service_id
- requested_date
- requested_time
- status: pending, approved, rejected, completed
- created_at

Rules:
- Service prices and durations may exist in the database for scheduling/business logic, but they are not shown on the public site.
- Public service reads must use `get_public_services`, which excludes prices and durations.
- Pending appointments do not reserve availability.
- Approved appointments reserve availability.
- Completed appointments stay completed for admin tracking.
- Approving an appointment must automatically reject pending appointments that conflict with the approved occupied time.
- Public appointment creation must use `create_appointment_request`, not direct table inserts.
- Public appointment creation is rate-limited to 10 total requests per 10 minutes.
- Public appointment dates must be tomorrow or later and at least 12 hours ahead.

## business_settings
- workday_start
- workday_end
- global_buffer_minutes

## blocked_dates
- id
- date
- reason
