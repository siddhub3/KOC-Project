'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const demoAccounts = [
  { role: 'Coach', email: 'coach@kingdom.test', password: 'Coach123!', initials: 'C' },
  { role: 'Student', email: 'student1@kingdom.test', password: 'Student123!', initials: 'S' },
];

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('coach@kingdom.test');
  const [password, setPassword] = useState('Coach123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.post('/auth/login', { email, password });
      queryClient.clear();
      queryClient.setQueryData(['me'], user);
      router.replace(user.role === 'coach' ? '/coach/tournaments' : '/student/tournaments');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t log you in. Check your details and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-showcase">
        <div className="showcase-glow showcase-glow-one" />
        <div className="showcase-glow showcase-glow-two" />
        <div className="showcase-content">
          <div className="showcase-kicker"><span className="showcase-live-dot" /> THE NEXT MOVE IS YOURS</div>
          <h1>Play bold.<br /><span>Think ahead.</span></h1>
          <p className="showcase-copy">A place to learn, compete, and celebrate every move — together.</p>
          <div className="showcase-board" aria-hidden="true">
            {['♜','♞','♝','♛','♟','♟','♟','♟','♙','♙','♙','♙','♖','♘','♗','♕'].map((piece, index) => (
              <span key={index} className={(Math.floor(index / 4) + index % 4) % 2 ? 'showcase-square showcase-dark' : 'showcase-square'}>{piece}</span>
            ))}
          </div>
          <div className="showcase-stats">
            <div><strong>01</strong><span>Live matches</span></div>
            <div><strong>02</strong><span>Player roles</span></div>
            <div><strong>∞</strong><span>Ways to improve</span></div>
          </div>
        </div>
        <span className="showcase-decoration showcase-decoration-one">♘</span>
        <span className="showcase-decoration showcase-decoration-two">♗</span>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-heading">
            <span className="login-eyebrow">WELCOME BACK</span>
            <h2>Make your move</h2>
            <p>Sign in to continue to your chess academy.</p>
          </div>

          <form onSubmit={submit} className="login-form">
            <label className="field-label" htmlFor="login-email">Email address</label>
            <Input id="login-email" autoComplete="username" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />

            <div className="password-label-row"><label className="field-label" htmlFor="login-password">Password</label></div>
            <div className="password-field">
              <Input id="login-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>

            {error && <div className="login-error" role="alert"><span aria-hidden="true">!</span>{error}</div>}
            <Button type="submit" disabled={loading} className="login-submit">
              {loading ? <><span className="button-spinner" /> Signing in…</> : <>Sign in <span aria-hidden="true">→</span></>}
            </Button>
          </form>

          <div className="demo-access">
            <div className="demo-access-heading"><span>QUICK DEMO ACCESS</span><i /></div>
            <p>Choose a role to fill the sample account.</p>
            <div className="demo-account-list">
              {demoAccounts.map((account) => <button type="button" key={account.role} className="demo-account" onClick={() => { setEmail(account.email); setPassword(account.password); setError(''); }}>
                <span className={`demo-avatar ${account.role === 'Coach' ? 'demo-avatar-coach' : ''}`}>{account.initials}</span>
                <span><strong>{account.role}</strong><small>{account.email}</small></span>
                <span className="demo-arrow" aria-hidden="true">↗</span>
              </button>)}
            </div>
            <span className="demo-note">Sample credentials work only after the demo database has been seeded.</span>
          </div>
          <div className="login-footer"><span>♟</span> KINGDOM OF CHESS <i /> BUILT FOR THE NEXT GENERATION</div>
        </div>
      </section>
    </div>
  );
}
