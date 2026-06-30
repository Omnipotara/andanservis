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
- notes
- service_id
- requested_date
- requested_time
- status
- created_at

Rules:
- Service prices are fixed, not estimates or starting prices.
- Pending appointments do not reserve availability.
- Approved appointments reserve availability.
- Approving an appointment must automatically reject pending appointments that conflict with the approved occupied time.

## business_settings
- workday_start
- workday_end
- global_buffer_minutes

## blocked_dates
- id
- date
- reason
