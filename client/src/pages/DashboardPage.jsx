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
  Plus, 
  CheckCircle2, 
  XCircle, 
  Info,
  LogOut,
  Bell,
  ShieldAlert,
  CreditCard,
  History,
  TrendingUp,
  MessageSquare,
  MoreVertical,
  ExternalLink,
  Search,
  Sparkles
} from "lucide-react";
import api from "../api/axios";
import { createSocketClient } from "../realtime/socket";
import { getUserId } from "../utils/user";

const ADMIN_ENDPOINTS = {
	// Candidate endpoints for "bookings this week" — edit to match your backend
	bookingsPaths: [
		"/admin/bookings/this-week",
		"/admin/bookings/summary?period=week",
		"/admin/bookings?period=week",
		"/admin/reports/bookings?period=week",
		"/admin/reports/bookings/week",
		"/admin/stats/bookings/week",
		"/reports/bookings?period=week",
		"/admin/bookings" // fallback: fetch all and filter client-side
	],
	// Candidate endpoints for escrowed tokens — edit to match your backend
	escrowPaths: [
		"/admin/wallet/escrow",
		"/admin/wallet/escrowed",
		"/admin/wallet/summary",
		"/admin/escrow",
		"/admin/financial/escrow",
		"/admin/reports/escrow",
		"/admin/wallet" // fallback
	],
	// Candidate endpoints for active users count — edit to match your backend
	usersPaths: [
		"/admin/users/active_count",
		"/admin/users/count/active",
		"/admin/users/stats",
		"/admin/users/summary",
		"/admin/users/active",
		"/admin/reports/users",
		"/admin/users" // fallback: fetch list and count active client-side
	]
};

