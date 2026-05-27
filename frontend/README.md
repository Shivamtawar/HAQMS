# HAQMS Frontend - Next.js App Client

This is the Next.js client for the Hospital Appointment & Queue Management System.

## 🚀 Running the Client
The client runs on port `3000` by default.

Start the development server:
```bash
npm run dev
```

Build the production bundle:
```bash
npm run build
```

## 🔍 Candidate Scope
You will need to analyze and optimize files inside `src/`:
- **Memory Leak**: Locate the polling issue in `src/app/queue/page.js`.
- **Render Performance**: Profile the input searches in `src/app/dashboard/page.js`.
- **Unsafe Object Property Reads**: Correct the null-reference clinical history rendering crash in `src/app/dashboard/page.js`.
- **Incomplete Feature**: Implement the missing legacy reports page at `src/app/patients/[id]/history-records/page.js`.

---

## 🐛 Issues Found & Fixed

### Memory Leak — `src/app/queue/page.js`
**Issue:** `setInterval` was started inside `useEffect` with no cleanup. Every time the user navigated to `/queue` a new interval was registered and never stopped. Navigating back and forth stacked up dozens of concurrent polling timers — all calling `setState` on an unmounted component — causing memory pressure and React warnings.
**Why it mattered:** In a hospital the queue board runs on a dedicated screen for hours. Accumulated intervals would degrade performance and eventually crash the tab.
**Fixed:** Added `return () => clearInterval(intervalId)` so React cancels the timer on unmount. Added a `mountedRef` guard to prevent `setState` calls from in-flight fetches that resolve after the component is gone. Moved the hardcoded `API_BASE_URL` to `process.env.NEXT_PUBLIC_API_BASE_URL`.

---

### Unnecessary Re-renders — `src/app/dashboard/page.js`
**Issue:** The patient search `useEffect` fired an API call and re-rendered the entire patient table on every single keystroke — no delay, no debounce. Typing a 4-character name sent 4 requests. Fast typing could also cause a race condition where a slower earlier response overwrites a newer one.
**Why it mattered:** Wasted backend load and a flickering UI on every keypress. A race condition could display stale results.
**Fixed:** Introduced a 350 ms debounce using `useRef` + `setTimeout`. The API call only fires after the user pauses typing. The cleanup function cancels the pending timeout if the user keeps typing or the component unmounts.

---

### Null Crash in Patient History Modal — `src/app/dashboard/page.js`
**Issue:** `medicalHistory` was rendered as `medicalHistory.toUpperCase()` with no null check. Several seeded patients (Bruce Wayne, Clark Kent, Diana Prince) have `medicalHistory: null`. Clicking any of them threw `TypeError: Cannot read properties of null (reading 'toUpperCase')` which propagated up through React and crashed the entire page.
**Why it mattered:** A crash while viewing patient records is a serious reliability failure in a medical context. Any nullable field accessed without a guard is a guaranteed crash waiting to happen.
**Fixed:** Replaced the unsafe call with a nullish coalescing render — patients with history display it as-is; patients without it show an italic "No medical history on record." placeholder. The unnecessary `.toUpperCase()` that was destroying original clinical note casing was also removed.

---

### Missing Route — `src/app/patients/[id]/history-records/page.js`
**Issue:** The "View Diagnostic Reports Details (Legacy App)" link on every patient history panel pointed to `/patients/:id/history-records`. The file didn't exist, so every click landed on the styled 404 page.
**Why it mattered:** Broken navigation in a clinical dashboard signals incomplete delivery and blocks a core workflow — reviewing a patient's full appointment history before or during a consultation.
**Fixed:** Built the missing page. It fetches `GET /api/patients/:id` (which already returns the full appointments array), renders a patient header card with null-safe medical history, a colour-coded sorted appointment history list, plus proper loading, error, and empty states. Auth guard redirects to `/login` if no session exists.
