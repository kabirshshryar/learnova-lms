import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Plus, 
  Trash2, 
  Clock, 
  Tag as TagIcon, 
  Coins, 
  Sparkles, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import api from "../api/axios";
import { getUserId } from "../utils/user";

function teacherIdStr(gig) {
  const t = gig.teacher_id;
  if (!t) return "";
  return t._id ? String(t._id) : String(t);
}

const GigCard = ({ gig, variant, token, isStudent, isTeacher, myId, onBook, onDelete, bookingTime, onTimeChange, deletingId }) => {
  const owner = myId && teacherIdStr(gig) === String(myId);

  return (
    <motion.article 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-full hover:bg-white/10 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-brand-light transition-colors">{gig.title}</h3>
        {isTeacher && owner && (
          <button
            onClick={() => onDelete(gig._id)}
            disabled={deletingId === gig._id}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand-light text-xs font-bold">
          <Coins className="w-3.5 h-3.5" /> {gig.price} tokens
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold">
          <Clock className="w-3.5 h-3.5" /> {gig.duration} mins
        </div>
        {variant === "recommended" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Recommended
          </div>
        )}
      </div>

      <p className="text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
        {gig.description}
      </p>

      {gig.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {gig.tags.map(tag => (
            <span key={tag} className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-white/5 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-6 border-t border-white/5">
        {!token ? (
          <Link to="/login" className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all">
            Login to Book <ChevronRight className="w-4 h-4" />
          </Link>
        ) : !isStudent ? (
          <div className="text-xs text-slate-500 italic text-center">Student account required to book</div>
        ) : (
          <div className="space-y-4">
            <div className="relative group/input">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-brand transition-colors" />
              <input 
                type="datetime-local"
                value={bookingTime || ""}
                onChange={(e) => onTimeChange(gig._id, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
              />
            </div>
            <button 
              onClick={() => onBook(gig._id)}
              className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Book Session
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
};

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
      setNotice("Gig deleted successfully.");
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

    if (!token) {
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
      setNotice("Booking created! Tokens moved to escrow.");
      setBookingTimes((prev) => ({ ...prev, [gigId]: "" }));
      await refreshSession();
      await fetchRecommendedGigs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to create booking.");
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white font-outfit">Expert Tutor Catalog</h2>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
            Browse specialized tutoring sessions and live classes. Book with tokens to start learning 
            directly from the world's top experts.
          </p>
        </div>
        <Link 
          to={token ? "/dashboard" : "/login"} 
          className="flex items-center gap-2 px-6 py-3 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand-light rounded-xl font-bold transition-all whitespace-nowrap"
        >
          {token ? "Dashboard" : "Login to Book"} <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-medium">
            <AlertCircle className="w-5 h-5" /> {error}
          </motion.div>
        )}
        {notice && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-success/10 border border-success/20 rounded-2xl flex items-center gap-3 text-success text-sm font-medium">
            <CheckCircle2 className="w-5 h-5" /> {notice}
          </motion.div>
        )}
      </div>

      {/* Create Gig Form (For Teachers) */}
      {isTeacher && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 p-8 rounded-3xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
              <Plus className="text-brand-light w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white font-outfit">Create a Session</h3>
          </div>

          <form onSubmit={onCreateGig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Session Title</label>
              <input 
                name="title" 
                value={gigForm.title} 
                onChange={onGigInputChange} 
                required 
                minLength={3} 
                placeholder="e.g., Python Advanced Data Structures"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Price (Tokens)</label>
                <input 
                  type="number"
                  name="price" 
                  value={gigForm.price} 
                  onChange={onGigInputChange} 
                  required 
                  min={0}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Duration (Min)</label>
                <input 
                  type="number"
                  name="duration" 
                  value={gigForm.duration} 
                  onChange={onGigInputChange} 
                  required 
                  min={1}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tags (comma separated)</label>
              <input 
                name="tags" 
                value={gigForm.tags} 
                onChange={onGigInputChange} 
                placeholder="python, backend, dev"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Session Description</label>
              <textarea 
                name="description" 
                value={gigForm.description} 
                onChange={onGigInputChange} 
                required 
                minLength={10}
                rows={3}
                placeholder="Describe what students will learn..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={creatingGig}
                className="px-8 py-3 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold shadow-lg shadow-brand/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {creatingGig ? "Publishing..." : "Publish Session"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Recommended Section */}
      {!isLoading && recommendedGigs.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="text-xl font-bold text-white font-outfit">Recommended For You</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedGigs.map((gig) => (
              <GigCard 
                key={gig._id} 
                gig={gig} 
                variant="recommended" 
                token={token} 
                isStudent={isStudent} 
                isTeacher={isTeacher}
                myId={myId}
                bookingTime={bookingTimes[gig._id]}
                onTimeChange={onBookingTimeChange}
                onBook={onBookGig}
                onDelete={onDeleteGig}
                deletingId={deletingGigId}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Gigs Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-500" />
          <h3 className="text-xl font-bold text-white font-outfit">All Tutoring Offers</h3>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-white/5 border-t-brand rounded-full animate-spin" />
            <p className="text-slate-500 animate-pulse">Loading amazing sessions...</p>
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
            <p className="text-slate-400">No sessions available right now. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              <GigCard 
                key={gig._id} 
                gig={gig} 
                variant="all" 
                token={token} 
                isStudent={isStudent} 
                isTeacher={isTeacher}
                myId={myId}
                bookingTime={bookingTimes[gig._id]}
                onTimeChange={onBookingTimeChange}
                onBook={onBookGig}
                onDelete={onDeleteGig}
                deletingId={deletingGigId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GigsPage;
