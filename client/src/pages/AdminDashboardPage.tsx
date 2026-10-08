import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getAuthHeaders, normalizeApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type AdminJob = {
  _id: string;
  title: string;
  status: string;
  company?: { name?: string };
  employer?: { name?: string; email?: string };
  location?: string;
};

// Admin-only UI for reviewing listings across every moderation state.
export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // The endpoint is admin-only; the bearer token is checked again by the API.
    const fetchJobs = async () => {
      if (!token) return;

      try {
        const response = await api.get('/jobs/moderation', getAuthHeaders(token));
        setJobs(response.data);
      } catch (err: unknown) {
        setError(normalizeApiError(err, 'Unable to load the moderation queue.'));
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [token]);

  const updateStatus = async (jobId: string, status: string) => {
    if (!token) return;

    try {
      await api.patch(`/jobs/${jobId}/status`, { status }, getAuthHeaders(token));
      // Apply the accepted server change locally without refetching the whole queue.
      setJobs((currentJobs) => currentJobs.map((job) => job._id === jobId ? { ...job, status } : job));
      setError('');
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Unable to update this job.'));
    }
  };

  // This client-side gate improves navigation UX; the API independently enforces admin access.
  if (!user || user.role !== 'admin') {
    // Moderation queue with approve/reject actions
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <Link to="/login" className="mt-6 inline-block rounded-full bg-cyan-500 px-5 py-3 font-semibold text-slate-950">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-cyan-400">Admin moderation</p>
            <h1 className="text-3xl font-semibold">Job review queue</h1>
          </div>
          <Link to="/" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-cyan-300">Home</Link>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}

          {loading ? (
            <p className="text-slate-400">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="text-slate-400">No jobs to review.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job._id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-slate-400">{job.company?.name || 'Unknown company'} � {job.location || 'Location unavailable'}</p>
                      <p className="mt-1 text-xs text-slate-500">Employer: {job.employer?.name || 'Unknown'} ({job.employer?.email || 'no email'})</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">{job.status}</span>
                      <button type="button" onClick={() => updateStatus(job._id, 'Published')} className="rounded-full border border-slate-700 px-3 py-2 text-xs">Approve</button>
                      <button type="button" onClick={() => updateStatus(job._id, 'Rejected')} className="rounded-full border border-rose-700 px-3 py-2 text-xs text-rose-300">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
