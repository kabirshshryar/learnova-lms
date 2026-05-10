import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { createSocketClient } from "../realtime/socket";
import { getUserId } from "../utils/user";

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  });
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [myWithdrawals, setMyWithdrawals] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [isAddingTokens, setIsAddingTokens] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("100");
  const [interestsDraft, setInterestsDraft] = useState("");
  const [isSavingInterests, setIsSavingInterests] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState({});
  const [chatInputs, setChatInputs] = useState({});
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [enablingInstructor, setEnablingInstructor] = useState(false);
  const socketRef = useRef(null);

  const statusClassMap = useMemo(
    () => ({
      pending: "status-pending",
      confirmed: "status-confirmed",
      completed: "status-completed",
      cancelled: "status-cancelled",
    }),
    []
  );

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isTeacher = roles.includes("instructor") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  const syncMe = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    const list = Array.isArray(data.user?.interests) ? data.user.interests : [];
    setInterestsDraft(list.join(", "));
  };

  const loadBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    try {
      const { data } = await api.get("/bookings/me");
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load bookings.");
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setIsLoadingTx(true);
    try {
      const { data } = await api.get("/wallet/transactions", { params: { limit: 50 } });
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (requestError) {
      setTransactions([]);
    } finally {
      setIsLoadingTx(false);
    }
  }, []);

  const loadMyWithdrawals = useCallback(async () => {
    if (!isTeacher) {
      setMyWithdrawals([]);
      return;
    }
    setIsLoadingWithdrawals(true);
    try {
      const { data } = await api.get("/withdrawals/me");
      setMyWithdrawals(Array.isArray(data.requests) ? data.requests : []);
    } catch (requestError) {
      setMyWithdrawals([]);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  }, [isTeacher]);

  const loadPendingWithdrawals = useCallback(async () => {
    if (!isAdmin) {
      setPendingWithdrawals([]);
      return;
    }
    try {
      const { data } = await api.get("/withdrawals/pending");
      setPendingWithdrawals(Array.isArray(data.requests) ? data.requests : []);
    } catch (requestError) {
      setPendingWithdrawals([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    const init = async () => {
      setError("");
      try {
        await syncMe();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load profile.");
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadBookings();
    loadTransactions();
    loadMyWithdrawals();
    loadPendingWithdrawals();
  }, [user, loadBookings, loadTransactions, loadMyWithdrawals, loadPendingWithdrawals]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return undefined;
    }

    const socket = createSocketClient(token);
    socketRef.current = socket;

    socket.on("booking:created", (payload) => {
      setNotifications((prev) => [
        { id: `${Date.now()}-created`, text: payload.message },
        ...prev.slice(0, 4),
      ]);
      loadBookings();
      loadTransactions();
    });

    socket.on("booking:status_updated", (payload) => {
      setNotifications((prev) => [
        { id: `${Date.now()}-status`, text: payload.message },
        ...prev.slice(0, 4),
      ]);
      loadBookings();
      loadTransactions();
    });

    socket.on("chat:new_message", (payload) => {
      setChatMessages((prev) => {
        const current = prev[payload.bookingId] || [];
        return {
          ...prev,
          [payload.bookingId]: [...current, payload],
        };
      });
    });

    socket.on("chat:error", (payload) => {
      setError(payload.message || "Chat error occurred.");
    });

    return () => {
      socket.disconnect();
    };
  }, [loadBookings, loadTransactions]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return;
    }
    bookings.forEach((booking) => {
      socket.emit("chat:join_booking", { bookingId: booking._id });
    });
  }, [bookings]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const myUserId = getUserId(user);

  const addTokens = async (amountArg) => {
    setFeedback("");
    setError("");
    const amt =
      typeof amountArg === "number"
        ? amountArg
        : Number.parseInt(String(topUpAmount), 10);
    if (!Number.isFinite(amt) || amt <= 0 || !Number.isInteger(amt)) {
      setError("Enter a valid whole number of tokens to add.");
      return;
    }

    setIsAddingTokens(true);
    try {
      await api.post("/wallet/topup", { amount: amt });
      await syncMe();
      await loadTransactions();
      setFeedback(`${amt} tokens added to your wallet.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to add tokens.");
    } finally {
      setIsAddingTokens(false);
    }
  };

  const saveInterests = async (event) => {
    event.preventDefault();
    setFeedback("");
    setError("");
    const tags = interestsDraft
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setIsSavingInterests(true);
    try {
      await api.patch("/auth/me/interests", { interests: tags });
      await syncMe();
      setFeedback("Interests saved. Recommendations will use these tags.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save interests.");
    } finally {
      setIsSavingInterests(false);
    }
  };

  const submitWithdrawal = async (event) => {
    event.preventDefault();
    setFeedback("");
    setError("");
    const amt = Number.parseInt(String(withdrawAmount), 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid withdrawal amount.");
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      await api.post("/withdrawals", {
        amount: amt,
        note: withdrawNote.trim(),
      });
      setWithdrawAmount("");
      setWithdrawNote("");
      await syncMe();
      await loadMyWithdrawals();
      await loadTransactions();
      setFeedback("Withdrawal request submitted.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Withdrawal failed.");
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const reviewWithdrawal = async (id, status) => {
    setFeedback("");
    setError("");
    setReviewingId(id);
    try {
      await api.patch(`/withdrawals/${id}/review`, { status });
      await loadPendingWithdrawals();
      await loadTransactions();
      setFeedback(`Withdrawal ${status}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Review failed.");
    } finally {
      setReviewingId(null);
    }
  };

  const enableAsInstructor = async () => {
    setFeedback("");
    setError("");
    setEnablingInstructor(true);
    try {
      await api.patch("/auth/me/become-instructor");
      await syncMe();
      setFeedback("Tutor profile enabled — you can publish sessions and withdraw earnings.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not enable tutoring.");
    } finally {
      setEnablingInstructor(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    setFeedback("");
    setError("");
    setUpdatingBookingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      await loadBookings();
      await syncMe();
      setFeedback(`Booking marked as ${status}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update booking.");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const onChatInputChange = (bookingId, value) => {
    setChatInputs((prev) => ({ ...prev, [bookingId]: value }));
  };

  const sendChatMessage = (bookingId) => {
    const socket = socketRef.current;
    const text = (chatInputs[bookingId] || "").trim();
    if (!socket || !text) {
      return;
    }

    socket.emit("chat:message", { bookingId, text });
    setChatInputs((prev) => ({ ...prev, [bookingId]: "" }));
  };

  const openJitsiMeeting = (meetingRoom) => {
    if (!meetingRoom) {
      return;
    }
    window.open(`https://meet.jit.si/${encodeURIComponent(meetingRoom)}`, "_blank", "noopener,noreferrer");
  };

  const getTeacherIdStr = (booking) => {
    const t = booking.teacher_id;
    if (!t) return "";
    return t._id ? String(t._id) : String(t);
  };

  const getStudentIdStr = (booking) => {
    const s = booking.student_id;
    if (!s) return "";
    return s._id ? String(s._id) : String(s);
  };

  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter(
    (booking) => new Date(booking.time) > new Date() && booking.status !== "cancelled"
  ).length;
  const liveReadyBookings = bookings.filter((booking) =>
    ["confirmed", "completed"].includes(booking.status)
  ).length;

  const teacherBookingActions = (booking) => {
    if (!isTeacher || getTeacherIdStr(booking) !== myUserId) {
      return null;
    }

    const busy = updatingBookingId === booking._id;

    if (booking.status === "pending") {
      return (
        <div className="booking-actions">
          <button
            type="button"
            className="booking-action-btn"
            disabled={busy}
            onClick={() => updateBookingStatus(booking._id, "confirmed")}
          >
            Confirm
          </button>
          <button
            type="button"
            className="booking-action-btn ghost"
            disabled={busy}
            onClick={() => updateBookingStatus(booking._id, "cancelled")}
          >
            Cancel
          </button>
        </div>
      );
    }

    if (booking.status === "confirmed") {
      return (
        <div className="booking-actions">
          <button
            type="button"
            className="booking-action-btn"
            disabled={busy}
            onClick={() => updateBookingStatus(booking._id, "completed")}
          >
            Mark completed
          </button>
          <button
            type="button"
            className="booking-action-btn ghost"
            disabled={busy}
            onClick={() => updateBookingStatus(booking._id, "cancelled")}
          >
            Cancel & refund escrow
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="dashboard">
      <nav className="dashboard-navbar">
        <div>
          <h2>Dashboard</h2>
          <p className="dashboard-subtitle">
            Coursera-style learning marketplace: buy tokens → book tutors → earn as an educator →
            cash out withdrawals
          </p>
        </div>
        <div className="dashboard-user">
          <span>{user?.name || "User"}</span>
          <button type="button" className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <h3>Menu</h3>
          <ul className="sidebar-links">
            <li>
              <a href="#overview">Overview</a>
            </li>
            <li>
              <a href="#profile">Profile & interests</a>
            </li>
            <li>
              <a href="#how-it-works">How tokens work</a>
            </li>
            <li>
              <Link to="/gigs">Find tutors</Link>
            </li>
            <li>
              <a href="#wallet">Wallet & top-up</a>
            </li>
            <li>
              <a href="#transactions">Transactions</a>
            </li>
            <li>
              <a href="#withdrawals">Withdrawals</a>
            </li>
            {isAdmin ? (
              <li>
                <a href="#admin-withdrawals">Admin queue</a>
              </li>
            ) : null}
            <li>
              <a href="#bookings">Bookings</a>
            </li>
          </ul>
        </aside>

        <main className="dashboard-main">
          {notifications.length > 0 ? (
            <div className="toast-stack" aria-live="polite">
              {notifications.map((item) => (
                <div key={item.id} className="toast-item">
                  {item.text}
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          {feedback ? <p className="form-success">{feedback}</p> : null}

          <section id="overview" className="dashboard-feed">
            <h3>Overview</h3>
            <div className="dashboard-cards">
              <article className="dashboard-card">
                <h4>Total bookings</h4>
                <p>{totalBookings}</p>
              </article>
              <article className="dashboard-card">
                <h4>Upcoming sessions</h4>
                <p>{upcomingBookings}</p>
              </article>
              <article className="dashboard-card">
                <h4>Live-ready</h4>
                <p>{liveReadyBookings}</p>
              </article>
              <article className="dashboard-card">
                <h4>Wallet balance</h4>
                <p>{user?.walletBalance ?? 0} tokens</p>
              </article>
              <article className="dashboard-card">
                <h4>Withdrawable</h4>
                <p>{user?.withdrawableBalance ?? 0} tokens</p>
              </article>
              <article className="dashboard-card">
                <h4>Roles</h4>
                <p>{roles.length ? roles.join(", ") : "—"}</p>
              </article>
            </div>
          </section>

          <section id="how-it-works" className="dashboard-feed mooc-info-panel">
            <h3>How this MOOC marketplace works</h3>
            <ul className="mooc-bullet-list">
              <li>
                <strong>As a learner (student):</strong> purchase tokens (mock checkout), browse expert
                sessions on a topic, book a slot — tokens stay in escrow until the session completes.
              </li>
              <li>
                <strong>As an educator (tutor):</strong> publish paid topic sessions like a mini-course or
                office hour — same account can stay a student elsewhere (dual role like Fiverr buyer +
                seller).
              </li>
              <li>
                <strong>Withdraw:</strong> after sessions complete, earnings sit in withdrawable tokens;
                request a payout — admins approve in the withdrawal queue (stand-in for fiat / bank /
                Wise).
              </li>
            </ul>
          </section>

          {!roles.includes("instructor") && !roles.includes("admin") ? (
            <section id="become-tutor" className="dashboard-feed tutor-cta-banner">
              <h3>Also teach here?</h3>
              <p className="muted">
                Enable tutor mode on this same account — no separate login. Publish sessions and swap
                completed earnings for withdrawals.
              </p>
              <button
                type="button"
                disabled={enablingInstructor}
                onClick={() => enableAsInstructor()}
              >
                {enablingInstructor ? "Enabling…" : "Become a tutor (enable instructor)"}
              </button>
            </section>
          ) : null}

          <section id="profile" className="dashboard-feed">
            <h3>Profile & learning interests</h3>
            <p className="muted">
              Used by <strong>/api/gigs/recommended</strong> plus your booking history tags.
            </p>
            <form className="inline-form" onSubmit={saveInterests}>
              <label className="full-width">
                Interests (comma separated)
                <input
                  type="text"
                  value={interestsDraft}
                  onChange={(e) => setInterestsDraft(e.target.value)}
                  placeholder="react, datascience, ielts speaking"
                />
              </label>
              <button type="submit" disabled={isSavingInterests}>
                {isSavingInterests ? "Saving…" : "Save interests"}
              </button>
            </form>
          </section>

          <section id="wallet" className="dashboard-feed">
            <h3>Token wallet</h3>
            <p className="muted">
              Tokens behave like prepaid credits toward tutoring. Top-up mocks paid purchase via{" "}
              <code>POST /api/wallet/topup</code>. Spend them when you confirm a booked session (
              escrow).
            </p>
            <div className="wallet-row">
              <label>
                Amount
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={isAddingTokens}
                onClick={() => addTokens()}
              >
                {isAddingTokens ? "Working…" : "Add tokens"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isAddingTokens}
                onClick={() => addTokens(100)}
              >
                +100 quick
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isAddingTokens}
                onClick={() => addTokens(500)}
              >
                +500 quick
              </button>
            </div>
          </section>

          <section id="transactions" className="dashboard-feed">
            <h3>Transaction ledger</h3>
            <p className="muted"><code>GET /api/wallet/transactions</code></p>
            {isLoadingTx ? (
              <p>Loading transactions…</p>
            ) : transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Op</th>
                      <th>Amount</th>
                      <th>Balance</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id}>
                        <td>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}</td>
                        <td>{tx.operation}</td>
                        <td>{tx.amount}</td>
                        <td>
                          {tx.balanceBefore} → {tx.balanceAfter}
                        </td>
                        <td>{tx.description || tx.referenceType || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="withdrawals" className="dashboard-feed">
            <h3>Earnings &amp; payouts (tutors)</h3>
            <p className="muted">
              Exchange withdrawable tokens for cash-out requests (manual approval represents bank /
              payment rail). APIs: <code>POST /api/withdrawals</code>,{" "}
              <code>GET /api/withdrawals/me</code>
            </p>
            {!isTeacher ? (
              <p>Tutors and admins use this after learners complete bookings.</p>
            ) : (
              <>
                <form className="inline-form stacked" onSubmit={submitWithdrawal}>
                  <div className="wallet-row wrap">
                    <label>
                      Amount (tokens)
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                    </label>
                    <label className="grow">
                      Note (optional)
                      <input
                        type="text"
                        value={withdrawNote}
                        onChange={(e) => setWithdrawNote(e.target.value)}
                      />
                    </label>
                  </div>
                  <button type="submit" disabled={isSubmittingWithdrawal}>
                    {isSubmittingWithdrawal ? "Submitting…" : "Request withdrawal"}
                  </button>
                </form>

                <h4>My requests</h4>
                {isLoadingWithdrawals ? (
                  <p>Loading…</p>
                ) : myWithdrawals.length === 0 ? (
                  <p>No withdrawal requests yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Created</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myWithdrawals.map((w) => (
                          <tr key={w._id}>
                            <td>{w.createdAt ? new Date(w.createdAt).toLocaleString() : "—"}</td>
                            <td>{w.amount}</td>
                            <td>{w.status}</td>
                            <td>{w.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          {isAdmin ? (
            <section id="admin-withdrawals" className="dashboard-feed">
              <h3>Admin: pending withdrawals</h3>
              <p className="muted"><code>GET /api/withdrawals/pending</code></p>
              {pendingWithdrawals.length === 0 ? (
                <p>No pending requests.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Teacher</th>
                        <th>Amount</th>
                        <th>Note</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingWithdrawals.map((w) => (
                        <tr key={w._id}>
                          <td>{w.teacher_id?.name || w.teacher_id?.email || "—"}</td>
                          <td>{w.amount}</td>
                          <td>{w.note || "—"}</td>
                          <td className="table-actions">
                            <button
                              type="button"
                              className="booking-action-btn"
                              disabled={reviewingId === w._id}
                              onClick={() => reviewWithdrawal(w._id, "approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="booking-action-btn ghost"
                              disabled={reviewingId === w._id}
                              onClick={() => reviewWithdrawal(w._id, "rejected")}
                            >
                              Reject (refund)
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          <section id="bookings" className="dashboard-feed">
            <h3>My teaching &amp; learning sessions</h3>
            <p className="muted">
              List: <code>GET /api/bookings/me</code> • Teacher updates:{" "}
              <code>PATCH /api/bookings/:id/status</code> • Socket.io chat/events
            </p>
            {isLoadingBookings ? <p>Loading bookings…</p> : null}

            {!isLoadingBookings && bookings.length === 0 ? (
              <p>
                No bookings yet.{" "}
                <Link to="/gigs">Browse gigs</Link>
              </p>
            ) : null}

            {!isLoadingBookings && bookings.length > 0 ? (
              <div className="booking-list">
                {bookings.map((booking) => (
                  <article key={booking._id} className="booking-item">
                    <div className="booking-row">
                      <h4>{booking.gig_id?.title || "Untitled gig"}</h4>
                      <span
                        className={`status-badge ${statusClassMap[booking.status] || "status-pending"}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="booking-meta-grid">
                      <span>
                        <strong>Scheduled:</strong> {new Date(booking.time).toLocaleString()}
                      </span>
                      <span>
                        <strong>Escrow:</strong> {booking.escrowStatus} ({booking.escrowAmount} tokens held)
                      </span>
                      <span>
                        <strong>Price:</strong> {booking.price} tokens
                      </span>
                      <span>
                        <strong>Room:</strong> {booking.meetingRoom || "—"}
                      </span>
                    </p>
                    <p>
                      <strong>Student:</strong> {booking.student_id?.name || getStudentIdStr(booking)}{" "}
                      · <strong>Teacher:</strong> {booking.teacher_id?.name || getTeacherIdStr(booking)}
                    </p>

                    {booking.meetingRoom &&
                    ["confirmed", "completed"].includes(booking.status) ? (
                      <button
                        type="button"
                        className="meeting-button"
                        onClick={() => openJitsiMeeting(booking.meetingRoom)}
                      >
                        Open Jitsi session
                      </button>
                    ) : null}

                    {teacherBookingActions(booking)}

                    <div className="chat-box">
                      <h5>Booking chat (Socket.io)</h5>
                      <div className="chat-messages">
                        {(chatMessages[booking._id] || []).length === 0 ? (
                          <p className="chat-empty">No messages yet.</p>
                        ) : (
                          (chatMessages[booking._id] || []).map((msg, index) => (
                            <p key={`${msg.createdAt}-${index}`}>
                              <strong>
                                {String(msg.senderId) === String(myUserId) ? "You" : "Peer"}:
                              </strong>{" "}
                              {msg.text}
                            </p>
                          ))
                        )}
                      </div>
                      <div className="chat-input-row">
                        <input
                          type="text"
                          value={chatInputs[booking._id] || ""}
                          onChange={(event) =>
                            onChatInputChange(booking._id, event.target.value)
                          }
                          placeholder="Message your student or teacher…"
                        />
                        <button type="button" onClick={() => sendChatMessage(booking._id)}>
                          Send
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </section>
  );
}

export default DashboardPage;
