# ResolveDesk — System Documentation Screenshots Catalog

This directory contains pristine, high-resolution (Retina 2x DPI) screenshots captured directly via headless Chrome with zero browser glows, overlays, or watermarks. All images feature authentic campus accounts (`student1`, `officer1`, `admin12`) with active grievances across college departments.

---

## 📸 Screenshots Overview

| # | Filename | Primary User Role | Description & Workflow Demonstrated |
|---|---|---|---|
| **01** | [`01_Login_Portal.png`](./01_Login_Portal.png) | Public / All | Collegiate portal authentication card with role-aware sign-in, ANITS branding, and credential validation. |
| **02** | [`02_Student_Registration.png`](./02_Student_Registration.png) | Student / Candidate | Student registration interface enforcing `@anits.edu.in` domain verification and collegiate roll format (`A24126510123`). |
| **03** | [`03_Student_Dashboard.png`](./03_Student_Dashboard.png) | Student (`student1`) | Student command center featuring live KPI counters, department workload distribution, resolution velocity curves, and quick action bars. |
| **04** | [`04_Lodge_Grievance_Portal.png`](./04_Lodge_Grievance_Portal.png) | Student (`student1`) | Modern grievance lodging form with department selection, urgency priority classification, statement textarea, and evidence attachment dropzone. |
| **05** | [`05_Student_My_Grievances.png`](./05_Student_My_Grievances.png) | Student (`student1`) | Filterable grievance history showing unique ticket IDs (`GRV-...`), departmental badges, status indicators (`Assigned`, `In Progress`, `Pending`), and timeline action links. |
| **06** | [`06_Grievance_Investigation_Timeline.png`](./06_Grievance_Investigation_Timeline.png) | Student (`student1`) | Detailed case audit timeline demonstrating official investigation trail, nodal officer assignment, SLA window compliance, and resolution feedback. |
| **07** | [`07_Campus_Community_Public_Feed.png`](./07_Campus_Community_Public_Feed.png) | Student / Campus Public | Public transparency feed featuring anonymized community grievances, resolution summaries, and student upvoting mechanism. |
| **08** | [`08_Student_Profile_Hub.png`](./08_Student_Profile_Hub.png) | Student (`student1`) | Student academic profile hub displaying enrollment credentials, roll number, department records, case statistics, and security panel. |
| **09** | [`09_Officer_Workload_Dashboard.png`](./09_Officer_Workload_Dashboard.png) | Officer (`officer1`) | Departmental grievance officer console (Hostel & Accommodation) with active task queues, SLA compliance meters, and triage filters. |
| **10** | [`10_Officer_Resolution_Modal.png`](./10_Officer_Resolution_Modal.png) | Officer (`officer1`) | Officer case resolution slide-over drawer displaying student statement, verdict dropdown (`RESOLVED`), internal scope, and mandatory resolution findings. |
| **11** | [`11_Admin_Analytics_Dashboard.png`](./11_Admin_Analytics_Dashboard.png) | Admin (`admin12`) | Executive administration dashboard showcasing institution-wide resolution velocity, active case volume, departmental load breakdown, and administrative actions. |
| **12** | [`12_Admin_Grievance_Triage_Console.png`](./12_Admin_Grievance_Triage_Console.png) | Admin (`admin12`) | Master institutional grievance registry showing all student submissions across departments with status chips, submission dates, and publication flags. |
| **13** | [`13_Admin_Staff_Management_Dialog.png`](./13_Admin_Staff_Management_Dialog.png) | Admin (`admin12`) | Campus staff directory modal allowing administrators to audit active accounts, manage officer assignments, and toggle privileges. |
| **14** | [`14_Admin_Staff_Invite_Dialog.png`](./14_Admin_Staff_Invite_Dialog.png) | Admin (`admin12`) | Institutional staff invitation dialog facilitating onboarding of department grievance officers with assigned roles. |
| **15** | [`15_Admin_Department_Management_Dialog.png`](./15_Admin_Department_Management_Dialog.png) | Admin (`admin12`) | Academic and campus department directory allowing administrators to manage nodal operational units and departmental contact emails. |

---

## 🛠️ Reproduction / Regeneration

To re-run and re-capture all screenshots programmatically at any time:
```bash
node scripts/capture_docs_screenshots.js
```
The script uses headless Google Chrome with automated session injection, waiting for full network idle and UI transition completion.
