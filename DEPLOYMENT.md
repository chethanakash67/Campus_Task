# Deployment Guide: CampusTasks App

This guide outlines the steps to deploy the CampusTasks application.
- **Server (Backend)**: Deployed on [Render](https://render.com).
- **Client (Frontend)**: Deployed on [Vercel](https://vercel.com).
- **Database**: PostgreSQL (managed by Render).

## Prerequisites

- GitHub account with the project repository pushed.
- Accounts on [Render](https://render.com) and [Vercel](https://vercel.com).

---

## Part 1: Deploy Server (Render)

1.  **Log in to Render** and click **New +** -> **Web Service**.
2.  **Connect your GitHub repository**.
3.  **Configure the Service**:
    -   **Name**: `campustasks-server` (or similar).
    -   **Region**: Choose the one closest to you/your users.
    -   **Branch**: `main` (or your default branch).
    -   **Root Directory**: `server` (Important!).
    -   **Runtime**: `Node`.
    -   **Build Command**: `npm install`.
    -   **Start Command**: `npm start`.
    -   **Instance Type**: Free (for hobby/testing) or Starter.

4.  **Environment Variables**:
    Click on **"Advanced"** or **"Environment"** tab and add the following variables. *Note: You MUST create a PostgreSQL database on Render first to get the DB credentials.*

    | Key | Value Description |
    | :--- | :--- |
    | `NODE_ENV` | `production` |
    | `PORT` | `5001` (or leave default, Render usually sets `PORT` automatically) |
    | `FRONTEND_URL` | Your Vercel URL (e.g., `https://your-app.vercel.app`). *Add this later after Vercel deployment.* |
    | `SESSION_SECRET` | A long random string. |
    | `JWT_SECRET` | A long random string. |
    | `DB_HOST` | From Render PostgreSQL (Hostname) |
    | `DB_PORT` | `5432` |
    | `DB_NAME` | From Render PostgreSQL (Database) |
    | `DB_USER` | From Render PostgreSQL (User) |
    | `DB_PASSWORD` | From Render PostgreSQL (Password) |
    | `EMAIL_USER` | Your email address (for notifications) |
    | `EMAIL_PASSWORD` | Your email app password |
    | `GOOGLE_CLIENT_ID` | (Optional) For Google Auth |
    | `GOOGLE_CLIENT_SECRET` | (Optional) For Google Auth |

5.  **Create Database (If not already)**:
    -   Go to Render Dashboard -> **New +** -> **PostgreSQL**.
    -   Name: `campustasks-db`.
    -   Copy the `Internal Connection URL` or individual credentials (`hostname`, `username`, etc.) to use in the Web Service environment variables.

6.  **Deploy**: Click **Create Web Service**. Wait for the build to finish.
    -   *Note the service URL (e.g., `https://campustasks-server.onrender.com`). You will need this for the Client.*

---

## Part 2: Deploy Client (Vercel)

1.  **Log in to Vercel** and click **"Add New..."** -> **Project**.
2.  **Import your GitHub repository**.
3.  **Configure Project**:
    -   **Framework Preset**: Vite.
    -   **Root Directory**: Click the `Edit` button and select `client`.
    -   **Build Command**: `npm run build` (default).
    -   **Output Directory**: `dist` (default).
    -   **Install Command**: `npm install` (default).

4.  **Environment Variables**:
    Expand the **Environment Variables** section and add:

    | Key | Value |
    | :--- | :--- |
    | `VITE_API_URL` | The Render Server URL (e.g., `https://campustasks-server.onrender.com/api`) |
    *Important: Ensure you include `/api` at the end if your backend routes are prefixed with it.*

5.  **Deploy**: Click **Deploy**.

---

## Part 3: Final Configuration

1.  **Update Server CORS**:
    -   Go back to your Render Web Service -> **Environment**.
    -   Update `FRONTEND_URL` to match your new Vercel domain (e.g., `https://campustasks-client.vercel.app`).
    -   Save changes. Render will redeploy automatically.

2.  **Verify**:
    -   Open your Vercel URL.
    -   Try logging in/signing up.
    -   Check network tab if API calls fail (Look for CORS errors or 404s).

## Troubleshooting

-   **Client 404 on Refresh**: If you refresh a page (like `/login`) and get a 404, create a `vercel.json` file in the `client` folder with:
    ```json
    {
      "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
    }
    ```
-   **CORS Errors**: Ensure `FRONTEND_URL` on Render matches the Vercel URL exactly (no trailing slash usually, unless your code handles it).
-   **Database Connection**: Ensure the `DB_` variables on Render are correct. Use the "Internal Database URL" if both are on Render.
