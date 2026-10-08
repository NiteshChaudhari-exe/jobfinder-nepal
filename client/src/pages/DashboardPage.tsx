import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getAuthHeaders, normalizeApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type ApplicationEntry = {
  _id: string;
  status: string;
  createdAt: string;
  job: {
    _id: string;
    title: string;
    company?: { name?: string };
    location?: string;
  };
};

// Candidate view of applications returned by the authenticated /applications/me endpoint.
export default function DashboardPage() {
  const { token, user } = useAuth();
  const [applications, setApplications] = useState<ApplicationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // This endpoint always scopes results to the authenticated candidate.
    const fetchApplications = async () => {
      if (!token) return;

      try {
        setError('');
        const response = await api.get('/applications/me', getAuthHeaders(token));
        setApplications(response.data);
      } catch (err: unknown) {
        setError(normalizeApiError(err, 'Unable to load your applications right now.'));
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [token]);

  if (!user) {
    // Summary cards and recent application history
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-semibold">Sign in to view your dashboard</h1>
          <Link to="/login" className="mt-6 inline-block rounded-full bg-cyan-500 px-5 py-3 font-semibold text-slate-950">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-cyan-400">Your profile</p>
            <h1 className="text-3xl font-semibold">Welcome back, {user.name}</h1>
          </div>
          <Link to="/jobs" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-cyan-300">Browse jobs</Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Applications</p>
            <p className="mt-2 text-3xl font-semibold">{applications.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Saved jobs</p>
            <p className="mt-2 text-3xl font-semibold">0</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Resumes</p>
            <p className="mt-2 text-3xl font-semibold">1</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold">Recent applications</h2>

          {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

          {loading ? (
            <p className="mt-4 text-slate-400">Loading your applications...</p>
          ) : applications.length === 0 ? (
            <p className="mt-4 text-slate-400">You have not applied to any jobs yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {applications.map((application) => (
                <div key={application._id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{application.job?.title}</p>
                      <p className="text-sm text-slate-400">{application.job?.company?.name || 'Company'} � {application.job?.location || 'Remote'}</p>
                    </div>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                      {application.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Applied on {new Date(application.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
