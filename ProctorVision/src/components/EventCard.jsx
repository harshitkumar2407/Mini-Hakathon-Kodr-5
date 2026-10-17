import { Check, CircleAlert, X } from 'lucide-react'

function EventCard({ event, onReview, review }) {
  const { id, title, description, severity, time, student } = event
  const severityClass = `severity-badge ${severity.toLowerCase()}`
  const reviewLabel = review === 'valid' ? 'Marked valid' : review === 'false-alarm' ? 'False alarm' : null

  return (
    <article className={`panel timeline-event${review ? ' reviewed' : ''}`}>
      <div className={`timeline-marker ${severity.toLowerCase()}`}><CircleAlert aria-hidden="true" size={17} /></div>
      <div className="event-main">
        <div className="event-title-row">
          <h3>{title}</h3>
          <span className={severityClass}>{severity} risk</span>
          {reviewLabel && <span className={`review-badge ${review}`}>{reviewLabel}</span>}
        </div>
        <p className="event-description">{description}</p>
        <div className="event-meta"><span>{student}</span><span className="meta-separator">·</span><time>{time}</time></div>
      </div>
      <div aria-label={`Review ${title}`} className="event-actions">
        <button
          aria-label={`Mark ${title} as valid`}
          aria-pressed={review === 'valid'}
          className={`review-button${review === 'valid' ? ' active valid' : ''}`}
          onClick={() => onReview(id, 'valid')}
          type="button"
        ><Check size={16} /> <span>Valid</span></button>
        <button
          aria-label={`Mark ${title} as a false alarm`}
          aria-pressed={review === 'false-alarm'}
          className={`review-button${review === 'false-alarm' ? ' active false-alarm' : ''}`}
          onClick={() => onReview(id, 'false-alarm')}
          type="button"
        ><X size={16} /> <span>False alarm</span></button>
      </div>
    </article>
  )
}

export default EventCard
