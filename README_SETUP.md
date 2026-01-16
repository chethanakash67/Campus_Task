# CampusTask Project Setup Guide

## Prerequisites

Before starting, make sure you have installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)

## Step-by-Step Setup Instructions

### 1. Database Setup

#### 1.1 Install PostgreSQL (if not installed)
- Download and install PostgreSQL from https://www.postgresql.org/download/
- During installation, remember the password you set for the `postgres` user
- Make sure PostgreSQL is running on your system

#### 1.2 Create Database
Open your terminal and run:

```bash
# Connect to PostgreSQL (you'll be prompted for password)
psql -U postgres

# Once connected, run these commands:
CREATE DATABASE campustasks;
\q
```

#### 1.3 Setup Database Schema
```bash
# Navigate to server directory
cd server

# Run the schema file to create tables
psql -U postgres -d campustasks -f db/schema.sql
```

**Note:** If you get a password prompt, enter the password you set during PostgreSQL installation.

---

### 2. Server Setup

#### 2.1 Navigate to Server Directory
```bash
cd server
```

#### 2.2 Install Dependencies
```bash
npm install
```

#### 2.3 Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
# Create .env file
touch .env
```

Add the following content to `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campustasks
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# JWT Secret (change this to a random string in production)
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# Server Port
PORT=5000
```

**Important:** Replace `your_postgres_password_here` with your actual PostgreSQL password.

#### 2.4 Start the Server

```bash
# Development mode (auto-reloads on changes)
npm run dev

# OR Production mode
npm start
```

You should see:
```
✅ Connected to PostgreSQL database
🚀 Server running on port 5000
```

---

### 3. Client Setup

#### 3.1 Open a NEW Terminal Window
Keep the server running, and open a new terminal window.

#### 3.2 Navigate to Client Directory
```bash
cd client
```

#### 3.3 Install Dependencies
```bash
npm install
```

#### 3.4 Configure Environment Variables (Optional)

Create a `.env` file in the `client` directory:

```bash
# Create .env file
touch .env
```

Add the following (usually default values work):

```env
VITE_API_URL=http://localhost:5000/api
```

#### 3.5 Start the Client

```bash
npm run dev
```

You should see:
```
VITE v7.2.5  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### 4. Access the Application

1. Open your browser
2. Navigate to: `http://localhost:5173` (or the port shown in terminal)
3. You should see the landing page
4. Click "Sign Up" or "Login" to create an account

---

## Troubleshooting

### Issue: "Registration failed" Error

**Possible Causes & Solutions:**

1. **Server not running**
   - Make sure the server is running on port 5000
   - Check terminal for server logs
   - Restart server: `cd server && npm run dev`

2. **Database connection failed**
   - Check PostgreSQL is running: `pg_isready` or check system services
   - Verify database credentials in `server/.env`
   - Test connection: `psql -U postgres -d campustasks`

3. **Database tables don't exist**
   - Run schema again: `psql -U postgres -d campustasks -f server/db/schema.sql`

4. **Port already in use**
   - Change PORT in `server/.env` to another port (e.g., 5001)
   - Update `client/.env` VITE_API_URL accordingly

5. **CORS errors**
   - Make sure server is running before client
   - Check browser console for specific errors

### Issue: Database Connection Error

```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start PostgreSQL service
# On macOS:
brew services start postgresql

# On Windows:
# Start PostgreSQL service from Services panel

# On Linux:
sudo systemctl start postgresql
```

### Issue: "Cannot find module" errors

```bash
# Delete node_modules and reinstall
cd server  # or cd client
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 5000 already in use

```bash
# Find what's using port 5000 (macOS/Linux)
lsof -i :5000

# Kill the process
kill -9 <PID>

# OR change PORT in server/.env to 5001
```

---

## Project Structure

```
Campus_Task/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # Context providers
│   │   └── ...
│   └── package.json
│
├── server/                # Express backend
│   ├── db/
│   │   └── schema.sql     # Database schema
│   ├── index.js           # Server entry point
│   └── package.json
│
└── README_SETUP.md        # This file
```

---

## Quick Start Commands

### Terminal 1 - Server
```bash
cd server
npm install
# Create .env file with database config
npm run dev
```

### Terminal 2 - Client
```bash
cd client
npm install
npm run dev
```

---

## Common Commands

### Server
- `npm start` - Start server in production mode
- `npm run dev` - Start server in development mode (with nodemon)

### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

---

## Testing the Setup

1. **Check Server:** Open http://localhost:5000/health
   - Should return: `{"status":"OK","message":"Server is running"}`

2. **Check Database:** 
   ```bash
   psql -U postgres -d campustasks -c "SELECT COUNT(*) FROM users;"
   ```

3. **Check Client:** Open http://localhost:5173
   - Should see the landing page

4. **Test Registration:**
   - Click "Sign Up"
   - Fill in the form
   - Submit and check for success

---

## Need Help?

- Check browser console (F12) for client errors
- Check server terminal for server errors
- Verify all steps above
- Ensure PostgreSQL is running
- Ensure both server and client are running
