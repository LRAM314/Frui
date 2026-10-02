---
name: Frui product constraints
description: Approved architectural and intake decisions and the product rationale behind them.
---

Frui stays on the existing Vite/Express/Wouter stack rather than migrating to Next.js.

**Why:** The user explicitly approved keeping the current stack for Phase 2.

**How to apply:** Extend the existing product and API rather than introducing a second framework.

Structured training is capped at six days per week in Version 1.

**Why:** The user requires at least one unprogrammed day to simplify the future scheduling algorithm, not because seven training days necessarily cause unsafe CNS fatigue.

**How to apply:** Preserve this software constraint in scheduling-related changes unless the user changes the product policy.

Biological sex is required with Male/Female choices for the planned formula inputs; it is separate from gender. Pain/limitations must be separate from dislikes.

**Why:** The user explicitly approved these distinctions for future physiological calculations and safe programming inputs. Phase 2 only collects data, not medical clearance.

**How to apply:** Do not infer gender, merge restrictions with preferences, or interpret unanswered/undisclosed limitations as clearance to prescribe.