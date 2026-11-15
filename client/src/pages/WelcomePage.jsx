import { Link } from 'react-router-dom'

const STEPS = [
  { n: '1', title: 'Create an account', text: 'Join as a client to book gigs, or as a freelancer to sell your services.' },
  { n: '2', title: 'Post or browse', text: 'Freelancers list what they offer. Clients search the gigs and book the one they like.' },
  { n: '3', title: 'Book and track', text: 'Every booking creates a transaction record, and freelancers see their income as it comes in.' },
]

export default function WelcomePage() {
  return (
    <>
      <section className="hero welcome-hero">
        <span className="chip">Welcome to HustleHub+</span>
        <h1 className="hero-title">Find someone who gets it done.</h1>
        <p className="hero-sub">
          HustleHub+ is a freelance marketplace. Freelancers advertise their services, and clients
          browse, book and keep track of the work, all in one place.
        </p>
        <div className="welcome-cta">
          <Link to="/register" className="btn btn-primary btn-lg">Create an account</Link>
          <Link to="/login" className="btn btn-lg">Log in</Link>
        </div>
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">How it works</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n} className="card step">
              <span className="step-num" aria-hidden="true">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="safe-title">
        <h2 id="safe-title" className="section-title">Built to be safe</h2>
        <div className="card safe-card">
          <ul className="safe-list">
            <li>Passwords are stored hashed, never as plain text.</li>
            <li>What you can see and do depends on your role.</li>
            <li>Repeated failed attempts are rate limited.</li>
            <li>Payments are simulated in this project, so no real money moves.</li>
          </ul>
        </div>
      </section>
    </>
  )
}