import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Shared sign-in and candidate-registration form.
export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountRole, setAccountRole] = useState<'user' | 'employer'>('user');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Avoid leaving an already signed-in user on the login screen.
    if (isAuthenticated) {
      navigate('/jobs');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    // Give immediate feedback before sending invalid form state to the API.
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name to create an account.');
      return;
    }

    setSubmitting(true);

    try {
      // Public UI registration creates candidate accounts; employer onboarding is separate.
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({ name: name.trim(), email: email.trim(), password, role: accountRole });
      }

      navigate('/jobs');
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Authentication failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // The same form switches between sign-in and candidate registration modes.
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
        <div className="mb-6 flex rounded-full border border-slate-700 bg-slate-950 p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-full px-3 py-2 ${mode === 'login' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full px-3 py-2 ${mode === 'register' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
            onClick={() => setMode('register')}
          >
            Create account
          </button>
        </div>

        <p className="text-sm text-cyan-400">{mode === 'login' ? 'Welcome back' : 'Join JobFinder Nepal'}</p>
        <h1 className="mt-2 text-3xl font-semibold">{mode === 'login' ? 'Sign in to JobFinder Nepal' : 'Create your account'}</h1>
        <p className="mt-3 text-slate-400">Access job recommendations, applications, and employer tools.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <select
                aria-label="Account type"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                value={accountRole}
                onChange={(event) => setAccountRole(event.target.value as 'user' | 'employer')}
              >
                <option value="user">I am looking for a job</option>
                <option value="employer">I am hiring</option>
              </select>
            </>
          )}
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : mode === 'login' ? 'Continue' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>Or continue with Google</p>
          <button type="button" className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3">Sign in with Google</button>
        </div>
      </div>
    </div>
  );
}
