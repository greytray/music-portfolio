# AI Change Registry

This file is the AI-facing change registry for the website repository.

## How to use this registry

- **Stable checkpoints** are restore points that represent an approved, known-good website state.
- **Changes** are atomic website modifications. Each change corresponds to one user request and one commit.
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

### CHANGE-002 — Add Process, Pricing, Delivery & Payment sections
- **Date:** 2026-09-03
- **Description:** Added four new information sections to the existing website: The Process, Pricing, Delivery, and Payment. The implementation extends the current dark/purple glass system, Dela Gothic One display typography, Work Sans supporting typography, existing rounded geometry, signal-blue accents, and responsive layout rather than introducing a separate visual language. Existing services, music player, hero, contact form, and interactions were preserved.
- **Files:** `index.html`, `CHANGELOG.md`
- **Parent:** `STABLE-001`
- **Status:** EXPERIMENTAL
- **Pricing:** Uses the existing service starting prices already present on the site; no new pricing figures were invented for this change.
- **Rollback:** Restore the parent checkpoint `STABLE-001` if the complete change needs to be removed.

### CHANGE-003 — Fix mobile view: premium spacing, sizing, and hero vertical centering
- **Date:** 2026-09-04
- **Description:** Improved the mobile (≤820px) experience across the entire site. The hero section title and subtitle are now vertically centered instead of bottom-aligned. Adjusted font sizes, spacing, padding, and section rhythm for a premium feel on small screens. Desktop view (≥821px) is completely untouched — all changes are scoped to mobile-only media queries.
- **Files:** `index.html`, `CHANGELOG.md`
- **Parent:** `CHANGE-002`
- **Status:** EXPERIMENTAL
- **Rollback:** Remove the `CHANGE-003` CSS block (the two `@media` queries labeled `CHANGE-003`) from `index.html`.

## Future Change Protocol

For every future website change:

1. Inspect the active stable checkpoint and existing change registry.
2. Treat the user's current request as exactly one unique `CHANGE-###` entry, regardless of size.
3. Make the requested implementation using design judgment and checking the whole site's visual system, typography, hierarchy, responsiveness, readability, and visitor impact.
4. Keep the request together as one logical change and one commit; do not split a single user request into multiple change commits.
5. Validate that the requested behavior and existing website behavior still work.
6. Update this registry as part of the same commit whenever possible.
7. Treat new changes as **EXPERIMENTAL** unless the user explicitly approves them as stable.
8. When the user approves a change as stable, create a new `STABLE-###` restore point and record the exact commit.
9. If the user says **"revert CHANGE-###"**, revert only that logical change when safely possible.
10. If the user says **"restore STABLE-###"**, restore the repository to the exact commit recorded for that checkpoint.
11. If a requested change conflicts with a later approved change, explain the dependency before reverting instead of blindly removing code.

## Naming

- `STABLE-###` = approved restore point.
- `CHANGE-###` = one user-requested modification.
- **EXPERIMENTAL** = implemented but not yet approved as stable.
- **ACTIVE** = currently part of the repository state.
- **REVERTED** = intentionally undone; keep the record for traceability.
