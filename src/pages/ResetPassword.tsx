import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      setMessage('Invalid reset link.');
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage('Password updated! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-accent" />
          <span className="font-display font-bold text-xl">AcadFlow</span>
        </div>
        <h1 className="text-2xl font-display font-bold">Reset Password</h1>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="New password"
                required
                minLength={6}
              />
            </div>
          </div>
          {message && <p className="text-xs text-accent">{message}</p>}
          <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-medium text-sm">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
