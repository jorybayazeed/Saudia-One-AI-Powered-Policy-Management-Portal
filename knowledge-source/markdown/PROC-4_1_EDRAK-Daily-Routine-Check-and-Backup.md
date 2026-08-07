# EDRAK Daily Routine Check and Backup

Document: Information Technology Office Procedure Manual
Edition: 6th Edition
Effective date: 21 NOV 2024
Retrieval group ID: PROC-4.1
Group type: Checklist Procedure
Chapter: 4
Section: 4.1
Source page(s): 33
System(s) or asset(s): CBT Stations, Headset Mouse and Keyboard, EDRAK Software, EDRAK Servers, Servers and Switches, Server Cabinet Fans, Communication Room, EDRAK, H1 Server / SQL Virtual Machine, MSSQL Backup Scripts, Backup Script, MSSQL Backup Script, H3 SQL Virtual Machine, External Hard Drive
Responsible role(s): IT Specialist

## Arabic Search Terms

فحص إدراك اليومي، النسخ الاحتياطي، سيرفرات إدراك، درجة حرارة غرفة الاتصالات، SQL، القرص الخارجي

## Records

1. Stations Powered On [REC-143; Daily Check]
  Make sure all stations are on
  Responsible role: IT Specialist | System or asset: CBT Stations | Frequency or timing: Daily | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: CBT Labs Second Floor

2. Peripheral Connection and Condition [REC-144; Daily Check]
  Make sure the headset mouse and keyboard are connected and nothing is broken
  Responsible role: IT Specialist | System or asset: Headset Mouse and Keyboard | Frequency or timing: Daily | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: CBT Labs Second Floor

3. EDRAK Software Running [REC-145; Daily Check]
  Make sure EDRAK software is running on all stations
  Responsible role: IT Specialist | System or asset: EDRAK Software | Frequency or timing: Daily | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: CBT Labs Second Floor

4. Server Error Messages [REC-146; Daily Check]
  Check whether there are error messages on the EDRAK servers
  Responsible role: IT Specialist | System or asset: EDRAK Servers | Frequency or timing: Daily | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: Communication Room First Floor

5. Server and Switch Indicators [REC-147; Daily Check]
  Confirm that all indicator lights on all switches and servers are green and that there are no red lights
  Responsible role: IT Specialist | System or asset: Servers and Switches | Frequency or timing: Daily | Target or threshold: All green and no red light | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: Communication Room First Floor

6. Server Cabinet Fans [REC-148; Daily Check]
  Make sure all server cabinet fans are operating properly and are clean
  Responsible role: IT Specialist | System or asset: Server Cabinet Fans | Frequency or timing: Daily | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: Communication Room First Floor

7. Room Temperature and Airflow [REC-149; Daily Check]
  Make sure the room temperature is between 18 and 24 degrees Celsius and that air-conditioning flow is acceptable
  Responsible role: IT Specialist | System or asset: Communication Room | Frequency or timing: Daily | Target or threshold: 18-24 degrees Celsius | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: Communication Room First Floor

8. Room Cleanliness and Cable Security [REC-150; Daily Check]
  Make sure the Communication Room is clean free of dust and debris tidy and that all wires are secured
  Responsible role: IT Specialist | System or asset: Communication Room | Frequency or timing: Daily | Evidence or record: EDRAK Routine Maintenance Card F02 | Storage location: Communication Room First Floor

9. EDRAK Data Backup [REC-151; Daily Check]
  Conduct an EDRAK data backup
  Responsible role: IT Specialist | System or asset: EDRAK | Frequency or timing: Daily | Evidence or record: EDRAK Backup Files | Storage location: Communication Room First Floor

9.1. Log in to SQL Virtual Machine [REC-152; Backup Step]
  Log in to the SQL virtual machine from the H1 server
  Responsible role: IT Specialist | System or asset: H1 Server / SQL Virtual Machine | Frequency or timing: Daily | Evidence or record: EDRAK Backup Files | Storage location: Communication Room First Floor | Parent record: REC-151

9.2. Open Backup Scripts [REC-153; Backup Step]
  Open the two backup scripts in C drive using MSSQL
  Responsible role: IT Specialist | System or asset: MSSQL Backup Scripts | Frequency or timing: Daily | Evidence or record: EDRAK Backup Files | Storage location: C Drive | Parent record: REC-151

9.3. Update Backup File Date [REC-154; Backup Step]
  Change the file name in the script to today's date
  Responsible role: IT Specialist | System or asset: Backup Script | Frequency or timing: Daily | Target or threshold: Current date | Evidence or record: EDRAK Backup Files | Parent record: REC-151

9.4. Run Backup Script [REC-155; Backup Step]
  Run the backup script
  Responsible role: IT Specialist | System or asset: MSSQL Backup Script | Frequency or timing: Daily | Evidence or record: EDRAK Backup Files | Parent record: REC-151

9.5. Copy to H3 SQL Virtual Machine [REC-156; Backup Step]
  Copy the backup files to the H3 SQL virtual machine
  Responsible role: IT Specialist | System or asset: H3 SQL Virtual Machine | Frequency or timing: Daily | Evidence or record: EDRAK Backup Files | Storage location: H3 SQL Virtual Machine | Parent record: REC-151

9.6. Copy to External Hard Drive [REC-157; Backup Step]
  Copy the backup files to the external hard drive
  Responsible role: IT Specialist | System or asset: External Hard Drive | Frequency or timing: Daily | Evidence or record: EDRAK Backup Files | Storage location: External Hard Drive | Parent record: REC-151

- Interrupted or Incomplete Routine Task [REC-158; Exception Documentation Requirement]
  When a routine task is interrupted or cannot be completed within its timeframe an appropriate comment shall be written in the remark field of the routine maintenance card
  Responsible role: IT Specialist | Trigger or condition: Routine task interrupted or not completed within its timeframe | Evidence or record: Remark Field on CBT Routine Maintenance Card

## Source Records

REC-143, REC-144, REC-145, REC-146, REC-147, REC-148, REC-149, REC-150, REC-151, REC-152, REC-153, REC-154, REC-155, REC-156, REC-157, REC-158
