# Backend Structure

This folder contains backend-related files and API configurations for BeSQL.

## Folders

- **sql/** - Database schema and migrations
- **config/** - Configuration files and environment setup
- **api/** - API endpoint definitions (when backend service is built)

## Files

- **.env.example** - Template for environment variables (copy to .env)

## Current Status

BeSQL is currently a **frontend-heavy SPA** (Single Page Application) with:
- Client-side SQL execution via `js/core/sql-engine.js`
- Local storage for problem and contest data
- Optional Supabase integration for cloud sync

## Future Backend Services

When building backend services, add:
- API routes (e.g., `/api/auth`, `/api/contests`, `/api/judge`)
- Database models and queries
- Authentication middleware
- Rate limiting and abuse prevention

## Setup

1. Copy `.env.example` to `.env` and fill in API keys
2. See root `README.md` for full project setup instructions

