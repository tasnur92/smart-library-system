# 📚 Smart Library Management System with AI-Powered Features

A modern, responsive, and fully functional web-based Library Management System developed with **HTML5**, **CSS3**, **Vanilla JavaScript (ES6 Modules)**, **Firebase Authentication**, and **Cloud Firestore Database**.

---

## 🌟 Key Features Overview

### 1. 🔐 User Registration & Role-Based Authentication
* **Student Registration:** Sign up with name, email, department/major, and password. Automatic student ID assignment.
* **Role-Based Access Control (RBAC):** Distinct dashboards, privileges, and route guards for **Students** and **Administrators**.
* **Profile Synchronization:** User profile data is automatically synced to Firestore `/users/{uid}`.
* **Instant Demo Accounts:** One-click login buttons for testing both Student (`alex@student.edu`, `emma@student.edu`) and Administrator (`admin@library.edu`) accounts.

### 2. 📖 Book Inventory Management (Admin)
* **Full CRUD Operations:** Add new titles, update existing book details, and safely delete books.
* **ISBN Validation & Duplicate Protection:** Checks for ISBN-10/ISBN-13 collisions and prevents duplicate entries.
* **Stock & Shelf Tracking:** Monitors total quantity, live availability count, publication year, shelf locations, and cover image URLs.
* **Borrow Protection:** Deletion is blocked if copies are actively on loan to students.

### 3. 🔍 Dynamic Book Search & Filtering
* **Instant Search:** Real-time search across book Title, Author, ISBN, Category, and Description.
* **Category Pills Bar:** Quick filtering across Computer Science, Artificial Intelligence, Literature, Science Fiction, Science, History, Business, and Philosophy.
* **Availability Toggle:** Filter by *All Inventory*, *Available Now*, or *Out of Stock*.
* **Multi-Criteria Sorting:** Sort by Title (A–Z, Z–A), Popularity (borrow frequency), Newest Additions, or Stock Count.

### 4. 🔄 Atomic Book Issue & Return
* **Atomic Concurrency:** Uses Firestore transactions (`runTransaction`) to guarantee stock accuracy under concurrent operations.
* **Loan Countdown:** 14-day standard borrowing window with real-time countdown badges (*"12 days left"*, *"Due in 2 days"*, *"Overdue"*).
* **Return Processing:** Automatically increments shelf stock, closes loan records, calculates overdue fines, and triggers waitlist notifications.
* **Borrowing History:** Retains a full ledger of all past returned titles.

### 5. 💰 Automated Overdue Fine Management
* **Automatic Fine Calculation:** Compares return timestamps with scheduled due dates at a standard rate of **$1.00 per overdue day**.
* **Fine Ledger:** Tracks fine status (`unpaid`, `paid`, `waived`), days overdue, and issue dates.
* **Student Payment Simulation:** Students can inspect itemized fines and clear balances through an integrated payment modal.
* **Admin Waiver Privileges:** Librarians can waive fines with documented administrative notes.

### 6. 🔖 Smart Book Reservation (Waitlist)
* **Unavailable Book Reservation:** Students can place reservations on titles currently out of stock.
* **Duplicate Queue Protection:** Prevents duplicate active reservations by the same student for the same title.
* **Auto-Alert Mechanism:** When a copy of a reserved book is returned, the system automatically marks the oldest reservation as `available_ready` and notifies the waiting student.

### 7. 🤖 AI-Powered Book Recommendation Engine
* **Dynamic Reading Profile Vectors:** Mathematical vector model analyzing borrowing history, weighted by exponential recency decay.
* **Category Affinity Distribution:** Identifies dominant and secondary student reading interests.
* **Author Affinity Scoring:** Boosts recommendations for authors the student has engaged with.
* **Candidate Deduplication Filter:** Strictly excludes books the student is currently reading or has previously borrowed.
* **Explainable AI Badges:** Transparent reason pills (e.g. *"96% Match • Based on your interest in Machine Learning"*).
* **Cold-Start Handler:** Provides Bayesian popularity discovery for new readers.