const StatCard = ({ title, value, icon: Icon, trend, color = "brand" }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="lms-card p-6 flex flex-col gap-4"
  >
    <div className="flex justify-between items-start">
      <div className={`p-2.5 rounded-xl bg-${color}/10 border border-${color}/20 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 text-${color === 'brand' ? 'brand-light' : color === 'success' ? 'success' : 'accent'}`} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${trend > 0 ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-400'}`}>
          <TrendingUp className={`w-3 h-3 ${trend < 0 && 'rotate-180'}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-bold text-white font-outfit tracking-tight">{value}</h3>
    </div>
  </motion.div>
);

const NavItem = ({ active, onClick, icon: Icon, children }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
      active 
      ? 'bg-brand text-white shadow-lg shadow-brand/20' 
      : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-brand-light'}`} />
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
  const [adminSubTab, setAdminSubTab] = useState("accounts");
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  // Admin overview metrics
  const [adminWeekBookings, setAdminWeekBookings] = useState(0);
  const [adminEscrowTokens, setAdminEscrowTokens] = useState(0);
  const [adminActiveUsers, setAdminActiveUsers] = useState(0);
  const [topUpAmount, setTopUpAmount] = useState("100");
  const [interestsDraft, setInterestsDraft] = useState("");
  const [nameDraft, setNameDraft] = useState(user?.name || "");
  const [descriptionDraft, setDescriptionDraft] = useState(user?.description || "");
  const [educationDraft, setEducationDraft] = useState(user?.education || "");
  const [certificationDraft, setCertificationDraft] = useState(user?.certification || "");
  const [experienceDraft, setExperienceDraft] = useState(user?.experience || "");
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
  // Ensure myUserId is always a string and available immediately (falls back to localStorage)
  const myUserId = (() => {
    const idFromUser = getUserId(user);
    if (idFromUser) return String(idFromUser);
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        return String(getUserId(parsed) || parsed._id || "");
      }
    } catch (e) {}
    return "";
  })();

  const syncMe = async () => {
    const { data } = await api.get("/auth/me");
    const me = data.user;
    // persist profile
    setUser(me);
    localStorage.setItem("user", JSON.stringify(me));
    const list = Array.isArray(me?.interests) ? me.interests : [];
    setInterestsDraft(list.join(", "));
    setNameDraft(me?.name || "");
    setDescriptionDraft(me?.description || "");
    setEducationDraft(me?.education || "");
    setCertificationDraft(me?.certification || "");
    setExperienceDraft(me?.experience || "");

    // First-time login welcome bonus (100 tokens)
    try {
      const localFlag = localStorage.getItem("welcomeBonusClaimed");
      const serverFlag = Boolean(me?.welcomeBonusGiven || me?.hasReceivedWelcomeBonus);
      if (!localFlag && !serverFlag) {
        // Try preferred bonus endpoint, fall back to topup
        let awarded = false;
        try {
          await api.post("/wallet/bonus", { amount: 100, reason: "welcome_bonus" });
          awarded = true;
        } catch (err) {
          try {
            await api.post("/wallet/topup", { amount: 100, reason: "welcome_bonus" });
            awarded = true;
          } catch (err2) {
            // leave awarded false
          }
        }

        if (awarded) {
          // Update local user walletBalance so UI reflects bonus immediately
          const currentBalance = Number(me?.walletBalance ?? 0);
          const newBalance = currentBalance + 100;
          const updated = { ...me, walletBalance: newBalance };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
          localStorage.setItem("welcomeBonusClaimed", "1");
          setFeedback("Welcome bonus: 100 tokens credited to your wallet.");
        }
      }
    } catch (e) {
      // don't block login if bonus logic fails
    }

    return me; // return for immediate role checks by caller
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
    if (!isAdmin) return;
    try {
      const { data } = await api.get("/withdrawals/pending");
      setPendingWithdrawals(Array.isArray(data.requests) ? data.requests : []);
    } catch (e) {}
  }, [isAdmin]);

  const loadPendingUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get("/admin/users/pending");
      setPendingUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {}
  }, [isAdmin]);

  const loadPendingBookings = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get("/admin/bookings/pending");
      setPendingBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (e) {}
  }, [isAdmin]);

  const loadAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get("/admin/users");
      setAllUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {}
  }, [isAdmin]);

  const loadCompletedBookings = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get("/admin/bookings/completed");
      setCompletedBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (e) {}
  }, [isAdmin]);

  const updateAccountStatus = async (id, status) => {
    try {
      await api.patch(`/admin/users/${id}/status`, { status });
      setAllUsers(prev => prev.map(u => u._id === id ? { ...u, status } : u));
      setFeedback(`User status updated to ${status}.`);
    } catch (e) {
      setError("Failed to update user status.");
    }
  };

  const approvePayout = async (id) => {
    try {
      await api.post(`/admin/bookings/${id}/payout`);
      setCompletedBookings(prev => prev.filter(b => b._id !== id));
      setFeedback("Payout approved successfully.");
    } catch (e) {
      setError("Failed to approve payout.");
    }
  };

  const approveUser = async (id) => {
    try {
      await api.post(`/admin/users/${id}/approve`);
      setPendingUsers(prev => prev.filter(u => u._id !== id));
      setFeedback("User approved successfully.");
    } catch (e) {
      setError("Failed to approve user.");
    }
  };

  const approveBooking = async (id) => {
    try {
      await api.post(`/admin/bookings/${id}/approve`);
      setPendingBookings(prev => prev.filter(b => b._id !== id));
      setFeedback("Booking approved successfully.");
    } catch (e) {
      setError("Failed to approve booking.");
    }
  };

  const loadAdminOverview = useCallback(async () => {
    if (!isAdmin) return;

    const tryEndpoints = async (paths) => {
      for (const p of paths) {
        try {
          const res = await api.get(p);
          if (res && res.status >= 200 && res.status < 300) return res;
        } catch (err) {
          // try next
        }
      }
      return null;
    };

    try {
      // Allow runtime override via window.ADMIN_ENDPOINTS (useful for quick adaptation)
      const endpoints = (typeof window !== "undefined" && window.ADMIN_ENDPOINTS) ? window.ADMIN_ENDPOINTS : ADMIN_ENDPOINTS;

      const [bookingsRes, escrowRes, usersRes] = await Promise.all([
        tryEndpoints(endpoints.bookingsPaths),
        tryEndpoints(endpoints.escrowPaths),
        tryEndpoints(endpoints.usersPaths),
      ]);

      // Bookings this week
      let weekCount = 0;
      if (bookingsRes) {
        weekCount = bookingsRes.data?.count ?? (Array.isArray(bookingsRes.data?.bookings) ? bookingsRes.data.bookings.length : 0);
        // if returned an array at top-level, try to count week items
        if (!weekCount && Array.isArray(bookingsRes.data)) {
          const now = new Date();
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay()); // week start (Sun)
          start.setHours(0,0,0,0);
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          weekCount = bookingsRes.data.filter(b => {
            const t = new Date(b.time);
            return t >= start && t < end;
          }).length;
        }
      }

      // Escrow tokens
      const escrowAmount = escrowRes?.data?.total ?? escrowRes?.data?.amount ?? escrowRes?.data?.escrow ?? 0;

      // Active users
      let activeUsers = usersRes?.data?.count ?? usersRes?.data?.active ?? 0;
      if (!activeUsers && Array.isArray(usersRes?.data)) {
        // if endpoint returned list, count active status
        activeUsers = usersRes.data.filter(u => u.status === "active").length;
      }
      if (!activeUsers && usersRes?.data?.users && Array.isArray(usersRes.data.users)) {
        activeUsers = usersRes.data.users.filter(u => u.status === "active").length;
      }

      setAdminWeekBookings(weekCount);
      setAdminEscrowTokens(escrowAmount);
      setAdminActiveUsers(activeUsers);
    } catch (e) {
      // silent fail - admin overview is optional
    }
  }, [isAdmin]);

  useEffect(() => {
    const init = async () => {
      setError("");
      try {
        const me = await syncMe();
        const rolesFromMe = Array.isArray(me?.roles) ? me.roles : [];
        const meIsAdmin = rolesFromMe.includes("admin");
        if (meIsAdmin) {
          loadPendingUsers();
          loadPendingBookings();
          loadPendingWithdrawals();
          loadAllUsers();
          loadCompletedBookings();
          loadAdminOverview();
        }
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

  useEffect(() => {
    if (!updatingBookingId) return;

    const fetchChat = async () => {
      try {
        const { data } = await api.get(`/bookings/${updatingBookingId}/chat`);
        setChatMessages(prev => ({
          ...prev,
          [updatingBookingId]: data.messages.map(m => ({
            _id: m._id,
            bookingId: m.booking_id,
            senderId: m.sender_id,
            text: m.text,
            createdAt: m.createdAt
          }))
        }));

        // Join the socket room for this booking
        if (socketRef.current) {
          socketRef.current.emit('chat:join_booking', { bookingId: updatingBookingId });
        }
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };

    fetchChat();
  }, [updatingBookingId]);

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

  const saveProfile = async (e) => {
    e.preventDefault();
    setIsSavingInterests(true);
    const tags = interestsDraft.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    try {
      await api.patch("/auth/me", {
        name: nameDraft,
        description: descriptionDraft,
        education: educationDraft,
        certification: certificationDraft,
        experience: experienceDraft,
        interests: tags,
      });
      await syncMe();
      setFeedback("Profile information updated successfully.");
    } catch (err) {
      setError("Failed to save profile changes.");
    } finally {
      setIsSavingInterests(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    let meetingLink = "";
    if (status === 'confirmed') {
      meetingLink = window.prompt("Enter meeting link (Google Meet, Jitsi, etc.)", `https://meet.jit.si/${bookingId}`);
      if (meetingLink === null) return; // Cancelled prompt
    }

    setUpdatingBookingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status, meetingLink });
      await loadBookings();
      await syncMe();
      setFeedback(`Session status updated to ${status}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const processWithdrawal = async (requestId, status) => {
    try {
      await api.patch(`/withdrawals/${requestId}/review`, { status });
      await loadPendingWithdrawals();
      setFeedback(`Withdrawal request ${status}.`);
    } catch (err) {
      setError("Failed to process withdrawal.");
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
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
      {/* Sidebar Navigation - Fixed & Clean */}
      <aside className="lg:col-span-3 space-y-6">
        <div className="lms-card p-6 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
              <UserIcon className="w-6 h-6 text-brand-light" />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold truncate leading-tight">{user?.name || "Professional"}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Premium Tier</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={LayoutDashboard}>Overview</NavItem>
            {/* hide "My Sessions" for admin users */}
            {!isAdmin && <NavItem active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} icon={BookOpen}>My Sessions</NavItem>}
            <NavItem active={activeTab === "wallet"} onClick={() => setActiveTab("wallet")} icon={Wallet}>Wallet & Tx</NavItem>
            <NavItem active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={Settings}>Settings</NavItem>
            {isAdmin && <NavItem active={activeTab === "admin"} onClick={() => setActiveTab("admin")} icon={ShieldAlert}>Admin Panel</NavItem>}
          </nav>

          <div className="pt-6 border-t border-white/5">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Professional Support Widget */}
        <div className="bg-gradient-to-br from-brand/10 to-transparent border border-brand/20 rounded-2xl p-6 space-y-4">
          <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
            <Info className="w-4 h-4 text-brand-light" />
          </div>
          <h4 className="text-sm font-bold text-white">Platform Support</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Having issues with tokens or sessions? Our help desk is available 24/7.</p>
          <button className="text-[10px] uppercase font-bold tracking-widest text-brand-light hover:text-white transition-colors flex items-center gap-2">
            Open Help Center <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:col-span-9 space-y-8">
        {/* Breadcrumbs & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 px-8 py-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white font-outfit capitalize">{activeTab}</h2>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl">
              <Wallet className="w-3.5 h-3.5 text-brand-light" />
              <span className="text-sm font-bold text-white">{user?.walletBalance ?? 0} <span className="text-[10px] text-brand-light uppercase ml-0.5">TKN</span></span>
            </div>
            <button className="p-2.5 text-slate-400 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-all relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-[#0b0f19]" />
            </button>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        <AnimatePresence>
          {(error || feedback) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl flex items-center gap-4 border ${error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-success/10 border-success/20 text-success'}`}
            >
              {error ? <ShieldAlert className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
              <span className="text-sm font-semibold">{error || feedback}</span>
              <button onClick={() => { setError(""); setFeedback(""); }} className="ml-auto opacity-50 hover:opacity-100"><XCircle className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content Router */}
        <div className="min-h-[600px]">
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {/* Stat Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <StatCard title="Total Enrollments" value={totalBookings} icon={BookOpen} trend={8} />
                <StatCard title="Active Slots" value={upcomingBookings} icon={Clock} trend={12} color="success" />
                <StatCard title="Net Balance" value={`${user?.walletBalance ?? 0} TKN`} icon={Wallet} />
                <StatCard title="Payout Credit" value={`${user?.withdrawableBalance ?? 0} TKN`} icon={ArrowUpRight} color="success" />
                <StatCard title="Learning Hours" value="32.4h" icon={History} />
                <StatCard title="Completed Goals" value="14" icon={CheckCircle2} color="brand" />
              </div>

              {/* Admin-only overview metrics */}
              {isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <StatCard title="Bookings This Week" value={adminWeekBookings} icon={BookOpen} color="brand" />
                  <StatCard title="Tokens in Escrow" value={`${adminEscrowTokens} TKN`} icon={CreditCard} color="success" />
                  <StatCard title="Active Users" value={adminActiveUsers} icon={UserIcon} color="brand" />
                </div>
              )}

              <div className="grid xl:grid-cols-5 gap-8">
                {/* Upcoming Schedule */}
                <div className="xl:col-span-3 lms-card p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white font-outfit">Active Schedule</h3>
                    <button onClick={() => setActiveTab("bookings")} className="btn btn-ghost text-[10px] uppercase font-bold tracking-widest px-4 h-8">View Calendar</button>
                  </div>
                  <div className="space-y-4">
                    {bookings.filter(b => b.status === "confirmed").slice(0, 3).map((booking) => (
                      <div key={booking._id} className="flex items-center gap-5 p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all group">
                        <div className="w-14 h-14 rounded-xl bg-brand/10 border border-brand/20 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-brand-light uppercase">{new Date(booking.time).toLocaleString('en-US', { month: 'short' })}</span>
                          <span className="text-xl font-bold text-white leading-none mt-1">{new Date(booking.time).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{booking.gig_id?.title || "Specialized Session"}</h4>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(booking.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-2 opacity-60">·</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(booking.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </p>
                        </div>
                        <div className="badge badge-success shrink-0">Confirmed</div>
                      </div>
                    ))}
                    {bookings.filter(b => b.status === "confirmed").length === 0 && (
                      <div className="text-center py-16 opacity-30 italic text-sm border-2 border-dashed border-white/5 rounded-2xl">
                        No upcoming sessions found in your schedule.
                      </div>
                    )}
                  </div>
                </div>

                {/* Weekly Token Distribution notice */}
                <div className="xl:col-span-2 lms-card p-8 bg-gradient-to-br from-brand/10 to-brand-dark/10 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -mr-32 -mt-32 rounded-full" />
                  <div className="relative space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-brand-light" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white font-outfit mb-2">Weekly Token Giveaway</h3>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                        Every Monday, active accounts automatically receive <span className="text-brand-light font-bold">50 free tokens</span> as a bonus for being part of the Learnova community.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Next drop: Monday 00:00 UTC
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "bookings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white font-outfit">Learning Timeline</h3>
                  <p className="text-sm text-slate-500">Track and manage your upcoming and past expert sessions.</p>
                </div>
                <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                  <button className="px-4 py-2 bg-brand/10 text-brand-light text-xs font-bold rounded-lg border border-brand/20">All</button>
                  <button className="px-4 py-2 text-slate-500 text-xs font-bold hover:text-white transition-colors">Upcoming</button>
                  <button className="px-4 py-2 text-slate-500 text-xs font-bold hover:text-white transition-colors">History</button>
                </div>
              </div>

              {isLoadingBookings ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="lms-card h-28 animate-pulse" />)}
                </div>
              ) : bookings.length === 0 ? (
                <div className="lms-card py-32 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="p-6 rounded-full bg-white/5 border border-white/5">
                    <BookOpen className="w-12 h-12 text-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-white">No sessions found</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Your learning journey hasn't started yet. Browse the catalog to find your first expert.</p>
                  </div>
                  <Link to="/gigs" className="btn btn-primary h-12 px-8">Browse Catalog</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="lms-card group overflow-hidden">
                      <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex gap-6 w-full md:w-auto">
                          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-brand-light uppercase">{new Date(booking.time).toLocaleString('en-US', { month: 'short' })}</span>
                            <span className="text-2xl font-bold text-white leading-none mt-1">{new Date(booking.time).getDate()}</span>
                          </div>
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className="text-lg font-bold text-white font-outfit truncate">{booking.gig_id?.title || "Specialized Session"}</h4>
                              <div className={`badge ${
                                booking.status === 'confirmed' ? 'badge-success' :
                                booking.status === 'pending' ? 'badge-warning' :
                                'badge-danger'
                              }`}>
                                {booking.status}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(booking.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                <span className="mx-2 opacity-60">·</span>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(booking.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </span>
                              <span className="flex items-center gap-2"><UserIcon className="w-3.5 h-3.5" /> {booking.teacher_id?.name || "Verified Tutor"}</span>
                              <span className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> {booking.gig_id?.price || 0} TKN</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
                          {booking.status === 'confirmed' && (
                            <button 
                              disabled={new Date(booking.time) > new Date()}
                              onClick={() => window.open(booking.meetingLink || `https://meet.jit.si/${booking._id}`, '_blank')}
                              className={`btn h-12 flex-1 md:flex-initial px-6 shadow-xl transition-all ${
                                new Date(booking.time) > new Date() 
                                ? 'bg-slate-800 border-white/5 text-slate-500 cursor-not-allowed' 
                                : 'bg-success border-success-dark text-white shadow-success/10'
                              }`}
                            >
                              <Video className="w-4 h-4" /> 
                              {new Date(booking.time) > new Date() ? 'Starts Soon' : 'Join Live'}
                            </button>
                          )}

                          {/* Tutor: Mark session completed when confirmed */}
                          {String(booking.teacher_id?._id || booking.teacher_id) === String(myUserId) && booking.status === 'confirmed' && (
                            <button
                              onClick={() => {
                                if (!window.confirm('Mark this session as completed?')) return;
                                updateBookingStatus(booking._id, 'completed');
                              }}
                              className="btn h-12 px-6 bg-brand/10 border border-brand/20 text-white hover:bg-brand/20 transition-all"
                            >
                              Mark Completed
                            </button>
                          )}
                          
                          {isTeacher && booking.status === 'pending' && String(booking.teacher_id?._id || booking.teacher_id) === myUserId && (
                            <div className="flex gap-2 flex-1 md:flex-initial">
                              <button 
                                onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                                className="btn btn-primary h-12 flex-1 px-4 bg-success border-success-dark"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                                className="btn btn-secondary h-12 flex-1 px-4 text-red-400 border-red-500/10"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          <button 
                            className={`p-3.5 rounded-xl border transition-all ${updatingBookingId === booking._id ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                            onClick={() => setUpdatingBookingId(booking._id === updatingBookingId ? null : booking._id)}
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Chat Drawer - Standardized UX */}
                      <AnimatePresence>
                        {updatingBookingId === booking._id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-black/20 border-t border-white/5 overflow-hidden"
                          >
                            <div className="p-8 space-y-6">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="w-4 h-4 text-brand-light" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secure Session Chat</span>
                              </div>
                              <div className="h-64 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                {(chatMessages[booking._id] || []).map((msg, i) => (
                                  <div key={i} className={`flex ${msg.senderId === myUserId ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                      msg.senderId === myUserId ? 'bg-brand text-white' : 'bg-white/10 text-slate-300'
                                    }`}>
                                      {msg.text}
                                    </div>
                                  </div>
                                ))}
                                {(chatMessages[booking._id] || []).length === 0 && (
                                  <div className="text-center text-slate-600 text-xs py-16 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                      <MessageSquare className="w-5 h-5 opacity-20" />
                                    </div>
                                    Start a conversation with your tutor.
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-3">
                                <input 
                                  type="text"
                                  value={chatInputs[booking._id] || ""}
                                  onChange={(e) => setChatInputs(prev => ({ ...prev, [booking._id]: e.target.value }))}
                                  placeholder="Communicate with expert..."
                                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-brand transition-all"
                                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(booking._id)}
                                />
                                <button 
                                  onClick={() => sendChatMessage(booking._id)}
                                  className="btn btn-primary h-12 px-6"
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
              <div className="grid xl:grid-cols-2 gap-8">
                {/* Balance Hub */}
                <div className="bg-gradient-to-br from-brand/20 to-brand-dark/10 border border-brand/30 rounded-3xl p-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
                  <div className="space-y-8 relative">
                    <div className="space-y-1">
                      <p className="text-brand-light text-xs font-bold uppercase tracking-[0.2em]">Available Funds</p>
                      <div className="flex items-end gap-3">
                        <span className="text-6xl font-extrabold text-white font-outfit tracking-tighter">{user?.walletBalance ?? 0}</span>
                        <span className="text-brand-light font-bold text-sm mb-3 uppercase">Learner Tokens</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Lifetime Spent</p>
                        <p className="text-white font-bold text-lg">1,240 <span className="text-[10px] opacity-50">TKN</span></p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Lifetime Earned</p>
                        <p className="text-success font-bold text-lg">+850 <span className="text-[10px] opacity-50">TKN</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deposit Hub */}
                <div className="lms-card p-10 flex flex-col justify-between">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white font-outfit">Top-Up Wallet</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => addTokens(100)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white p-5 rounded-2xl transition-all group">
                        <p className="text-xs font-bold text-slate-500 group-hover:text-white transition-colors mb-1">Starter Pack</p>
                        <p className="text-xl font-bold">100 <span className="text-[10px] opacity-50 uppercase">TKN</span></p>
                      </button>
                      <button onClick={() => addTokens(500)} className="bg-brand/10 hover:bg-brand/20 border border-brand/20 text-white p-5 rounded-2xl transition-all group shadow-lg shadow-brand/5">
                        <p className="text-xs font-bold text-brand-light mb-1">Expert Bundle</p>
                        <p className="text-xl font-bold">500 <span className="text-[10px] opacity-50 uppercase">TKN</span></p>
                      </button>
                    </div>
                  </div>
                  <button onClick={() => addTokens(1000)} className="w-full btn btn-secondary h-14 mt-6 border-dashed hover:border-brand transition-all">Custom Amount (Contact Sales)</button>
                </div>
              </div>

              {/* Professional Transaction Table */}
              <div className="lms-card overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white font-outfit">Financial Ledger</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input type="text" placeholder="Filter ledger..." className="bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-brand w-48" />
                  </div>
                </div>
                {isLoadingTx ? (
                  <div className="p-24 text-center">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-brand rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Decrypting Transactions...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5">Details</th>
                          <th className="px-8 py-5">Source</th>
                          <th className="px-8 py-5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {transactions.map((tx) => (
                          <tr key={tx._id} className="text-sm hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-6">
                              <div className={`badge ${tx.operation === 'DEBIT' ? 'badge-danger' : 'badge-success'} text-[9px]`}>
                                {tx.operation}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-white font-semibold group-hover:text-brand-light transition-colors">{tx.description || "Platform Utility"}</p>
                              <p className="text-[10px] text-slate-500 font-medium mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">{tx.referenceType}</span>
                            </td>
                            <td className={`px-8 py-6 text-right font-extrabold ${tx.operation === 'DEBIT' ? 'text-slate-400' : 'text-success'}`}>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-10 pb-20">
              <div className="lms-card p-10 space-y-10">
                <div className="flex flex-col sm:flex-row items-center gap-8 pb-10 border-b border-white/5">
                  <div className="w-28 h-28 rounded-3xl bg-brand/10 border-2 border-brand/40 flex items-center justify-center relative group shrink-0">
                    <UserIcon className="w-12 h-12 text-brand-light" />
                    <div className="absolute inset-0 bg-brand/40 opacity-0 group-hover:opacity-100 rounded-3xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left space-y-4">
                    <div>
                      <h3 className="text-3xl font-extrabold text-white font-outfit tracking-tight">{user?.name}</h3>
                      <p className="text-slate-500 text-sm font-medium mt-1">{user?.email}</p>
                    </div>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {roles.map(role => (
                        <span key={role} className="px-3 py-1 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg">{role}</span>
                      ))}
                      <button className="px-3 py-1 bg-brand/10 border border-brand/20 text-brand-light text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-1.5 hover:bg-brand/20 transition-all">
                        <Plus className="w-3 h-3" /> Upgrade
                      </button>
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-8">
                  {/* Full Name & Education */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                      <input 
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="input-field h-12"
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Education Background</label>
                      <input 
                        type="text"
                        value={educationDraft}
                        onChange={(e) => setEducationDraft(e.target.value)}
                        className="input-field h-12"
                        placeholder="e.g. B.Sc. in Computer Science from MIT"
                      />
                    </div>
                  </div>

                  {/* Certifications & Experience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Certifications</label>
                      <input 
                        type="text"
                        value={certificationDraft}
                        onChange={(e) => setCertificationDraft(e.target.value)}
                        className="input-field h-12"
                        placeholder="e.g. AWS Certified Solutions Architect, PMP"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Professional Experience</label>
                      <input 
                        type="text"
                        value={experienceDraft}
                        onChange={(e) => setExperienceDraft(e.target.value)}
                        className="input-field h-12"
                        placeholder="e.g. 5+ years of Engineering at Google, Lead at Stripe"
                      />
                    </div>
                  </div>

                  {/* Bio / Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Professional Bio / Description</label>
                    <textarea 
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      className="input-field resize-none py-3"
                      rows={3}
                      placeholder="Introduce yourself to prospective students and present your expertise..."
                    />
                  </div>

                  {/* Expertise / Interests */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Expertise & Interests</label>
                        <p className="text-[11px] text-slate-500">List tags separated by commas to refine your search recommendations.</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{interestsDraft.split(',').filter(Boolean).length} tags</span>
                    </div>
                    <textarea 
                      value={interestsDraft}
                      onChange={(e) => setInterestsDraft(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-brand transition-all resize-none font-medium leading-relaxed"
                      rows={3}
                      placeholder="e.g. distributed systems, UI/UX, behavioral psychology, rust lang"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={isSavingInterests}
                      className="btn btn-primary h-14 px-12 text-base font-bold shadow-xl shadow-brand/20"
                    >
                      {isSavingInterests ? "Saving Configuration..." : "Save Profile Details"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Professional Risk Area */}
              <div className="p-10 bg-red-500/[0.02] border border-red-500/10 rounded-3xl space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  </div>
                  <h4 className="text-red-400 font-bold uppercase tracking-widest text-xs">Security & Privacy</h4>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-white font-bold text-sm">Deactivate Professional Account</p>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                      This will permanently delete your records, transaction history, and wallet balance. 
                      This action cannot be undone.
                    </p>
                  </div>
                  <button className="btn btn-secondary text-red-400 border-red-500/20 hover:bg-red-500/10 h-11 px-8">Delete Account</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "admin" && isAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
                {["accounts", "users", "payouts", "withdrawals"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAdminSubTab(tab)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${adminSubTab === tab ? 'bg-brand/10 text-brand-light border border-brand/20 shadow-lg shadow-brand/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {adminSubTab === "accounts" && (
                <div className="lms-card p-8 space-y-6">
                  <h4 className="text-xl font-bold text-white font-outfit">Pending Registrations</h4>
                  {pendingUsers.length === 0 ? (
                    <div className="py-20 text-center opacity-20 italic">No users awaiting approval.</div>
                  ) : (
                    <div className="space-y-4">
                      {pendingUsers.map(u => (
                        <div key={u._id} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center gap-6">
                          <div>
                            <p className="text-sm font-bold text-white">{u.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{u.email}</p>
                          </div>
                          <button onClick={() => approveUser(u._id)} className="btn btn-primary h-10 px-6 bg-success border-success text-[10px]">Approve Account</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {adminSubTab === "users" && (
                <div className="lms-card p-8 space-y-6">
                  <h4 className="text-xl font-bold text-white font-outfit">User Management</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Roles</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers.map(u => (
                          <tr key={u._id} className="text-xs hover:bg-white/[0.02]">
                            <td className="px-4 py-4">
                              <p className="text-white font-bold">{u.name}</p>
                              <p className="text-slate-500">{u.email}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex gap-1">
                                {u.roles.map(r => <span key={r} className="px-2 py-0.5 bg-white/5 rounded text-[8px]">{r}</span>)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                u.status === 'active' ? 'bg-success/10 text-success' : 
                                u.status === 'restricted' ? 'bg-warning/10 text-warning' : 
                                'bg-slate-500/10 text-slate-500'
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {u.status !== 'active' && <button onClick={() => updateAccountStatus(u._id, 'active')} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-all"><CheckCircle2 className="w-4 h-4" /></button>}
                                {u.status === 'active' && <button onClick={() => updateAccountStatus(u._id, 'restricted')} className="p-1.5 text-warning hover:bg-warning/10 rounded-lg transition-all"><ShieldAlert className="w-4 h-4" /></button>}
                                <button onClick={() => updateAccountStatus(u._id, 'deleted')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><XCircle className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



              {adminSubTab === "payouts" && (
                <div className="lms-card p-8 space-y-6">
                  <h4 className="text-xl font-bold text-white font-outfit">Session Payout Approvals</h4>
                  <p className="text-xs text-slate-500">Review completed sessions and release escrowed tokens to tutors.</p>
                  {completedBookings.length === 0 ? (
                    <div className="py-20 text-center opacity-20 italic">No completed sessions awaiting payout.</div>
                  ) : (
                    <div className="space-y-4">
                      {completedBookings.map(b => (
                        <div key={b._id} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center gap-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white">{b.gig_id?.title || "Session"}</p>
                              <span className="badge badge-success text-[8px]">COMPLETED</span>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                              Tutor: <span className="text-white">{b.teacher_id?.name}</span> | Amount: <span className="text-brand-light">{b.gig_id?.price} TKN</span>
                            </p>
                          </div>
                          <button onClick={() => approvePayout(b._id)} className="btn btn-primary h-10 px-6 bg-success border-success text-[10px]">Approve Payout</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {adminSubTab === "withdrawals" && (
                <div className="lms-card p-8 space-y-6">
                  <h4 className="text-xl font-bold text-white font-outfit">Payout Requests</h4>
                  {pendingWithdrawals.length === 0 ? (
                    <div className="py-20 text-center opacity-20 italic">No payout requests pending.</div>
                  ) : (
                    <div className="space-y-4">
                      {pendingWithdrawals.map(w => (
                        <div key={w._id} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                              <ArrowUpRight className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{w.teacher_id?.name || "Tutor"}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{w.amount} tokens</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => processWithdrawal(w._id, 'approved')} className="btn btn-primary h-10 px-4 bg-success border-success text-[10px]">Release</button>
                            <button onClick={() => processWithdrawal(w._id, 'rejected')} className="btn btn-secondary h-10 px-4 text-red-400 border-red-500/20 text-[10px]">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
