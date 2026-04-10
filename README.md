# Satisfactory Production Planner

A production planning app for Satisfactory with:

- a `Next.js` frontend in [frontend](/c:/Users/Murat/Documents/Personal%20Archive/Coding%20stuff/Satisfactory/satisfactory-production-planner/frontend)
- an `Express` + `TypeScript` backend in [backend](/c:/Users/Murat/Documents/Personal%20Archive/Coding%20stuff/Satisfactory/satisfactory-production-planner/backend)
- shared planner types in [shared/planner.ts](/c:/Users/Murat/Documents/Personal%20Archive/Coding%20stuff/Satisfactory/satisfactory-production-planner/shared/planner.ts)

The current planner uses a linear programming model to maximize output from a set of supplied inputs, then builds a production tree from the solved recipe mix.

## What It Does

You choose:

- a target item
- available inputs per minute
- optional alternate recipes

The backend planner then:

- builds an LP model from the recipe graph
- maximizes target output
- runs a second cleanup solve to minimize extra activity among equally optimal solutions
- returns:
  - `outputPerMin`
  - selected recipe usage
  - a production tree for the solved plan
  - relevant alternate recipe suggestions

## Project Structure

```text
backend/
  src/
    routes/planner.ts
    services/planner.ts
    db/
  test/planner.test.js
frontend/
  src/app/page.tsx
shared/
  planner.ts
```

Important files:

- planner API route: [planner.ts](/c:/Users/Murat/Documents/Personal%20Archive/Coding%20stuff/Satisfactory/satisfactory-production-planner/backend/src/routes/planner.ts)
- LP planner service: [planner.ts](/c:/Users/Murat/Documents/Personal%20Archive/Coding%20stuff/Satisfactory/satisfactory-production-planner/backend/src/services/planner.ts)
- main UI page: [page.tsx](/c:/Users/Murat/Documents/Personal%20Archive/Coding%20stuff/Satisfactory/satisfactory-production-planner/frontend/src/app/page.tsx)
- shared contract: [planner.ts](/c:/Users/Murat/Documents/Personal%20Archive/Coding%20stuff/Satisfactory/satisfactory-production-planner/shared/planner.ts)

## Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local ports:

- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`

## Production Build

Backend:

```bash
cd backend
npm run build
npm run start
```

Frontend:

```bash
cd frontend
npm run build
npm run start
```

## Testing

Backend smoke tests:

```bash
cd backend
npm test
```

This currently checks:

- screws from `120 Iron Ore / min`
- mixing supplied intermediates with in-factory production
- alternate suggestions for a simple optimized plan

Frontend typecheck:

```bash
cd frontend
npx tsc --noEmit
```

## Notes

- `backend/dist/` is generated build output and is ignored.
- The planner route is exposed at `/api/planner`.
- Shared planner types live in `shared/` so frontend and backend stay aligned.
