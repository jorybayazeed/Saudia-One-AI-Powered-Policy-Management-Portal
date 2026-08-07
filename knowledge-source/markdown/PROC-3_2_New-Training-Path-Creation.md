# New Training Path Creation

Document: Information Technology Office Procedure Manual
Edition: 6th Edition
Effective date: 21 NOV 2024
Retrieval group ID: PROC-3.2
Group type: Procedure
Chapter: 3
Section: 3.2
Source page(s): 32
System(s) or asset(s): Freshdesk, New Path Creation Form, TMS, Email
Responsible role(s): IT Specialist

## Arabic Search Terms

إنشاء مسار جديد، طلب تدريب، نموذج إنشاء المسار، TMS، مراجعة المسار، قسم التدريب

## Records

1. Receive Request [REC-122; Process Step]
  The IT Specialist receives a Freshdesk ticket raised by the Training Department
  Responsible role: IT Specialist | System or asset: Freshdesk | Trigger or condition: Request raised by Training Department | Evidence or record: Support Ticket | Reference or recipient: Training Department

2. Check Form Completeness [REC-123; Process Step]
  The IT Specialist checks whether the provided New Path Creation form is complete
  Responsible role: IT Specialist | System or asset: New Path Creation Form | Evidence or record: New Path Creation Form

2A. Incomplete Form [REC-124; Process Step]
  If the form is incomplete advise the requester to complete the form and raise the request again
  Responsible role: IT Specialist | System or asset: Freshdesk | Trigger or condition: Form is incomplete | Evidence or record: Support Ticket / New Path Creation Form | Reference or recipient: Requester | Parent record: REC-123

2B. Complete Form [REC-125; Process Step]
  If the form is complete proceed to the next step
  Responsible role: IT Specialist | System or asset: New Path Creation Form | Trigger or condition: Form is complete | Evidence or record: New Path Creation Form | Parent record: REC-123

3. Build New Path [REC-126; Process Step]
  The IT Specialist builds the new path in TMS
  Responsible role: IT Specialist | System or asset: TMS | Evidence or record: New Path

4. Review New Path [REC-127; Process Step]
  The IT Specialist reviews the newly created path and ensures that no data is missing
  Responsible role: IT Specialist | System or asset: TMS | Evidence or record: Reviewed New Path

4A. Check Department Name [REC-128; Process Step]
  The review shall include the Department Name
  Responsible role: IT Specialist | System or asset: TMS | Evidence or record: Reviewed New Path | Parent record: REC-127

4B. Check Path Duration [REC-129; Process Step]
  The review shall include the Path Duration
  Responsible role: IT Specialist | System or asset: TMS | Evidence or record: Reviewed New Path | Parent record: REC-127

4C. Check Minimum Attendees [REC-130; Process Step]
  The review shall include the minimum number of attendees
  Responsible role: IT Specialist | System or asset: TMS | Evidence or record: Reviewed New Path | Parent record: REC-127

4D. Check Maximum Attendees [REC-131; Process Step]
  The review shall include the maximum number of attendees
  Responsible role: IT Specialist | System or asset: TMS | Evidence or record: Reviewed New Path | Parent record: REC-127

5. Notify Sales and Marketing [REC-132; Process Step]
  The IT Specialist sends an email stating that a new path has been created and provides the path name and path code
  Responsible role: IT Specialist | System or asset: Email | Evidence or record: Notification Email | Reference or recipient: psaasales@saudia.com

5A. Copy Training Department [REC-133; Process Step]
  The Training Department is copied on the notification email
  Responsible role: IT Specialist | System or asset: Email | Evidence or record: Notification Email | Reference or recipient: Training Department | Parent record: REC-132

6. Update and Close Ticket [REC-134; Process Step]
  The IT Specialist updates and closes the ticket
  Responsible role: IT Specialist | System or asset: Freshdesk | Evidence or record: Support Ticket

## Source Records

REC-122, REC-123, REC-124, REC-125, REC-126, REC-127, REC-128, REC-129, REC-130, REC-131, REC-132, REC-133, REC-134
