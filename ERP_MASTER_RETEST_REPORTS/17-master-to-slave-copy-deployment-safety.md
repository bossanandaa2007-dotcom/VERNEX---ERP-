# 17 - Master-to-Slave Copy Deployment Safety Re-Test

Date: 2026-06-07

## Master Safety Result

| Check | Status | Evidence / Notes |
| --- | --- | --- |
| `npm ci --dry-run` | PASS | Lockfile is now installable. |
| `npm ci` | PASS | Completed successfully; 280 packages installed. |
| `npm run lint` | PASS | ESLint completed with exit code 0. |
| `npm run build` | PASS | TypeScript/Vite production build completed successfully. |
| `package-lock.json` synced | PASS WITH WORKTREE CAVEAT | `npm ci --dry-run` and `npm ci` pass. `frontend/package-lock.json` is currently modified in the worktree and should be committed/reviewed before release tagging. |
| School-specific hardcoded Supabase values | PASS | No hardcoded live frontend Supabase project URL or fallback URL found. |
| Hardcoded test/default credentials | FAIL / RISK | Backend scripts/migrations include default/test passwords and seed/demo accounts. See Test 4. |

## Environment Separation Result

PASS WITH LIVE VERIFICATION BLOCKED.

Each slave deployment must set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Service-role keys must never be placed in frontend/Vercel client environment variables. Backend/admin service-role keys, if used, must remain backend-only and per-school.

Local source evidence:

- Frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Frontend env examples contain only public placeholder values.
- `.gitignore` protects `.env`, `.env.local` through `*.local`, `.vercel`, `node_modules`, and `dist`.

Live Vercel/env values could not be verified locally.

## Supabase Separation Result

REQUIRED / BLOCKED FOR LIVE VERIFICATION.

Each school must have its own:

- Supabase project
- Database
- Auth users
- Storage buckets, if used
- Migrations applied
- Backup/export process

No school should share database, Auth users, storage, or backups with another school.

## Deployment Misconfiguration Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Wrong `VITE_SUPABASE_URL` in a school deployment | HIGH | The frontend will connect to whichever project is configured at build/deploy time. |
| Wrong `VITE_SUPABASE_ANON_KEY` | HIGH | A mismatched anon key/project can break auth/data or point users to the wrong project. |
| Service-role key in frontend env | CRITICAL | Must be verified absent in every Vercel/frontend deployment. |
| Manual edits to one slave copy | HIGH | Causes schema/code drift and makes support unsafe. |
| Default/test credentials from migrations/scripts | HIGH | Must be reset/removed/controlled before real pilot accounts. |
| Backups mixed between schools | HIGH | Backup files must be labeled and stored per school/project. |

## Migration Consistency Result

PASS AS PROCESS REQUIREMENT / BLOCKED FOR LIVE VERIFICATION.

`backend/supabase/migrations` contains 77 SQL migrations. Each slave Supabase project must run the same migration set from the tested master. Schema drift between school copies must be treated as a deployment risk.

Any hotfix must be:

1. Recorded.
2. Merged back into master.
3. Re-tested on master.
4. Re-deployed to affected slave copies.

## Required Deployment Checklist Per School

Manual status values: PASS / FAIL / BLOCKED

| Check | Manual Status |
| --- | --- |
| Create separate Vercel project/env or equivalent deployment environment | BLOCKED |
| Set school-specific `VITE_SUPABASE_URL` | BLOCKED |
| Set school-specific `VITE_SUPABASE_ANON_KEY` | BLOCKED |
| Confirm no service-role key in frontend env | BLOCKED |
| Create separate Supabase project/database | BLOCKED |
| Apply same master migrations | BLOCKED |
| Create school-specific Auth users | BLOCKED |
| Create/configure storage buckets if used | BLOCKED |
| Verify RLS/RPCs/tables in school project | BLOCKED |
| Verify backup/export/PITR readiness | BLOCKED |
| Record school deployment URL and Supabase project ref | BLOCKED |
| Record deployed master version/tag | BLOCKED |

## Version / Update Strategy

Recommended release tag for this tested master once blockers are addressed:

`vernex-pilot-master-2026-06-07-rc1`

Update process:

1. Update master only.
2. Run `npm ci`, `npm run lint`, `npm run build`, and required manual smoke tests.
3. Create release note and tag.
4. Deploy the same commit/tag to each school copy.
5. Apply the same migrations to each school Supabase project.
6. Record deployed version per school.
7. Avoid one-off school-only changes unless logged as a hotfix and merged back to master.

## Final Test 17 Status

BLOCKED.

Reason: master install/lint/build now pass, and local source supports separate school deployment by env/project. However, live Vercel/Supabase separation, service-role absence in frontend env, per-school backups, storage setup, and migration application cannot be verified locally. Test 4 also found hardcoded test/default credential risks that must be handled before cloning real school deployments.
