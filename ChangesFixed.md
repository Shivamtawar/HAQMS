# HAQMS — Complete Fixes Reference

This document consolidates every fix applied across all five challenges. Each entry describes what was broken, why it mattered, and exactly what was changed.

---

## Table of Contents

- [Challenge 1 — Security Audit](#challenge-1--security-audit) (12 fixes)
- [Challenge 2 — Backend Performance & Concurrency](#challenge-2--backend-performance--concurrency) (4 fixes)
- [Challenge 3 — Database & Schema Optimization](#challenge-3--database--schema-optimization) (4 fixes)
- [Challenge 4 — Frontend Memory & React Optimization](#challenge-4--frontend-memory--react-optimization) (3 fixes)
- [Challenge 5 — Incomplete Feature Delivery](#challenge-5--incomplete-feature-delivery) (1 fix)

---

## Challenge 1 — Security Audit

**Files changed:** `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`, `backend/src/routes/doctors.js`, `backend/src/routes/appointments.js`, `backend/src/routes/queue.js`, `backend/src/index.js`

---

### Fix 1.1 — Credential logging removed

**File:** `backend/src/routes/auth.js`

**What was wrong:**
`console.log('[DEBUG] Registering user with payload:', JSON.stringify(req.body))` printed the entire request body — including the raw plaintext password — to the server logs on every registration attempt. A second log on the login route printed `password: ${req.body.password}` explicitly.

**Why it matters:**
Server logs are commonly shipped to log aggregation tools (Datadog, CloudWatch, Splunk). Any engineer, devops person, or attacker who gains read access to those logs instantly has a dump of every user's password in plaintext — completely bypassing bcrypt hashing.

**Fix:**
Deleted both `console.log` lines. The only remaining server-side logging is `console.error` on genuine exceptions, and even those no longer include request body data.

---

### Fix 1.2 — Hardcoded JWT secret removed; secret required from environment

**Files:** `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`

**What was wrong:**
```js
const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-secret-key-12345!!!';
```
The `||` fallback meant the app would happily run with a publicly known secret if the env var was missing or mis-spelled. Any attacker can forge arbitrary JWTs — including admin tokens — using that fallback value.

**Why it matters:**
JWT security entirely depends on the secret being secret. A hardcoded fallback defeats that completely. If the app ever deploys without setting `JWT_SECRET`, it silently runs in an insecure mode with no warning.

**Fix:**
Replaced the fallback with a hard crash at startup:
```js
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const JWT_SECRET = process.env.JWT_SECRET;
```
The app now refuses to start rather than silently falling back to the known key.

---

### Fix 1.3 — JWT expiry reduced from 365 days to 8 hours; payload minimised

**File:** `backend/src/routes/auth.js`

**What was wrong:**
Tokens were signed with `expiresIn: '365d'` and included `{ id, email, role, name }` in the payload.

**Why it matters:**
A stolen JWT (e.g. via XSS) is valid for a full year with no way to revoke it. Embedding `role` in the payload also means a role change in the database has no effect on existing tokens — an attacker or stale session retains the old role for 365 days.

**Fix:**
- Reduced expiry to `8h` — a working day; forces re-login daily.
- Payload now contains only `{ id }`. On every authenticated request, `middleware/auth.js` does a fresh DB lookup using that `id` and attaches the live user record to `req.user`. Role changes take effect immediately on the next request.

---

### Fix 1.4 — `ignoreExpiration: true` removed from JWT verification

**File:** `backend/src/middleware/auth.js`

**What was wrong:**
```js
const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
```
The `ignoreExpiration` flag told `jsonwebtoken` to skip the `exp` claim entirely, meaning an expired token was accepted as valid forever.

**Why it matters:**
The entire point of a short expiry is revocation-by-time. With `ignoreExpiration: true` the expiry field in the token is decorative — the server never acts on it. A leaked token from months ago would still authenticate.

**Fix:**
Removed the options object entirely so the default behaviour (check expiration, throw `TokenExpiredError` if past) applies. The catch block now returns a generic `401` with no error detail forwarded to the client.

---

### Fix 1.5 — JWT error detail no longer leaked to client

**File:** `backend/src/middleware/auth.js`

**What was wrong:**
```js
return res.status(401).json({ error: 'Invalid token.', details: error.message });
```
`error.message` from `jsonwebtoken` includes strings like `"invalid signature"` or `"jwt expired"` that tell an attacker exactly why verification failed.

**Why it matters:**
Leaking verification failure reasons helps attackers distinguish between a tampered token, an expired token, and a token signed with a different secret — valuable information for crafting bypass attempts.

**Fix:**
The catch block now returns only `{ error: 'Invalid token.' }` with no `details` field.

---

### Fix 1.6 — Bypassed `authorizeAdminOnlyLegacy` middleware fixed

**File:** `backend/src/middleware/auth.js`

**What was wrong:**
```js
const authorizeAdminOnlyLegacy = (req, res, next) => {
  if (!req.user) { return res.status(401).json({ error: 'Unauthorized.' }); }
  // if (req.user.role !== 'ADMIN') { ... }  ← commented out
  next(); // every authenticated user passes through
};
```
Any logged-in Receptionist or Doctor could call `DELETE /api/patients/:id` and it would succeed.

**Why it matters:**
Patient deletion is a destructive, irreversible operation. Allowing any authenticated user — not just Admins — to delete records violates the principle of least privilege and could be abused to destroy data.

**Fix:**
Uncommented and restored the role check:
```js
if (req.user.role !== 'ADMIN') {
  return res.status(403).json({ error: 'Access denied. Admin only.' });
}
```

---

### Fix 1.7 — SQL injection in doctor search rewritten with Prisma ORM

**File:** `backend/src/routes/doctors.js`

**What was wrong:**
```js
conditions.push(`name ILIKE '%${search}%'`);
conditions.push(`specialization = '${specialization}'`);
const doctors = await prisma.$queryRawUnsafe(query);
```
Both `search` and `specialization` were interpolated directly into a raw SQL string, then executed with `$queryRawUnsafe`. Example exploit:
```
GET /api/doctors?search=House%' UNION SELECT id,email,password,name,role,'x','x',0,id FROM "User"--
```
This would return every user's hashed password alongside the doctor results.

**Why it matters:**
SQL injection is the most critical class of web vulnerability (OWASP A03). It gives an attacker full read (and potentially write/delete) access to the entire database, including the `User` table with password hashes.

**Fix:**
Replaced the entire raw-SQL block with a Prisma `findMany` using structured filter objects:
```js
const where = {};
if (search) where.name = { contains: search, mode: 'insensitive' };
if (specialization && specialization !== 'All') where.specialization = specialization;
const doctors = await prisma.doctor.findMany({ where });
```
Prisma generates parameterized queries — user input is never concatenated into SQL. Also removed the `console.log` that was printing the raw injectable query string to stdout, and removed `sqlMessage: error.message` from the error response.

---

### Fix 1.8 — Password hash no longer returned in register response

**File:** `backend/src/routes/auth.js`

**What was wrong:**
```js
res.status(201).json({ message: 'User registered successfully', user });
```
`user` was the raw Prisma record including the `password` field (a bcrypt hash).

**Why it matters:**
bcrypt hashes can be cracked offline with GPU-accelerated dictionary attacks. Returning the hash in an API response hands an attacker the material they need to attempt this — completely undoing the purpose of hashing.

**Fix:**
Destructured a safe subset before responding:
```js
res.status(201).json({
  message: 'User registered successfully',
  user: { id: user.id, email: user.email, name: user.name, role: user.role },
});
```

---

### Fix 1.9 — `role` can no longer be supplied by the client during registration

**File:** `backend/src/routes/auth.js`

**What was wrong:**
```js
const { email, password, name, role } = req.body;
role: role || 'RECEPTIONIST',
```
Any client could POST `{ "role": "ADMIN" }` and register themselves as an administrator.

**Why it matters:**
Privilege escalation via mass assignment. An attacker creates their own admin account with a single HTTP request, bypassing any invite/approval workflow.

**Fix:**
Removed `role` from the destructured body variables and hardcoded the value:
```js
const { email, password, name } = req.body;
role: 'RECEPTIONIST',
```
Admin accounts can only be created by seeding or direct DB access.

---

### Fix 1.10 — Error responses no longer leak internal details

**Files:** `backend/src/routes/auth.js`, `backend/src/index.js`

**What was wrong (three places):**
1. `auth.js` login error: `{ error: 'Internal Server Error', errorStack: error.stack }` — full Node.js stack trace.
2. `auth.js` register error: `{ error: '...', databaseError: error.message }` — raw Prisma/PostgreSQL error message.
3. `index.js` global handler: `{ ..., error: err.message, stack: err.stack }` — always sent stack trace.

**Why it matters:**
Stack traces reveal exact file paths, library versions, and code structure. DB error messages reveal table names, column names, and constraint names — a detailed map of the schema for an attacker.

**Fix:**
All three error responses now return only a generic message. Full error objects are still logged server-side via `console.error` for debugging.

---

### Fix 1.11 — Wildcard CORS replaced with origin allowlist

**File:** `backend/src/index.js`

**What was wrong:**
```js
app.use(cors());
```
No `origin` option means `Access-Control-Allow-Origin: *` is sent for every request, allowing any website to make credentialed cross-origin requests to this API from a user's browser.

**Why it matters:**
A malicious site could trick a logged-in HAQMS user into visiting a page that silently calls the API on their behalf (CSRF-style attack via the user's browser, using their stored JWT).

**Fix:**
CORS is now restricted to an allowlist read from `process.env.ALLOWED_ORIGINS` (defaults to `http://localhost:3000` for local dev). Requests from any other origin are rejected at the CORS layer.

---

### Fix 1.12 — Enum validation added to PATCH status endpoints

**Files:** `backend/src/routes/appointments.js`, `backend/src/routes/queue.js`

**What was wrong:**
`PATCH /api/appointments/:id` and `PATCH /api/queue/:id` accepted any string as `status` and wrote it directly to the database, bypassing Prisma enum definitions.

**Why it matters:**
Invalid enum values corrupt data integrity and cause a Prisma runtime error whose message was previously leaked to the client, exposing schema details.

**Fix:**
Added explicit allowlist checks before the DB write:
```js
const VALID_APPOINTMENT_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'];
if (!VALID_APPOINTMENT_STATUSES.includes(status)) {
  return res.status(400).json({ error: `Invalid status. Must be one of: ...` });
}
```
Same pattern applied to queue statuses (`WAITING`, `CALLING`, `COMPLETED`, `SKIPPED`). Error responses in these handlers also no longer include `details: error.message`.

---

## Challenge 2 — Backend Performance & Concurrency

**Files changed:** `backend/src/routes/appointments.js`, `backend/src/routes/doctors.js`, `backend/src/routes/reports.js`, `backend/src/routes/queue.js`

---

### Fix 2.1 — N+1 queries in `GET /api/appointments` eliminated

**File:** `backend/src/routes/appointments.js`

**What was wrong:**
The endpoint fetched all appointments first, then looped over them and ran two individual `findUnique` queries per row — one for the patient and one for the doctor:
```js
for (const app of appointments) {
  const patient = await prisma.patient.findUnique({ where: { id: app.patientId } });
  const doctor  = await prisma.doctor.findUnique({ where: { id: app.doctorId } });
}
```
With N appointments this produced `1 + 2N` database round-trips. At 50 appointments that's 101 queries for a single page load.

**Why it matters:**
N+1 is one of the most common ORM performance bugs. Database latency adds up multiplicatively — each extra query incurs network overhead, connection acquisition time, and query planning cost on the PostgreSQL side.

**Fix:**
Replaced the fetch-then-loop with a single `findMany` using Prisma's `include` with `select`:
```js
const appointments = await prisma.appointment.findMany({
  where,
  orderBy: { appointmentDate: 'asc' },
  include: {
    patient: { select: { id: true, name: true, phoneNumber: true, age: true, medicalHistory: true } },
    doctor:  { select: { id: true, name: true, specialization: true } },
  },
});
```
This is 1 query regardless of how many appointments exist. Prisma generates a single JOIN under the hood.

---

### Fix 2.2 — Sequential aggregates in `GET /api/doctors/stats` parallelised

**File:** `backend/src/routes/doctors.js`

**What was wrong:**
Four completely independent database aggregation queries were chained with `await` back-to-back. Each `await` paused the event loop until the previous query returned before starting the next. Total latency = sum of all four round-trips.

**Why it matters:**
Node.js is single-threaded but I/O is async. Awaiting independent queries serially wastes the entire time those queries are sitting on the database — time that could be used to run them simultaneously.

**Fix:**
Wrapped all four calls in `Promise.all`:
```js
const [totalDoctors, surgeonsCount, averageFee, highestExperience] = await Promise.all([
  prisma.doctor.count(),
  prisma.doctor.count({ where: { department: 'Surgery' } }),
  prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
  prisma.doctor.aggregate({ _max: { experience: true } }),
]);
```
Total latency ≈ the slowest single query, not the sum of all four. Also removed the `debugInfo` field that was exposing internal timing notes to clients.

---

### Fix 2.3 — Slow nested report endpoint rewritten with parallel per-doctor queries

**File:** `backend/src/routes/reports.js`

**What was wrong:**
Two compounding problems:
1. **Sequential outer loop:** Each doctor was processed one at a time with `await` — N doctors = N sequential batches.
2. **Sequential inner queries + extra `findMany`:** Inside the loop, five DB calls ran one after another, including a `findMany` of all completed appointments just to count them, plus an artificial 80 ms sleep per doctor.

With 5 doctors and the sleep, the minimum response time was 400 ms of artificial delay alone.

**Why it matters:**
A sequential approach with N×M queries makes the endpoint O(N×M). Under any real load this becomes unacceptable.

**Fix:**
- Outer loop replaced with `Promise.all(doctors.map(...))` — all doctors processed concurrently.
- Inner queries also wrapped in `Promise.all` per doctor so the four counts fire simultaneously.
- Redundant `findMany` for revenue replaced with `completedAppointments * fee` (the count was already being fetched).
- Artificial `setTimeout` sleep removed entirely.
- Error response no longer leaks `details: error.message`.

The result scales as O(max query time per doctor) rather than O(N × M).

---

### Fix 2.4 — Check-in race condition fixed with a serializable transaction

**File:** `backend/src/routes/queue.js`

**What was wrong:**
The check-in flow used a classic read-then-write pattern:
1. Read the current max token number for the doctor today.
2. Compute `nextTokenNumber = currentMax + 1`.
3. **Sleep 350 ms** (to widen the race window intentionally).
4. Write the new token.

Between steps 1 and 4, another concurrent request could read the same `currentMax` and also compute the same `nextTokenNumber`, resulting in two patients receiving duplicate token numbers.

**Why it matters:**
In a busy clinic, multiple receptionists check patients in simultaneously. Duplicate token numbers on the calling board cause confusion, incorrect patient calls, and data integrity issues.

**Fix:**
Wrapped the read+write in a single `prisma.$transaction` with `isolationLevel: 'Serializable'`. At serializable isolation, PostgreSQL guarantees that no two concurrent transactions can see the same snapshot — if two check-ins run simultaneously, one is forced to retry after the other commits:
```js
const newToken = await prisma.$transaction(async (tx) => {
  const maxTokenResult = await tx.queueToken.aggregate({ ... _max: { tokenNumber: true } });
  const nextTokenNumber = (maxTokenResult._max.tokenNumber || 0) + 1;
  return tx.queueToken.create({ data: { tokenNumber: nextTokenNumber, ... } });
}, { isolationLevel: 'Serializable' });
```
The artificial 350 ms sleep is also removed.

---

## Challenge 3 — Database & Schema Optimization

**Files changed:** `backend/prisma/schema.prisma`, `backend/src/routes/patients.js`

---

### Fix 3.1 — Missing unique constraint on `Appointment(doctorId, appointmentDate)` added

**File:** `backend/prisma/schema.prisma`

**What was wrong:**
The `Appointment` model had no database-level constraint preventing double-booking. The application code attempted a soft check using `findFirst` but it compared exact milliseconds — a booking 1 second apart bypassed it completely.

**Why it matters:**
Application-level duplicate checks are inherently racy under concurrent requests. A `@@unique` constraint at the database level is an atomic guarantee — PostgreSQL will reject the second insert with a constraint violation regardless of concurrency.

**Fix:**
Added `@@unique([doctorId, appointmentDate])` to the `Appointment` model.

---

### Fix 3.2 — Missing indexes added across all models

**File:** `backend/prisma/schema.prisma`

**What was wrong:**
Several columns used in frequent `WHERE` clauses and `ORDER BY` had no index, forcing full sequential table scans on every query:

| Model | Missing index | Used by |
|---|---|---|
| `Doctor` | `department`, `specialization` | `/api/doctors?specialization=...`, report grouping |
| `Appointment` | `(doctorId, status)`, `patientId` | Doctor worklist queries, patient history lookup |
| `QueueToken` | `(doctorId, createdAt)`, `status` | Daily token aggregation, status filter queries |
| `Patient` | `createdAt` | Default `orderBy: { createdAt: 'desc' }` in patient list |

**Why it matters:**
Without indexes PostgreSQL reads every row in the table to evaluate the `WHERE` condition — O(N) per query. Indexes reduce this to O(log N). On a table with thousands of records the difference is orders of magnitude.

**Fix:**
```prisma
// Doctor
@@index([department])
@@index([specialization])

// Patient
@@index([createdAt])

// Appointment
@@index([doctorId, status])
@@index([patientId])

// QueueToken
@@index([doctorId, createdAt])
@@index([status])
```

---

### Fix 3.3 — `onDelete: Cascade` added to foreign key relations

**File:** `backend/prisma/schema.prisma`

**What was wrong:**
No `onDelete` behaviour was defined on any foreign key. Deleting a `Patient` or `Doctor` would either leave orphaned rows or (with PostgreSQL's default `RESTRICT`) silently block the delete with a constraint error.

**Why it matters:**
Without cascades, `DELETE /api/patients/:id` would fail for any patient who has appointments. Adding cascades makes deletion atomic and safe — deleting a patient also atomically removes all their appointments and queue tokens.

**Fix:**
Added `onDelete: Cascade` to `Appointment.patient`, `Appointment.doctor`, `QueueToken.patient`, and `QueueToken.doctor`.

---

### Fix 3.4 — In-memory pagination replaced with SQL-level pagination

**File:** `backend/src/routes/patients.js`

**What was wrong:**
The patients list endpoint fetched every single row from the database into Node.js memory, applied search filters as JavaScript `.filter()` calls on the full array, then sliced the result for the requested page. With 10 000 patient records, every page load transferred 10 000 rows from Postgres into Node.js regardless of which page was requested.

**Why it matters:**
This is an O(N) memory and bandwidth problem on every request. The database is optimised for filtering and pagination with indexes; doing it in application memory wastes both DB-to-Node transfer and heap allocation.

**Fix:**
All filtering and pagination pushed into Prisma:
```js
const where = {};
if (search) where.OR = [
  { name: { contains: search, mode: 'insensitive' } },
  { phoneNumber: { contains: search } },
  { email: { contains: search, mode: 'insensitive' } },
];
if (gender && gender !== 'All') where.gender = { equals: gender, mode: 'insensitive' };

const [totalPatients, patients] = await Promise.all([
  prisma.patient.count({ where }),
  prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
]);
```
The database now returns only the rows for the requested page. `count` and `findMany` run in parallel. Input sanitisation (clamping `page` and `limit` to sane bounds) was also added.

---

## Challenge 4 — Frontend Memory & React Optimization

**Files changed:** `frontend/src/app/queue/page.js`, `frontend/src/app/dashboard/page.js`

---

### Fix 4.1 — Memory leak in queue polling fixed with `clearInterval` cleanup

**File:** `frontend/src/app/queue/page.js`

**What was wrong:**
The `useEffect` started a `setInterval` but never returned a cleanup function:
```js
useEffect(() => {
  fetchQueueData();
  const intervalId = setInterval(() => {
    fetchQueueData();
    setRefreshCount((prev) => prev + 1);
  }, 3000);
  // Missing: return () => clearInterval(intervalId);
}, []);
```
Every time the user navigated to `/queue`, a new interval was created. Navigating away did not stop it. After navigating back and forth 10 times, 10 concurrent intervals were all polling the backend every 3 seconds and calling `setState` on an unmounted component.

**Why it matters:**
Memory leaks in polling components are a production reliability issue. In a hospital setting the queue board may run on a dedicated display for hours — accumulated intervals would progressively degrade performance and eventually crash the browser tab.

**Fix:**
- Returned `() => clearInterval(intervalId)` from the effect, which React calls when the component unmounts.
- Added a `mountedRef` (`useRef(true)`) flag so that `setState` calls inside the async `fetchQueueData` callback check `mountedRef.current` before updating state — protecting against in-flight fetches resolving after unmount.
- Removed the stale-closure log (`refreshCount + 1` was always `1` because `refreshCount` was captured at mount).
- Moved `API_BASE_URL` to a module-level constant reading from `process.env.NEXT_PUBLIC_API_BASE_URL`.

---

### Fix 4.2 — Per-keystroke API calls debounced with a 350 ms delay

**File:** `frontend/src/app/dashboard/page.js`

**What was wrong:**
The patient search `useEffect` fired `fetchPatients(1)` on every change to `patientSearch` with no delay. Typing "John" into the search box fired 4 separate HTTP requests — one for "J", "Jo", "Joh", "John" — each triggering a full re-render of the patient table.

**Why it matters:**
Debouncing is the standard solution to the "search-as-you-type" performance problem. It eliminates wasted requests and re-renders during active typing, and prevents race conditions where an earlier, slower response could overwrite a newer one.

**Fix:**
Replaced the immediate effect with a debounced version using `useRef` to hold the timeout handle:
```js
const searchDebounceRef = useRef(null);
useEffect(() => {
  if (user.role !== 'RECEPTIONIST' && user.role !== 'ADMIN') return;
  clearTimeout(searchDebounceRef.current);
  searchDebounceRef.current = setTimeout(() => {
    fetchPatients(1);
  }, 350);
  return () => clearTimeout(searchDebounceRef.current);
}, [patientSearch, patientGender]);
```
The API call only fires 350 ms after the user stops typing. The cleanup function cancels any pending timeout on unmount.

---

### Fix 4.3 — Null crash in patient history modal fixed with nullish coalescing

**File:** `frontend/src/app/dashboard/page.js`

**What was wrong:**
The medical history modal accessed `.toUpperCase()` directly on `medicalHistory` without any null check:
```jsx
<p>{selectedPatientHistory.medicalHistory.toUpperCase()}</p>
```
Patients like Bruce Wayne and Clark Kent were seeded with `medicalHistory: null`. Clicking their name immediately threw `TypeError: Cannot read properties of null (reading 'toUpperCase')`, crashing the entire page.

**Why it matters:**
Any field marked `String?` (nullable) in the Prisma schema can be `null` in practice. Accessing a method on `null` without a guard is a guaranteed runtime crash. In a medical application, a crash while viewing patient records is a serious reliability failure.

**Fix:**
Replaced the unsafe call with a nullish coalescing render:
```jsx
<p>
  {selectedPatientHistory.medicalHistory ?? (
    <span className="italic text-slate-400">No medical history on record.</span>
  )}
</p>
```
Patients with history display it unchanged; patients without it see a clear placeholder instead of a crash. The unnecessary `.toUpperCase()` that was destroying original clinical note casing was also removed.

---

## Challenge 5 — Incomplete Feature Delivery

**File created:** `frontend/src/app/patients/[id]/history-records/page.js`

---

### Fix 5.1 — Missing history-records page built

**What was wrong:**
Clicking "View Diagnostic Reports Details (Legacy App)" in the patient history modal navigated to `/patients/:id/history-records`. No file existed at that path, so Next.js hit `not-found.js` and showed a styled 404 page. The route was entirely unimplemented.

**Why it matters:**
Broken links in a clinical dashboard erode user trust and indicate incomplete feature delivery. The linked route is the natural destination a doctor or receptionist would click to review a patient's full appointment history before or during a consultation.

**What was built:**

The page fetches from the existing `GET /api/patients/:id` endpoint, which already returns the patient object with their full `appointments` array included. No new backend endpoint was needed.

**Patient header card**
- Displays name, gender, age, phone, and email.
- Renders `medicalHistory` with the same null-safe `??` pattern from Fix 4.3 — patients without history show an italic placeholder instead of crashing.

**Appointment history list**
- Renders all appointments sorted newest-first.
- Each entry shows the appointment reason, formatted date/time, and a colour-coded status badge (`COMPLETED` = teal, `CANCELLED` = rose, `PENDING` = amber) with a matching icon.
- Empty state shows a clear "No appointments found" message.

**Navigation & auth**
- "Back to Dashboard" link using Next.js `<Link>` for client-side navigation.
- Authentication guard: redirects to `/login` if no user is in context.

**Loading and error states**
- Shows the same `pulse-loader` spinner used elsewhere in the app while fetching.
- Shows a rose error card if the API returns a non-OK response, including a specific message for 404.

**Data flow:**
```
useEffect (on mount)
  → GET /api/patients/:id  (with Bearer token)
  → receives { id, name, age, gender, phoneNumber, email, medicalHistory, appointments: [...] }
  → setPatient(data)
  → renders header + sorted appointments list
```

---

## Summary of All Files Changed

| File | Challenge(s) | Nature of change |
|---|---|---|
| `backend/src/routes/auth.js` | 1 | Removed credential logs, stripped password hash from response, removed `role` from client input, reduced JWT expiry to 8h, minimised payload to `{ id }`, removed stack traces from errors |
| `backend/src/middleware/auth.js` | 1 | Removed hardcoded secret fallback, removed `ignoreExpiration`, removed error detail from 401, fixed `authorizeAdminOnlyLegacy` role check, added live DB lookup on every request |
| `backend/src/routes/doctors.js` | 1, 2 | Rewrote raw SQL to Prisma ORM (SQLi fix), parallelised 4 sequential aggregates with `Promise.all` |
| `backend/src/routes/appointments.js` | 1, 2 | Added enum validation to PATCH, eliminated N+1 with Prisma `include` |
| `backend/src/routes/queue.js` | 1, 2 | Added enum validation to PATCH, fixed race condition with serializable transaction, removed artificial sleep |
| `backend/src/routes/reports.js` | 2 | Rewrote sequential nested loop with parallel `Promise.all` per doctor, replaced `findMany` with `count` for revenue, removed artificial sleep |
| `backend/src/routes/patients.js` | 3 | Replaced in-memory pagination/filtering with SQL-level `skip`/`take`/`where` |
| `backend/src/index.js` | 1 | Replaced wildcard CORS with origin allowlist, stripped stack traces from global error handler |
| `backend/prisma/schema.prisma` | 3 | Added `@@unique([doctorId, appointmentDate])`, 7 missing `@@index` directives, `onDelete: Cascade` on all FK relations |
| `frontend/src/app/queue/page.js` | 4 | Fixed memory leak (added `clearInterval` cleanup + `mountedRef` guard), moved `API_BASE_URL` to env var |
| `frontend/src/app/dashboard/page.js` | 4 | Added 350ms search debounce, fixed null crash with `??` nullish coalescing |
| `frontend/src/app/patients/[id]/history-records/page.js` | 5 | Created from scratch — patient header, null-safe medical history, sorted appointment history list, auth guard, loading/error states |
