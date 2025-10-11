# Mead Batch Tracker

A React application for tracking mead batches through the brewing process, now with file-based storage on disk!

## Changes Made

The application has been updated to store batches on disk in a `batches` folder instead of using browser localStorage. This provides better data persistence and the ability to backup/share batch data easily.

## New Architecture

- **Frontend**: React + Vite (runs on port 5173 by default)
- **Backend**: Node.js + Express (runs on port 3001)
- **Storage**: JSON files in the `batches` folder

## Installation

```bash
npm install
```

## Running the Application

### Option 1: Run Everything Together (Recommended)

This will start both the frontend and backend servers simultaneously:

```bash
npm run dev:all
```

### Option 2: Run Separately

In one terminal, start the backend server:
```bash
npm run server
```

In another terminal, start the frontend:
```bash
npm run dev
```

## Accessing the Application

Once running, open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/batches

## Batch Storage

All batches are stored as individual JSON files in the `batches` folder at the root of the project. Each batch is saved as `batch-{id}.json`.

### Backup Your Data

Simply copy the `batches` folder to backup all your mead batch data!

### Sharing Data

You can share specific batch files or the entire `batches` folder with others.

## Features

- Create and track mead batches
- Record original gravity and calculate TOSNA 3.0 nutrient schedules
- Track gravity readings throughout fermentation
- Record final gravity and ABV
- Calculate stabilizer amounts
- Track backsweetening
- Record bottling/kegging dates

## API Endpoints

- `GET /api/batches` - Get all batches
- `GET /api/batches/:id` - Get a specific batch
- `POST /api/batches` - Create a new batch
- `PUT /api/batches/:id` - Update a batch
- `DELETE /api/batches/:id` - Delete a batch

## Troubleshooting

If you see an error about "Failed to load batches", make sure the backend server is running on port 3001.

