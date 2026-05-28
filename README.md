# AI Support Ticket System

An intelligent, full-stack ticketing system that automatically categorizes, prioritizes, and extracts actionable insights from user support requests using AI. Built with Next.js, React, and PostgreSQL.

## 🚀 Features

- **AI-Powered Analysis**: Automatically extracts the category, priority, key issues, and suggested actions from incoming tickets using Google Gemini.
- **Role-Based Access Control**: Different dashboards and permissions for `users` (clients) and `technicians` (support staff).
- **Modern UI/UX**: Fully responsive interface built with modern CSS and reusable React components.
- **Type-Safe**: End-to-end type safety using TypeScript and Zod for runtime validation.
- **PostgreSQL Database**: Robust and reliable data storage using PostgreSQL.

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (CSS Variables, Flexbox, CSS Grid)
- **Database**: PostgreSQL (pg module)
- **Authentication**: NextAuth.js
- **Validation**: Zod
- **AI Integration**: Google Generative AI (Gemini)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Gemini API Key

## ⚙️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Variables**
   Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
   Required variables:
   - `DATABASE_URL` (or `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`)
   - `AUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `GEMINI_API_KEY` (Get one from Google AI Studio)

4. **Initialize Database**
   Run the seed script to create tables and the initial admin user:
   ```bash
   pnpm seed
   ```
   *Default Admin Credentials:*
   - Username: `admin`
   - Password: `admin123`

5. **Start Development Server**
   ```bash
   pnpm dev
   ```

## 🏗️ Architecture

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: Reusable UI components.
- `src/lib`: Core utilities including database client (`db.ts`), AI integration (`ai.ts`), and validation schemas (`validation.ts`).
- `src/types`: Global TypeScript definitions.

## 🔒 Security

This project implements several security best practices:
- Password hashing using `bcryptjs`.
- JWT-based session management via NextAuth.
- Strict input validation using `Zod` schemas on all API endpoints.
- Proper authorization guards ensuring users can only access their own data.

## 📝 License

This project is licensed under the MIT License.
