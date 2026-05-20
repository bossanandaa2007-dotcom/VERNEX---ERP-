# Backend

This folder contains the Supabase backend and admin-side utilities for the School ERP project.

## Contents

- `supabase/` for migrations and edge functions
- `scripts/` for setup and admin scripts

## Environment

Create `backend/.env` from `backend/.env.example` and set:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

## Notes

- Database schema changes belong in `backend/supabase/migrations/`
- Supabase functions belong in `backend/supabase/functions/`
- Admin or data bootstrap scripts belong in `backend/scripts/`
