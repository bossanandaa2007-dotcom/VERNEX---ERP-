


























































# 04 - Master Copy Secret Scan Re-Test

Date: 2026-06-07

## Files / Paths Scanned

Scanned the full project with `rg`, excluding `node_modules`, `dist`, `.git`, `ERP_PILOT_RETEST_REPORTS`, and `ERP_MASTER_RETEST_REPORTS`.

Search terms included: `service_role`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_SERVICE_ROLE_KEY`, `private_key`, `secret`, `api_key`, `Bearer`, `JWT_SECRET`, `password`, `token`, `authorization`, `anon`, `VITE_SUPABASE`, `SUPABASE_URL`, hardcoded Supabase URLs, `.env`, and `.env.local`.

## Suspicious Matches Found

| Match / Path | Result | Risk Assessment |
| --- | --- | --- |
| `frontend/src/lib/supabase.ts` uses `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` | SAFE | Correct frontend env usage. No fallback URL. |
| `frontend/.env.example`, `frontend/README.md` mention `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` | SAFE | Placeholder/public frontend config only. |
| `backend/README.md` mentions `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` | SAFE WITH CAUTION | Backend-only setup docs; service-role key must not be used in frontend/Vercel client env. |
| `backend/scripts/create-librarian.mjs`, `delete-librarian.mjs`, `create-student-profiles.mjs` use `SUPABASE_URL` and service-role env vars | SAFE WITH CAUTION | Service-role values are read from environment variables, not committed. Scripts are admin/backend only. |
| `backend/scripts/create-librarian.mjs` default `TEST_LIBRARIAN_PASSWORD=TestPass123!` and fallback `librarian.test@school.test` | RISK | Hardcoded test credential fallback exists. Not a frontend secret, but should not be used for real pilot accounts. |
| `backend/scripts/create-student-profiles.mjs` uses `password: 'password'` in generated user metadata/body | RISK | Hardcoded default password literal exists in admin script. |
| `backend/supabase/migrations/*` seed many `@school.edu` demo accounts | RISK / DEMO DATA | Demo school emails are committed in migrations. They are not real school credentials, but clean pilot projects should review/remove/replace seed data as needed. |
| `backend/supabase/migrations/20260507_reset_class_teacher_3a_password*.sql` contains `Teacher@123` | RISK | Hardcoded reset password exists in migration. |
| `backend/supabase/migrations/20260513_auto_provision_teacher_student_logins.sql` contains default password hashes | RISK | Known default password hashes are embedded for provisioning. |
| `backend/supabase/migrations/20260514_guarantee_student_login_on_write.sql` contains `Student@123` | RISK | Hardcoded student default password exists in migration. |
| `backend/supabase/functions/ai-attendance/index.ts` reads `GEMINI_API_KEY` from function secrets | SAFE | Secret is expected from Supabase Edge Function environment, not committed. |
| `backend/supabase/config.toml` references env-based secrets and auth token settings | SAFE | Uses `env(...)` placeholders and comments. |

## Frontend Secret Exposure Result

PASS.

Evidence:

- Frontend Supabase client uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- No frontend service-role key was found.
- No hardcoded production Supabase URL fallback was found.
- If frontend env values are missing, the Supabase client is `null`; it does not fall back to another project.

## Backend Script Secret Handling Result

PASS WITH RISKS.

Backend/admin scripts read service-role keys from environment variables. No real service-role key was found committed. However, backend scripts include hardcoded test/default credential fallbacks and must not be used unchanged for real school pilot accounts.

## Hardcoded URL / Credential Result

FAIL.

No hardcoded live production Supabase project URL was found in frontend source. Backend scripts contain placeholder Supabase URLs such as `https://xyz.supabase.co`, which are examples.

However, hardcoded test/default credential patterns were found in backend scripts and migrations:

- `TestPass123!`
- `password`
- `Teacher@123`
- `Student@123`
- Default password hashes
- Demo `@school.edu` accounts in seed migrations

These are not exposed frontend service-role secrets, but they are not acceptable to mark fully clean for pilot readiness without review/reset/removal for real school deployments.

## `.gitignore` Protection Result

PASS.

`.gitignore` protects:

- `.env`
- `frontend/.env`
- `backend/.env`
- `.vercel`
- `node_modules`
- `dist`
- `*.local`, which covers `.env.local`

## Final Test 4 Status

FAIL.

Reason: frontend secret exposure checks pass, but hardcoded test/default credential patterns exist in backend scripts and migrations. These must be removed, disabled, or clearly replaced/reset before cloning real pilot school deployments.
