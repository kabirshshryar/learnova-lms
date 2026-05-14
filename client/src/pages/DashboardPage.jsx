import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Wallet, 
  BookOpen, 
  Clock, 
  MessageCircle, 
  Video, 
  User as UserIcon, 
  Settings, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Info,
  LogOut,
  Bell,
  Search,
  ShieldAlert,
  CreditCard,
  History
} from "lucide-react";
import api from "../api/axios";
import { createSocketClient } from "../realtime/socket";
import { getUserId } from "../utils/user";

const StatCard = ({ title, value, icon: Icon, trend, color = "brand" }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}/10 border border-${color}/20`}>
        <Icon className={`w-5 h-5 text-${color === 'brand' ? 'brand-light' : color}`} />
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
    <h3 className="text-2xl font-bold text-white font-outfit">{value}</h3>
  </motion.div>
);

const NavItem = ({ active, onClick, icon: Icon, children }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
      active 
      ? 'bg-brand text-white shadow-lg shadow-brand/20' 
      : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className="w-4 h-4" />
    {children}
  </button>
);

function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
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

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isTeacher = roles.includes("instructor") || roles.includes("admin");
  const isAdmin = roles.includes("admin");
  const myUserId = getUserId(user);

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
    if (!token) return undefined;

    const socket = createSocketClient(token);
    socketRef.current = socket;

    socket.on("booking:created", (payload) => {
      addNotification(payload.message);
      loadBookings();
      loadTransactions();
    });

    socket.on("booking:status_updated", (payload) => {
      addNotification(payload.message);
      loadBookings();
      loadTransactions();
    });

    socket.on("chat:new_message", (payload) => {
      setChatMessages((prev) => ({
        ...prev,
        [payload.bookingId]: [...(prev[payload.bookingId] || []), payload],
      }));
    });

    return () => socket.disconnect();
  }, [loadBookings, loadTransactions]);

  const addNotification = (text) => {
    setNotifications((prev) => [
      { id: Date.now(), text },
      ...prev.slice(0, 4),
    ]);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const addTokens = async (amount) => {
    const amt = typeof amount === "number" ? amount : Number(topUpAmount);
    if (!amt || amt <= 0) return;

    setIsAddingTokens(true);
    try {
      await api.post("/wallet/topup", { amount: amt });
      await syncMe();
      await loadTransactions();
      setFeedback(`${amt} tokens added to your wallet.`);
    } catch (err) {
      setError("Failed to add tokens.");
    } finally {
      setIsAddingTokens(false);
    }
  };

  const saveInterests = async (e) => {
    e.preventDefault();
    setIsSavingInterests(true);
    const tags = interestsDraft.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    try {
      await api.patch("/auth/me/interests", { interests: tags });
      await syncMe();
      setFeedback("Interests updated successfully.");
    } catch (err) {
      setError("Failed to save interests.");
    } finally {
      setIsSavingInterests(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    setUpdatingBookingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      await loadBookings();
      await syncMe();
      setFeedback(`Booking marked as ${status}.`);
    } catch (err) {
      setError("Update failed.");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const sendChatMessage = (bookingId) => {
    const socket = socketRef.current;
    const text = (chatInputs[bookingId] || "").trim();
    if (!socket || !text) return;
    socket.emit("chat:message", { bookingId, text });
    setChatInputs(prev => ({ ...prev, [bookingId]: "" }));
  };

  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter(b => new Date(b.time) > new Date() && b.status !== "cancelled").length;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center border border-brand/30">
              <UserIcon className="w-5 h-5 text-brand-light" />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold truncate">{user?.name || "Member"}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Learner Tier</p>
            </div>
          </div>

          <div className="space-y-1">
            <NavItem active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={LayoutDashboard}>Overview</NavItem>
            <NavItem active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} icon={BookOpen}>Bookings</NavItem>
            <NavItem active={activeTab === "wallet"} onClick={() => setActiveTab("wallet")} icon={Wallet}>Wallet</NavItem>
            <NavItem active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={Settings}>Settings</NavItem>
            {isAdmin && <NavItem active={activeTab === "admin"} onClick={() => setActiveTab("admin")} icon={ShieldAlert}>Admin Panel</NavItem>}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {/* Support Card */}
        <div className="bg-gradient-to-br from-brand/20 to-accent/20 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl -mr-12 -mt-12 rounded-full" />
          <h4 className="text-white font-bold mb-2">Need Help?</h4>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">Our support team is available 24/7 to assist with your learning journey.</p>
          <button className="text-[10px] uppercase font-bold tracking-widest text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">Contact Support</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center bg-white/5 border border-white/10 px-8 py-4 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4 text-slate-400">
            <h2 className="text-xl font-bold text-white font-outfit capitalize">{activeTab}</h2>
            <ChevronRight className="w-4 h-4 opacity-30" />
            <span className="text-xs font-medium uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-dark-bg" />
            </button>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl">
              <Wallet className="w-4 h-4 text-brand-light" />
              <span className="text-sm font-bold text-white">{user?.walletBalance ?? 0} <span className="text-[10px] text-brand-light uppercase">TKN</span></span>
            </div>
          </div>
        </div>

        {/* Global Feedback Messages */}
        <AnimatePresence>
          {(error || feedback) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-2xl flex items-center gap-3 border ${error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-success/10 border-success/20 text-success'}`}
            >
              {error ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              <span className="text-sm font-medium">{error || feedback}</span>
              <button onClick={() => { setError(""); setFeedback(""); }} className="ml-auto opacity-50 hover:opacity-100"><XCircle className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Bookings" value={totalBookings} icon={BookOpen} trend={12} />
                <StatCard title="Upcoming Sessions" value={upcomingBookings} icon={Clock} trend={5} />
                <StatCard title="Wallet Balance" value={`${user?.walletBalance ?? 0} TKN`} icon={Wallet} color="brand" />
                <StatCard title="Withdrawable" value={`${user?.withdrawableBalance ?? 0} TKN`} icon={ArrowUpRight} color="success" />
                <StatCard title="Account Level" value="Advanced" icon={Plus} color="accent" />
                <StatCard title="Session Hours" value="48.5h" icon={History} color="brand" />
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Bookings Preview */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white font-outfit">Upcoming Sessions</h3>
                    <button onClick={() => setActiveTab("bookings")} className="text-brand-light text-xs font-bold hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {bookings.filter(b => b.status === "confirmed").slice(0, 3).map((booking, i) => (
                      <div key={booking._id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-12 h-12 rounded-xl bg-brand/10 flex flex-col items-center justify-center border border-brand/20">
                          <span className="text-[10px] font-bold text-brand-light uppercase">{new Date(booking.time).toLocaleString('en-US', { month: 'short' })}</span>
                          <span className="text-lg font-bold text-white leading-none">{new Date(booking.time).getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white">{booking.gig_id?.title || "Session"}</h4>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(booking.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-widest">Live</div>
                      </div>
                    ))}
                    {bookings.filter(b => b.status === "confirmed").length === 0 && (
                      <div className="text-center py-10 opacity-50 italic text-sm">No upcoming sessions found.</div>
                    )}
                  </div>
                </div>

                {/* Quick Wallet Action */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-brand/10 blur-3xl rounded-full" />
                  <h3 className="text-xl font-bold text-white font-outfit mb-6">Quick Deposit</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tokens to purchase</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                        <button 
                          onClick={() => addTokens()}
                          disabled={isAddingTokens}
                          className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand/20"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[50, 100, 500].map(amt => (
                        <button key={amt} onClick={() => addTokens(amt)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-xl text-xs font-bold transition-all">+{amt}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                      Secure payment handled via escrow. Tokens are used to book 1-on-1 tutoring sessions.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "bookings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-white font-outfit">My Sessions</h3>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/10">All</button>
                  <button className="px-4 py-2 bg-brand/10 border border-brand/20 text-brand-light rounded-lg text-xs font-bold">Upcoming</button>
                  <button className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold">History</button>
                </div>
              </div>

              {isLoadingBookings ? (
                <div className="flex justify-center py-20">
                  <div className="w-10 h-10 border-4 border-white/5 border-t-brand rounded-full animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                  <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400">No bookings yet. Start your journey by exploring tutors.</p>
                  <Link to="/gigs" className="mt-6 inline-block bg-brand px-6 py-3 rounded-xl font-bold text-white">Explore Gigs</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                      <div className="p-6 flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-brand-light uppercase">{new Date(booking.time).toLocaleString('en-US', { month: 'short' })}</span>
                            <span className="text-2xl font-bold text-white leading-none">{new Date(booking.time).getDate()}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-lg font-bold text-white font-outfit">{booking.gig_id?.title || "Session"}</h4>
                              <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                                booking.status === 'confirmed' ? 'bg-success/10 text-success' :
                                booking.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                'bg-slate-500/10 text-slate-500'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(booking.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> {booking.teacher_id?.name || "Tutor"}</span>
                              <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> {booking.gig_id?.price || 0} Tokens</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {booking.status === 'confirmed' && (
                            <button 
                              onClick={() => window.open(`https://meet.jit.si/${booking._id}`, '_blank')}
                              className="px-6 py-3 bg-success hover:bg-success/80 text-white rounded-xl text-sm font-bold shadow-lg shadow-success/20 transition-all flex items-center gap-2"
                            >
                              <Video className="w-4 h-4" /> Start Meeting
                            </button>
                          )}
                          <button 
                            className="p-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
                            onClick={() => setUpdatingBookingId(booking._id === updatingBookingId ? null : booking._id)}
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Chat Section */}
                      <AnimatePresence>
                        {updatingBookingId === booking._id && (
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="border-t border-white/10 bg-black/20 overflow-hidden"
                          >
                            <div className="p-6 space-y-4">
                              <div className="h-48 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                                {(chatMessages[booking._id] || []).map((msg, i) => (
                                  <div key={i} className={`flex ${msg.senderId === myUserId ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${msg.senderId === myUserId ? 'bg-brand text-white' : 'bg-white/10 text-slate-300'}`}>
                                      {msg.text}
                                    </div>
                                  </div>
                                ))}
                                {(chatMessages[booking._id] || []).length === 0 && <div className="text-center text-slate-600 text-xs py-10">No messages yet. Say hello!</div>}
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={chatInputs[booking._id] || ""}
                                  onChange={(e) => setChatInputs(prev => ({ ...prev, [booking._id]: e.target.value }))}
                                  placeholder="Type your message..."
                                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
                                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(booking._id)}
                                />
                                <button 
                                  onClick={() => sendChatMessage(booking._id)}
                                  className="p-2 bg-brand text-white rounded-xl font-bold"
                                >
                                  Send
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "wallet" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 rounded-3xl p-8 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white font-outfit mb-2">Available Balance</h3>
                  <div className="flex items-end gap-3 mb-8">
                    <span className="text-5xl font-extrabold text-white font-outfit">{user?.walletBalance ?? 0}</span>
                    <span className="text-brand-light font-bold text-sm mb-2 uppercase tracking-widest">Learner Tokens</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Spent</p>
                      <p className="text-white font-bold">1,240 TKN</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Earned</p>
                      <p className="text-success font-bold">+850 TKN</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl flex flex-col justify-center text-center">
                  <h4 className="text-white font-bold mb-4">Quick Top-Up</h4>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button onClick={() => addTokens(50)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white p-4 rounded-2xl font-bold transition-all">+50 TKN</button>
                    <button onClick={() => addTokens(200)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white p-4 rounded-2xl font-bold transition-all">+200 TKN</button>
                  </div>
                  <button onClick={() => addTokens(500)} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white py-4 rounded-2xl font-bold transition-all">Buy 500 Tokens (Best Value)</button>
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
                <div className="p-8 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white font-outfit">Transaction Ledger</h3>
                </div>
                {isLoadingTx ? (
                  <div className="p-20 text-center text-slate-500 italic">Syncing ledger...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <th className="px-8 py-4">Status</th>
                          <th className="px-8 py-4">Transaction</th>
                          <th className="px-8 py-4">Type</th>
                          <th className="px-8 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {transactions.map((tx) => (
                          <tr key={tx._id} className="text-sm hover:bg-white/5 transition-colors">
                            <td className="px-8 py-6">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                                tx.operation === 'DEBIT' ? 'bg-red-500/10 text-red-400' : 'bg-success/10 text-success'
                              }`}>
                                {tx.operation}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-white font-medium mb-1">{tx.description || "System Transaction"}</p>
                              <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                            </td>
                            <td className="px-8 py-6 text-slate-400 text-xs font-medium">{tx.referenceType}</td>
                            <td className={`px-8 py-6 text-right font-bold ${
                              tx.operation === 'DEBIT' ? 'text-slate-300' : 'text-success'
                            }`}>
                              {tx.operation === 'DEBIT' ? '-' : '+'}{Math.abs(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-24 h-24 rounded-3xl bg-brand/20 border-2 border-brand/40 flex items-center justify-center relative group">
                    <UserIcon className="w-10 h-10 text-brand-light" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-3xl flex items-center justify-center transition-opacity cursor-pointer">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white font-outfit">{user?.name}</h3>
                    <p className="text-slate-500 text-sm mb-4">{user?.email}</p>
                    <div className="flex gap-2">
                      {roles.map(role => (
                        <span key={role} className="px-3 py-1 bg-brand/10 border border-brand/20 text-brand-light text-[10px] font-bold uppercase tracking-widest rounded-lg">{role}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <form onSubmit={saveInterests} className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Learning Interests</label>
                      <span className="text-[10px] text-slate-600">Comma separated tags</span>
                    </div>
                    <textarea 
                      value={interestsDraft}
                      onChange={(e) => setInterestsDraft(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                      rows={4}
                      placeholder="e.g. react, nodejs, figma, design system"
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                      Interests help our recommendation engine show you tutoring sessions that match your goals.
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={isSavingInterests}
                      className="px-10 py-4 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold shadow-lg shadow-brand/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSavingInterests ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 backdrop-blur-xl">
                <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Danger Zone
                </h4>
                <p className="text-slate-500 text-xs mb-6">Once you delete your account, there is no going back. All your tokens and booking history will be lost.</p>
                <button className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all">Delete Account</button>
              </div>
            </motion.div>
          )}

          {activeTab === "admin" && isAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-8">
                  <ShieldAlert className="w-6 h-6 text-accent" />
                  <h3 className="text-2xl font-bold text-white font-outfit">Withdrawal Queue</h3>
                </div>
                
                {pendingWithdrawals.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 bg-black/20 rounded-2xl border border-white/5">
                    No pending withdrawal requests. Everything is up to date!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingWithdrawals.map((w) => (
                      <div key={w._id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                            <ArrowUpRight className="text-accent w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-white font-bold">{w.teacher_id?.name || w.teacher_id?.email || "Tutor"}</p>
                            <p className="text-xs text-slate-500">Requested {new Date(w.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-extrabold text-white font-outfit">{w.amount} TKN</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Payout Amount</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateBookingStatus(w._id, "approved")}
                            disabled={reviewingId === w._id}
                            className="px-6 py-2.5 bg-success text-white rounded-lg text-xs font-bold shadow-lg shadow-success/20 transition-all active:scale-95"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(w._id, "rejected")}
                            disabled={reviewingId === w._id}
                            className="px-6 py-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
