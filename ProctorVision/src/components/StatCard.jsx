function StatCard({ title, value, detail, icon }) {
  return (
    <article className="panel stat-card">
      <div className="stat-card-top"><span className="stat-icon">{icon}</span><span className="stat-label">{title}</span></div>
      <p className="stat-value">{value}</p>
      <p className="stat-detail">{detail}</p>
    </article>
  )
}

export default StatCard
