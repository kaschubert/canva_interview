# CLAUDE.md

## Project Overview

React 19 + Vite starter project. JSX throughout (no TypeScript configured yet).

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview production build
```

## Code Style & Conventions

### General
- Prefer concise, readable code over clever one-liners
- No unnecessary abstractions — solve the problem at hand
- Delete dead code rather than commenting it out
- No `console.log` left in committed code

### JavaScript / TypeScript
- Use `const` by default; `let` only when reassignment is necessary
- Prefer named exports over default exports (except for page/route components)
- Use optional chaining (`?.`) and nullish coalescing (`??`) over explicit null checks
- Avoid `any` in TypeScript; use `unknown` + type narrowing when the type is truly unknown
- Prefer `type` over `interface` unless declaration merging is needed
- Keep functions small and single-purpose; extract helpers when logic exceeds ~20 lines

### React
- Functional components only — no class components
- One component per file; filename matches the component name (PascalCase)
- Co-locate state as close to where it's used as possible; lift only when necessary
- Custom hooks live in `src/hooks/` and are prefixed with `use`
- Keep JSX clean: extract complex expressions into named variables before the return
- Avoid inline object/array literals in JSX props (causes unnecessary re-renders)
- Derive state from props/other state where possible; avoid redundant `useState`
- Use the `key` prop correctly — stable, unique IDs, never array index for dynamic lists
- In React 19, prefer `use()` + Suspense for async data over `useEffect` + loading flags

### CSS / Styling
- Component-scoped CSS modules preferred (`.module.css`)
- BEM-style class names inside modules for clarity
- Avoid global styles except in `index.css` for resets/tokens

## Architecture Guidelines

- `src/components/` — shared, reusable UI components
- `src/hooks/` — custom hooks
- `src/utils/` — pure utility functions (no React dependencies)
- `src/pages/` or `src/views/` — route-level components (if routing is added)
- Keep components dumb where possible; push business logic into hooks or utils

## Performance

- Wrap expensive computations in `useMemo`; wrap stable callbacks in `useCallback` only when passed to memoized children
- Use `React.memo` sparingly and only after profiling confirms a re-render problem
- Lazy-load heavy components with `React.lazy` + `Suspense`
- Avoid prop drilling beyond 2–3 levels; use Context or a state lib instead

## Testing (when added)

- Unit test pure utils and custom hooks
- Integration tests for non-trivial user flows
- Avoid testing implementation details; test behavior from the user's perspective

## What NOT to do

- Do not add dependencies without checking if the standard library or a small utility covers the need
- Do not wrap working code in try/catch unless there is a real error-handling strategy
- Do not create HOCs unless there is no hook-based alternative
- Do not use `useEffect` to sync state that can be derived synchronously
