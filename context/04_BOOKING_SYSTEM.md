# Booking System

Workflow:
1. User selects service
2. User selects date
3. Available slots shown
4. User submits request
5. Status = Pending
6. Admin approves or rejects
7. Only after approval is slot reserved

Availability rules:
- Pending requests do not block a time slot.
- Multiple customers can request the same pending slot.
- Approved appointments block the occupied time.
- When an admin approves one request, other pending requests for the same occupied time must be automatically rejected.

Occupied time =
service duration + global buffer

Global buffer editable by admin.
