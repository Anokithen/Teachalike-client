# TeachAlike frontend

Next.js (App Router) + Tailwind CSS frontend for the TeachAlike Flask backend (`Teach-api`),
built from `TeachAlike_Frontend_Spec.md`.

## Child-friendly pronunciation comparison

The existing `/reading-sessions/[id]` microphone flow now renders the structured
comparison returned by `POST /api/reading-sessions/<id>/pronunciation-check`.
It remains part of the same reading session, narration, feedback, progress-log,
and leaderboard experience.

The result card uses the existing TeachAlike neumorphic colors, cards, shadows,
rounded controls, and typography. It provides:

- a circular deterministic word-match score and a separately labelled provider reading score;
- green `Correct`, orange `Heard differently`, coral `Skipped`, and indigo `Extra word` chips with icons and screen-reader labels;
- desktop side-by-side **Original paragraph** / **What I heard** panels that stack on phones and tablets;
- selectable mistake details with one-based `Sentence N · Word N` labels (the API remains zero-based);
- practice cards, browser speech playback when supported, and paragraph narration replay;
- a prominent retry action that preserves the paragraph, restores focus to the microphone, and keeps prior attempts;
- newest-first attempt history and positive-only improvement messages; and
- friendly recording, provider, permission, unsupported-browser, short-recording, and network states.

The client renders all original/transcript values as ordinary React text—never
unsafe HTML. Colors are reinforced by labels/icons, touch controls are at least
44px, focus is visible, completion is announced through an ARIA live region,
and celebration/recording motion respects `prefers-reduced-motion`.

The comparison reports what ASR detected; it is not a phonetic assessment.
Microphone noise, accents, and device quality can change a transcript. The UI
keeps `provider_accuracy` and deterministic `text_match_accuracy` visibly
separate and shows this limitation beside every result.

Typed contracts are in `lib/types.ts`, API calls (including authenticated
`GET /api/reading-sessions/<id>/pronunciation-attempts`) are in
`lib/endpoints.ts`, and the reusable result UI is in
`components/reading/PronunciationComparison.tsx`.

Verify with:

```bash
npm run lint
npm run build
```

## Teacher applications and book engagement

The public `/register` route supports parent and teacher account types. Parent
registration preserves the original automatic-login flow. Teacher selection
reveals the accessible conditional form for phone, address, teacher type,
optional school/tuition name, and required professional photo. Successful
teacher applications show a waiting-for-approval screen and never store JWTs.
The login page displays the API's pending, rejected, rejection-reason, and
banned messages; normalized API errors preserve stable `error_code` values.

Administrators review private application details at `/admin/teachers`, filter
pending/approved/rejected applications, approve or reject them, and retain the
existing create/ban/unban/delete controls. Long addresses are contained in an
accessible details modal, and reject/delete actions require confirmation.

Book details now record one server-deduplicated view after a successful load,
show view/read/like totals, and let a verified selected child like or unlike the
book. The existing child selector and PIN dialog are reused; parents or teachers
cannot submit a like without an accessible child. Narration, gallery, mini-game,
reading-session, and admin book controls remain intact.

The admin sidebar's **Book views** item opens `/admin/book-views`, which provides
responsive search/sort/pagination analytics for total and unique views, reads,
completed reads, unique readers, and child likes. It shows aggregate data only.

Approved teachers have a guarded book studio at `/teacher/books`, with create
and edit routes under `/teacher/books/create` and
`/teacher/books/<book_id>/edit`. The responsive form uses the existing inputs,
cards, alerts, loading buttons, and neumorphic styling. It supports story text,
descriptions, URLs, cover/illustration/video previews, and sends media directly
to the authenticated server-owned upload workflow. A per-submission
`Idempotency-Key` prevents accidental double clicks from creating another book.

The **My books** page only requests books owned by the signed-in teacher and
shows aggregate views, reads, and child likes—never individual child activity.
Edit and delete actions are checked again by the API; opening another teacher's
edit URL cannot grant access. Admins continue managing every book through the
existing controls.

`BookAttribution` renders the API's safe `created_by_label` consistently in the
gallery, book details, reading session, teacher library, dashboard, and admin
analytics. Teacher-created books show `Created by <Teacher Name>`; legacy and
system books show `Created by TeachAlike`. No teacher contact or workplace data
is included in the book type or rendered response.

Teacher book forms can also upload one official teacher narration. The client
sends only the file in the authenticated book request; the API derives the
teacher, book, canonical Cloudinary folder, public ID, and Asset owner. Admin
cover and illustration uploads now occur after the book ID exists through the
book-scoped image endpoint, allowing the backend to use the centralized
`Books/...` storage tree. No frontend request contains a Cloudinary folder or
public ID.

Related API calls live in `lib/endpoints.ts`; shared teacher and engagement
types live in `lib/types.ts`. No new frontend environment variables are needed.
After setting the existing `NEXT_PUBLIC_API_URL`, verify changes with:

