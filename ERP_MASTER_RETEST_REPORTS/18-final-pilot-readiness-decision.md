# 18 - Final Pilot Readiness Decision Test

Date: 2026-06-07

## Summary Table

| Test | Result | Reason |
| --- | --- | --- |
| Test 4 - Master Copy Secret Scan | FAIL | Frontend has no service-role exposure, but backend scripts/migrations include hardcoded test/default credential patterns. |
| Test 13 - Pilot-Size Load | BLOCKED | No pilot-scale dataset/live school project/browser execution was available. |
| Test 17 - Master-to-Slave Deployment Safety | BLOCKED | Master build passes, but live Vercel/Supabase env/project/backups cannot be verified and Test 4 credential risks remain. |
| Test 18 - Final Decision | GO FOR PILOT AFTER FIXING BLOCKERS | Master is technically buildable, but deployment and credential blockers/caveats remain. |

## Build / Local Technical Status

PASS WITH WORKTREE CAVEAT.

Commands run:

- `npm ci --dry-run`: PASS
- `npm ci`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS

Caveat: `frontend/package-lock.json` is modified in the worktree. Since `npm ci` now passes, this lockfile change should be reviewed and committed/tagged as part of the release candidate.

## Role Permission Status

PASS WITH CAVEATS based on existing report evidence.

Existing Phase 3 report found frontend direct URL route guards and `/unauthorized` handling. Backend/live role-token verification remains a caveat unless executed in the target per-school Supabase project.

## Secret Exposure Status

FAIL.

Frontend secret exposure is PASS:

- Frontend uses only `VITE_SUPABASE_URL`.
- Frontend uses only `VITE_SUPABASE_ANON_KEY`.
- No frontend service-role key found.
- No hardcoded production Supabase fallback URL found.

Overall secret/credential scan is FAIL because backend scripts/migrations include hardcoded test/default credential patterns such as `TestPass123!`, `password`, `Teacher@123`, `Student@123`, default password hashes, and demo `@school.edu` accounts.

## Pilot-Size Load Status

BLOCKED.

No live 300-student per-school dataset, browser run, mobile 390px check, or concurrency test was executed. Pilot-size use is plausible for one school per database, but not proven.

## Master-to-Slave Safety Status

BLOCKED.

The master/slave architecture avoids the need for shared-database tenant isolation during pilot, as long as each school gets its own Supabase project/database and deployment env. Live project/env/backup verification is still required per school.

## Remaining Blockers

1. Remove, disable, or reset hardcoded test/default credential patterns before real pilot cloning.
2. Review and commit the modified `frontend/package-lock.json`, then tag the tested master version.
3. Verify each school Vercel/frontend env contains only that school's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Verify no service-role key exists in any frontend/Vercel client env.
5. Create and verify separate Supabase project/database/Auth/storage/backups per school.
6. Apply the same migrations to each school project and prevent schema drift.
7. Execute pilot-size load/mobile/browser checklist with about 300 students and realistic records.
8. Verify backup/export/PITR before entering real school data.

## Remaining Non-Blocking Improvements

- Add an automated route-permission smoke test.
- Add a pilot seed/load dataset generator for 300-student school copies.
- Add a deployment checklist template per school.
- Record release notes and deployed version per school.

## Exact Next Action

Clean up or neutralize hardcoded default/test credentials in backend scripts and migrations, then review/commit the passing lockfile state and create a tagged master release candidate. After that, create one fully isolated Supabase/Vercel slave deployment and run the pilot-size browser/load/mobile checklist before cloning the same version to the remaining pilot schools.

## Final Decision

GO FOR PILOT AFTER FIXING BLOCKERS

Reason: The master copy now passes install, lint, and build, and the master/slave architecture is acceptable for pilot if each school has a separate Supabase project/database. However, hardcoded test/default credential risks, unverified live deployment separation, unverified backups/PITR, and unexecuted pilot-size load/mobile tests prevent full approval today.
