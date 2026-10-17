# ProctorVision — AI-Assisted Mini Hackathon MVP

> **Goal:** Evolve the current browser-based prototype into a secure, demonstrable student/teacher exam workflow. Use a three-hour implementation window for a carefully scoped MVP, not production certification.
>
> **Priority:** Working end-to-end demo first. Avoid overengineering, unnecessary dependencies, and features that cannot be tested.

## 1. Product Overview

ProctorVision is a privacy-conscious online exam monitoring prototype. It performs supported checks in the student's browser and records structured monitoring events for a teacher to review.

### Problem
Online exams can be difficult to supervise at scale. Uploading continuous video creates privacy concerns, and automated monitoring can produce false alarms.

### Proposed MVP
- A home page with separate student and teacher sign-in entry points.
- Server-authenticated login/logout with password hashing and protected sessions.
- Server-enforced student/teacher roles and role-protected routes/API endpoints.
- An exam page with webcam preview, a 20-minute countdown, and 21 sample questions.
- Browser-based face count, no-face, multiple-face, estimated gaze/head direction, and blink snapshot features.
- Tab-visibility event logging and experimental browser-based phone-object detection.
- Persisted monitoring event metadata linked to an owned student exam session.
- A teacher dashboard that reads authorized exam sessions/events and saves review actions.
- An illustrative risk-score utility, clearly labelled as a heuristic—not a probability or proof of cheating.

### Current implementation status
- Student and teacher registration/login, logout, a Mongo-backed server session, Argon2id password hashing, HttpOnly JWT cookie, and React role guards are now implemented.
- The UI keeps the existing `/exam` and `/dashboard` paths: `/exam` is student-only and `/dashboard` is teacher-only. `/`, `/login/:role`, and `/register/:role` are public.
- The Express API provides role-protected `/api/student/access` and `/api/teacher/access` endpoints. The current exam/dashboard content is still frontend demo content; sessions/events/review actions are not persisted or connected to MongoDB yet.
- The exam page requires camera connection and a detected face before the student can start. Monitoring flags are stored in the exam page's in-memory React state for the current session.
- The dashboard currently displays separate, hard-coded demonstration events. It does not receive live exam events, and its review selections are not persisted.
- Teacher signup requires the server-only `TEACHER_INVITE_CODE`; student registration is open. The server assigns the role from the registration endpoint and never trusts a submitted role.
- Database-backed account/session behavior requires a valid local MongoDB connection. Do not claim authentication is ready to use until the API is started and a real registration/login/logout flow has been exercised.
- Face, gaze, and phone detection have not been validated across a representative set of real camera/device conditions. Treat them as experimental signals and do not present them as dependable enforcement.

The architecture and execution plan below describe the intended end-to-end system; identify unfinished persistence/data-flow work explicitly.

### Privacy Principles
- Process webcam frames locally in the browser.
- Do not upload or persist raw video.
- A blink can capture a still image in browser memory and show a download link. It is not uploaded or persisted by the app, but the user can explicitly download it.
- Request camera access only after the user chooses to start monitoring.
- Show a clear camera/monitoring status and explain what events are recorded.
- Treat all automated detections as review signals, not proof of misconduct.
- Use synthetic demo students and events where possible.
- Stop all camera tracks and clean up listeners/timers when monitoring ends or a component unmounts.

## 2. Required Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Lucide React icons
- Express API with MongoDB/Mongoose
- Argon2id password hashing
- JWT-backed Mongo session delivered only in an HttpOnly cookie; never put tokens in localStorage/sessionStorage
- Zod request validation
- MediaPipe Tasks Vision Face Detector for browser-based face detection
- MediaPipe Tasks Vision Face Landmarker for experimental gaze/head-direction estimates and blink detection
- TensorFlow.js COCO-SSD for experimental in-browser `cell phone` object detection
- Browser `getUserMedia()` API for webcam access
- Page Visibility API for tab visibility events

Do not train a model during this hackathon. Use a compatible pretrained model and verify the model asset/license/configuration before claiming a feature works.

