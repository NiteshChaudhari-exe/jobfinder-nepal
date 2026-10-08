import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

type Job = {
  _id: string;
  title: string;
  company: { _id?: string; name: string };
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  category?: string;
  description?: string;
};

const defaultJobs: Job[] = [
  {
    _id: 'demo-1',
    title: 'Software Engineer',
    company: { name: 'CodeMinds' },
    location: 'Kathmandu',
    salaryMin: 100000,
    salaryMax: 180000,
    jobType: 'Full Time',
    category: 'Engineering'
  },
  {
    _id: 'demo-2',
    title: 'Marketing Specialist',
    company: { name: 'Brand Nepal' },
    location: 'Pokhara',
    salaryMin: 60000,
    salaryMax: 120000,
    jobType: 'Contract',
    category: 'Marketing'
  },
  {
    _id: 'demo-3',
    title: 'HR Executive',
    company: { name: 'PeopleFirst' },
    location: 'Lalitpur',
    salaryMin: 50000,
    salaryMax: 90000,
    jobType: 'Part Time',
    category: 'HR'
  }
];

// Public discovery page: query the API when filters change and show demo content if unavailable.
export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(defaultJobs);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');

  useEffect(() => {
    // Refetch when any filter changes; the API applies the published-only visibility rule.
    const fetchJobs = async () => {
      try {
        // Only send active filters so the API can apply its defaults for omitted values.
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (location) params.location = location;
        if (jobType) params.jobType = jobType;

        const response = await api.get('/jobs', { params });
        if (Array.isArray(response.data) && response.data.length > 0) {
          setJobs(response.data);
        } else {
          // Demo content keeps the page populated but is not backed by MongoDB.
          setJobs(defaultJobs);
        }
      } catch (error) {
        // Keep the browsing UI usable in demo mode when the API cannot be reached.
        setJobs(defaultJobs);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [search, location, jobType]);

  const totalJobs = useMemo(() => jobs.length, [jobs]);

  // Search controls and result cards

  // Render filters, result count, and links to public job detail pages.
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-cyan-400">Jobs in Nepal</p>
            <h1 className="text-3xl font-semibold">Explore opportunities</h1>
          </div>
          <Link to="/" className="text-sm text-slate-400 hover:text-cyan-400">Back home</Link>
        </div>

        <div className="mb-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="Search roles or skills"
          />
          <select value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option value="">All locations</option>
            <option value="Kathmandu">Kathmandu</option>
            <option value="Pokhara">Pokhara</option>
            <option value="Lalitpur">Lalitpur</option>
            <option value="Remote">Remote</option>
          </select>
          <select value={jobType} onChange={(event) => setJobType(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option value="">All job types</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
            <option value="Remote">Remote</option>
          </select>
          <div className="flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300">
            {totalJobs} jobs found
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-semibold">Filters</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <div>Location: Kathmandu, Pokhara, Lalitpur</div>
              <div>Salary: Negotiable or fixed</div>
              <div>Job Type: Full Time, Part Time, Contract</div>
              <div>Category: Engineering, Marketing, HR</div>
            </div>
          </aside>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-300">Loading jobs...</div>
            ) : jobs.map((job) => (
              <article key={job._id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{job.title}</h2>
                    <p className="mt-1 text-slate-400">{job.company?.name}</p>
                  </div>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">{job.jobType || 'Full Time'}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                  <span>{job.location}</span>
                  <span>{job.salaryMin && job.salaryMax ? `Rs. ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}` : 'Salary negotiable'}</span>
                  <span>{job.category || 'General'}</span>
                </div>
                <p className="mt-4 line-clamp-2 text-slate-300">{job.description || 'Explore this opportunity and apply to join a growing team.'}</p>
                <div className="mt-5">
                  <Link to={`/jobs/${job._id}`} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-cyan-300 hover:border-cyan-500">
                    View details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}