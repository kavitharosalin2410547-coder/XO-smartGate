# Garage Desk

An offline-first car wash manager built with **Next.js** and installable as a **PWA**. White canvas, black text, blue accents.

## Pages

| Page | What it does |
|---|---|
| **Home** | Greeting, "Start a wash" (search or scan a plate), today's numbers, a live queue (Waiting, Washing, Finished today) with one-tap actions and payment collection, 7-day chart, recent payments |
| **Revenue** | Money collected for Today / 7 / 30 / 90 days, change vs the previous period, chart by day, split by service and by payment method, unpaid washes to collect, payments list, CSV export |
| **Customers & Vehicles** | Every vehicle with owner, phone, visits, total spent and last visit. Search, sort, scan a plate, add a vehicle. Open one to see its history and add a wash job |
| **Admin** | Users (add, change role, disable, reset password), **Roles & permissions** matrix, activity log, business name, backup and restore, offline status |

Everything runs on the device. No server, no internet needed after the first load.

## Roles

Admin, Manager, Supervisor, Cashier and Washer. The Admin page has a matrix of checkboxes to decide what each role can do (view revenue, export, add/edit/delete vehicles, create jobs, update job status, collect payments). Menu items and pages are hidden or blocked for roles without permission. The Admin role always has full access, and the last admin cannot be removed or disabled.

## Run it

You need Node.js 20 or newer.

```bash
npm install        # downloads packages and copies the OCR engine into public/ocr
npm run build      # builds the static app into the out/ folder
npm start          # serves out/ at http://localhost:3000
```

Open http://localhost:3000. The first time, you set up your business name and the admin account.

The service worker only runs in the production build, so always use `npm run build` and `npm start` when testing offline behaviour. (`npm run dev` works for editing screens, without offline support.)

## Test that it works offline

1. Open http://localhost:3000 once and log in. Go to **Admin > Backup & device**. "Works offline" should say **Yes**.
2. Stop the server (`Ctrl+C` in the terminal).
3. Reload the page. The app still opens, you are still signed in, your data is there and plate scanning still works.

You can also install it from Chrome's address bar and open it like a normal app.

## Plate scanning tips

- Fill the photo with the plate, in daylight, with no glare, with a little margin around the characters.
- The app shows up to 5 readings. Tap the right one, or type the plate by hand.
- It understands the Indian format (TN 09 AB 1234, and BH series) and fixes common mix-ups such as O/0, I/1 and T/I.
- Always check the reading before saving. OCR on real photos is never 100%.

## How the offline part works

| File | Job |
|---|---|
| `next.config.mjs` | `output: "export"` makes a plain static site with no Node server |
| `scripts/inject-precache.mjs` | After the build, lists every file in `out/` and writes it into `out/sw.js` |
| `public/sw.js` | Service worker: caches all those files on install, serves them from the cache afterwards |
| `scripts/copy-ocr-assets.mjs` | Copies the OCR engine and English data into `public/ocr` so nothing is fetched from a CDN |
| `public/fonts` | Inter and Instrument Serif, self-hosted so the look works offline |
| `lib/db.ts` | IndexedDB storage (users, vehicles, jobs, settings, activity log) |
| `lib/auth.ts` | Local login, passwords stored as salted PBKDF2 hashes |
| `lib/permissions.ts` | Roles and the permission matrix |
| `lib/stats.ts` | Revenue and dashboard calculations |
| `lib/plate.ts`, `lib/ocr.ts` | Plate cleaning and in-browser Tesseract OCR |

## Things to know

- **Data lives only on the device.** Use **Admin > Backup & device > Download backup** regularly. Clearing browser data can erase it. One device is one database; there is no sync between devices.
- **The login is local.** It keeps casual users out and enforces roles in the app, but it is not server-grade security: someone with access to the device's browser tools could bypass it. There is no "forgot password" for the admin: restore a backup or erase data.
- **Opening it on a phone** needs HTTPS or `localhost`. A plain `http://192.168...` address will not install or work offline. Deploy to any HTTPS host (Netlify, Vercel, GitHub Pages).
- **iPhone/Safari** may clear stored data for sites not opened for a while. Install to the Home Screen and keep backups.
- After you change any code, run `npm run build` again. A new build gets a new cache version, and users receive the update the next time they are online.
- Upgrading from the first version: existing users become admins and finished jobs are marked paid by cash.

## Customise

- Services and prices: `lib/services.ts` (also the currency symbol)
- Colours and fonts: the `:root` tokens at the top of `app/globals.css`
- Role defaults: `lib/permissions.ts`
- Other plate formats: `lib/plate.ts`

## Tests

```bash
npm test      # unit tests for plate reading and revenue calculations
```
