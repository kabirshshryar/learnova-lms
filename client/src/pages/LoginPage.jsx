import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Tag, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import api from "../api/axios";

const InputField = ({ label, icon: Icon, error, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">{label}</label>
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <input 
        {...props}
        className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-4 transition-all ${
          error 
          ? 'border-red-500/50 focus:ring-red-500/10' 
          : 'border-white/10 focus:border-brand focus:ring-brand/10'
        }`}
      />
    </div>
    {error && <p className="text-[10px] text-red-400 font-medium ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
  </div>
);

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegisterMode = useMemo(
    () => location.pathname === "/register",
    [location.pathname]
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    interests: "",
  });
  const [wantToTeach, setWantToTeach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const interestTags = formData.interests
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const payload = isRegisterMode
        ? {
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            interests: interestTags,
            wantToTeach,
          }
        : {
            email: formData.email.trim(),
            password: formData.password,
          };

      const endpoint = isRegisterMode ? "/auth/register" : "/auth/login";
      const { data } = await api.post(endpoint, payload);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccess(isRegisterMode ? "Account created! Redirecting..." : "Welcome back! Redirecting...");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Unable to authenticate. Please check your credentials and try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col justify-center items-center py-8 lg:py-16 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[460px] space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 mb-2">
            {isRegisterMode ? <UserPlus className="text-brand-light w-7 h-7" /> : <LogIn className="text-brand-light w-7 h-7" />}
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white font-outfit tracking-tight">
            {isRegisterMode ? "Create Account" : "Access Learnova"}
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
            {isRegisterMode
              ? "Join our marketplace of experts and start your professional journey."
              : "Welcome back. Log in to manage your sessions, wallet, and learning."}
          </p>
        </div>

        <div className="lms-card p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle Decorative Gradient */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none" />
          
          <form className="space-y-6" onSubmit={submitAuth}>
            {isRegisterMode && (
              <InputField 
                label="Full Name"
                name="name"
                type="text"
                icon={UserIcon}
                value={formData.name}
                onChange={onInputChange}
                required
                placeholder="e.g. John Doe"
              />
            )}

            <InputField 
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              value={formData.email}
              onChange={onInputChange}
              required
              placeholder="name@company.com"
            />

            <InputField 
              label="Password"
              name="password"
              type="password"
              icon={Lock}
              value={formData.password}
              onChange={onInputChange}
              required
              placeholder="••••••••"
            />

            {isRegisterMode && (
              <InputField 
                label="Interests"
                name="interests"
                type="text"
                icon={Tag}
                value={formData.interests}
                onChange={onInputChange}
                placeholder="e.g. react, design, physics"
              />
            )}

            {isRegisterMode && (
              <label className="flex items-start gap-3 cursor-pointer group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-brand/30 transition-all">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand focus:ring-brand cursor-pointer"
                    checked={wantToTeach}
                    onChange={(e) => setWantToTeach(e.target.checked)}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">Enable Instructor Mode</span>
                  <span className="text-[10px] text-slate-500 leading-normal mt-0.5">
                    Select if you plan to publish sessions and earn tokens as a tutor.
                  </span>
                </div>
              </label>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-medium"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3 text-success text-xs font-medium"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>{success}</p>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full btn btn-primary h-14 text-base font-bold shadow-xl shadow-brand/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegisterMode ? "Create Free Account" : "Log In to Platform"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-500 text-sm">
              {isRegisterMode ? "Already have a professional account?" : "Don't have an account yet?"}{" "}
              <Link 
                to={isRegisterMode ? "/login" : "/register"}
                className="text-brand-light hover:text-brand font-bold transition-colors inline-flex items-center gap-1"
              >
                {isRegisterMode ? "Log In" : "Sign up for free"}
              </Link>
            </p>
          </div>
        </div>
        
        <p className="text-[10px] text-center text-slate-600 uppercase tracking-widest font-bold">
          Protected by Learnova Secure Auth
        </p>
      </motion.div>
    </section>
  );
}

export default LoginPage;
