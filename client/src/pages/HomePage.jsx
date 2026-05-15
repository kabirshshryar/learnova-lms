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
  Wallet,
  CheckCircle2,
  Trophy,
  Globe
} from "lucide-react";

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.article 
    initial={{ opacity: 0, y: 15 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay }}
    className="lms-card p-8 hover:border-brand/40 transition-all group"
  >
    <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand/20 transition-colors">
      <Icon className="text-brand-light w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </motion.article>
);

const Step = ({ num, title, desc, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay }}
    className="relative pl-12"
  >
    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light text-xs font-bold font-outfit">
      {num}
    </div>
    <h4 className="text-white font-bold mb-2">{title}</h4>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </motion.div>
);

function HomePage() {
  return (
    <div className="space-y-32">
      {/* Hero Section - Cleaner Typography & Visual Hierarchy */}
      <section className="relative py-12 lg:py-20 flex flex-col items-center text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-brand/5 blur-[120px] rounded-full -z-10" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl space-y-8"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-light text-xs font-bold uppercase tracking-widest shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-current" />
            Empowering the Next Generation of Experts
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] font-outfit">
            Master Specialized Skills with <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-brand-dark">
              Expert-Led Micro-Courses
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The modern marketplace for specialized 1-on-1 tutoring and live sessions. 
            Join a community where learning is verified, secure, and expert-driven.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/register" className="btn btn-primary h-14 px-10 text-base shadow-xl shadow-brand/20 active:scale-95">
              Start Your Journey <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
            <Link to="/gigs" className="btn btn-secondary h-14 px-10 text-base active:scale-95">
              Browse All Tutors
            </Link>
          </div>

          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto border-t border-white/5">
            {[
              { icon: Globe, text: "Global Access" },
              { icon: ShieldCheck, text: "Escrow Secure" },
              { icon: Video, text: "Live Learning" },
              { icon: Trophy, text: "Certified Tutors" }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                <item.icon className="w-5 h-5 text-slate-300" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust Section - Value Propositions */}
      <section className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl lg:text-4xl font-bold font-outfit text-white">Why Learn on Learnova?</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Structured for professional results, built with marketplace transparency.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={BookOpen}
            title="Structured Sessions"
            desc="Every gig is a specialized module designed for high-impact learning. No fluff, just skills."
            delay={0.1}
          />
          <FeatureCard 
            icon={Users}
            title="Direct Expert Access"
            desc="Skip the pre-recorded videos. Book live sessions with experts who provide real-time feedback."
            delay={0.2}
          />
          <FeatureCard 
            icon={Wallet}
            title="Transparent Economy"
            desc="Pay with tokens, secure with escrow. Tutors only get paid when you confirm the session is complete."
            delay={0.3}
          />
        </div>
      </section>

      {/* How it Works - The Journey */}
      <section className="container mx-auto max-w-6xl py-12">
        <div className="lms-card p-12 lg:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 blur-[100px] -mr-40 -mt-40 rounded-full" />
          
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold font-outfit text-white leading-tight">
                  A Simple, Secure <br />
                  <span className="text-brand-light">Learning Cycle</span>
                </h2>
                <p className="text-slate-400 text-base leading-relaxed">
                  We've streamlined the process of finding and booking top-tier talent. 
                  Our tokenized escrow system ensures both parties are protected.
                </p>
              </div>

              <div className="space-y-10">
                <Step 
                  num="1"
                  title="Find Your Expert"
                  desc="Search our catalog of verified tutors specialized in tech, design, business, and more."
                  delay={0.1}
                />
                <Step 
                  num="2"
                  title="Book with Tokens"
                  desc="Select a time slot and commit tokens. They stay in escrow until you're satisfied."
                  delay={0.2}
                />
                <Step 
                  num="3"
                  title="Complete & Learn"
                  desc="Attend your live session via Jitsi. Once done, confirm to release the payment."
                  delay={0.3}
                />
              </div>

              <div className="pt-6">
                <Link to="/register" className="btn btn-primary h-12 px-8">Join the Community</Link>
              </div>
            </div>

            {/* Visual Representation of Platform */}
            <div className="space-y-6">
              <div className="bg-dark-bg/60 border border-white/5 rounded-2xl p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">Active Marketplace</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-bold text-success uppercase">Live Feed</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { u: "John D.", a: "Booked React Session", t: "Just now", amt: "-45", s: "Escrow" },
                    { u: "Marta K.", a: "Earned from Design Gig", t: "5m ago", amt: "+120", s: "Completed" },
                    { u: "Alex P.", a: "Top-up: 500 Tokens", t: "12m ago", amt: "+500", s: "Success" }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {item.u[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{item.u}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{item.a}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${item.amt.startsWith('+') ? 'text-success' : 'text-brand-light'}`}>{item.amt}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">{item.s}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-center text-xs text-slate-600 italic">Join 1,200+ users already learning on Learnova</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Closing the sale */}
      <section className="container mx-auto max-w-4xl text-center py-20 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="space-y-10"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center border border-brand/20">
              <Trophy className="w-10 h-10 text-brand-light" />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold font-outfit text-white">Elevate Your Career with Experts</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Whether you're looking to acquire new skills or share your expertise, 
              Learnova provides the infrastructure for professional growth.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn btn-primary h-14 px-12 text-base w-full sm:w-auto">Start as Learner</Link>
            <Link to="/register" className="btn btn-secondary h-14 px-12 text-base w-full sm:w-auto">Become a Tutor</Link>
          </div>
          <div className="flex items-center justify-center gap-8 pt-8">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-success" /> No subscription required
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-success" /> Escrow protected
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default HomePage;
