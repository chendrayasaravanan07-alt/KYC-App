KYC Verification System — Mobile App + Backend + Admin Panel

This project is a complete KYC (Know Your Customer) verification system containing:

✔ React Native Mobile App (for users)
✔ Node.js Express Backend (KYC processing + OCR + Face Match + Flag system)
✔ Admin Panel (review flagged users, check verification status)

🚀 Project Structure
KYC-App/
│── mobile-app/        → React Native (JSX)
│── backend/           → Node.js + Express + MongoDB (or SQL)
│── admin-panel/       → React Web Admin Dashboard
│── README.md          → Project documentation
│── .gitignore         → Git ignore rules

📱 Mobile App (React Native)

Used for:

User onboarding

Capture images (OCR + face)

Submit KYC documents

Show KYC status

Tech stack: React Native + Context API + Axios

🔧 Backend (Node.js + Express)

Handles:

User API

OCR Processing

Face Matching

Flagging suspicious KYC

Storing documents

Sending results to Admin Panel

Your .env will contain:

PORT=5000
MONGO_URI=your_database_url
OCR_API_KEY=xxxxx
FACE_MATCH_API_KEY=xxxxx
JWT_SECRET=yourSecretKey

🖥️ Admin Panel (React Web)

Admin can:

View all users

View KYC completed users

View flagged (suspicious) users

Approve / Reject KYC manually

🌱 How to Install and Run
1️⃣ Clone the project
git clone https://github.com/your-username/KYC-App.git
cd KYC-App

2️⃣ Install dependencies
Mobile app:
cd mobile-app
npm install

Backend:
cd ../backend
npm install

Admin panel:
cd ../admin-panel
npm install

▶️ Start the project
Start backend
cd backend
npm start

Start admin panel
cd admin-panel
npm start

Start mobile app
cd mobile-app
npx expo start

🔒 Environment Variables

Only the backend requires a .env file.

Your backend folder should have:

backend/
│── .env.example
│── .env ← you create manually (not uploaded to GitHub)

📌 Why README is Required?

✔ Helps your team understand
✔ How to run the project
✔ What each folder contains
✔ What technologies are used
✔ How to set environment variables
✔ Makes GitHub project professional