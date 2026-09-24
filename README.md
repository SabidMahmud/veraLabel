# VeraLabel

> A self-hosted, highly scalable, and dynamically configurable image annotation platform built for research teams and medical imaging workflows.

VeraLabel is designed to streamline the process of dataset curation. It allows researchers to create custom annotation projects, define dynamic label taxonomies, and automatically distribute images to a team of annotators through a blind cross-validation queue engine. 

---

## Key Features

- **Dynamic Project Config:** Researchers can define custom taxonomies (labels, colors, and descriptions) per project. No hardcoded medical terms—VeraLabel adapts to any visual classification task.
- **Smart Queue Engine:** A blind cross-validation routing system ensures annotators are served images they haven't seen before, automatically tracking progress until a customizable `consensusRequired` threshold is met.
- **Role-Based Access Control (RBAC):** 
  - **Admin:** Manages platform users and system-wide settings.
  - **Researcher:** Creates projects, defines label taxonomies, and oversees consensus data.
  - **Annotator:** Processes the image queue via a distraction-free UI.
  - **Reviewer:** Resolves annotation conflicts when consensus is not reached.
- **High-Performance Image Serving:** Images are bypassed from the Node.js event loop and served directly via an Nginx proxy volume mount, easily handling hundreds of thousands of high-resolution images.
- **Self-Hosted & Secure:** Designed to run in isolated lab environments, cloud VPS, or NAS setups. Complete data ownership with no external SaaS dependencies.

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes, NextAuth.js (v5), Mongoose
- **Database:** MongoDB 6.0
- **Infrastructure:** Docker, Docker Compose, Nginx

---

## Quick Start (Production / Server)

VeraLabel is built to be deployed seamlessly using Docker. 

### 1. Prerequisites
- Docker Engine & Docker Compose
- Git

### 2. Installation

Clone the repository and navigate into the directory:
```bash
git clone https://github.com/yourusername/VeraLabel.git
cd VeraLabel
```

Set up your environment variables:
```bash
cp .env.example .env
```
*Be sure to open `.env` and fill out your `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.*

### 3. Start the Platform
Run the docker-compose stack in detached mode:
```bash
docker compose up -d --build
```
This spins up three containers:
1. `db`: MongoDB database.
2. `web`: The Next.js application.
3. `proxy`: Nginx serving as a reverse proxy and static image server.

*(Note: A temporary `seed` container will also run once to automatically provision your Admin account based on your `.env` variables).*

### 4. Access the Application
Navigate to `http://localhost` (or your server's IP address) in your browser. 
Log in using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you configured in your `.env` file.

---

## Data Loading Procedure

VeraLabel handles images efficiently by mapping local directories directly into the Nginx container. 

1. Place your dataset images inside the `./data/images` folder on your host machine (or whatever path you set `DATA_FOLDER_PATH` to in your `.env`).
2. Inside VeraLabel, when a project is created, the system will expect image paths relative to this mount (e.g., `/images/dataset-a/slide1.jpg`).
3. Nginx intercepts any request to `/images/*` and serves the file directly from disk, ensuring lightning-fast load times in the Viewer UI.

---

## Local Development

If you wish to modify the code or contribute to VeraLabel, you can run the application in development mode.

### Prerequisites
- Node.js (v22+)
- MongoDB instance running locally or a MongoDB URI.

### Setup
```bash
# Install exact dependencies
npm install

# Start the development server with Turbopack
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Security & Authentication

VeraLabel uses NextAuth.js for session management. 
- **Session Tokens:** Handled securely via `httpOnly` cookies.
- **Forgot Password:** Integrated OTP (One-Time Password) generation utilizing `nodemailer`. Ensure you configure the SMTP settings in your `.env` to enable this feature.
- **Middleware:** All routes are strictly protected by Next.js edge middleware. Unauthorized roles are immediately intercepted and redirected.

---

## License

*(Include your chosen license here, e.g., MIT License, or state that it is proprietary for your laboratory).*
