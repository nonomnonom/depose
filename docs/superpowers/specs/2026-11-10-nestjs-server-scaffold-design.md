# Design: Initial `packages/server` NestJS Backend + Better Auth

Date: 2026-11-10
Status: Approved (approach #1 - modular monolith)

## Intent

Scaffold the initial backend for the Depose platform: a NestJS server package
under `packages/server`, with a modular backend structure, integrated with
Better Auth (server + organization plugin).

## Why

The monorepo was reset to a clean Turborepo template (commit `82348f2`) - no
`apps/` and no `packages/` remain. This is the first backend code for the
platform.

## Goals / Non-Goals / Anti-Goals

Goals:

- Runnable NestJS server in `packages/server`, invocable via turbo tasks.
- Better Auth wired per integration guide: `main.ts` with `bodyParser: false`,
  `AuthModule.forRoot({ auth })`.
- Organization plugin enabled (server + client), with migration steps.
- Modular layout aligned to future bounded contexts: auth, ingest, matters,
  documents, intelligence.

Non-Goals:

- Multi-service split (out of scope for the initial scaffold).
- Frontend work.

Anti-Goals:

- Broad tooling refactor; keep the initial scope minimal.

## Constraints

- Package manager: pnpm@11.25.0; Node >= 24; TypeScript 7; turbo ^2.11.10.
- Better Auth NestJS integration is community-maintained
  (`@thallesp/nestjs-better-auth`); Fastify beta support.

## Approaches Considered

1. Modular monolith (chosen) - single NestJS app in `packages/server`, module
   per bounded context; easy to split later.
2. Multi-service from day one - premature; inter-service contracts undecided.
3. Monorepo per-context packages - overkill for the initial scaffold.

## Decisions

- Start with modular monolith in `packages/server`.
- Auth stack: Better Auth + `@thallesp/nestjs-better-auth` + `organization`
  plugin.

## Remaining

- Produce implementation plan via superpowers:writing-plans.
- Execute scaffold + install + verify.