---

## 🏗️ Architecture & Project Folder Structure

```
project-root/
│
├── index.html                   # Modern landing page (Hero, Search, Featured Books, AI Showcase, About)
├── firestore.rules              # Production-grade Cloud Firestore security rules
├── README.md                    # System documentation and setup guide
│
├── pages/
│   ├── login.html               # Authentication portal (Student Login/Register, Admin Portal, Demo Accounts)
│   ├── student-dashboard.html   # Student portal (Catalog, AI Recommendations, Loans, Reservations, Fines)
│   └── admin-dashboard.html     # Administrator portal (Analytics, Inventory CRUD, Circulation, Queues, Users)
│
├── css/
│   ├── style.css                # Global design system (CSS variables, buttons, badges, modals, toasts)
│   ├── landing.css              # Landing page layout, hero glows, ribbons, and responsive breakpoints
│   └── dashboard.css            # Sidebar shell, topbar, notification dropdown, stat cards, data tables
│
├── js/
│   ├── firebase-config.js       # Firebase v10 CDN initialization + Unified Zero-Crash Data Adapter
│   ├── seed-data.js             # 14+ comprehensive books, demo users, sample loans, fines, and reservations
│   ├── auth.js                  # Authentication service, registration, login, logout, and route guards
│   ├── books.js                 # Catalog CRUD, search, category pills, ISBN validation, and sorting
│   ├── borrowings.js            # Atomic issue and return transactions, loan periods, stock decrement/increment
│   ├── fines.js                 # Overdue calculations, fine status, student balance, pay, and waiver logic
│   ├── reservations.js          # Waitlist queue, duplicate check, and return auto-notification triggers
│   ├── notifications.js        # Real-time alert dispatch, unread counters, and mark-as-read
│   ├── ai-recommender.js        # Hybrid Content-Based + Collaborative AI recommendation vector engine
│   ├── student-controller.js    # Student portal controller and dynamic view rendering
│   ├── admin-controller.js      # Admin portal controller, KPI analytics, inventory modals, and circulation
│   └── landing.js               # Landing page dynamic book showcase and live search preview
│
└── assets/                      # Icons, graphics, and image assets
```

---

## 🚀 Getting Started & Local Testing

The application uses standard **ES6 Modules** and requires a local HTTP server for native module imports.

### Option 1: Python HTTP Server (Recommended)
Open a terminal in the project directory and run:
```bash
python -m http.server 8000
```
Then open your browser and navigate to:
```
http://localhost:8000
```

### Option 2: Node.js (Optional)
If Node.js is installed, you can use:
```bash
npx serve .
```

---

## ⚡ Instant Demo Credentials

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Student** | `alex@student.edu` | `student123` | CS Student with active loans & overdue fine |
| **Student** | `emma@student.edu` | `student123` | Literature Major |
| **Admin** | `admin@library.edu` | `admin123` | Dr. Sarah Sterling (Full Administrator Privileges) |

*You can also click the quick one-click buttons on the sign-in page (`pages/login.html`) to log in instantly without typing credentials.*

---

## ☁️ Connecting Your Live Firebase Project

The system includes a **Unified Zero-Crash Data Adapter**: it runs out-of-the-box with immediate sample data and persistent storage, and can seamlessly connect to your live Firebase project anytime:

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password provider).
3. Create a **Cloud Firestore Database** in test mode or deploy `firestore.rules`.
4. Copy your web app configuration JSON from **Project Settings > General > Your Apps**.
5. Log into the **Admin Portal** (`pages/admin-dashboard.html`), navigate to **Firebase & Data**, paste your JSON configuration, and click **Save & Connect Live Firebase**.

---

## 🛡️ Firestore Security Rules

Production-grade rules are defined in [`firestore.rules`](file:///c:/project%20on%20library%20management%20system/firestore.rules).
- Public read access for the catalog.
- Role-based authorization for administrative mutations.
- Strict ownership isolation: students can only read and write their own loans, reservations, fines, and notifications.
- Concurrency-safe atomic transaction constraints on inventory stock.
