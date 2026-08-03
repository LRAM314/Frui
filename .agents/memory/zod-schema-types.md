---
name: Zod v3 vs drizzle-zod type mismatch
description: drizzle-zod generates Zod v4 ZodObject types incompatible with Zod v3 z.infer<>. Use Drizzle's native $inferInsert/$inferSelect instead.
---

# Zod v3 / drizzle-zod Type Mismatch

## Rule
Do not use `drizzle-zod`'s `createInsertSchema` with `z.infer<typeof schema>` in this project.

**Why:** The workspace pins `zod: ^3.25.76` (Zod v3). `drizzle-zod` v0.8.x generates Zod v4 `ZodObject<..., { out: {}; in: {} }>` types. Using `z.infer<>` on these fails TypeScript type-checking because v4 types don't satisfy v3's `ZodType<any, any, any>` constraint.

**How to apply:** In `lib/db/src/schema/*.ts`, export types using Drizzle's native inference:
```typescript
export type InsertFoo = typeof fooTable.$inferInsert;
export type Foo = typeof fooTable.$inferSelect;
```
Do not import `z` or `createInsertSchema` in schema files.

Also note: `zod/v4` subpath does not exist in Zod v3. Use `import { z } from "zod"`.
