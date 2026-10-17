# ProctorVision

React + Vite student exam and teacher dashboard prototype with Express/MongoDB authentication.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI`, `JWT_SECRET`, and `TEACHER_INVITE_CODE` in `.env`. Keep the file private and do not commit it.
3. Install dependencies:

   ```sh
   npm install
   ```

4. Set unique passwords of at least 10 characters for `DEFAULT_STUDENT_PASSWORD` and `DEFAULT_TEACHER_PASSWORD` in `.env`. Create the default accounts once:

   ```sh
   npm run seed:users
   ```

   This creates `student@gmail.com` as a student and `teacher@gmail.com` as a teacher. It never overwrites existing accounts or passwords and refuses to run when `NODE_ENV=production`.

5. Start the API in one terminal:

   ```sh
   npm run dev:server
   ```

6. Start the frontend in a second terminal:

   ```sh
   npm run dev
   ```

7. Sign in with the seeded accounts, or register at `/register/student` or `/register/teacher`. Teacher registration requires the server-configured invite code.

The API requires a working MongoDB connection before registration/login can succeed. Frontend routes are role-protected; `/exam` requires a student account and `/dashboard` requires a teacher account. The exam-session/event persistence and live teacher dashboard are not implemented yet.

See [README_ProctorVision_AI.md](./README_ProctorVision_AI.md) for the architecture, security requirements, three-hour implementation plan, and verification checklist.
