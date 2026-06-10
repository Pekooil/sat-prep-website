# SaturnPath

A free SAT study planner for the official College Board Question Bank with customized study schedule, automated error logs, deep data analysis, and adapts to your study pace.

## Demonstration

### Home Page  

<img width="1920" height="956" alt="Screenshot 2026-06-10 at 1 00 46 AM" src="https://github.com/user-attachments/assets/56413a7e-e6d7-492a-b093-2b1d01792587" />

### Calendar View  

<img width="1920" height="957" alt="Screenshot 2026-06-10 at 1 01 09 AM" src="https://github.com/user-attachments/assets/0af9fca6-9cb5-4d40-82bf-12428211974a" />

### Adaptive Planner  

<img width="1920" height="958" alt="Screenshot 2026-06-10 at 1 02 30 AM" src="https://github.com/user-attachments/assets/5a6a30c3-9be2-49d9-af62-7f0ec1985e13" />

### Error Log  

<img width="1920" height="958" alt="Screenshot 2026-06-10 at 1 05 30 AM" src="https://github.com/user-attachments/assets/2354f7e8-5efc-4f32-8855-5ae6008731b9" />


## Motivation

While studying for the June SAT in only two weeks, I used the College Board Question Bank for the main prep tool, but it was highly unorganized.  
I had to design my own study plan with no guidance, type my answers on Google Docs, time myself, calculate my results of each practice session, log every mistake manually in an error log, and keep track of the questions available left in the question bank.  
  
SaturnPath aims to solve all these problems with personalized plans, interface for entering answers with timer, automated error logs, and organized question bank inventory.  
Most importantly, SaturnPath adapts to the student's learning curve and update future practice plans based on their improvements.  
SaturnPath aims to provide accessible and adaptable study guide for all students preparing for the SAT.

## Getting Started

Follow these steps to access SaturnPath planner as guest.

1. Click on "create one free" to create a new account at the landing page.
2. Enter current score, weak areas, and other data for SaturnPath to generate a personalized plan.
3. Select "continue as guest" or register an account.

## Features & Workflow

Students repeat the following step to drill weak areas with College Board's Question Bank.

- Students input their current SAT score, target score, and their weak areas.
- SaturnPath generates a customized plan based on the student's data and assign different practice sessions for every day.
- The student follows the planner and complete practice sessions. Based on their results, SaturnPath would adapt and adjust future workloads and target topics.
- All questions missed are automatically stored in the Error Log. This allows students to review their mistakes throughly.
- SaturnPath keeps track of questions left in the question bank to make sure it's not exhausted before the student's test date.

## Design Inspiration

Vercel, Linear, Notion, and Superhuman - referenced in the designing process for navigation bar and overall aesthetic.

## AI Usage

### Development Process
SaturnPath is developed with the assistance and acceleration of Claude's Opus 4.8 and Sonnet 4.6 for code generation and debugging.
However, the primary design and workflow decisions were made by human and not by AI.

### In-App "AI" Features
Although SaturnPath contains the "AI Adaptive Replanner" feature, there is no LLM or external AI API called.  
The "AI Adaptive Replanner" runs on pre-written Typescript Algorithms.

## Acknowledgement

Core Platform

- Vercel — hosting, deployment, analytics, and speed insights
- Supabase — authentication and PostgreSQL database

Frameworks & Libraries

- Next.js — React framework (App Router)
- React — UI library
- Tailwind CSS — styling
- Radix UI — headless UI primitives
- Recharts — charting library
- Lucide — icon set
- date-fns — date utility library
- Resend — transactional email reminders
- Geist — font by Vercel

## Copyright Compliance
 
SaturnPath does not access, store, reproduce, or display any copyrighted materials from the College Board.  
SAT is not affiliated with, and does not endorse, SaturnPath.
