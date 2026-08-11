import { useState } from 'react';
import { motion } from 'framer-motion';
import EmotionalHook from './EmotionalHook';

export default function LoginScreen({ status, error, onSignUp, onLogIn }) {
  const [mode, setMode] = useState('signup'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileText, setProfileText] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isChecking = status === 'checking';
  const isSignup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (isSignup) {
      if (password.length < 6) {
        setLocalError('Use at least 6 characters for your password.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords don't match.");
        return;
      }
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
    <div className="h-full flex flex-col justify-center px-6 bg-deep">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-sm mx-auto w-full"
      >
      <div className="mb-6 pb-5 border-b border-surface-2">
  <p className="text-sm text-muted leading-relaxed">
    <span className="text-cream font-medium">Pocket Bestie</span> is your pocket AI companion — it remembers your
    stories and your mood, and talks with you by text or voice, anytime you need it. 
    Share your FRUSTRATIONS, REGRETS, OBSESSIONS, CONFESSIONS, PROMISES, STORIES, THOUGHTS AND EVERYTHING. 
    Things that can't be shared with known persons, you may share them here by making this companion as that person you have in mind.
    Give a try talking to this STRANGER.
  </p>
</div>
{isSignup && <EmotionalHook />}
        <h1 className="font-display text-4xl text-cream mb-2">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="text-muted mb-8 text-sm leading-relaxed">
          {isSignup
            ? 'This is what lets the same memory follow you to another device.'
            : 'Sign in to pick up where you left off, on any device.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface text-cream rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50"
              placeholder="you@example.com"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface text-cream rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50"
              placeholder="••••••••"
            />
          </div>

          {isSignup && (
            <>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted mb-1.5 block">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-surface text-cream rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted mb-1.5 block">
                  Tell it about yourself <span className="normal-case text-muted/70">(optional, skippable)</span>
                </label>
                <textarea
                  value={profileText}
                  onChange={(e) => setProfileText(e.target.value)}
                  rows={4}
                  className="w-full bg-surface text-cream rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-warm/60 placeholder:text-muted/50 resize-none text-sm leading-relaxed"
                  placeholder="Your age, work, what's going on lately - whatever you want it to actually know from day one, in your own words."
                />
              </div>
            </>
          )}

          {(localError || error) && <p className="text-warm text-sm">{localError || error}</p>}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full bg-warm text-deep font-medium rounded-xl py-3 mt-2 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'One sec…' : isSignup ? 'Create account' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? 'login' : 'signup');
              setLocalError('');
            }}
            className="w-full text-center text-sm text-muted hover:text-cream transition-colors pt-1"
          >
            {isSignup ? 'Already have an account? Sign in' : "New here? Create an account"}
          </button>

          {isSignup && (
            <p className="text-muted/70 text-xs text-center pt-1 leading-relaxed">
              There's no way to recover your data if you forget this password - it's what encrypts everything, not
              just what logs you in. Use a password manager if you're not confident you'll remember it.
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
