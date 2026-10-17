import { ArrowRight, ClipboardCheck, ShieldCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-kicker"><span className="status-dot" /> TRUSTED EXAM EXPERIENCE</div>
          <h1 className="page-title">Exams, with confidence.</h1>
          <p className="page-copy">
            ProctorVision brings students and educators into one secure, focused
            space for online assessments.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link className="button" to={user.role === 'teacher' ? '/dashboard' : '/exam'}>
                {user.role === 'teacher' ? <ClipboardCheck aria-hidden="true" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
                Continue to {user.role === 'teacher' ? 'teacher dashboard' : 'student exam'}
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            ) : (
              <>
                <div className="role-entry">
                  <Link className="button" to="/login/student">
                    <ShieldCheck aria-hidden="true" size={18} />
                    Login as a student
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                  <Link className="role-register-link" to="/register/student">Create student account</Link>
                </div>
                <div className="role-entry">
                  <Link className="button secondary" to="/login/teacher">
                    <ClipboardCheck aria-hidden="true" size={18} />
                    Login as a teacher
                  </Link>
                  <Link className="role-register-link" to="/register/teacher">Register with teacher invite</Link>
                </div>
              </>
            )}
          </div>
          {!loading && !user && (
            <p className="privacy-note">Sign in or register before entering an exam or teacher dashboard.</p>
          )}
        </div>
        <div aria-hidden="true" className="hero-visual">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-shield"><ShieldCheck size={64} strokeWidth={1.4} /></div>
          <div className="visual-label"><span className="status-dot" /> EXAM SESSION SECURE</div>
        </div>
      </section>

      <section aria-label="Platform highlights" className="home-highlights">
        <article className="highlight-card">
          <span className="highlight-icon"><ShieldCheck size={20} /></span>
          <div>
            <h2>Focused assessments</h2>
            <p>A calm, distraction-free exam space for every student.</p>
          </div>
        </article>
        <article className="highlight-card">
          <span className="highlight-icon"><UsersRound size={20} /></span>
          <div>
            <h2>Clear oversight</h2>
            <p>Review sample session events from a single dashboard.</p>
          </div>
        </article>
      </section>
      <footer className="home-footer">ProctorVision <span>·</span> A better view of online exams</footer>
    </div>
  )
}

export default Home