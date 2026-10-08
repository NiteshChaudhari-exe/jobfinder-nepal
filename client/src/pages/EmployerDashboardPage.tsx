import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getAuthHeaders, normalizeApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Company = {
  _id: string;
  name: string;
  description?: string;
  location?: string;
  website?: string;
};

type Job = {
  _id: string;
  title: string;
  description?: string;
  location: string;
  category?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  status?: string;
  requirements?: string[];
  company?: { name?: string; owner?: string };
  employer?: string;
};

type JobFormState = {
  title: string;
  description: string;
  location: string;
  category: string;
  salaryMin: string;
  salaryMax: string;
  jobType: string;
  requirements: string;
};

// Keep input values as strings; convert numeric fields when building the API payload.
const emptyJobForm = {
  title: '',
  description: '',
  location: '',
  category: '',
  salaryMin: '',
  salaryMax: '',
  jobType: 'Full Time',
  requirements: ''
};

// Company profile creation plus CRUD and publication controls for the current employer.
export default function EmployerDashboardPage() {
  const { user, token } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [jobForm, setJobForm] = useState<JobFormState>(emptyJobForm);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<JobFormState>(emptyJobForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingJob, setSubmittingJob] = useState(false);

  // Load the employer's company and owned jobs from separate protected endpoints.
  const fetchEmployerData = async () => {
    if (!token || !user) return;

    try {
      const [companiesResponse, jobsResponse] = await Promise.all([
        api.get('/employers/me', getAuthHeaders(token)),
        api.get('/jobs/me', getAuthHeaders(token))
      ]);

      const employerCompanies = Array.isArray(companiesResponse.data) ? companiesResponse.data : [];
      const currentCompany = employerCompanies[0] || null;

      setCompany(currentCompany);
      setCompanyName(currentCompany?.name || '');
      setJobs(Array.isArray(jobsResponse.data) ? jobsResponse.data : []);
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Unable to load your employer dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployerData();
  }, [token, user]);

  // Create the company once; the server associates it with the current employer.
  const handleCreateCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      const response = await api.post(
        '/employers',
        { name: companyName, description: companyDescription, location, website },
        getAuthHeaders(token)
      );

      setCompany(response.data);
      setCompanyName(response.data.name || companyName);
      setMessage('Company profile created successfully.');
      setError('');
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Unable to create company profile.'));
    }
  };

  // Convert the controlled form state to the API's job shape and refresh after creation.
  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setError('Please sign in again to post a job.');
      return;
    }

    if (!company && !companyName.trim()) {
      setError('Create a company profile before posting a job.');
      return;
    }

    setSubmittingJob(true);
    setError('');
    setMessage('');

    try {
      // Comma-separated requirements in the UI become a clean string array for MongoDB.
      const payload = {
        title: jobForm.title.trim(),
        description: jobForm.description.trim(),
        location: jobForm.location.trim(),
        companyName: company?.name || companyName.trim(),
        category: jobForm.category.trim(),
        salaryMin: jobForm.salaryMin ? Number(jobForm.salaryMin) : undefined,
        salaryMax: jobForm.salaryMax ? Number(jobForm.salaryMax) : undefined,
        jobType: jobForm.jobType,
        requirements: jobForm.requirements
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      };

      if (!payload.title || !payload.description || !payload.location || !payload.companyName) {
        setError('Please complete the title, description, location, and company info.');
        return;
      }

      await api.post('/jobs', payload, getAuthHeaders(token));
      setJobForm(emptyJobForm);
      setMessage('Job posted successfully.');
      await fetchEmployerData();
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Unable to post the job. Please review the details and try again.'));
    } finally {
      setSubmittingJob(false);
    }
  };

  // Employer workflow allows only publish/draft; moderation-only states belong to admins.
  const updateJobStatus = async (jobId: string, status: 'Published' | 'Draft') => {
    if (!token) return;

    try {
      await api.patch(`/jobs/${jobId}/status`, { status }, getAuthHeaders(token));
      setJobs((currentJobs) => currentJobs.map((job) => (job._id === jobId ? { ...job, status } : job)));
      setMessage(`Job moved to ${status}.`);
      setError('');
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Unable to update the job status.'));
    }
  };

  // Copy a selected job into editable string inputs, including numeric salary fields.
  const startEditingJob = (job: Job) => {
    setEditJobId(job._id);
    setEditForm({
      title: job.title,
      description: job.description || '',
      location: job.location,
      category: job.category || '',
      salaryMin: job.salaryMin ? String(job.salaryMin) : '',
      salaryMax: job.salaryMax ? String(job.salaryMax) : '',
      jobType: job.jobType || 'Full Time',
      requirements: (job.requirements || []).join(', ')
    });
  };

  // Persist only the editable job fields, then reload the authoritative server data.
  const saveEditedJob = async (jobId: string) => {
    if (!token) return;

    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        companyName: company?.name || companyName.trim(),
        category: editForm.category.trim(),
        salaryMin: editForm.salaryMin ? Number(editForm.salaryMin) : undefined,
        salaryMax: editForm.salaryMax ? Number(editForm.salaryMax) : undefined,
        jobType: editForm.jobType,
        requirements: editForm.requirements
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      };

      if (!payload.title || !payload.description || !payload.location) {
        setError('Please complete the required job fields before saving.');
        return;
      }

      await api.patch(`/jobs/${jobId}`, payload, getAuthHeaders(token));
      setEditJobId(null);
      setEditForm(emptyJobForm);
      setMessage('Job updated successfully.');
      setError('');
      await fetchEmployerData();
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Unable to update the job.'));
    }
  };

  // Confirm destructive action before issuing the ownership-checked delete request.
  const deleteJob = async (jobId: string) => {
    if (!token) return;

    const confirmed = window.confirm('Delete this job posting?');
    if (!confirmed) return;

    try {
      await api.delete(`/jobs/${jobId}`, getAuthHeaders(token));
      setJobs((currentJobs) => currentJobs.filter((job) => job._id !== jobId));
      setMessage('Job deleted successfully.');
      setError('');
    } catch (err: unknown) {
      setError(normalizeApiError(err, 'Unable to delete the job.'));
    }
  };

  // The API still checks the employer role and record ownership for every write.
  if (!user) {
    // Company editor, new-job form, and owned-job management panel
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-semibold">Employer access required</h1>
          <Link to="/login" className="mt-6 inline-block rounded-full bg-cyan-500 px-5 py-3 font-semibold text-slate-950">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-cyan-400">Employer dashboard</p>
            <h1 className="text-3xl font-semibold">Welcome, {user.name}</h1>
          </div>
          <Link to="/jobs" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-cyan-300">Browse talent</Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            {/* Company profile */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold">Company profile</h2>

              {company ? (
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <h3 className="text-lg font-semibold">{company.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">{company.description || 'No company description yet.'}</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <div>Location: {company.location || 'Not provided'}</div>
                    <div>Website: {company.website || 'Not provided'}</div>
                  </div>
                </div>
              ) : (
                <form className="mt-5 space-y-4" onSubmit={handleCreateCompany}>
                  <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Company name" required />
                  <textarea value={companyDescription} onChange={(event) => setCompanyDescription(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Company description" rows={4} />
                  <input value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Location" />
                  <input value={website} onChange={(event) => setWebsite(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Website URL" />
                  {error && <p className="text-sm text-rose-400">{error}</p>}
                  {message && <p className="text-sm text-cyan-300">{message}</p>}
                  <button type="submit" className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950">Create company</button>
                </form>
              )}
            </div>

            {/* Create a new job posting */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold">Post a job</h2>

              <form className="mt-5 space-y-4" onSubmit={handleCreateJob}>
                <input
                  value={jobForm.title}
                  onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  placeholder="Job title"
                  required
                />
                <textarea
                  value={jobForm.description}
                  onChange={(event) => setJobForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  placeholder="Job description"
                  rows={5}
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={jobForm.location}
                    onChange={(event) => setJobForm((current) => ({ ...current, location: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                    placeholder="Location"
                    required
                  />
                  <input
                    value={jobForm.category}
                    onChange={(event) => setJobForm((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                    placeholder="Category"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="number"
                    value={jobForm.salaryMin}
                    onChange={(event) => setJobForm((current) => ({ ...current, salaryMin: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                    placeholder="Min salary"
                  />
                  <input
                    type="number"
                    value={jobForm.salaryMax}
                    onChange={(event) => setJobForm((current) => ({ ...current, salaryMax: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                    placeholder="Max salary"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <select
                    value={jobForm.jobType}
                    onChange={(event) => setJobForm((current) => ({ ...current, jobType: event.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Contract</option>
                    <option>Remote</option>
                    <option>Internship</option>
                  </select>
                  <input
                    value={company?.name || companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                    placeholder="Company name"
                    readOnly={Boolean(company)}
                  />
                </div>
                <textarea
                  value={jobForm.requirements}
                  onChange={(event) => setJobForm((current) => ({ ...current, requirements: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  placeholder="Requirements (comma separated)"
                  rows={3}
                />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                {message && <p className="text-sm text-cyan-300">{message}</p>}
                <button
                  type="submit"
                  disabled={submittingJob}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingJob ? 'Posting job...' : 'Post job'}
                </button>
              </form>
            </div>
          </div>

          {/* Existing job list; each card switches between read and edit modes. */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold">Posted jobs</h2>

            {loading ? (
              <p className="mt-5 text-slate-400">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="mt-5 text-slate-400">No jobs posted yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {jobs.map((job) => (
                  <div key={job._id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    {editJobId === job._id ? (
                      <div className="space-y-3">
                        <input
                          value={editForm.title}
                          onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                          placeholder="Job title"
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                          rows={4}
                          placeholder="Description"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            value={editForm.location}
                            onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                            placeholder="Location"
                          />
                          <input
                            value={editForm.category}
                            onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                            placeholder="Category"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            type="number"
                            value={editForm.salaryMin}
                            onChange={(event) => setEditForm((current) => ({ ...current, salaryMin: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                            placeholder="Min salary"
                          />
                          <input
                            type="number"
                            value={editForm.salaryMax}
                            onChange={(event) => setEditForm((current) => ({ ...current, salaryMax: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                            placeholder="Max salary"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            value={editForm.jobType}
                            onChange={(event) => setEditForm((current) => ({ ...current, jobType: event.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                          >
                            <option>Full Time</option>
                            <option>Part Time</option>
                            <option>Contract</option>
                            <option>Remote</option>
                            <option>Internship</option>
                          </select>
                          <input
                            value={company?.name || companyName}
                            onChange={(event) => setCompanyName(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                            placeholder="Company name"
                            readOnly={Boolean(company)}
                          />
                        </div>
                        <textarea
                          value={editForm.requirements}
                          onChange={(event) => setEditForm((current) => ({ ...current, requirements: event.target.value }))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
                          rows={3}
                          placeholder="Requirements (comma separated)"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveEditedJob(job._id)} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Save changes</button>
                          <button type="button" onClick={() => setEditJobId(null)} className="rounded-full border border-slate-700 px-4 py-2 text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{job.title}</p>
                            <p className="text-sm text-slate-400">{job.company?.name || 'Company'} • {job.location}</p>
                          </div>
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">{job.status || 'Draft'}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => updateJobStatus(job._id, 'Published')} className="rounded-full border border-cyan-500 px-3 py-2 text-xs text-cyan-300">Publish</button>
                          <button type="button" onClick={() => updateJobStatus(job._id, 'Draft')} className="rounded-full border border-slate-700 px-3 py-2 text-xs">Save as draft</button>
                          <button type="button" onClick={() => startEditingJob(job)} className="rounded-full border border-slate-700 px-3 py-2 text-xs">Edit</button>
                          <button type="button" onClick={() => deleteJob(job._id)} className="rounded-full border border-rose-700 px-3 py-2 text-xs text-rose-300">Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