### Configure and run authentication locally
1. Copy `.env.example` to `.env` in the project root.
2. Set `MONGODB_URI` to a valid database URI. Do not commit it; `.env` is gitignored. If a real database password was exposed in chat, rotate it before use.
3. Generate a separate secret for `JWT_SECRET` and `TEACHER_INVITE_CODE`. For example, run `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` twice and put each output only in `.env`.
4. Keep `FRONTEND_ORIGIN` exactly aligned with the Vite URL. The default is `http://localhost:5173`; if Vite uses another port/host, update the value.
5. Start the API and frontend in separate terminals:

```sh
npm run dev:server
npm run dev
```

To create the development demo accounts, set unique `DEFAULT_STUDENT_PASSWORD` and `DEFAULT_TEACHER_PASSWORD` values (10-128 characters) in `.env`, then run `npm run seed:users` once. This creates `student@gmail.com` as a student and `teacher@gmail.com` as a teacher. The command is disabled in production and will not overwrite existing accounts or passwords. Keep these passwords private and do not commit `.env`.

You can also register a student at `/register/student` or register a teacher at `/register/teacher` using the invitation code configured in the server's environment. **The app needs a working MongoDB URI before account creation or login can succeed.**

## 3. Authentication and Role-Based Access

### Login and password handling
- Provide separate student and teacher login entry points, but use the same validated login API and trusted server-issued role.
- Normalize/validate email addresses and validate password input on the server.
- Hash passwords at account creation with Argon2id; verify hashes with the matching library. Never store, log, return, or seed a plaintext password in source control.
- Never accept a role from the login form as authorization. Look up the role from the authenticated account.
- Public registration, if added, must create student accounts only. Create teacher accounts through a trusted seed/admin process or invitation flow; do not let a browser submit `role: "teacher"` to self-elevate.
- Use generic login failure messages so the endpoint does not reveal whether an email exists.

### Session and JWT handling
- Implemented: issue a 4-hour signed access JWT in an `HttpOnly`, `SameSite=Strict` cookie, `Secure` in production. Keep signing secrets only in server environment variables.
- Do not store bearer tokens in browser storage or include them in URLs. Use HTTPS in production.
- Include a session identifier (`sid`) in the JWT and persist/revoke active sessions server-side. On each protected request, verify signature, expiry, issuer/audience as configured, and that the session remains active.
- Logout revokes the active server session and clears the cookie using the same path/domain/security options. Expired, malformed, revoked, and missing sessions must receive `401`.
- Protect cookie-authenticated mutations against CSRF using Origin checks and a CSRF token where appropriate; keep CORS credentials restricted to the configured frontend origin.
- Rate-limit login attempts, return safe error messages, and never log passwords, cookies, JWTs, or camera/image data.

### Roles and protected routes
- Roles are exactly `student` and `teacher`; authorization must be enforced in Express middleware on every protected API request.
- Students may start/read only their own exam sessions and create events only for sessions they own.
- Teachers may view/review only sessions for exams they own or are explicitly assigned to. Do not trust student IDs, exam ownership, or role values sent by the client.
- Implemented: React route guards redirect students away from `/dashboard` and teachers away from `/exam`. `/api/student/*` and `/api/teacher/*` also use server authentication and role middleware. React guards improve navigation UX but are not a security boundary for actual data APIs.
- If session state is not loaded yet, show a loading state rather than briefly rendering protected content. After logout, clear user state and invalidate protected cached data.
- Unauthenticated users visiting a protected route go to the appropriate role login page and return only to an allowed local route after successful login.

## 4. Three-Hour Execution Plan

The existing app is already a frontend MVP. Spend the time on the smallest secure end-to-end slice; defer non-essential detection improvements. If a phase exceeds its budget, reduce scope rather than bypass security.

