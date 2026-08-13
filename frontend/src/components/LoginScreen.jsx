import { useState } from 'react';
import { motion } from 'framer-motion';
import EmotionalHook from './EmotionalHook';

export default function LoginScreen({ status, error, onSignUp, onLogIn }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileText, setProfileText] = useState('');
  const [showProfileField, setShowProfileField] = useState(false);
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isChecking = status === 'checking';
  const isSignup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (isSignup) {
      if (password.length < 6) { setLocalError('Use at least 6 characters for your password.'); return; }
      if (password !== confirmPassword) { setLocalError("Passwords don't match."); return; }
      setSubmitting(true);
      await onSignUp(email, password, profileText);
      setSubmitting(false);
    } else {
      setSubmitting(true);
      await onLogIn(email, password);
      setSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="h-full flex items-center justify-center bg-deep">
        <div className="w-2 h-2 rounded-full bg-warm animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-deep">
      <div className="min-h-full flex flex-col justify-center px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-sm mx-auto w-full"
        >
          {isSignup && <EmotionalHook />}

          <div className="flex items-center justify-between mb-1.5 gap-3">
            <h1 className="font-display text-2xl text-cream">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <button
              type="button"
              onClick={() => { setMode(isSignup ? 'login' : 'signup'); setLocalError(''); }}
              className="text-xs text-calm hover:text-cream transition-colors shrink-0 underline underline-offset-2"
            >
              {isSignup ? 'Sign in instead' : 'Create account'}
            </button>
          </div>

          <p className="text-muted mb-4 text-xs leading-relaxed">
            {isSignup ? 'Lets your memory follow you to another device.' : 'Pick up where you left off, on any device.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted mb-1 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface text-cream rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50 text-sm"
                placeholder="you@example.com" autoFocus />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted mb-1 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface text-cream rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50 text-sm"
                placeholder="••••••••" />
            </div>

            {isSignup && (
              <>
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-muted mb-1 block">Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface text-cream rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50 text-sm"
                    placeholder="••••••••" />
                </div>

                {!showProfileField ? (
                  <button type="button" onClick={() => setShowProfileField(true)}
                    className="text-xs text-calm hover:text-cream transition-colors underline underline-offset-2">
                    + Tell it about yourself (optional)
                  </button>
                ) : (
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-muted mb-1 block">About you (optional)</label>
                    <textarea value={profileText} onChange={(e) => setProfileText(e.target.value)} rows={2}
                      className="w-full bg-surface text-cream rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50 resize-none text-sm leading-relaxed"
                      placeholder="Your age, work, what's going on lately…" />
                  </div>
                )}
              </>
            )}

            {(localError || error) && <p className="text-warm text-xs">{localError || error}</p>}

            <button type="submit" disabled={submitting || !email || !password}
              className="w-full bg-warm text-deep font-medium rounded-xl py-2.5 mt-1 disabled:opacity-50 transition-opacity text-sm">
              {submitting ? 'One sec…' : isSignup ? 'Create account' : 'Sign in'}
            </button>

            {isSignup && (
              <p className="text-muted/70 text-[11px] text-center leading-relaxed">
                No password recovery — it's what encrypts your data, not just what logs you in.
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}