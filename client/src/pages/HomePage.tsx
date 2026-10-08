import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const featuredJobs = [
  {
    title: 'Senior Frontend Developer',
    company: 'TechHub Nepal',
    location: 'Kathmandu',
    salary: 'Rs. 120,000 - 180,000',
    type: 'Full Time'
  },
  {
    title: 'Product Designer',
    company: 'MeroWork',
    location: 'Pokhara',
    salary: 'Rs. 90,000 - 140,000',
    type: 'Hybrid'
  },
  {
    title: 'Data Analyst',
    company: 'Himalayan Digital',
    location: 'Lalitpur',
    salary: 'Rs. 70,000 - 110,000',
    type: 'Remote'
  }
];

// Landing page and role-aware navigation for the current session.
export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Global navigation includes a dashboard link selected from the user's role. */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div>
          <h1 className="text-2xl font-semibold">JobFinder Nepal</h1>
          <p className="text-sm text-slate-400">Find the right role in Nepal</p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/jobs" className="hover:text-cyan-400">Jobs</Link>
          {user ? (
            <>
              <Link to={user.role === 'admin' ? '/admin-dashboard' : user.role === 'employer' ? '/employer-dashboard' : '/dashboard'} className="hover:text-cyan-400">
                {user.role === 'admin' ? 'Admin Dashboard' : user.role === 'employer' ? 'Employer Dashboard' : 'Dashboard'}
              </Link>
              <button type="button" onClick={logout} className="rounded-full border border-slate-700 px-4 py-2 font-medium">Log out</button>
            </>
          ) : (
            <Link to="/login" className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950">Sign In</Link>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-20">
        {/* Hero and primary actions */}
        <section className="grid items-center gap-10 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              Modern hiring for Nepal
            </p>
            <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Discover meaningful jobs and connect with top employers across Nepal.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-slate-400">
              From Kathmandu to Pokhara, build a career with smart search, personalized recommendations, and a seamless application flow.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/jobs" className="rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950">Explore Jobs</Link>
              <Link to="/login" className="rounded-full border border-slate-700 px-6 py-3 font-semibold">Post a Job</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h3 className="text-xl font-semibold">Why JobFinder Nepal?</h3>
            <ul className="mt-4 space-y-3 text-slate-400">
              <li>• Smart filters for Nepal locations and salary ranges</li>
              <li>• Resume-based applications and tracking</li>
              <li>• Employer dashboards for hiring workflow</li>
              <li>• Mobile-first experience with dark mode</li>
            </ul>
          </div>
        </section>

        {/* These cards are curated demo content, not API-backed job records. */}
        <section className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Featured jobs</h3>
            <Link to="/jobs" className="text-sm text-cyan-400">View all</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredJobs.map((job) => (
              <article key={job.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <p className="text-sm text-cyan-400">{job.type}</p>
                <h4 className="mt-2 text-xl font-semibold">{job.title}</h4>
                <p className="mt-2 text-slate-400">{job.company}</p>
                <p className="mt-4 text-sm text-slate-300">{job.location}</p>
                <p className="mt-2 text-sm text-slate-300">{job.salary}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}