| Time | Phase | Deliverable and acceptance criteria |
| --- | --- | --- |
| 0:00–0:15 | Inspect and plan | Confirm current routes/files, Node version, dependency manager, existing tests, and runtime. Record what is implemented and what is only sample data. |
| 0:15–0:35 | Backend foundation | Add Express app, MongoDB connection from environment config, health route, centralized error handler, request-size limits, and CORS restricted to the frontend origin. App reports DB/config failures clearly. |
| 0:35–1:05 | Auth and sessions | Add User and Session models, password hashing, trusted account seed from environment, login/logout/session endpoints, cookie flags, JWT verification/revocation, login rate limit, and validation. Test correct/wrong login, expiry, logout, revoked token, and missing DB/config. |
| 1:05–1:25 | Role enforcement | Add `requireAuth` and `requireRole` middleware; protect teacher API on server. Test student gets `403` for teacher endpoints even if directly calling the API or manually entering a route. |
| 1:25–1:50 | React auth architecture | Add AuthProvider, auth service, `useAuth`, role-aware protected route, separate student/teacher login pages, loading/error/logout states. Refreshing should restore the cookie-backed session through `/api/auth/me`; no token in Web Storage. |
| 1:50–2:20 | Owned exam session | Add the minimal Exam/ExamSession model and API. A logged-in student can create/read only their session; every endpoint checks authenticated owner in the database query. Keep answers/session fields limited to what the demo needs. |
| 2:20–2:40 | Event workflow | Validate and persist event metadata from the browser, associating it with the authenticated student’s active session on the server. Never accept arbitrary student ownership from the payload. Teacher API returns only assigned exam events and saves review status. Start with polling; defer WebSockets. |
| 2:40–3:00 | Verification and demo | Run lint/build/tests; manually exercise student and teacher flows, direct-route/API authorization, ownership checks, logout, event creation/review, and camera cleanup. Document known detector limitations and unverified cases. |

### Three-hour priority rule
- **P0:** Login/session, server-side role checks, student session ownership, and correct logout.
- **P1:** Persist validated event metadata and show/review events for authorized teachers.
- **P2:** Improve phone/gaze accuracy, analytics, WebSockets, password reset, email verification, and production operations.
- Do not call the system production-ready after a hackathon implementation. Security review, deployment hardening, backup/retention policy, and real-device testing remain necessary.

## 5. Routes and Permissions

- `/` — Public landing page with student/teacher login choices.
- `/login/student` — Student login. A successful login with the server-confirmed `student` role goes to `/student/exam`.
- `/login/teacher` — Teacher login. A successful login with the server-confirmed `teacher` role goes to `/teacher/dashboard`.
- `/student/exam` — Student-only protected route.
- `/teacher/dashboard` — Teacher-only protected route.
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` — Authentication/session endpoints.
- `/api/student/sessions` and `/api/student/sessions/:sessionId/events` — Student-owned session/event endpoints.
- `/api/teacher/exams/:examId/events` and `/api/teacher/events/:eventId/review` — Teacher-authorized event and review endpoints.

Implemented UI paths are `/`, `/login/:role`, `/register/:role`, `/exam` (student protected), and `/dashboard` (teacher protected). The API currently includes the auth endpoints and role-protected `/api/student/access` and `/api/teacher/access` endpoints. The exam-session/event routes below are target architecture only and are not yet implemented.

## 6. React and Backend Architecture

Keep modules small and responsibility-based. Preserve existing working UI and detectors; add only the folders needed for auth, API, and persistence.

```text
client/src/
  app/                 App, router, query/provider composition
  components/          Shared UI, webcam monitor, protected route
  context/AuthContext.jsx
  hooks/               useAuth and proctoring hooks
  pages/               Home, StudentLogin, TeacherLogin, StudentExam, TeacherDashboard
  services/             authApi, sessionApi, eventApi (fetch wrapper with credentials)
  utils/                riskScore and presentation helpers
server/src/
  app.js                Express middleware and route registration
  config/               environment validation and MongoDB connection
  middleware/           auth, role authorization, validation, rate limit, error handling
  modules/
    auth/               routes, controller, service, validation
    exams/              routes, controller, service, model
    sessions/           routes, controller, service, model
    events/             routes, controller, service, model
    users/              User model and teacher provisioning
  utils/                JWT/cookie and safe error helpers
