import { Link, Navigate, Route, Routes } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, User as UserIcon, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import GigsPage from "./pages/GigsPage";

const NavLink = ({ to, children, icon: Icon }) => (
  <Link 
    to={to} 
    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
  >
    {Icon && <Icon className="w-4 h-4" />}
    {children}
  </Link>
);

function App() {
  const token = localStorage.getItem("token");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  })();

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 font-inter selection:bg-brand/30">
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-outfit text-white tracking-tight">Learnova</h1>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Marketplace</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/gigs">Tutors</NavLink>
            {token && <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>}
            {!token && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
                <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-white px-4 py-2 transition-colors">Login</Link>
                <Link to="/register" className="bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand/20 transition-all active:scale-95">Sign Up</Link>
              </div>
            )}
            {token && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-brand-light/20 flex items-center justify-center">
                    <UserIcon className="w-3 h-3 text-brand-light" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">{user?.name || "User"}</span>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <Routes>
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
    </div>
  );
}

export default App;