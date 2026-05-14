import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Tag, CheckCircle2 } from "lucide-react";
import api from "../api/axios";

const InputField = ({ label, icon: Icon, ...props }) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-slate-300 ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <input 
        {...props}
        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
      />
    </div>
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

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
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

      navigate("/dashboard");
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Unable to authenticate. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex justify-center items-center py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-3xl -mr-16 -mt-16 rounded-full" />
        
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/20 mb-4"
          >
            {isRegisterMode ? <UserPlus className="text-brand-light w-8 h-8" /> : <LogIn className="text-brand-light w-8 h-8" />}
          </motion.div>
          <h2 className="text-3xl font-bold text-white font-outfit">
            {isRegisterMode ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            {isRegisterMode
              ? "Join Learnova to start your learning or teaching journey today."
              : "Sign in to access your dashboard, wallet, and active classes."}
          </p>
        </div>

        <form className="space-y-5" onSubmit={submitAuth}>
          {isRegisterMode && (
            <InputField 
              label="Full Name"
              name="name"
              type="text"
              icon={UserIcon}
              value={formData.name}
              onChange={onInputChange}
              required
              placeholder="John Doe"
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
            placeholder="you@example.com"
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
              label="Learning Interests"
              name="interests"
              type="text"
              icon={Tag}
              value={formData.interests}
              onChange={onInputChange}
              placeholder="python, math, design"
            />
          )}

          {isRegisterMode && (
            <label className="flex items-start gap-3 cursor-pointer group bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-brand focus:ring-brand"
                checked={wantToTeach}
                onChange={(e) => setWantToTeach(e.target.checked)}
              />
              <span className="text-xs text-slate-400 leading-normal group-hover:text-slate-300 transition-colors">
                I also want to teach (same account acts as learner + tutor — dual role).
              </span>
            </label>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-brand/20 transition-all transform active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isRegisterMode ? "Create Account" : "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm">
            {isRegisterMode ? "Already have an account?" : "No account yet?"}{" "}
            <Link 
              to={isRegisterMode ? "/login" : "/register"}
              className="text-brand-light hover:text-white font-bold transition-colors ml-1"
            >
              {isRegisterMode ? "Login" : "Sign up free"}
            </Link>
          </p>
        </div>
      </motion.div>
    </section>
  );
}

export default LoginPage;