```

The current app is a single Vite package at the repository root. Do not physically move the frontend into `client/` during the three-hour MVP unless deployment/tooling requires it; a small `server/` alongside the existing root-level `src/` avoids a risky unrelated restructure.

### Request/data flow
1. The AuthProvider calls `/api/auth/me` with credentials and holds only the current user and auth-loading state in React memory.
2. Login submits credentials to Express; the server validates, checks the stored password hash, creates a revocable session, and sets the HttpOnly JWT cookie.
3. The student route obtains a server-created exam session. The webcam and MediaPipe/TensorFlow models continue to process frames locally.
4. Detection hooks emit event metadata (type, timestamp, detector confidence/details, session identifier) to the student event service. No video, frame, or blink snapshot is sent.
5. Express derives the student identity from the verified session, verifies that the active exam session belongs to that student, validates/limits the event payload, then persists the event.
6. The teacher dashboard requests events through role-protected routes. The server verifies the teacher owns/is assigned to the exam before returning events or accepting review changes.
7. Start with polling at a conservative interval. Do not add WebSockets until the authenticated polling flow and ownership tests pass.

### Minimum MongoDB models
- `User`: normalized unique `email`, `passwordHash`, `role` enum (`student`/`teacher`), display name, timestamps, and account status. Never serialize `passwordHash`.
- `Session`: unpredictable `sid`, `userId`, expiry, and revocation timestamp. Index `sid` uniquely and expiry for cleanup. The JWT carries the `sid`; authorization checks the corresponding active session.
- `Exam`: teacher/owner ID, optional assigned teacher IDs, title, and active status.
- `ExamSession`: `examId`, `studentId`, status, start/end timestamps. Verify student ownership and active status for every student read/write.
- `ProctoringEvent`: `examSessionId`, allowlisted type, occurrence time, bounded detector metadata, review status, reviewer ID, and review timestamp. Index by session and occurrence time.

Add only fields the current exam flow actually uses. Use Mongoose schema validation as defense in depth, not as a replacement for request validation and authorization.

### Minimal auth API contract
- `POST /api/auth/login` accepts `{ email, password }`; server sets the session cookie and returns `{ user: { id, email, displayName, role } }`. Never accept a role in the request.
- `GET /api/auth/me` returns the public user profile for a valid active session, otherwise `401`.
- `POST /api/auth/logout` revokes the current session and clears its cookie; repeat logout safely returns success without exposing session details.
- Client fetch calls use `credentials: "include"`. The cookie is not readable to JavaScript and the JWT is not returned in the JSON body.

## 7. UI Requirements

Use a professional, modern, responsive dashboard style:
- Dark navy/slate background with clear contrast
- Accessible text sizes and status colors
- Consistent spacing, rounded cards, restrained gradients
- Loading, empty, error, and success states
- Responsive layouts for laptop and smaller screens
- Lucide icons where useful

### Home (`/`)
- Project name and concise description
- Separate “Login as student” and “Login as teacher” links to their role-specific login pages
- Short privacy note: camera processing is local; validated event metadata may be sent to the server for review
- Do not present role selection as authorization; the API-issued role determines access.

### Login (`/login/student`, `/login/teacher`)
- Show the selected role clearly and provide email/password inputs, validation feedback, loading state, and a non-enumerating generic credential error.
- Send credentials to the backend over HTTPS in production and use `credentials: "include"` for the cookie session.
- Navigate only when the returned authenticated user role matches the requested login page; otherwise show an access message and do not render the wrong-role destination.
- Do not prefill or ship demo passwords in production. If development seed accounts are required, create them from local environment variables and document them as development-only.
- Provide logout in the authenticated app shell; after logout, invalidate auth state and protected cached data.

### Student Exam (`/student/exam`)
- Exam title, 21 sample multiple-choice questions, and a 20-minute countdown
- Camera setup/test control; starting the exam is gated on a connected camera and detected face
- Live webcam preview
- Camera permission/loading/error states
- Current face count, if detector is active
- Monitoring status, detection errors/alerts, and session event counts
- Experimental blink-triggered local snapshot (with explicit download option)
- Clear notice that automated flags may be inaccurate

### Teacher Dashboard (`/teacher/dashboard`)
- Summary cards and a timeline populated from the teacher-authorized API
- Student/session identifier and validated event metadata
- Event type, timestamp, severity, review status
- “Mark valid” / “Mark false alarm” review actions persist through a teacher-authorized endpoint.
- During incremental development, label any remaining sample events as demo data.
- The risk-score helper exists but is not currently displayed; do not surface it as a prediction.

## 8. Proctoring Event Data Contract

The current exam creates in-memory events. The authenticated implementation should validate and persist a normalized document similar to:

```js
{
  _id: ObjectId,
  examSessionId: ObjectId,
  type: "FACE_NOT_DETECTED",
  occurredAt: ISODate,
  confidence: 0.82,          // optional; bounded to [0, 1]
  details: { durationMs: 3000 },
  reviewStatus: "pending",   // pending | valid | false_alarm
  reviewedBy: null,          // teacher User ID when reviewed
  reviewedAt: null
}
```

Use a fixed allowlist such as `FACE_NOT_DETECTED`, `MULTIPLE_FACES`, `LOOKING_AWAY`, `PHONE_DETECTED`, and `TAB_HIDDEN`; map browser hook names to these API values in one client service. Do not accept arbitrary event types, titles, severity, `studentId`, `reviewStatus`, or reviewer identity from the student payload. Derive ownership and review state on the server. `confidence` is optional and must be treated as a model estimate, not a calibrated probability.

The current event list is lost on reload/navigation and is not shared with the dashboard. Dashboard examples currently use separate static data and local review state. The event persistence API is not implemented. Do not describe the examples as live detections.

## 9. Proctoring Workflow and Detection Behaviour

### End-to-end flow
1. Student authenticates; Express issues a session and returns the public user profile (ID, display name, role)—never a password hash or token in JSON.
2. Student opens their authorized exam and creates/loads a server-owned `ExamSession`.
3. On explicit user action, the browser requests camera access. Webcam frames remain local and are supplied to the existing MediaPipe/TensorFlow detectors.
4. Hooks debounce/cool down detections and emit allowlisted event metadata only. Do not upload video, raw frames, or blink snapshots.
5. The API authenticates the request, checks active session status and student ownership, validates/rate-limits the event, then persists it under that `ExamSession`.
6. The teacher dashboard fetches events only for exams the authenticated teacher owns/is assigned to. Event review updates are audited with reviewer ID and timestamp.
7. Teacher UI refreshes from server state (polling is sufficient for the MVP). React props or client-side route guards do not authorize any API request.

### Webcam
- Request video only; do not request microphone access.
- Request permission only after the user clicks Start Monitoring.
- Display useful errors for denied permission, missing devices, or unsupported APIs.
- Stop all `MediaStreamTrack`s when stopping monitoring and during cleanup.
- Avoid starting multiple camera streams or creating duplicate listeners.

### Face Detection
- Use MediaPipe Tasks Vision Face Detector with a compatible pretrained model.
- Load the model once and handle loading failures.
- Run inference at a reasonable interval; do not run expensive inference on every React render.
- Display the current face count when detection is running.
- Trigger `FACE_NOT_DETECTED` only if zero faces persist for approximately 3 seconds.
- Trigger `MULTIPLE_FACES` when more than one face is detected, with a cooldown or state-transition guard.
- Avoid repeated events for one continuous condition.
- Keep inference local. Never upload webcam frames.
- If model setup fails, show a truthful error and preserve webcam functionality. Do not claim detection works until tested.

Current Face Detector configuration: local model at `public/models/blaze_face_short_range.tflite`, video mode, approximately 250 ms inference interval, 3-second no-face threshold, and 15-second repeat cooldown.

The separate Face Landmarker runs blink and gaze/head-direction estimates. The current looking-away flag is triggered after an estimated condition lasts about 5 seconds. It is an experimental estimate; screen gaze cannot be determined reliably from a single webcam alone. A blink may capture a still frame locally and exposes it for optional user download.

### Tab Visibility
- Use `document.visibilityState` / `visibilitychange`.
- Record an event when the exam page becomes hidden.
- Remove the event listener during cleanup.
- Do not attempt to block normal tab switching or interfere with browser controls.
- Explain that a hidden-tab event is not proof of cheating.

### Phone Detection (Experimental)
- The current implementation uses TensorFlow.js COCO-SSD (`mobilenet_v2`) and its `cell phone` class, with TensorFlow.js WebGL/CPU backends.
- The model is dynamically imported and inference runs locally on camera frames. COCO-SSD weights are fetched by the browser from the model's configured remote URL; first use needs network access. This downloads model weights, not camera frames.
- The code uses a 30% confidence threshold, checks approximately every 600 ms, and flags a candidate after at least two positive frames within 2.5 seconds. It rearms after 3 seconds without a detection.
- These settings are prototype tuning, not validated accuracy. COCO-SSD may miss small, obscured, distant, or poorly lit phones and may produce false positives. It does not distinguish the phone's front from its back.
- The phone detector is implemented but has not been verified against a representative real-phone test set. Report it as experimental until end-to-end tests with different phones, orientations, lighting, and distances pass.
- `public/models/object_detector.tflite` is not used by this TensorFlow.js phone-detection path.

## 10. Illustrative Risk Score

If implemented, use simple configurable event weights, for example:
- `TAB_SWITCH`: 10
- `FACE_NOT_DETECTED`: 15
- `MULTIPLE_FACES`: 25
- `PHONE_DETECTED`: 20

The current `src/utils/riskScore.js` utility uses severity weights (`low`: 5, `medium`: 15, `high`: 30) and caps its total at 100. It is not currently wired into the dashboard or exam events. If it is surfaced, these arbitrary demo weights must not be presented as validated measurements or a probability of cheating.

- Before using a risk score, avoid counting repeated events from the same continuous incident and exclude events reviewed as false alarms.
- Clearly separate pending events from reviewed events if review state becomes shared.
- Never automatically label a student as cheating or guilty.

## 11. Security Requirements

### Environment and configuration
- Keep `MONGODB_URI`, JWT signing key, cookie settings, frontend origin, and optional seed credentials in server-only environment variables. Validate required configuration at startup and fail clearly if absent.
- Commit `.env.example` with placeholder names only; ensure real `.env` files are ignored by Git. Never put backend secrets in `VITE_*` variables, frontend source, logs, README examples, or build artifacts.
- Restrict production CORS to the exact frontend origin and enable credentials only for that origin. Serve the app and API over HTTPS.

### API and data protection
- Validate request params, body, and query on the server with explicit schemas, length/range bounds, and allowlists. Reject unknown fields where practical; never trust client-supplied role, owner IDs, review status, or severity.
- Use authentication middleware before role middleware and resource lookup. Return `401` for unauthenticated requests, `403` for wrong roles, and avoid leaking whether another user's resource exists.
- Enforce student ownership in the database query itself, e.g. find an active session with both `_id: sessionId` and `studentId: req.user.id`; do not fetch unrestricted then rely on a client-side check.
- For teachers, query exams with both the requested ID and `teacherId`/assignment membership, and scope event reads/reviews through that authorized exam.
- Keep MongoDB schemas strict; add indexes for email uniqueness, session IDs/expiry, exam ownership, and event-session/time queries. Never expose password hashes or session secrets in API responses.
- Apply a JSON body-size limit, authentication/login rate limits, safe centralized errors, secure cookie flags, CSRF defenses for cookie-authenticated mutations, and appropriate security headers.
- Set session/JWT expirations and revoke sessions on logout. Use generic auth failure responses. Avoid brute-force revealing timing/identity behavior.
- Record minimal operational/auth audit information. Never log passwords, cookies, JWTs, full request authorization headers, or webcam/snapshot data.
- Define retention/deletion behavior for exam sessions and event metadata. Obtain clear consent for camera use and disclose what metadata is sent to the server.
- Never interpret automated events as proof of cheating or automatically punish/block a student solely based on detector output.

## 12. Development and Verification Workflow

For future changes:

1. Inspect the relevant implementation and `package.json` before editing.
2. Preserve existing routes and the React + Vite setup.
3. Run the narrowest useful lint/build/test checks after each coherent change.
4. For camera and detector changes, manually test with real camera inputs when available; synthetic or blank frames do not prove detection quality.
5. Test camera permission errors, camera stop/unmount cleanup, model-loading failures, frame inference, event delays, cooldowns, and browser console output.
6. Keep claims about detection accuracy proportional to actual testing. Document unverified conditions.
7. Until implemented, treat authentication, role protection, persistent sessions/events, and live dashboard integration as future work; do not imply those features exist.
8. Provide changed files, run commands, validation results, and any limitations with the implementation.

## 13. Final Acceptance Checklist

Current implementation checks:

- [x] Home, Exam, and Dashboard routes are defined.
- [x] The exam requests video only after the camera button is selected.
- [x] Exam start is disabled until the camera is connected and a face is detected.
- [x] The exam includes a 20-minute timer and 21 sample questions.
- [x] Face detection, blink/gaze landmark processing, phone-object detection, and tab-hidden event logic are implemented in the browser.
- [x] Lint and production build pass with `npm run lint` and `npm run build`.

Still requires end-to-end/manual verification or future implementation:

- [ ] Verify face, gaze, and phone detections using real people/phones and varied conditions; current automated signals are not accuracy-certified.
- [ ] Verify camera stop and browser/device permission handling on the target laptop.
- [ ] Verify event counts/cooldowns with repeatable real detections.
- [ ] Server login verifies a password hash and creates a revocable HttpOnly-cookie session.
- [ ] Logout clears the cookie and revokes the server session; `/api/auth/me` handles missing, expired, and revoked sessions.
- [ ] A student cannot access teacher routes/API even by direct URL/API request.
- [ ] A teacher cannot access another teacher's exams/events/reviews.
- [ ] A student cannot read/write another student's exam session by changing IDs.
- [ ] Student event metadata is validated, ownership-derived, persisted, and appears for only authorized teachers.
- [ ] Teacher review action is server-authorized and records reviewer/time.
- [ ] No password, JWT, cookie, or secret is exposed in frontend code, browser storage, API response, or logs.
- [ ] Login validation, generic failures, rate limits, CSRF/CORS, and missing environment/DB errors are exercised.
- [ ] Manually inspect browser-console errors on the target laptop.

## 14. Suggested 60-Second Demo

1. Open the home page and show separate student and teacher login options.
2. Sign in using development seed accounts configured locally; do not show or commit real credentials.
3. As a student, start an exam and camera monitoring. Show that event metadata—not video—is sent to the API.
4. Attempt to open the teacher dashboard as the student; show the frontend redirect and the server's `403` for a direct API call.
5. Sign in as a teacher and review the authorized session event; demonstrate a persisted review status.
6. Explain that detector flags are review signals, not proof of misconduct.

## 15. Instructions for Future AI Coding Work

Read this README and inspect the current implementation before making changes.

1. Inspect the current React + Vite app, package manifests, routes, and detector code first. The current app is frontend-only; do not imply auth or backend exists until built and tested.
2. Implement the three-hour plan incrementally. Keep the current root-level Vite app and add a small Express server; do not restructure the frontend without a concrete need.
3. Build one vertical slice at a time: auth/session → server role middleware → route UX → owned exam session → validated event persistence → authorized dashboard review.
4. Server authorization is mandatory. A React guard alone is not access control. Test direct API calls and ID-tampering/ownership cases.
5. Use password hashes, HttpOnly cookie sessions, server-side revocation, environment secrets, strict validation, rate limits, and CSRF/CORS protections described above. Never create a client-side role-only mock as a substitute.
6. Do not hard-code demo credentials or production secrets. Seed local-only users from environment variables; server assigns roles.
7. Do not send camera frames or snapshots to Express. Persist only minimal, validated event metadata tied to a server-owned student session.
8. Do not add another detector or advanced feature until auth, role checks, session ownership, and event flow work. Keep unverified detection features explicitly experimental.
9. After each phase, run focused tests; at completion run lint/build and auth/authorization integration tests. Report changed files, exact commands, test outcomes, and remaining security/manual review work.