```bash
npm run lint
npm run build
```

## Setup

```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL to your Flask backend
npm run dev
```

## Generated story mini-games

The existing `/mini-games/[id]` page supports book-generated quiz, word puzzle,
and easy/medium/hard spelling content. The book page shows preparation,
fallback, ready, failed, and stale states; administrators and approved owning
teachers receive a rate-limited **Regenerate questions** action. Children see
the book cover, progress, difficulty and skill badges, large keyboard-accessible
answer cards, hints, explanations after grading, earned points, and replay
controls in the existing responsive neumorphic theme. Motion is restrained and
disabled by `prefers-reduced-motion`.

Quiz answer keys never arrive with the child-facing game response. The client
submits typed question IDs, selected option indexes, and hint usage; Flask
calculates correctness, deductions, score, and leaderboard points. Puzzle and
spelling responses are graded server-side too. Generated strings render as
ordinary React text, never unsafe HTML. The UI uses the friendly deterministic
fallback exactly like provider-generated content and never displays provider
errors to children.

After the backend migration and deployment, verify this client with:

```bash
npm run lint
npm run build
```

Runs at http://localhost:3000. Point `NEXT_PUBLIC_API_URL` at wherever `core` (the
Flask backend) is running, e.g. `http://localhost:5000`.

## Vercel deployment

Import this repository into Vercel with the project root set to this directory.
Add the following variable to Production and Preview before deploying:

```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

The value must be the public backend origin only: use HTTPS and do not append
`/api`. Next.js embeds `NEXT_PUBLIC_*` variables into the browser bundle during
the build, so changing the value requires a new Vercel deployment. Production
builds intentionally fail when the variable is missing or malformed instead
of publishing a frontend that calls localhost.

On the backend, set `FRONTEND_ORIGINS` to the production Vercel origin, such as
`https://your-project.vercel.app`. Add other exact comma-separated origins only
when browser access from those domains is required.

## Progressive Web App

The production build is installable as a PWA. It includes:

- a web app manifest with standard, maskable, and Apple install icons;
- a root-scoped service worker registered only in production;
- offline caching for versioned Next.js static assets and brand icons; and
- a dedicated offline fallback page for navigation requests.

Authenticated API requests and page responses are deliberately not cached, so
account and child data are not persisted by the service worker. Deploy over
HTTPS for installation and service-worker support; browsers also allow these
features on `localhost` during development. New workers wait instead of
replacing a running version mid-session; parents can apply an available update
from the account page. When changing the service worker's precache behavior,
increment `CACHE_VERSION` in `public/sw.js`.

## What's here

- `lib/api.ts` — single axios instance: attaches the bearer token on every request,
  and on a `401` silently refreshes once (via `/api/auth/refresh`) and retries the
  original request. Forces logout + redirect to `/login` if refresh also fails.
- `lib/auth-context.tsx` — React Context for the logged-in account (parent/teacher/admin),
  login/register/logout, and role helpers (`isAdmin`, `isTeacher`, `isParent`).
- `lib/endpoints.ts` — thin per-resource wrapper functions over every endpoint in the spec.
- `components/layout/AuthGuard.tsx` — redirects unauthenticated users to `/login`; gates
  `/admin/*` behind `role === "admin"` and `/teacher/*` behind the teacher role.
- `app/(app)/layout.tsx` — the sidebar + topbar shell for all authenticated routes; the
  sidebar becomes a slide-in drawer on small screens.
- Every route from the spec's route map is implemented under `app/`, including the
  public landing/login/register pages and the full authenticated app shell.

## Known gaps (flagged in the spec itself)

- **Teacher "add child" form** takes a plain numeric parent account ID — there's no
  backend endpoint yet for a teacher to search/select an existing parent by name.
- **Voice profile creation** records audio in the browser and uploads it as multipart
  form data to the authenticated API endpoint.
- **`/api/sync`** is available through `syncApi.push` for offline clients; there is
  not yet a dedicated offline-first UI screen.

## Brand

Colors, spacing, and copy tone follow section 3 of the spec (`brand-900` / `brand-600`
/ `brand-400`, calm sentence-case copy, plain-verb buttons). Tailwind theme tokens live
in `tailwind.config.ts`.
# Google Identity Services

Set `NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID` to the same Google OAuth Web client ID
used by the Flask backend `GOOGLE_AUTH_CLIENT_ID`. Add both localhost and the
deployed frontend origin to Google Cloud Authorized JavaScript origins.

The frontend uses the official Google Identity Services rendered button on
`/login` and `/register`. It sends only the returned ID credential to
`POST /api/auth/google`; token verification, account creation/linking, role
checks, and JWT issuance all happen in Flask.

Password registration now shows a verification-required confirmation instead of
auto-login. `/verify-email?token=...` posts the token to Flask and displays
success, expired, or invalid-link states. Use `npm run lint` and `npm run build`
after changing auth UI.
