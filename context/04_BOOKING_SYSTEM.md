# Booking System

Workflow:
1. User selects service
2. User selects date
3. Available slots shown
4. User submits request through the public-safe `create_appointment_request` RPC
5. Status = Pending
6. Admin approves or rejects
7. Only after approval is slot reserved
8. Admin can mark approved work as completed

Availability rules:
- Pending requests do not block a time slot.
- Multiple customers can request the same pending slot.
- Approved appointments block the occupied time.
- Completed appointments are tracked as finished work in the admin panel.
- When an admin approves one request, other pending requests for the same occupied time must be automatically rejected.
- Public users cannot book today.
- Public users cannot book less than 12 hours ahead.
- Public booking creation is rate-limited to 10 total requests per 10 minutes.
- Public availability should be returned by `get_available_appointment_slots`.

Occupied time =
service duration + global buffer

Global buffer editable by admin.

Booking form:
- Customer name, phone, email, vehicle brand, and vehicle model are required.
- Vehicle year and chassis/VIN are optional.
- `Upit za cenu` is a separate dropdown option below a separator.
- When `Upit za cenu` is selected, date and time fields are hidden.
- When `Upit za cenu` is selected, vehicle year and chassis/VIN are required.
