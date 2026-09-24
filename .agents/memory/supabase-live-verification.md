---
name: Supabase live verification lessons
description: Live migration and privilege details discovered while validating the Wisdom OS Supabase project.
---

The foundation migration’s generated statement order is not safe on an empty Supabase project: composite foreign keys reference `(workspace_id, id)` before the matching unique indexes exist. A fresh live apply needs the equivalent statements reordered as tables, unique indexes, foreign keys, then functions/triggers.

**Why:** Supabase rejected the original foundation migration with PostgreSQL error 42830 before applying any objects.

**How to apply:** Never reset the database or edit historical migrations during live verification; verify migration state first and use a corrective, ordered application when the target is empty.

`REVOKE ... FROM PUBLIC` did not remove explicit `anon` execute ACLs on security-definer functions in the live project. Revoke `anon` explicitly and verify `has_function_privilege` for `anon`, `authenticated`, and `public`.

**Why:** The bootstrap and membership helper initially retained `anon=X` even though the migration revoked `PUBLIC`.

**How to apply:** Every exposed security-definer RPC must explicitly deny `anon` and `public`, retain only the intended authenticated grant, and use a locked `search_path`.