# Deployment Guide

This guide covers how to deploy:
1.  **Backend**: Hugging Face Spaces (Docker)
2.  **Frontend**: Vercel

---

## 1. Backend Deployment (Hugging Face Spaces)

We use **Hugging Face Spaces** because it offers **16GB RAM free**, resolving memory issues.

1.  **Create Space**:
    *   Go to [Hugging Face Spaces](https://huggingface.co/spaces).
    *   Click **Create new Space**.
    *   **Name**: `freshscanx-backend`
    *   **License**: `MIT`
    *   **SDK**: Select **Docker** -> **Blank**.
    *   Click **Create Space**.

2.  **Upload Files**:
    *   Navigate to the **Files** tab in your new Space.
    *   Click **Add file** -> **Upload files**.
    *   **Drag and drop** these two items from your computer:
        1.  The `backend` folder.
        2.  The `Dockerfile`.
    *   *Note: The model is inside the backend folder, so it uploads automatically.*
    *   Click **Commit changes**.

3.  **Wait for Build**:
    *   The Space will build (Status: **Building** -> **Running**).
    *   This takes ~2-5 minutes.

4.  **Get Backend URL**:
    *   Once running, click the **Embed this space** button (top right).
    *   Copy the **Direct URL**.
    *   Example: `https://yourname-freshscanx-backend.hf.space`
    *   **Keep this URL safe**; you need it for the frontend.

---

## 2. Frontend Deployment (Vercel)

We use **Vercel** for the React frontend.

1.  **Create Project**:
    *   Go to [Vercel New Project](https://vercel.com/new).
    *   Import your GitHub repository.

2.  **Configure Build**:
    *   **Framework Preset**: `Vite`    (Should auto-detect).
    *   **Root Directory**: `.`         (Default).
    *   **Build Command**: `npm run build` (Default).
    *   **Output Directory**: `dist`    (Default).

3.  **Environment Variables**:
    *   Expand **Environment Variables**.
    *   Key: `VITE_API_URL`
    *   Value: **Paste your Hugging Face Backend URL here** (from Step 1.4).
        *   *No trailing slash* (e.g., `https://yourname-freshscanx-backend.hf.space`).

4.  **Deploy**:
    *   Click **Deploy**.
    *   Wait for the celebration confetti! 🎉

---

## Troubleshooting

-   **Backend**: If the Space status is `Runtime Error`, check the **Logs** tab in Hugging Face.
-   **Frontend**: If the app loads but scans fail:
    1.  Open your browser console (F12).
    2.  Check for "Network Error" or "404".
    3.  Verify that your `VITE_API_URL` variable in Vercel matches your running Backend URL.
