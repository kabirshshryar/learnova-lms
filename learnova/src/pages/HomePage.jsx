import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="home-layout">
      <section className="home-hero">
        <p className="home-kicker">Education marketplace</p>
        <h2>Learn topics from real experts — or teach and earn tokens.</h2>
        <p>
          Learnova is a lightweight MOOC-style LMS: a catalog of tutors and topic sessions, token
          payments, bookings, chat, and live classes. Same account can feel like Coursera (learn) and
          Fiverr (offer paid help) together.
        </p>
        <div className="home-actions">
          <Link to="/register" className="home-link home-link-primary">
            Join as learner / tutor
          </Link>
          <Link to="/gigs" className="home-link">
            Explore tutors
          </Link>
          <Link to="/login" className="home-link">
            Login
          </Link>
        </div>
      </section>

      <section className="token-flow-banner">
        <h3>Token economy (simple)</h3>
        <ol className="token-flow-list">
          <li>
            <strong>Purchase tokens</strong> — prepaid credits toward sessions (demo top-up stands in
            for Stripe / bkash etc.).
          </li>
          <li>
            <strong>Book a tutor</strong> on a concrete topic → tokens go to escrow until the session is
            done.
          </li>
          <li>
            <strong>Tutors cash out</strong> — withdrawable balance → payout requests (admin approves = bank
            / manual settlement).
          </li>
        </ol>
      </section>

      <section className="home-grid">
        <article className="home-feature-card">
          <h3>Structured learning vibe</h3>
          <p>Sessions mapped to subjects and difficulty — browse like a marketplace, progress like LMS.</p>
        </article>
        <article className="home-feature-card">
          <h3>Trust & scheduling</h3>
          <p>Escrow, status tracking, realtime chat — before and during your live lesson.</p>
        </article>
        <article className="home-feature-card">
          <h3>Live classroom</h3>
          <p>Open Jitsi when the booking is confirmed — no extra LMS plugin required.</p>
        </article>
      </section>
    </div>
  );
}

export default HomePage;
