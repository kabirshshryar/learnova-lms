import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Users, 
  Zap, 
  ArrowRight, 
  Star, 
  ShieldCheck, 
  Video, 
  Wallet 
} from "lucide-react";

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.article 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors group"
  >
    <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      <Icon className="text-brand-light w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold mb-2 font-outfit text-white">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </motion.article>
);

const TokenStep = ({ num, title, desc, delay }) => (
  <motion.li 
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="flex gap-4 items-start"
  >
    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand/20 text-brand-light flex items-center justify-center font-bold font-outfit border border-brand/30">
      {num}
    </span>
    <div>
      <h4 className="font-bold text-white mb-1">{title}</h4>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  </motion.li>
);

function HomePage() {
  return (
    <div className="space-y-24 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-12 lg:pt-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand-light text-xs font-bold uppercase tracking-wider mb-6">
              <Zap className="w-3 h-3 fill-current" /> Education Marketplace
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold font-outfit tracking-tight text-white leading-tight">
              Master any skill with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light via-white to-accent">
                Learnova Experts
              </span>
            </h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            A lightweight MOOC marketplace where you can learn from real experts 
            or teach and earn tokens. Real-time bookings, chat, and live classes 
            all in one seamless experience.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link 
              to="/register" 
              className="px-8 py-4 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-brand/20"
            >
              Start Learning Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/gigs" 
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all"
            >
              Explore Tutors
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="pt-12 flex flex-wrap justify-center gap-8 text-slate-500 font-medium text-sm"
          >
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-light" /> Escrow Protected</span>
            <span className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Top Rated Tutors</span>
            <span className="flex items-center gap-2"><Video className="w-4 h-4 text-accent" /> Live Live Classes</span>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={BookOpen}
            title="Structured Learning"
            desc="Sessions mapped to subjects and difficulty. Browse like a marketplace, progress like an LMS."
            delay={0.1}
          />
          <FeatureCard 
            icon={Users}
            title="Expert Tutoring"
            desc="Connect directly with verified experts for personalized 1-on-1 sessions and live classes."
            delay={0.2}
          />
          <FeatureCard 
            icon={Wallet}
            title="Token Economy"
            desc="Secure token-based payments with escrow protection. Pay as you learn, earn as you teach."
            delay={0.3}
          />
        </div>
      </section>

      {/* Token Flow Section */}
      <section className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-brand/20 to-accent/5 border border-white/10 rounded-3xl p-8 lg:p-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/20 blur-[80px] -mr-32 -mt-32 rounded-full" />
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold font-outfit text-white">
                The Learnova <br />
                <span className="text-brand-light">Token Economy</span>
              </h2>
              <p className="text-slate-400 leading-relaxed">
                We've simplified marketplace payments using a secure token system. 
                Whether you're topping up to learn or withdrawing your earnings as a tutor, 
                everything is handled with transparency and speed.
              </p>
              <ul className="space-y-6">
                <TokenStep 
                  num="01"
                  title="Purchase Tokens"
                  desc="Prepaid credits toward sessions. Easy top-ups via standard payment gateways."
                  delay={0.1}
                />
                <TokenStep 
                  num="02"
                  title="Book a Tutor"
                  desc="Tokens go to secure escrow until the session is confirmed as complete."
                  delay={0.2}
                />
                <TokenStep 
                  num="03"
                  title="Cash Out"
                  desc="Tutors can withdraw their balance directly to their bank or mobile wallet."
                  delay={0.3}
                />
              </ul>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <div className="flex justify-between items-center pb-4 border-bottom border-white/5">
                <span className="text-slate-400 font-bold">Transaction Ledger</span>
                <span className="px-2 py-1 bg-success/20 text-success text-[10px] rounded uppercase font-bold tracking-widest">Realtime</span>
              </div>
              <div className="space-y-3">
                {[
                  { user: "Alice M.", action: "Purchased 50 Tokens", time: "2m ago", amount: "+50" },
                  { user: "Dev K.", action: "Withdrawal Approved", time: "15m ago", amount: "-120" },
                  { user: "Sarah J.", action: "Booked Python Basics", time: "1h ago", amount: "-15" },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600" />
                      <div>
                        <p className="text-xs font-bold text-white">{item.user}</p>
                        <p className="text-[10px] text-slate-500">{item.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${item.amount.startsWith('+') ? 'text-success' : 'text-slate-300'}`}>{item.amount}</p>
                      <p className="text-[10px] text-slate-500">{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto space-y-8"
        >
          <h2 className="text-4xl font-bold font-outfit text-white">Ready to start your journey?</h2>
          <p className="text-slate-400">
            Join thousands of learners and tutors on the most innovative 
            education marketplace in the web3 space.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              to="/register" 
              className="px-10 py-4 bg-brand text-white rounded-xl font-bold shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
            >
              Get Started for Free
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default HomePage;
