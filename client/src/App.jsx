import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  User as UserIcon, 
  LayoutDashboard, 
  Search, 
  Bell, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Settings 
} from "lucide-react";
import { useState, useEffect } from "react";
import api from "./api/axios";
import { createSocketClient } from "./realtime/socket";
import { getUserId } from "./utils/user";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import GigsPage from "./pages/GigsPage";

const NavLink = ({ to, children, icon: Icon, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active 
      ? 'bg-brand/10 text-brand-light' 
      : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {children}
  </Link>
);

function App() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("AudioContext playback failed", e);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  const loadNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const token = localStorage.getItem("token");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  })();

  useEffect(() => {
    if (!token || !user) return undefined;
    
    loadNotifications();

    const myUserId = getUserId(user);
    if (!myUserId) return undefined;

    const socket = createSocketClient();
    socket.emit("join:room", `user:${myUserId}`);
    
    const handleNewNotif = (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      if (soundEnabled) {
        playNotificationSound();
      }
    };
    
    socket.on("notification:new", handleNewNotif);

    return () => {
      socket.off("notification:new", handleNewNotif);
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 font-inter selection:bg-brand/30">
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/20 transition-transform group-hover:scale-105">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold font-outfit text-white leading-none tracking-tight">Learnova</h1>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.1em] mt-0.5">LMS Platform</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" active={location.pathname === "/"}>Home</NavLink>
            <NavLink to="/gigs" active={location.pathname === "/gigs"} icon={Search}>Explore</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center cursor-pointer shrink-0"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode (Projector)"}
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 text-brand-light" />
              ) : (
                <Sun className="w-4 h-4 text-brand-light" />
              )}
            </button>

            {token ? (
              <div className="flex items-center gap-2 lg:gap-4 pl-4 border-l border-white/10">
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 hover:text-white transition-colors rounded-xl bg-white/5 hover:bg-white/10 border relative cursor-pointer flex items-center justify-center shrink-0 ${showNotifications ? 'text-white border-brand' : 'text-slate-400 border-white/10'}`}
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border border-dark-bg animate-pulse" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-[-60px] sm:right-0 mt-3 w-80 sm:w-96 bg-[#0f1422] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                      >
                        {/* Dropdown Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-brand-light animate-bounce" />
                            <h4 className="font-bold text-white text-sm font-outfit">
                              Notifications ({notifications.filter(n => !n.isRead).length})
                            </h4>
                          </div>
                          <button 
                            onClick={markAllNotificationsAsRead}
                            className="text-[10px] text-brand-light hover:text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Mark all as read
                          </button>
                        </div>

                        {/* Scrollable Notification List */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 pr-0.5">
                          {notifications.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs italic flex flex-col items-center gap-3">
                              <Bell className="w-8 h-8 opacity-20" />
                              No activities yet.
                            </div>
                          ) : (
                            notifications.map((notif) => {
                              const isUnread = !notif.isRead;
                              let iconBg = "bg-brand/10 border-brand/20 text-brand-light";
                              let IconComponent = Bell;

                              if (notif.type === 'rating_received') {
                                iconBg = "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
                                IconComponent = Sparkles;
                              } else if (notif.type === 'booking_approved') {
                                iconBg = "bg-success/10 border-success/20 text-success";
                                IconComponent = CheckCircle2;
                              } else if (notif.type === 'booking_cancelled') {
                                iconBg = "bg-red-500/10 border-red-500/20 text-red-400";
                                IconComponent = XCircle;
                              } else if (notif.type === 'booking_reminder') {
                                iconBg = "bg-blue-500/10 border-blue-500/20 text-blue-400";
                                IconComponent = Clock;
                              } else if (notif.type === 'booking_completed') {
                                iconBg = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
                                IconComponent = BookOpen;
                              }

                              return (
                                <div 
                                  key={notif._id} 
                                  onClick={() => markNotificationAsRead(notif._id)}
                                  className={`p-4 flex gap-3.5 items-start hover:bg-white/[0.03] transition-all cursor-pointer ${isUnread ? 'bg-white/[0.01]' : 'opacity-70'}`}
                                >
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${iconBg}`}>
                                    <IconComponent className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-0.5 text-left">
                                    <p className={`text-xs text-slate-300 leading-normal ${isUnread ? 'font-semibold text-white' : 'font-medium'}`}>{notif.message}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{formatTimeAgo(notif.createdAt)}</p>
                                  </div>
                                  <div className="flex items-center justify-center shrink-0 pt-1">
                                    {isUnread && (
                                      <span className="w-2 h-2 bg-brand rounded-full" />
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Dropdown Footer Controls (Fiverr Style) */}
                        <div className="p-3 bg-[#0a0d18] border-t border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            {/* Sound toggler */}
                            <button 
                              onClick={() => setSoundEnabled(!soundEnabled)}
                              title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
                              className={`p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer ${soundEnabled ? 'text-brand-light' : 'text-slate-500'}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {soundEnabled ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm12.364-5.636l-3.536 3.536m0-3.536l3.536 3.536" />
                                )}
                              </svg>
                            </button>

                            {/* Settings indicator */}
                            <Link 
                              to="/dashboard"
                              onClick={() => {
                                setShowNotifications(false);
                              }}
                              title="Notification Settings"
                              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all flex items-center justify-center"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                          
                          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                            Live Feed
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Link to="/dashboard" className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <div className="hidden lg:block text-right">
                    <p className="text-xs font-bold text-white leading-none">{user?.name || "User"}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                      {Array.isArray(user?.roles) && user.roles.includes("admin") ? "Admin" :
                       Array.isArray(user?.roles) && user.roles.includes("instructor") ? "Instructor" :
                       "Learner"}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center border border-brand/30">
                    <UserIcon className="w-3.5 h-3.5 text-brand-light" />
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-white px-4 py-2 transition-colors">Login</Link>
                <Link to="/register" className="btn btn-primary h-10">Sign Up</Link>
              </div>
            )}
            <button 
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden mt-4 pb-4 space-y-1 overflow-hidden"
            >
              <NavLink to="/" active={location.pathname === "/"}>Home</NavLink>
              <NavLink to="/gigs" active={location.pathname === "/gigs"} icon={Search}>Explore Gigs</NavLink>
              {token && <NavLink to="/dashboard" active={location.pathname === "/dashboard"} icon={LayoutDashboard}>Dashboard</NavLink>}
              {!token && (
                <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                  <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-400">Login</Link>
                  <Link to="/register" className="btn btn-primary w-full">Sign Up Free</Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-12 min-h-[calc(100vh-140px)]">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<LoginPage />} />
            <Route path="/gigs" element={<GigsPage />} />
            <Route
              path="/dashboard"
              element={token ? <DashboardPage /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <footer className="border-t border-white/5 py-12 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BookOpen className="text-brand w-6 h-6" />
              <span className="text-xl font-bold font-outfit text-white">Learnova</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Empowering experts and learners through a transparent token-based marketplace.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-[10px]">Platform</h4>
            <ul className="space-y-2 text-slate-500">
              <li><Link to="/gigs" className="hover:text-brand transition-colors">Find Tutors</Link></li>
              <li><Link to="/register" className="hover:text-brand transition-colors">Become a Teacher</Link></li>
              <li><Link to="/" className="hover:text-brand transition-colors">How it Works</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-[10px]">Support</h4>
            <ul className="space-y-2 text-slate-500">
              <li><a href="#" className="hover:text-brand transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Token Policy</a></li>
              <li><a href="#" className="hover:text-brand transition-colors">Privacy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-[10px]">Newsletter</h4>
            <div className="flex gap-2">
              <input type="email" placeholder="Email" className="input-field h-10 py-0" />
              <button className="btn btn-primary h-10 px-4">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-xs text-slate-600">
          <p>© 2026 Learnova LMS. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Twitter</a>
            <a href="#" className="hover:text-white">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;