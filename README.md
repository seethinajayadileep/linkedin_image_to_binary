# 🗄️ Image Vault

A full-stack image storage application built with **React**, **Node.js (Express)**, and **Supabase**.  
Upload images through a drag-and-drop UI, store them in Supabase Storage, and retrieve them as raw binary data via a REST API.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Supabase Setup](#supabase-setup)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Getting Binary Data](#getting-binary-data)
- [Deploying to Vercel](#deploying-to-vercel)
- [Common Issues](#common-issues)

---

## Overview

Image Vault lets you:
1. **Upload** images via drag-and-drop or file picker
2. **Store** the binary in Supabase Storage and metadata in a Postgres table
3. **Retrieve** any image as raw binary data (`Content-Type: image/png`, no base64)
4. **Delete** images from both Storage and the database

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Axios |
| Backend | Node.js, Express 4, Multer |
| Database | Supabase Postgres |
| File Storage | Supabase Storage |
| Deployment | Vercel (frontend + backend as two separate projects) |

---

## Features

- Drag-and-drop image upload (PNG, JPG, GIF, WebP — max 10 MB)
- Live upload preview before submitting
- Images displayed in a responsive grid
- Each image served as **raw binary** (`ArrayBuffer`) — no base64 encoding
- Binary inspector panel shows `Content-Type`, byte count, and rendered preview
- Delete images (removed from both Storage and DB)
- Works locally with Vite proxy; works in production with an env-var base URL

---

## Project Structure

```
image-vault/
│
├── backend/                        # Express API server
│   ├── server.js                   # All route handlers
│   ├── vercel.json                 # Vercel serverless config
│   ├── supabase-schema.sql         # Run once in Supabase SQL Editor
│   ├── .env.example                # Copy to .env and fill in values
│   └── package.json
│
├── frontend/                       # React + Vite app
│   ├── index.html
│   ├── vite.config.js              # Dev proxy: /api → localhost:4000
│   ├── vercel.json                 # SPA rewrite rules for Vercel
│   ├── .env.example                # Copy to .env and fill in VITE_API_URL
│   ├── src/
│   │   ├── main.jsx                # React entry point
│   │   ├── App.jsx                 # Root component, fetches image list
│   │   ├── api.js                  # Axios instance (reads VITE_API_URL)
│   │   ├── index.css
│   │   └── components/
│   │       ├── ImageUpload.jsx     # Drag-and-drop uploader
│   │       └── ImageGrid.jsx       # Image grid + binary inspector
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                     UPLOAD FLOW                     │
│                                                     │
│  Browser (React)                                    │
│    └─ FormData (multipart/form-data)                │
│          └─► POST /api/upload (Express)             │
│                  ├─ Multer reads binary into memory │
│                  ├─ Uploads buffer → Supabase       │
│                  │  Storage (private bucket)        │
│                  └─ Saves metadata → Postgres       │
│                     (id, name, path, mime, size)    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  BINARY FETCH FLOW                  │
│                                                     │
│  Browser (React)                                    │
│    └─ GET /api/images/:id  { responseType:          │
│                               'arraybuffer' }       │
│          └─► Express                                │
│                  ├─ Reads metadata from Postgres    │
│                  ├─ Downloads blob from Supabase    │
│                  │  Storage                         │
│                  ├─ Converts Blob → Node Buffer     │
│                  └─ res.send(buffer)                │
│                     Content-Type: image/png         │
│                     Content-Length: <bytes>         │
│                                                     │
│  Browser receives raw ArrayBuffer                   │
│    └─ new Blob([buffer]) → URL.createObjectURL()    │
│          └─ Rendered as <img src="blob:...">        │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)
- [Git](https://git-scm.com/)

---

## Supabase Setup

Do this **once** before running the project.

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New Project → note your **Project URL** and **service_role key** (Settings → API).

### 2. Run the schema SQL
Go to **SQL Editor** in your Supabase dashboard and paste:

```sql
-- Creates the images metadata table
CREATE TABLE IF NOT EXISTS images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  storage_path  TEXT        NOT NULL UNIQUE,
  mime_type     TEXT        NOT NULL,
  size          BIGINT      NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable RLS so the service-role key has full access
ALTER TABLE images DISABLE ROW LEVEL SECURITY;
```

> The full file is also at `backend/supabase-schema.sql`.

### 3. Create the Storage bucket
Go to **Storage → New Bucket**:
- **Name:** `images`
- **Public:** OFF (files are served through our backend, not directly)

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-username/image-vault.git
cd image-vault

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Set up environment variables

**Backend** — create `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Then open `backend/.env` and fill in:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=images
PORT=4000
```

**Frontend** — no `.env` needed for local dev. The Vite proxy handles `/api/*` automatically.

### 3. Start both servers

Open **two terminals**:

```bash
# Terminal 1 — Backend API
cd backend
npm run dev
# ✅ Server running on http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm run dev
# ✅ Vite running on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project URL | `https://abcd1234.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) | `eyJhbGci...` |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name | `images` |
| `PORT` | Port for the Express server | `4000` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL — **leave empty in local dev** | `https://image-vault-api.vercel.app` |

> ⚠️ `VITE_*` variables are **baked into the build at compile time**.  
> After changing them in Vercel dashboard you must **redeploy** to apply the new values.

---

## API Reference

Base URL (local): `http://localhost:4000`  
Base URL (production): `https://your-backend.vercel.app`

---

### `POST /api/upload`
Upload an image to Supabase Storage and save its metadata.

**Request**
```
Content-Type: multipart/form-data
Field: image  (file)
```

**Response `201`**
```json
{
  "message": "Image uploaded successfully",
  "image": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "photo.png",
    "storage_path": "1716000000000-photo.png",
    "mime_type": "image/png",
    "size": 94302,
    "created_at": "2026-05-21T10:00:00.000Z"
  }
}
```

**Response `400`** — no file sent  
**Response `500`** — Supabase error

---

### `GET /api/images`
List metadata for all uploaded images (newest first).

**Response `200`**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "photo.png",
    "storage_path": "1716000000000-photo.png",
    "mime_type": "image/png",
    "size": 94302,
    "created_at": "2026-05-21T10:00:00.000Z"
  }
]
```

---

### `GET /api/images/:id`
Download a single image as **raw binary data**.

**Response `200`**
```
Content-Type: image/png
Content-Length: 94302
Content-Disposition: inline; filename="photo.png"

<binary data>
```

**Response `404`** — image not found  
**Response `500`** — Supabase error

---

### `DELETE /api/images/:id`
Delete an image from both Supabase Storage and the database.

**Response `200`**
```json
{ "message": "Image deleted" }
```

**Response `404`** — image not found

---

## Getting Binary Data

The `GET /api/images/:id` endpoint sends **pure binary** over HTTP — no base64 encoding.

### Using `fetch` (browser)
```js
const res    = await fetch('/api/images/<id>');
const buffer = await res.arrayBuffer();              // raw binary

console.log(res.headers.get('content-type'));        // "image/png"
console.log(buffer.byteLength);                     // 94302

// Display it
const blob = new Blob([buffer], { type: 'image/png' });
document.querySelector('img').src = URL.createObjectURL(blob);

// Download it
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'photo.png';
a.click();
```

### Using `axios` (already in the project)
```js
const resp = await axios.get('/api/images/<id>', {
  responseType: 'arraybuffer',   // ← key option
});

const buffer = resp.data;                     // ArrayBuffer
const blob   = new Blob([buffer], { type: 'image/png' });
const url    = URL.createObjectURL(blob);
```

### Using `curl` (terminal)
```bash
# Save to file
curl http://localhost:4000/api/images/<id> -o photo.png

# View headers only
curl -I http://localhost:4000/api/images/<id>

# Hex dump of the first bytes
curl -s http://localhost:4000/api/images/<id> | xxd | head
```

### Using Node.js
```js
import fs from 'fs';

const res    = await fetch('http://localhost:4000/api/images/<id>');
const buffer = Buffer.from(await res.arrayBuffer());

fs.writeFileSync('photo.png', buffer);
console.log('Saved', buffer.length, 'bytes');
```

---

## Deploying to Vercel

Deploy as **two separate Vercel projects** — one for the backend, one for the frontend.

### Step 1 — Push to GitHub
```bash
git add .
git commit -m "ready to deploy"
git push origin main
```

### Step 2 — Deploy the Backend

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
2. Set **Root Directory** → `backend`
3. Framework preset → **Other**
4. Add these **Environment Variables**:

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `SUPABASE_STORAGE_BUCKET` | `images` |

5. Click **Deploy**
6. Copy the deployed URL → e.g. `https://image-vault-api.vercel.app`

### Step 3 — Deploy the Frontend

1. **Add New Project** → same GitHub repo (import again)
2. Set **Root Directory** → `frontend`
3. Framework preset → **Vite**
4. Build command → `npm run build` | Output directory → `dist`
5. Add this **Environment Variable**:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://image-vault-api.vercel.app` ← backend URL from Step 2 |

6. Click **Deploy**

### Step 4 — Verify

Open your frontend Vercel URL, upload an image.  
In browser DevTools → Network tab, confirm requests go to `https://image-vault-api.vercel.app/api/...` and **not** `localhost`.

---

## Common Issues

### API calls going to `localhost` after deployment
`VITE_API_URL` was not set before the build ran.  
**Fix:** Set it in Vercel → Project Settings → Environment Variables, then **Redeploy**.

### `CORS` error in browser
The backend `server.js` already enables `cors()` for all origins.  
If you need to restrict it, replace:
```js
app.use(cors());
```
with:
```js
app.use(cors({ origin: 'https://your-frontend.vercel.app' }));
```

### `413 Payload Too Large`
The default Express/Multer limit is 10 MB.  
To increase it, edit `backend/server.js`:
```js
limits: { fileSize: 25 * 1024 * 1024 }  // 25 MB
```

### Image not showing after upload
Check that your Supabase bucket is named exactly `images` and matches the `SUPABASE_STORAGE_BUCKET` env var.

### `supabase-schema.sql` — table already exists error
Safe to ignore — the SQL uses `CREATE TABLE IF NOT EXISTS`.

---

## License

MIT — free to use, modify, and distribute.
