import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import WebcamMonitor from '../components/WebcamMonitor.jsx'

const TEST_DURATION_SECONDS = 20 * 60
const incidentTypes = [
  { type: 'no-face', label: 'Face absent' },
  { type: 'multiple-faces', label: 'Multiple faces' },
  { type: 'looking-away', label: 'Looking away' },
  { type: 'phone-detected', label: 'Phone in view' },
  { type: 'tab-left', label: 'Exam tab left' },
]

const questions = [
  {
    prompt: 'Which data structure follows the First-In, First-Out (FIFO) principle?',
    answers: ['Stack', 'Queue', 'Binary tree', 'Graph'],
  },
  {
    prompt: 'Which language is primarily used to structure content on the web?',
    answers: ['HTML', 'SQL', 'Bash', 'Python'],
  },
  {
    prompt: 'What does CPU stand for?',
    answers: ['Central Processing Unit', 'Computer Power Utility', 'Core Program Upload', 'Central Program User'],
  },
  {
    prompt: 'Which programming construct repeats a block of code while a condition is true?',
    answers: ['Loop', 'Variable', 'Comment', 'Constant'],
  },
  {
    prompt: 'Which of these is a JavaScript data type?',
    answers: ['Boolean', 'Markup', 'Stylesheet', 'Hyperlink'],
  },
  {
    prompt: 'What is the result of 7 multiplied by 8?',
    answers: ['54', '56', '58', '64'],
  },
  {
    prompt: 'Which symbol is commonly used for a single-line comment in JavaScript?',
    answers: ['//', '<!--', '**', '##'],
  },
  {
    prompt: 'What does URL stand for?',
    answers: ['Uniform Resource Locator', 'Universal Record Link', 'Unified Reference List', 'User Routing Language'],
  },
  {
    prompt: 'Which part of a computer stores data temporarily while programs are running?',
    answers: ['RAM', 'SSD', 'Keyboard', 'Power supply'],
  },
  {
    prompt: 'Which protocol is commonly used to load secure websites?',
    answers: ['HTTPS', 'FTP', 'SMTP', 'SSH'],
  },
  {
    prompt: 'In a relational database, what is a row commonly called?',
    answers: ['Record', 'Function', 'Branch', 'Package'],
  },
  {
    prompt: 'Which Git command creates a copy of a remote repository on your computer?',
    answers: ['git clone', 'git merge', 'git status', 'git commit'],
  },
  {
    prompt: 'What does CSS primarily control on a web page?',
    answers: ['Presentation and layout', 'Database queries', 'Server authentication', 'File compression'],
  },
  {
    prompt: 'Which value represents “no value” in JavaScript?',
    answers: ['null', 'true', 'NaN', '1'],
  },
  {
    prompt: 'What is the time complexity of looking up a value by key in an average hash table?',
    answers: ['O(1)', 'O(n)', 'O(n²)', 'O(log n)'],
  },
  {
    prompt: 'Which HTML element represents the largest top-level heading?',
    answers: ['<h1>', '<head>', '<title>', '<header>'],
  },
  {
    prompt: 'Which HTTP method is typically used to retrieve data?',
    answers: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
  {
    prompt: 'What does an operating system manage?',
    answers: ['Hardware and software resources', 'Only web pages', 'Only database tables', 'Internet domain names'],
  },
  {
    prompt: 'Which Boolean operator is true only when both conditions are true?',
    answers: ['AND', 'OR', 'NOT', 'XOR'],
  },
  {
    prompt: 'What is the purpose of a function parameter?',
    answers: ['To pass input into a function', 'To stop a computer', 'To style a web page', 'To create a database'],
  },
  {
    prompt: 'Which of these is a valid IPv4 address?',
    answers: ['192.168.1.1', '300.10.1.1', '192.168.1', 'example.com'],
  },
]

function Exam() {
  const [cameraConnected, setCameraConnected] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('idle')
  const [testStartedAt, setTestStartedAt] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_DURATION_SECONDS)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [savedAnswers, setSavedAnswers] = useState({})
  const [proctoringEvents, setProctoringEvents] = useState([])
  const [testSubmitted, setTestSubmitted] = useState(false)
  const testStarted = testStartedAt !== null
  const testFinished = testStarted && remainingSeconds === 0
  const testComplete = testFinished || testSubmitted
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const formattedTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
  const incidentCounts = proctoringEvents.reduce((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1
    return counts
  }, {})

  const recordProctoringEvent = useCallback((event) => {
    if (!testStarted || testComplete) {
      return
    }

    setProctoringEvents((events) => [
      { ...event, id: `${event.type}-${Date.now()}-${events.length}` },
      ...events,
    ])
  }, [testComplete, testStarted])

  useEffect(() => {
    if (testStartedAt === null || testSubmitted) {
      return undefined
    }

    const updateTimer = () => {
      const deadline = testStartedAt + TEST_DURATION_SECONDS * 1000
      const secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemainingSeconds(secondsLeft)
      if (secondsLeft === 0) {
        window.clearInterval(intervalId)
      }
    }

    const intervalId = window.setInterval(updateTimer, 1000)
    return () => window.clearInterval(intervalId)
  }, [testStartedAt, testSubmitted])

  useEffect(() => {
    if (!testStarted || testComplete) {
      return undefined
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        recordProctoringEvent({
          type: 'tab-left',
          title: 'Exam tab left',
          detail: 'The exam page became hidden.',
          occurredAt: new Date(),
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [recordProctoringEvent, testComplete, testStarted])

  function startTest() {
    if (!cameraConnected || !faceDetected || testStarted) {
      return
    }
    setRemainingSeconds(TEST_DURATION_SECONDS)
    setTestStartedAt(Date.now())
  }

  function saveAnswerAndContinue() {
    if (!selectedAnswer || testComplete) {
      return
    }

    setSavedAnswers((answers) => ({ ...answers, [currentQuestionIndex]: selectedAnswer }))
    if (isLastQuestion) {
      setTestSubmitted(true)
      return
    }

    const nextQuestionIndex = currentQuestionIndex + 1
    setCurrentQuestionIndex(nextQuestionIndex)
    setSelectedAnswer(savedAnswers[nextQuestionIndex] ?? '')
  }

  return (
    <div className="exam-page">
      <div className="exam-topbar">
        <div>
          <Link className="back-link" to="/"><ArrowLeft size={16} /> Back home</Link>
          <p className="eyebrow">STUDENT EXAM</p>
          <h1 className="section-title">Foundations of Computer Science</h1>
          {!testStarted && <p className="dashboard-subtitle">Connect your camera to unlock and begin the test.</p>}
        </div>
        {testStarted && (
          <div aria-label={`${formattedTime} remaining`} className={`timer-card${testComplete ? ' timer-finished' : ''}`}>
            <Clock3 aria-hidden="true" size={18} />
            <div>
              <span aria-live="off" className="timer-value">{formattedTime}</span>
              <span className="timer-caption">{testFinished ? 'Time is up' : testSubmitted ? 'Test submitted' : 'Time remaining'}</span>
            </div>
          </div>
        )}
      </div>

      <div className={`exam-layout${testStarted ? '' : ' camera-setup-layout'}`}>
        {!testStarted ? (
          <section aria-labelledby="camera-setup-heading" className="camera-gate panel">
            <div className="camera-gate-intro">
              <span className="gate-icon"><ShieldCheck size={23} /></span>
              <div>
                <p className="eyebrow">BEFORE YOU BEGIN</p>
                <h2 id="camera-setup-heading">Set up your camera</h2>
                <p>Connect your camera and position your face in view. Your exam questions unlock after a face is detected and you start the test.</p>
              </div>
            </div>
            <div className="camera-gate-footer">
              <span className={`camera-ready-label${faceDetected ? ' ready' : ''}`}>
                {faceDetected
                  ? <CheckCircle2 size={17} />
                  : <span className="status-dot disconnected" />}
                {faceDetected
                  ? 'Face detected — you’re ready to begin'
                  : !cameraConnected
                    ? 'Connect and test your camera to continue'
                    : faceDetectionStatus === 'loading'
                      ? 'Loading face detection…'
                      : faceDetectionStatus === 'error'
                        ? 'Face detection is unavailable; the test remains locked'
                        : 'Position your face in the camera view'}
              </span>
              <button className="button" disabled={!cameraConnected || !faceDetected} onClick={startTest} type="button">
                Start your test
              </button>
              <p className="camera-privacy-note">Face landmarks are processed in your browser. Camera video is not sent to a face-detection API. Camera permission requires a secure page (HTTPS or localhost).</p>
            </div>
          </section>
        ) : (
          <section aria-labelledby="question-heading" className="panel question-panel">
            {testComplete && (
              <div className="test-finished-banner" role="status">
                <Clock3 size={17} /> {testFinished ? 'Time is up. Your test is complete.' : 'Your test has been submitted.'}
              </div>
            )}
            <div className="panel-heading">
              <div><span className="eyebrow">QUESTION {String(currentQuestionIndex + 1).padStart(2, '0')} <span className="eyebrow-divider">/</span> {String(questions.length).padStart(2, '0')}</span><h2 id="question-heading">Multiple choice</h2></div>
              <span className="question-points">1 point</span>
            </div>
            <p className="question-prompt">{currentQuestion.prompt}</p>
            <fieldset className="answer-options" disabled={testComplete}>
              <legend className="sr-only">Select your answer</legend>
              {currentQuestion.answers.map((answer, index) => (
                <label className={`answer-option${selectedAnswer === answer ? ' selected' : ''}`} key={answer}>
                  <input
                    checked={selectedAnswer === answer}
                    name="exam-answer"
                    onChange={() => {
                      setSelectedAnswer(answer)
                    }}
                    type="radio"
                    value={answer}
                  />
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span>{answer}</span>
                </label>
              ))}
            </fieldset>
            <div className="question-footer">
              <span aria-live="polite" className="saved-message">
                {savedAnswers[currentQuestionIndex] ? 'Previously saved answer' : ''}
              </span>
              <button className="button" disabled={!selectedAnswer || testComplete} onClick={saveAnswerAndContinue} type="button">
                {isLastQuestion ? 'Submit test' : 'Save & next'}
              </button>
            </div>
          </section>
        )}
        <aside className="exam-sidebar">
          <WebcamMonitor
            locked={testStarted}
            onConnectionChange={setCameraConnected}
            onFaceDetectedChange={setFaceDetected}
            onFaceStatusChange={setFaceDetectionStatus}
            onProctoringEvent={recordProctoringEvent}
          />
          {testStarted && (
            <>
            <section aria-label="Session status" className="panel session-panel">
              <div className="session-status-icon"><ShieldCheck size={19} /></div>
              <div><h2>Session status</h2><p>{testComplete ? 'Test complete.' : 'Your test is in progress.'}</p></div>
              <span className="status-pill"><span className="status-dot" /> {testComplete ? 'Complete' : 'In progress'}</span>
            </section>
            <p className="privacy-note">Local automated signals are active during the test. Flags can be inaccurate and are not proof of misconduct.</p>
            </>
          )}
        </aside>
      </div>
      {testStarted && (
        <section aria-labelledby="proctoring-events-heading" className="proctoring-events panel">
          <div className="proctoring-events-header">
            <div>
              <p className="eyebrow">SESSION MONITORING</p>
              <h2 id="proctoring-events-heading">Proctoring flags</h2>
            </div>
            <span className="incident-total"><AlertTriangle size={16} /> {proctoringEvents.length} total</span>
          </div>
          <div aria-label="Incident counts" className="incident-counts">
            {incidentTypes.map(({ type, label }) => (
              <div className="incident-count" key={type}>
                <span>{label}</span>
                <strong>{incidentCounts[type] ?? 0}</strong>
              </div>
            ))}
          </div>
          {proctoringEvents.length > 0 ? (
            <ol aria-label="Proctoring event list" className="proctoring-event-list">
              {proctoringEvents.map((event) => (
                <li className="proctoring-event" key={event.id}>
                  <span className={`event-count-marker ${event.type}`}><AlertTriangle size={15} /></span>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                  </div>
                  <time>{event.occurredAt.toLocaleTimeString()}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="no-proctoring-events">No flags recorded during this test yet.</p>
          )}
          <p className="privacy-note">Automated flags can be inaccurate. They are local sample monitoring signals and should be reviewed by a person.</p>
        </section>
      )}
    </div>
  )
}

export default Exam
