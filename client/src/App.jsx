import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, User as UserIcon, LayoutDashboard, Search, Bell, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
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
  const token = localStorage.getItem("token");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  })();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 font-inter selection:bg-brand/30">
      {/* Professional Header */}
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" active={location.pathname === "/"}>Home</NavLink>
            <NavLink to="/gigs" active={location.pathname === "/gigs"} icon={Search}>Explore</NavLink>
            {token && (
              <NavLink to="/dashboard" active={location.pathname === "/dashboard"} icon={LayoutDashboard}>Dashboard</NavLink>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {token ? (
              <div className="flex items-center gap-2 lg:gap-4 pl-4 border-l border-white/10">
                <button className="hidden sm:flex p-2 text-slate-400 hover:text-white transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                <Link to="/dashboard" className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <div className="hidden lg:block text-right">
                    <p className="text-xs font-bold text-white leading-none">{user?.name || "User"}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Learner</p>
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
            
            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
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

      {/* Main Content with Route Transitions */}
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

      {/* Simple Professional Footer */}
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