import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, BookOpen, Calendar, ClipboardCheck } from 'lucide-react';

export default function Login() {
  const { user, role, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // Show loading screen while auth state is being resolved
  if (loading || submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <GraduationCap className="w-8 h-8 text-accent animate-pulse" />
          <div className="text-sm text-muted-foreground">Signing in...</div>
        </div>
      </div>
    );
  }

  // Only redirect when both user AND role are resolved
  if (user && role) {
    return <Navigate to={role === 'super_admin' ? '/planner' : '/dashboard'} replace />;
  }

  // If user exists but role not yet loaded, keep showing loading
  if (user && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <GraduationCap className="w-8 h-8 text-accent animate-pulse" />
          <div className="text-sm text-muted-foreground">Loading your workspace...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName);
      if (error) { setError(error.message); setSubmitting(false); }
      else { setSuccess('Check your email for a confirmation link.'); setSubmitting(false); }
    } else {
      const { error } = await signIn(email, password);
      if (error) { setError(error.message); }
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-accent/10 via-primary/5 to-accent/5 p-12">
        <div className="max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-accent" />
            </div>
            <span className="font-display font-bold text-3xl text-foreground">AcadFlow</span>
          </div>
          <h2 className="text-2xl font-display font-semibold text-foreground leading-snug">
            Institutional Academic Calendar Planning System
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Design activity flows, apply compliance rules, auto-generate schedules, and finalize academic calendars with ease.
          </p>
          <div className="space-y-4 pt-4">
            {[
              { icon: BookOpen, label: 'Define Activity Flows', desc: 'Visual workflow builder' },
              { icon: ClipboardCheck, label: 'Compliance Rules', desc: 'AICTE, NAAC, NBA, Anna University' },
              { icon: Calendar, label: 'Smart Scheduling', desc: 'Auto-generate & confirm events' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4.5 h-4.5 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <GraduationCap className="w-6 h-6 text-accent" />
            <span className="font-display font-bold text-xl">AcadFlow</span>
          </div>

          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isSignUp ? 'Create Account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? 'Sign up to start planning' : 'Sign in to your institution account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  placeholder="admin@institution.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-10 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</div>
            )}
            {success && (
              <div className="text-xs text-accent bg-accent/10 px-3 py-2 rounded-lg">{success}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
              className="text-accent font-medium hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground pt-4">
            Institutional Academic Calendar Planning System
          </p>
        </div>
      </div>
    </div>
  );
}
