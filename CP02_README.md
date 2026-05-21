# CP02: Core Authentication Implementation

This document outlines the implementation of **CP02 (Core Authentication)** for the Spendly-Ai project. CP02 provides user registration, login, and session management using **bcrypt** for password hashing and **express-session** for session handling.

---

## 📌 What is CP02?

CP02 is the **Core Authentication** checkpoint, assigned to **Kayden**. It includes:
- User registration with email and password
- Secure login with bcrypt password hashing
- Session management for persistent user authentication

This checkpoint is a **blocker** for other features like CP07 (AI context injection), which requires user sessions to function.

---

## 🛠️ Implementation Details

### 1. Database Schema
- **File:** `lib/db/src/schema/users.ts`
- **Purpose:** Defines the `users` table with fields for `id`, `email`, `passwordHash`, `createdAt`, and `updatedAt`.
- **Dependencies:** Uses Drizzle ORM for PostgreSQL.

### 2. Authentication Endpoints
- **File:** `scripts/src/server.ts`
- **Endpoints:**
  - `POST /api/auth/register`: Register a new user
  - `POST /api/auth/login`: Log in an existing user
  - `POST /api/auth/logout`: Log out the current user
- **Features:**
  - Password hashing with bcrypt
  - Session creation and destruction
  - Session middleware to attach user ID to requests

### 3. API Specification
- **File:** `lib/api-spec/openapi.yaml`
- **Purpose:** Documents the authentication endpoints for frontend integration.

### 4. Dependencies
- **Backend (`scripts/package.json`):**
  - `express`: Web framework
  - `express-session`: Session management
  - `connect-pg-simple`: Session store for PostgreSQL
  - `bcrypt`: Password hashing
  - `@workspace/db`: Database access

- **Database (`lib/db/package.json`):**
  - `bcrypt`: Password hashing

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (v18 or later)
2. **pnpm** (recommended package manager)
3. **PostgreSQL** database
4. **Environment Variables** (see `.env.example`)

### Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/KevinIbarra547/Spendly-Ai.git
cd Spendly-Ai
```

#### 2. Checkout the CP02 Branch
```bash
git checkout CP02
```

#### 3. Install Dependencies
```bash
pnpm install
```

#### 4. Configure Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/spendly
SESSION_SECRET=your_secure_session_secret_here
PORT=3000
```

#### 5. Run Database Migrations
```bash
cd lib/db
pnpm run push
```

#### 6. Start the Server
```bash
cd ../..
cd scripts
pnpm run start
```

The server will start on the port specified in `.env` (default: `3000`).

---

## 🧪 Testing the Endpoints

You can test the authentication endpoints using **curl**, **Postman**, or any HTTP client.

### Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123"}'
```

**Response (201 Created):**
```json
{
  "id": "user_id_here",
  "email": "user@example.com"
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123"}'
```

**Response (200 OK):**
```json
{
  "id": "user_id_here",
  "email": "user@example.com"
}
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout
```

**Response (200 OK):**
```
Session destroyed
```

---

## 📂 File Structure

```
Spendly-Ai/
├── lib/
│   └── db/
│       ├── src/
│       │   └── schema/
│       │       ├── index.ts          # Exports all schemas
│       │       └── users.ts          # Users table schema
│       └── package.json              # Database dependencies
├── scripts/
│   ├── src/
│   │   ├── hello.ts                  # Example file
│   │   └── server.ts                 # Authentication server
│   └── package.json                  # Backend dependencies
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore rules
└── CP02_README.md                    # This file
```

---

## 🔐 Security Notes

1. **Password Hashing:** All passwords are hashed using bcrypt before storage.
2. **Session Security:** Sessions are stored in PostgreSQL and encrypted with a secret key.
3. **Environment Variables:** Never commit `.env` to version control. Use `.env.example` as a template.

---

## 📝 Notes for the Team

- **Frontend Integration:** Nolan can now build login/register forms and connect them to these endpoints.
- **AI Features:** Kevin can start working on CP07, which requires user sessions for context injection.
- **Testing:** Ensure all endpoints are tested thoroughly before merging to `main`.

---

## 🎯 Next Steps

1. **Frontend:** Implement login/register UI and connect to `/api/auth/*` endpoints.
2. **AI:** Use `req.session.userId` to fetch user-specific data for AI features.
3. **Testing:** Write unit/integration tests for authentication flows.

---

## 📞 Support

For questions or issues, contact **Kayden Kamberi** (Backend & Architecture Lead).