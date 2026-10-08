import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getAuthHeaders, normalizeApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type JobDetail = {
  _id: string;
  title: string;
  description: string;
  company: { name: string; location?: string; website?: string };
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  category?: string;
  requirements?: string[];
  createdAt?: string;
};

// Loads a public listing and submits the current candidate's application.
export default function JobDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Public detail API returns only published jobs; 404 also represents unpublished listings.
    const fetchJob = async () => {
      try {
        const response = await api.get(`/jobs/${id}`);
        setJob(response.data);
      } catch (err: unknown) {
        setMessage(normalizeApiError(err, 'Unable to load job details right now.'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJob();
    }
  }, [id]);

  const handleApply = async () => {
    // The API derives applicant identity from the JWT; only user-entered application content is sent.
    if (!token || !job || user?.role !== 'user') return;

    setApplying(true);
    try {
      await api.post('/applications', {
        job: job._id,
        resumeUrl: resumeUrl.trim(),
        coverLetter: coverLetter.trim()
      }, getAuthHeaders(token));
      setMessage('Application submitted successfully.');
      setResumeUrl('');
      setCoverLetter('');
    } catch (err: unknown) {
      setMessage(normalizeApiError(err, 'Could not submit your application.'));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">Loading...</div>;
  }

  if (!job) {
    return <div className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">Job not found.</div>;
  }

  // Job information and application action
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/jobs" className="text-sm text-cyan-400">? Back to jobs</Link>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">{job.jobType || 'Full Time'}</span>
        </div>

        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-cyan-400">{job.company?.name}</p>
              <h1 className="mt-2 text-3xl font-semibold">{job.title}</h1>
            </div>
          </div>

          {user?.role === 'user' ? (
            <form
              className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleApply();
              }}
            >
              <h2 className="text-lg font-semibold">Apply for this job</h2>
              <label className="grid gap-2 text-sm text-slate-300">
                Resume link
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(event) => setResumeUrl(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  placeholder="https://example.com/my-resume.pdf"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Cover letter
                <textarea
                  value={coverLetter}
                  onChange={(event) => setCoverLetter(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  rows={5}
                  placeholder="Tell the employer why you're interested in this role."
                  required
                />
              </label>
              <button
                type="submit"
                disabled={applying}
                className="w-fit rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {applying ? 'Submitting...' : 'Submit application'}
              </button>
            </form>
          ) : user ? (
            <p className="mt-6 text-sm text-slate-400">Candidate accounts can apply to this job.</p>
          ) : (
            <Link to="/login" className="mt-6 inline-flex rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950">
              Sign in to apply
            </Link>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-300">
            <span>{job.location}</span>
            <span>{job.category || 'General'}</span>
            {job.salaryMin && job.salaryMax ? (
              <span>Rs. {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}</span>
            ) : <span>Salary negotiable</span>}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
            <div>
              <h2 className="text-xl font-semibold">Job description</h2>
              <p className="mt-4 whitespace-pre-line text-slate-300">{job.description}</p>

              <div className="mt-8">
                <h3 className="text-xl font-semibold">Requirements</h3>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
                  {(job.requirements && job.requirements.length > 0 ? job.requirements : ['Strong communication skills', 'Team collaboration', 'Relevant experience']).map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h3 className="font-semibold">Overview</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li><span className="text-slate-400">Location:</span> {job.location}</li>
                <li><span className="text-slate-400">Type:</span> {job.jobType || 'Full Time'}</li>
                <li><span className="text-slate-400">Category:</span> {job.category || 'General'}</li>
                <li><span className="text-slate-400">Posted:</span> {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}</li>
              </ul>
            </aside>
          </div>

          {message && <p className="mt-6 text-sm text-cyan-300">{message}</p>}
        </article>
      </div>
    </div>
  );
}
