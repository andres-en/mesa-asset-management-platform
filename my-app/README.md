# Mesa — frontend

Next.js 16 (App Router) + React 19 + Material UI. See the [project README](../README.md) for the
full picture.

```bash
npm install
npm run dev      # http://localhost:3000 (expects the API on NEXT_PUBLIC_API_URL, default http://localhost:5000)
npm run lint
npm run build
```

`NEXT_PUBLIC_*` variables are baked into the bundle at build time, so `NEXT_PUBLIC_API_URL` must be
reachable from the user's browser.
