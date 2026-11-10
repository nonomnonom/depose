# NestJS Server Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the initial `packages/server` NestJS backend with Better Auth (modular monolith) in the clean Turborepo repo.

**Architecture:** Single NestJS application in `packages/server` following a modular monolith layout; Better Auth wired via `@thallesp/nestjs-better-auth` with the `organization` plugin.

**Tech Stack:** NestJS, `@nestjs/*`, `better-auth`, `@thallesp/nestjs-better-auth`, pnpm, TypeScript, Turborepo/turbo.

**Spec:** docs/superpowers/specs/2026-11-10-nestjs-server-scaffold-design.md

## Global Constraints

- No `apps/` or `packages/` exist in the repo at this point (post reset).
- pnpm@11.25.0, Node >= 24, TypeScript 7.0.2, turbo ^2.11.10.
- Better Auth integration requires `bodyParser: false` in Nest bootstrap and `AuthModule.forRoot({ auth })`.
- Keep initial scope minimal (auth-focused); defer broader context modules.

## Review Focus

- Better Auth bootstrap correctness (bodyParser, module wiring, guard/decorators).
- Scaffold compiles and builds cleanly via turbo.

---

### Task 1: Scaffold `packages/server` NestJS shell

**Files:**

- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/nest-cli.json`
- Create: `packages/server/src/main.ts`
- Create: `packages/server/src/app.module.ts`
- Create: `packages/server/src/app.controller.ts`

**Interfaces:**

- Produces: minimal NestJS app runnable via turbo dev/build in `packages/server`.

- [ ] **Step 1: Scaffold package config files**

- [ ] **Step 2: Write Nest bootstrap + app module files**

- [ ] **Step 3: Verify scaffold compiles**

### Task 2: Install Better Auth stack in `packages/server`

- [ ] **Step 1: Install dependencies**

### Task 3: Wire Better Auth server + AuthModule

- [ ] **Step 1: Write Better Auth instance with organization plugin**

- [ ] **Step 2: Wire Nest bootstrap and AuthModule**

- [ ] **Step 3: Verify typecheck**

### Task 4: Verify turbo build and commit

- [ ] **Step 1: Run turbo build for the new package**

- [ ] **Step 2: Commit**

---

## Self-Review Checklist

- [ ] Spec coverage: design goals (scaffold, Better Auth, organization, modular layout) map to tasks.
- [ ] Step scan: each step unambiguous, one action each.
- [ ] Type consistency: package name and imports consistent across tasks.
- [ ] Review focus covered: bootstrap correctness, clean build.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-11-10-nestjs-server-scaffold.md`.
Please review. Execution approach: since the user said "langsung eksekusi", proceed with the native execution method (implement tasks directly, fresh reviewer at end).
