# Deployment Guide: Render Only (Manual Setup)`

This guide explains how to deploy both the **Backend** and **Frontend** entirely on Render, without using Blueprints.

## Prerequisites
- A [Render.com](https://render.com) account.
- This repository pushed to your GitHub.

---

## Part 1: Deploy the Backend (Python)
This service runs the AI model.

1.  **Create Service**:
    -   Go to your Render Dashboard.
    -   Click **New +** and select **Web Service**.
2.  **Connect Repo**:
    -   Find your **Fresh-Scan-X** repository and click **Connect**.
3.  **Configure Settings**:
    -   **Name**: `freshscanx-backend` (or similar)
    -   **Region**: (Choose closest to you)
    -   **Runtime**: `Python 3`
    -   **Build Command**: `pip install -r backend/requirements.txt`
    -   **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port 10000`
    -   **Instance Type**: `Free`
4.  **Environment Variables** (Optional but recommended):
    -   Key: `PYTHON_VERSION`
    -   Value: `3.10.0`
5.  **Deploy**:
    -   Click **Create Web Service**.
    -   Wait for the deployment to finish (Green "Live" badge).
6.  **Copy URL**:
    -   Copy the service URL from the dashboard (e.g., `https://freshscanx-backend.onrender.com`).
    -   **Save this URL**, you need it for the frontend!

---

## Part 2: Deploy the Frontend (React/Vite)
This service hosts the user interface.

1.  **Create Service**:
    -   Go to your Render Dashboard.
    -   Click **New +** and select **Static Site**.
2.  **Connect Repo**:
    -   Select the same **Fresh-Scan-X** repository.
3.  **Configure Settings**:
    -   **Name**: `freshscanx-frontend`
    -   **Runtime**: `Node` (default)
    -   **Build Command**: `npm install && npm run build`
    -   **Publish Directory**: `dist`
    -   **Instance Type**: `Free`
4.  **Environment Variables (CRITICAL)**:
    -   You MUST set this so the frontend knows where the backend is.
    -   Key: `VITE_API_URL`
    -   Value: `[PASTE_YOUR_BACKEND_URL_HERE]` (e.g., `https://freshscanx-backend.onrender.com`)
    -   *Note: Ensure there is **no trailing slash** at the end of the URL.*
5.  **Deploy**:
    -   Click **Create Static Site**.
    -   Wait for the deployment to finish.

---

## Part 3: Done!
Visit your **Frontend URL** (provided by Render Static Site). Upload an image, and it will send it to your Backend service for analysis.
