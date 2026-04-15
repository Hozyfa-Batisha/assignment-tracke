# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (artifact: deadline-tracker)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

- **deadline-tracker** (React + Vite, preview at `/`): Student Deadline Tracker frontend
- **api-server** (Express 5, preview at `/api`): Backend API server

## Database Schema

- `assignments` table: id, title, course, description, due_date, status (pending/done), priority (low/medium/high), created_at

## Features

- Add assignments with title, course, description, due date, priority
- Live countdown timers on each assignment card
- Mark assignments as done/pending
- Delete assignments
- Summary stats bar (total, pending, done, overdue, due soon)
- Filter tabs (All / Pending / Done / Overdue)
- Browser notifications for assignments due within 24h

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
