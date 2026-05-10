import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { getUserId } from "../utils/user";

function teacherIdStr(gig) {
  const t = gig.teacher_id;
  if (!t) return "";
  return t._id ? String(t._id) : String(t);
}

function GigsPage() {
  const [gigs, setGigs] = useState([]);
  const [recommendedGigs, setRecommendedGigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bookingTimes, setBookingTimes] = useState({});
  const [creatingGig, setCreatingGig] = useState(false);
  const [deletingGigId, setDeletingGigId] = useState(null);
  const [gigForm, setGigForm] = useState({
    title: "",
    description: "",
    duration: "",
    price: "",
    tags: "",
  });

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (parseError) {
      return null;
    }
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setUser(null);
      return;
    }

    let cancelled = false;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const myId = getUserId(user);
  const isTeacher = roles.includes("instructor") || roles.includes("admin");
  const isStudent = roles.includes("student") || roles.includes("admin");

  const fetchGigs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data } = await api.get("/gigs");
      setGigs(Array.isArray(data.gigs) ? data.gigs : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load gigs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecommendedGigs = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) {
      setRecommendedGigs([]);
      return;
    }

    try {
      const { data } = await api.get("/gigs/recommended");
      setRecommendedGigs(Array.isArray(data.gigs) ? data.gigs : []);
    } catch (requestError) {
      setRecommendedGigs([]);
    }
  }, []);

  useEffect(() => {
    fetchGigs();
    fetchRecommendedGigs();
  }, [fetchGigs, fetchRecommendedGigs]);

  const onGigInputChange = (event) => {
    const { name, value } = event.target;
    setGigForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCreateGig = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    setCreatingGig(true);

    try {
      const payload = {
        title: gigForm.title.trim(),
        description: gigForm.description.trim(),
        duration: Number(gigForm.duration),
        price: Number(gigForm.price),
        tags: gigForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      await api.post("/gigs", payload);
      setGigForm({
        title: "",
        description: "",
        duration: "",
        price: "",
        tags: "",
      });
      setNotice("Gig created successfully.");
      await fetchGigs();
      await fetchRecommendedGigs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to create gig.");
    } finally {
      setCreatingGig(false);
    }
  };

  const onDeleteGig = async (gigId) => {
    setNotice("");
    setError("");
    setDeletingGigId(gigId);
    try {
      await api.delete(`/gigs/${gigId}`);
      setNotice("Gig deleted.");
      await fetchGigs();
      await fetchRecommendedGigs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete gig.");
    } finally {
      setDeletingGigId(null);
    }
  };

  const onBookingTimeChange = (gigId, value) => {
    setBookingTimes((prev) => ({ ...prev, [gigId]: value }));
  };

  const refreshSession = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (e) {
      /* noop */
    }
  };

  const onBookGig = async (gigId) => {
    const selectedTime = bookingTimes[gigId];
    setNotice("");
    setError("");

    const t = localStorage.getItem("token");
    if (!t) {
      setError("Please log in first to book a session.");
      return;
    }

    if (!isStudent) {
      setError("Your account needs the student role to book gigs.");
      return;
    }

    if (!selectedTime) {
      setError("Please choose a date and time before booking.");
      return;
    }

    try {
      await api.post("/bookings", {
        gig_id: gigId,
        time: new Date(selectedTime).toISOString(),
      });
      setNotice("Booking created. Tokens moved to escrow for this session.");
      setBookingTimes((prev) => ({ ...prev, [gigId]: "" }));
      await refreshSession();
      await fetchRecommendedGigs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to create booking.");
    }
  };

  const renderBookingBlock = (gig) => {
    if (!token) {
      return (
        <p className="gig-note">
          <Link to="/login">Log in</Link> to book this gig with your wallet balance.
        </p>
      );
    }

    if (!isStudent) {
      return <p className="gig-note">Switch to a student account to book sessions.</p>;
    }

    return (
      <div className="gig-booking">
        <label>
          Session time
          <input
            type="datetime-local"
            value={bookingTimes[gig._id] || ""}
            onChange={(event) => onBookingTimeChange(gig._id, event.target.value)}
          />
        </label>
        <button type="button" onClick={() => onBookGig(gig._id)}>
          Book session
        </button>
      </div>
    );
  };

  const ownerControls = (gig) => {
    const owner = myId && teacherIdStr(gig) === String(myId);
    if (!isTeacher || !owner) return null;

    return (
      <button
        type="button"
        className="gig-delete-btn"
        disabled={deletingGigId === gig._id}
        onClick={() => onDeleteGig(gig._id)}
      >
        {deletingGigId === gig._id ? "Removing…" : "Delete gig"}
      </button>
    );
  };

  const renderGigCard = (gig, variant) => (
    <article key={`${variant}-${gig._id}`} className="gig-card">
      <div className="gig-card-top">
        <h3>{gig.title}</h3>
        {ownerControls(gig)}
      </div>
      <p className="gig-meta">
        <strong>Price:</strong> {gig.price} tokens
      </p>
      <p className="gig-meta">
        <strong>Duration:</strong> {gig.duration} mins
      </p>
      {variant === "recommended" ? (
        <p className="gig-meta">
          <strong>Recommendation score:</strong> {gig.recommendationScore ?? "—"}
        </p>
      ) : null}
      <p className="gig-desc">{gig.description}</p>

      {Array.isArray(gig.tags) && gig.tags.length ? (
        <div className="gig-tags">
          {gig.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}

      {renderBookingBlock(gig)}
    </article>
  );

  return (
    <section className="gigs-section">
      <div className="gigs-header">
        <div>
          <h2>Tutor &amp; topic catalog</h2>
          <p>
            Explore paid learning sessions Coursera-style: each listing is help on a concrete topic.
            Personalized picks use <code>GET /api/gigs/recommended</code>. Tutors list via{" "}
            <code>POST /api/gigs</code>; learners book with tokens via <code>POST /api/bookings</code>.
          </p>
        </div>
        {token ? (
          <Link to="/dashboard" className="dashboard-pill-link">
            Open dashboard →
          </Link>
        ) : (
          <Link to="/login" className="dashboard-pill-link">
            Log in to book →
          </Link>
        )}
      </div>

      {isTeacher ? (
        <form className="gig-form" onSubmit={onCreateGig}>
          <h3>Publish a tutoring session</h3>
          <div className="gig-form-grid">
            <label>
              Title
              <input
                name="title"
                value={gigForm.title}
                onChange={onGigInputChange}
                required
                minLength={3}
              />
            </label>
            <label>
              Duration (minutes)
              <input
                name="duration"
                type="number"
                value={gigForm.duration}
                onChange={onGigInputChange}
                required
                min={1}
              />
            </label>
            <label>
              Price (tokens)
              <input
                name="price"
                type="number"
                value={gigForm.price}
                onChange={onGigInputChange}
                required
                min={0}
              />
            </label>
            <label>
              Tags (comma separated)
              <input
                name="tags"
                value={gigForm.tags}
                onChange={onGigInputChange}
                placeholder="python, interview prep"
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              name="description"
              value={gigForm.description}
              onChange={onGigInputChange}
              required
              minLength={10}
              rows={4}
            />
          </label>
          <button type="submit" disabled={creatingGig}>
            {creatingGig ? "Publishing…" : "Publish to catalog"}
          </button>
        </form>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      {isLoading ? <p>Loading gigs…</p> : null}

      {!isLoading && recommendedGigs.length > 0 ? (
        <div className="recommended-gigs">
          <h3>Recommended sessions for you</h3>
          <div className="gig-cards">{recommendedGigs.map((gig) => renderGigCard(gig, "recommended"))}</div>
        </div>
      ) : null}

      {!isLoading ? (
        <div>
          <h3 className="gig-section-title">All tutoring offers</h3>
          <div className="gig-cards">{gigs.map((gig) => renderGigCard(gig, "all"))}</div>
        </div>
      ) : null}

      {!token ? (
        <p className="gig-market-footnote muted">
          Sign in with a learner wallet to spend tokens — or enable tutor mode in the dashboard to sell
          topic sessions too (Coursera + Fiverr style).
        </p>
      ) : null}
    </section>
  );
}

export default GigsPage;
