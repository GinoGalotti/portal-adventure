---
name: playtest-check
description: Quick pre-playtest verification — runs TypeScript type check, all Vitest tests, and Vite production build in sequence. Use before the user opens the browser for playtesting.
user_invocable: true
---

# Playtest Check

Run all verification steps to confirm the game is playtest-ready.

## Usage

`/playtest-check`

No arguments needed.

## Instructions

Run these three checks sequentially (each depends on the previous passing):

### Step 1: TypeScript type check
```bash
cd d:/Workspace/portal-adventure && npx tsc --noEmit 2>&1
```
- Filter output to only show errors from `src/` files (ignore pre-existing errors in `simulation/` and `tests/`)
- If new type errors exist in `src/`, stop and report them

### Step 2: Run all tests
```bash
cd d:/Workspace/portal-adventure && npx vitest run 2>&1
```
- Report total test count and pass/fail status
- If any tests fail, stop and report the failures

### Step 3: Production build
```bash
cd d:/Workspace/portal-adventure && npx vite build 2>&1
```
- Report build success/failure and bundle size
- If build fails, report the error

## Output Format

Present results as a checklist:

```
Playtest readiness:
- [x] TypeScript: no new type errors in src/
- [x] Tests: 543/543 passing
- [x] Build: success (245 KB gzipped)

Ready to playtest!
```

Or if something fails:

```
Playtest readiness:
- [x] TypeScript: no new type errors in src/
- [ ] Tests: 541/543 passing (2 FAILED)
  - tests/engine/actions.test.ts > exploitWeakness > ...
  - tests/engine/freetext.test.ts > ...

NOT ready — fix failing tests first.
```

## Notes

- Pre-existing type errors in `simulation/` and `tests/` files are known and should be ignored
- The build step uses `publicDir: 'assets'` in vite.config.ts — icons are served from `/icons/` not `/assets/icons/`
- If build succeeds, the user can run `npx vite preview` or deploy to Workers
