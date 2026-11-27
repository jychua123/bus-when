# Prompts

Chronological log of all prompts used to build **SG BusTime**.

---

## Prompt 1 — Initial Front-End Build

> 1. build me a singapore based bus application that tracks real time bus arrival times and includes search bar to input bus stop code for quick access to arrival data and favorites functionality. 
> 2. build just the front-end for now, i'll establish an api connection later.

---

## Prompt 2 — LTA DataMall v3 Serverless Integration

> 1. add a serverless connection that pulls data from LTA's datamall using the following end points: 
> ```
> # Next buses at a stop (v3, the current version; refreshes every 20 seconds):
> https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121
> # To ask about one service only, add &ServiceNo=7
> 
> # Every request needs the header:  AccountKey: <LTA_ACCOUNT_KEY>
> ```
> 2. store this in /api at project root level (not the src file) 
> 3. include a /health.ts and /busarrival.ts within the same subfolder
> 4. do not hardcode any key, I will input them manually

---

## Prompt 3 — Vercel Build Dependency Fix

> fix the error - 
> ```
> 10:18:14.159 Running build in Washington, D.C., USA (East) – iad1
> 10:18:14.160 Build machine configuration: 2 cores, 8 GB
> 10:18:14.273 Cloning github.com/jychua123/bus-when (Branch: main, Commit: fe691ce)
> 10:18:14.274 Previous build caches not available.
> 10:18:14.571 Cloning completed: 298.000ms
> 10:18:15.729 Running "vercel build"
> 10:18:15.741 Vercel CLI 66.6.0
> 10:18:16.502 Installing dependencies...
> 10:18:17.246 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
> 10:18:29.487 npm error code ERESOLVE
> 10:18:29.487 npm error ERESOLVE could not resolve
> 10:18:29.487 npm error
> 10:18:29.488 npm error Found: esbuild@0.25.12
> 10:18:29.488 npm error node_modules/esbuild
> 10:18:29.488 npm error   dev esbuild@"^0.25.0" from the root project
> 10:18:29.488 npm error
> 10:18:29.488 npm error Could not resolve dependency:
> 10:18:29.488 npm error peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.4.0
> 10:18:29.488 npm error node_modules/vite
> 10:18:29.489 npm error   vite@"^8.3.0" from the root project
> 10:18:29.489 npm error   peer vite@"^5.2.0 || ^6 || ^7 || ^8" from @tailwindcss/vite@4.3.5
> 10:18:29.489 npm error   node_modules/@tailwindcss/vite
> 10:18:29.489 npm error     @tailwindcss/vite@"^4.3.3" from the root project
> 10:18:29.490 npm error   1 more (@vitejs/plugin-react)
> 10:18:29.490 npm error
> 10:18:29.490 npm error Conflicting peer dependency: esbuild@0.28.2
> 10:18:29.490 npm error node_modules/tsx/node_modules/esbuild
> 10:18:29.490 npm error   peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.4.0
> 10:18:29.491 npm error   node_modules/vite
> 10:18:29.491 npm error     vite@"^8.3.0" from the root project
> 10:18:29.491 npm error     peer vite@"^5.2.0 || ^6 || ^7 || ^8" from @tailwindcss/vite@4.3.5
> 10:18:29.491 npm error     node_modules/@tailwindcss/vite
> 10:18:29.492 npm error       @tailwindcss/vite@"^4.3.3" from the root project
> 10:18:29.492 npm error     1 more (@vitejs/plugin-react)
> 10:18:29.492 npm error
> 10:18:29.492 npm error Fix the upstream dependency conflict, or retry this command with --force or --legacy-peer-deps to accept an incorrect (and potentially broken) dependency resolution.
> 10:18:29.492 npm error
> 10:18:29.492 npm error
> 10:18:29.493 npm error For a full report see:
> 10:18:29.493 npm error /vercel/.npm/_logs/2026-11-27T02_18_16_764Z-eresolve-report.txt
> 10:18:29.493 npm error A complete log of this run can be found in: /vercel/.npm/_logs/2026-11-27T02_18_16_764Z-debug-0.log
> 10:18:29.534 Error: [BUILD_UTILS_SPAWN_1] Command "npm install" exited with 1
> ```

---

## Prompt 4 — Collate Prompts

> collate all prompts into PROMPTS.md file
