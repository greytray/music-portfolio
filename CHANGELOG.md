# AI Change Registry

This file is the AI-facing change registry for the website repository.

## How to use this registry

- **Stable checkpoints** are restore points that represent an approved, known-good website state.
- **Changes** are atomic website modifications. Each change should correspond to one user request and one commit whenever practical.
- A change is **EXPERIMENTAL** until the user approves it as part of the stable version.
- Future AI work should inspect this registry before modifying the website, preserve the current stable checkpoint unless explicitly told otherwise, and use the change ID when discussing a revert.
- Website code remains contained in `index.html`; this registry does not affect the website itself.

## Stable Checkpoints

### STABLE-001 — Current stable website
- **Status:** ACTIVE RESTORE POINT
- **Date:** 2026-09-02
- **Commit:** `8397df743d0a41a54fb097f0dcae47aadfa277d1`
- **Description:** Current published/stable website state immediately before introducing this change-management system.
- **Restore instruction:** Restore the repository to commit `8397df743d0a41a54fb097f0dcae47aadfa277d1` when the user asks to return to `STABLE-001`.
- **Scope:** Entire website repository state at this commit.

## Changes

### CHANGE-001 — Establish AI change registry
- **Date:** 2026-09-02
- **Description:** Added this registry so future website changes can be referenced by stable checkpoint and change ID instead of relying on Git history alone.
- **Files:** `CHANGELOG.md`
- **Parent:** `STABLE-001`
- **Status:** ACTIVE
- **Rollback:** Remove `CHANGELOG.md`; this change does not modify website behavior or `index.html`.

## Future Change Protocol

For every future website change:

1. Inspect the active stable checkpoint and existing change registry.
2. Identify the requested change as a unique `CHANGE-###` entry.
3. Make the smallest appropriate implementation, using design judgment and checking the whole site's visual system, typography, hierarchy, responsiveness, readability, and visitor impact.
4. Keep unrelated changes out of the same change.
5. Validate that the requested behavior and existing website behavior still work.
6. Update this registry with the change description, affected files, parent checkpoint, commit, and status.
7. Commit and push the website change and its registry update together when practical so the code and its AI-facing record remain synchronized.
8. Treat new changes as **EXPERIMENTAL** unless the user explicitly approves them as stable.
9. When the user approves a change as stable, create a new `STABLE-###` restore point and record the exact commit.
10. If the user says **"revert CHANGE-###"**, revert only that logical change when safely possible.
11. If the user says **"restore STABLE-###"**, restore the repository to the exact commit recorded for that checkpoint.
12. If a requested change conflicts with a later approved change, explain the dependency before reverting instead of blindly removing code.

## Naming

- `STABLE-###` = approved restore point.
- `CHANGE-###` = one logical modification.
- **EXPERIMENTAL** = implemented but not yet approved as stable.
- **ACTIVE** = currently part of the repository state.
- **REVERTED** = intentionally undone; keep the record for traceability.
