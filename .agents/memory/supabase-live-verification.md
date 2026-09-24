---
name: Supabase live verification lessons
description: Live migration and privilege details discovered while validating the Wisdom OS Supabase project.
---

The foundation migration’s generated statement order is not safe on an empty Supabase project: composite foreign keys reference `(workspace_id, id)` before the matching unique indexes exist. The smallest reproducibility fix is to move the existing index statements ahead of the foreign-key statements while preserving the migration name and journal history.

**Why:** Supabase rejected the original foundation migration with PostgreSQL error 42830 before applying any objects.

**How to apply:** Do not reset the database. When finalization explicitly permits a migration repair, update only the statement order, validate the full chain on an isolated empty PostgreSQL database, and do not reapply the repaired historical migration to an already-built live database.

`REVOKE ... FROM PUBLIC` did not remove explicit `anon` execute ACLs on security-definer functions in the live project. Revoke `anon` explicitly and verify `has_function_privilege` for `anon`, `authenticated`, and `public`.

**Why:** The bootstrap and membership helper initially retained `anon=X` even though the migration revoked `PUBLIC`.

**How to apply:** Every exposed security-definer RPC must explicitly deny `anon` and `public`, retain only the intended authenticated grant, and use a locked `search_path`.