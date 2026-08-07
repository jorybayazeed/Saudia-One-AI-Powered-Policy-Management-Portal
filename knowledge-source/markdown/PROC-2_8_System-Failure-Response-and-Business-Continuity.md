# System Failure Response and Business Continuity

Document: Information Technology Office Procedure Manual
Edition: 6th Edition
Effective date: 21 NOV 2024
Retrieval group ID: PROC-2.8
Group type: Procedure
Chapter: 2
Section: 2.8
Source page(s): 27
System(s) or asset(s): Freshdesk / TMS / EDRAK, Affected System, EDRAK Backup Server, EDRAK Main Server

## Arabic Search Terms

تعطل النظام، فشل النظام، استمرارية الأعمال، إدراك، فريش ديسك، تي إم إس، الخادم الاحتياطي، السيرفر الاحتياطي

## Records

- System Failure Response [REC-105; Business Continuity Requirement]
  When any stated system fails the listed steps shall be followed to ensure business continuity
  System or asset: Freshdesk / TMS / EDRAK | Trigger or condition: Failure in an above-mentioned system

1. Troubleshoot the Problem [REC-106; Business Continuity Step]
  Troubleshoot the problem
  System or asset: Affected System | Frequency or timing: As soon as possible | Trigger or condition: System failure | Parent record: REC-105

2. Apply Needed Fix [REC-107; Business Continuity Step]
  Apply the needed fix as soon as possible
  System or asset: Affected System | Frequency or timing: As soon as possible | Trigger or condition: System failure | Parent record: REC-105

3. Contact Vendor [REC-108; Business Continuity Step]
  Contact the vendor if needed
  Frequency or timing: When vendor support is needed | Reference or recipient: System Vendor | Parent record: REC-105

4. Switch to EDRAK Backup Server [REC-109; Business Continuity Step]
  For EDRAK switch immediately to the backup server if troubleshooting takes more than one day
  System or asset: EDRAK Backup Server | Frequency or timing: Immediately | Trigger or condition: Troubleshooting takes more than one day | Target or threshold: More than 1 day | Parent record: REC-105

5. Return to Main EDRAK Server [REC-110; Business Continuity Step]
  Return to the main EDRAK server once the problem is fixed
  System or asset: EDRAK Main Server | Trigger or condition: Problem is fixed | Parent record: REC-105

## Source Records

REC-105, REC-106, REC-107, REC-108, REC-109, REC-110
