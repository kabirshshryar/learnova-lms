import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  Filter,
  User,
  ExternalLink,
  ArrowRight,
  Star
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="lms-card flex flex-col h-full hover:border-brand/40 group overflow-hidden"
    >
      <div className="p-6 flex-grow space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white group-hover:text-brand-light transition-colors leading-tight">{gig.title}</h3>
            <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
              <div className="relative flex items-center shrink-0">
                {gig.teacher_id?.profilePicture ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                    <img src={gig.teacher_id.profilePicture} alt={gig.teacher_id.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
                {gig.teacher_id?.isOnline && (
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-dark-bg animate-pulse" title="Available now for consultation" />
                )}
              </div>
              <span>{gig.teacher_id?.name || "Verified Tutor"}</span>
              <span className="opacity-40">·</span>
              <div className="flex items-center gap-1 text-yellow-500 font-semibold" title="Session average rating">
                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                <span>{gig.rating > 0 ? gig.rating.toFixed(1) : "New"}</span>
              </div>
              {gig.teacher_id?.isOnline && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider animate-pulse ml-1">
                  Available Now
                </span>
              )}
            </div>
          </div>
          {isTeacher && owner && (
            <button
              onClick={() => onDelete(gig._id)}
              disabled={deletingId === gig._id}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand/10 border border-brand/20 text-brand-light text-[10px] font-bold uppercase tracking-wider">
            <Coins className="w-3 h-3" /> {gig.price} TKN
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <Clock className="w-3 h-3" /> {gig.duration} MIN
          </div>
          {variant === "recommended" && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Recommended
            </div>
          )}
        </div>

        <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
          {gig.description}
        </p>

        {gig.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {gig.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] font-bold text-slate-500 border border-white/5 px-2 py-0.5 rounded uppercase tracking-widest">
                #{tag}
              </span>
            ))}
            {gig.tags.length > 3 && <span className="text-[9px] font-bold text-slate-600">+{gig.tags.length - 3}</span>}
          </div>
        )}

        {(gig.teacher_id?.education || gig.teacher_id?.certification || gig.teacher_id?.experience || gig.teacher_id?.description) && (
          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="text-[10px] font-bold text-brand-light uppercase tracking-wider">Tutor Qualifications</div>
            
            {gig.teacher_id?.description && (
              <p className="text-slate-400 text-xs italic leading-relaxed line-clamp-2">
                "{gig.teacher_id.description}"
              </p>
            )}

            <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-400">
              {gig.teacher_id?.education && (
                <div className="flex items-start gap-1.5">
                  <span className="text-slate-500 font-bold shrink-0">Education:</span>
                  <span className="font-medium text-slate-300 leading-snug">{gig.teacher_id.education}</span>
                </div>
              )}
              {gig.teacher_id?.experience && (
                <div className="flex items-start gap-1.5">
                  <span className="text-slate-500 font-bold shrink-0">Experience:</span>
                  <span className="font-medium text-slate-300 leading-snug">{gig.teacher_id.experience}</span>
                </div>
              )}
              {gig.teacher_id?.certification && (
                <div className="flex items-start gap-1.5">
                  <span className="text-slate-500 font-bold shrink-0">Certifications:</span>
                  <span className="font-medium text-slate-300 leading-snug">{gig.teacher_id.certification}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-5 bg-white/[0.02] border-t border-white/5 mt-auto">
        {!token ? (
          <Link to="/login" className="btn btn-secondary w-full text-xs py-2.5 group/btn">
            Login to Book <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        ) : !isStudent ? (
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center py-2.5 bg-white/5 rounded-lg border border-white/5 italic">
            Learner profile required
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative group/input">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-brand transition-colors" />
              <input 
                type="datetime-local"
                value={bookingTime || ""}
                onChange={(e) => onTimeChange(gig._id, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-[11px] text-white focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
              />
            </div>
            <button 
              onClick={() => onBook(gig._id)}
              className="w-full btn btn-primary h-11 text-xs"
            >
              Reserve Slot
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const fetchGigs = useCallback(async (query = "") => {
    setIsLoading(true);
    setError("");
    try {
      const params = {};
      if (query.trim()) {
        params.search = query.trim();
      }
      const { data } = await api.get("/gigs", { params });
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
    const delayDebounceFn = setTimeout(() => {
      fetchGigs(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchGigs]);

  useEffect(() => {
    fetchRecommendedGigs();
  }, [fetchRecommendedGigs]);

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
      setNotice("Gig published to catalog successfully.");
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
      setNotice("Gig removed from catalog.");
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

  const onBookGig = async (gigId) => {
    const selectedTime = bookingTimes[gigId];
    setNotice("");
    setError("");

    if (!token) {
      setError("Authorization required. Please log in.");
      return;
    }

    if (!isStudent) {
      setError("Learner profile required to book sessions.");
      return;
    }

    if (!selectedTime) {
      setError("Please specify a date and time for the session.");
      return;
    }

    try {
      await api.post("/bookings", {
        gig_id: gigId,
        time: new Date(selectedTime).toISOString(),
      });
      setNotice("Reservation confirmed. Tokens held in escrow.");
      setBookingTimes((prev) => ({ ...prev, [gigId]: "" }));
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      await fetchRecommendedGigs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete booking.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-8 border-b border-white/5">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand-light text-[10px] font-bold uppercase tracking-widest">
            Expert Catalog
          </div>
          <h2 className="text-4xl font-extrabold text-white font-outfit tracking-tight leading-none">Find Your Next Tutor</h2>
          <p className="text-slate-500 max-w-2xl text-base leading-relaxed">
            Discover verified experts specialized in high-demand skills. Book live, 1-on-1 sessions 
            protected by our secure token escrow system.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  fetchGigs(searchQuery);
                }
              }}
              placeholder="Search skills, tutors..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand transition-all"
            />
          </div>
          <button 
            onClick={() => fetchGigs(searchQuery)}
            className="btn btn-primary h-[46px] px-5 text-xs font-bold shadow-lg shadow-brand/20 flex items-center gap-2"
          >
            Search
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(error || notice) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-4 border ${
              error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-success/10 border-success/20 text-success'
            }`}
          >
            {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-semibold">{error || notice}</span>
            <button onClick={() => { setError(""); setNotice(""); }} className="ml-auto opacity-50 hover:opacity-100">
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <aside className="lg:col-span-4 space-y-8 sticky top-28">
          {isTeacher ? (
            <div className="lms-card p-8 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Plus className="text-brand-light w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white font-outfit leading-tight">Publish a Session</h3>
              </div>

              <form onSubmit={onCreateGig} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Gig Title</label>
                  <input 
                    name="title" 
                    value={gigForm.title} 
                    onChange={onGigInputChange} 
                    required 
                    placeholder="e.g. Advanced Node.js Patterns"
                    className="input-field h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Price (TKN)</label>
                    <input 
                      type="number"
                      name="price" 
                      value={gigForm.price} 
                      onChange={onGigInputChange} 
                      required 
                      className="input-field h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Duration (M)</label>
                    <input 
                      type="number"
                      name="duration" 
                      value={gigForm.duration} 
                      onChange={onGigInputChange} 
                      required 
                      className="input-field h-12"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Categories (comma sep)</label>
                  <input 
                    name="tags" 
                    value={gigForm.tags} 
                    onChange={onGigInputChange} 
                    placeholder="backend, devops, scale"
                    className="input-field h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Description</label>
                  <textarea 
                    name="description" 
                    value={gigForm.description} 
                    onChange={onGigInputChange} 
                    required 
                    rows={4}
                    placeholder="What will you teach in this session?"
                    className="input-field resize-none py-3"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={creatingGig}
                  className="w-full btn btn-primary h-12 text-sm shadow-lg shadow-brand/20 active:scale-95 disabled:opacity-50"
                >
                  {creatingGig ? "Publishing..." : "Create Gig Offer"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-brand/10 to-brand-dark/5 border border-brand/20 rounded-3xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-white font-outfit leading-tight">Start Teaching?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Unlock instructor features to publish your own sessions and earn tokens. 
                Enable instructor mode in your profile settings.
              </p>
              <Link to="/dashboard" className="btn btn-secondary w-full text-xs">Manage Profile</Link>
            </div>
          )}

          {/* Quick Help / Info */}
          <div className="lms-card p-6 flex items-start gap-4">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
              <AlertCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Booking Policy</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Tokens are held in escrow until you confirm the session is complete. 
                Refunds are automated if the teacher cancels.
              </p>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-8 space-y-16">
          {!isLoading && recommendedGigs.length > 0 && !searchQuery.trim() && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-white font-outfit">Top Matches</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </section>
          )}

          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-white font-outfit">All Available Sessions</h3>
              </div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 4, 5].map(i => (
                  <div key={i} className="lms-card h-[320px] animate-pulse bg-white/[0.02]" />
                ))}
              </div>
            ) : gigs.length === 0 ? (
              <div className="lms-card py-24 flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                  <AlertCircle className="w-12 h-12 text-slate-700" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-white">No sessions available</h4>
                  <p className="text-slate-500 text-sm">Check back later or become the first tutor in this category.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </section>
        </div>
      </div>
    </div>
  );
}

export default GigsPage;
