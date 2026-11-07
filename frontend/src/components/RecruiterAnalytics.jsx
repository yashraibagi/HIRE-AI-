import { useEffect, useMemo, useState } from 'react';
import { Activity, BriefcaseBusiness, RefreshCw, Target, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { listRecruiterApplications, listRecruiterJobs } from '../services/jobs';

const STATUS_COLORS = {
  Applied: '#a1a1aa',
  'Under Review': '#d4d4d8',
  Shortlisted: '#f4f4f5',
  Rejected: '#71717a',
};
const SCORE_COLORS = ['#52525b', '#71717a', '#a1a1aa', '#f4f4f5'];

function MetricCard({ label, value, detail, icon: Icon, accent }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-md shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">{value}</p>
          <p className="mt-1 text-xs font-light text-zinc-500">{detail}</p>
        </div>
        <span className={`rounded-xl border border-zinc-700 bg-zinc-800/80 p-3 ${accent}`}><Icon size={21} /></span>
      </div>
    </article>
  );
}

export default function RecruiterAnalytics() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const [recruiterJobs, recruiterApplications] = await Promise.all([
        listRecruiterJobs(),
        listRecruiterApplications(),
      ]);
      setJobs(recruiterJobs);
      setApplications(recruiterApplications);
    } catch (loadError) {
      setError(loadError.response?.data?.detail || loadError.message || 'Could not load recruiting analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const scoredApplications = useMemo(
    () => applications.filter((application) =>
      application.match_score != null && Number.isFinite(Number(application.match_score))
    ),
    [applications]
  );
  const averageMatch = scoredApplications.length
    ? scoredApplications.reduce((total, application) => total + Number(application.match_score), 0) / scoredApplications.length
    : 0;
  const shortlisted = applications.filter((application) => application.status === 'Shortlisted').length;

  const statusData = ['Applied', 'Under Review', 'Shortlisted', 'Rejected']
    .map((status) => ({ name: status, value: applications.filter((application) => application.status === status).length }))
    .filter((entry) => entry.value > 0);

  const scoreRanges = [
    { name: 'Below 50%', min: 0, max: 50 },
    { name: '50–69%', min: 50, max: 70 },
    { name: '70–84%', min: 70, max: 85 },
    { name: '85–100%', min: 85, max: 101 },
  ];
  const scoreData = scoreRanges.map((range, index) => ({
    name: range.name,
    applicants: scoredApplications.filter((application) => {
      const score = Number(application.match_score);
      return score >= range.min && score < range.max;
    }).length,
    fill: SCORE_COLORS[index],
  }));

  const jobData = jobs.map((job) => {
    const jobApplications = applications.filter((application) => application.job_id === job.id);
    const jobScores = jobApplications
      .filter((application) => application.match_score != null)
      .map((application) => Number(application.match_score))
      .filter(Number.isFinite);
    return {
      title: job.title.length > 20 ? `${job.title.slice(0, 18)}…` : job.title,
      applicants: jobApplications.length,
      average: jobScores.length
        ? Math.round(jobScores.reduce((total, score) => total + score, 0) / jobScores.length)
        : 0,
    };
  }).slice(0, 8);

  const topApplicants = [...scoredApplications]
    .sort((a, b) => Number(b.match_score) - Number(a.match_score))
    .slice(0, 5);

  return (
    <section className="space-y-6 text-zinc-100 bg-zinc-950 min-h-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Recruiting insights</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-100">Analytics</h1>
          <p className="mt-1 text-sm font-light text-zinc-400">A live summary of your job openings and applicant pipeline.</p>
        </div>
        <button onClick={loadAnalytics} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">{error}</div>}
      {loading ? <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm font-light text-zinc-400 backdrop-blur-md">Loading analytics…</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Open jobs" value={jobs.length} detail="Your active job postings" icon={BriefcaseBusiness} accent="text-zinc-200" />
            <MetricCard label="Applicants" value={applications.length} detail="Across all your openings" icon={Users} accent="text-zinc-200" />
            <MetricCard label="Average match" value={`${averageMatch.toFixed(1)}%`} detail={`${scoredApplications.length} applicants scored`} icon={Target} accent="text-zinc-200" />
            <MetricCard label="Shortlisted" value={shortlisted} detail={applications.length ? `${((shortlisted / applications.length) * 100).toFixed(0)}% of applicants` : 'No applicants yet'} icon={Activity} accent="text-zinc-200" />
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center backdrop-blur-md">
              <BriefcaseBusiness className="mx-auto mb-3 text-zinc-500" size={34} />
              <h2 className="font-semibold text-zinc-100">Analytics will appear when you post jobs</h2>
              <p className="mt-1 text-sm font-light text-zinc-400">Create a job opening to start tracking applicants and match scores.</p>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm backdrop-blur-md">
                <h2 className="font-semibold text-zinc-100">Applicant statuses</h2>
                <p className="mt-1 text-sm font-light text-zinc-400">Current distribution across your hiring pipeline</p>
                {statusData.length ? (
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={48} paddingAngle={3}>
                          {statusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 12, color: '#f4f4f5' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="grid h-64 place-items-center text-sm font-light text-zinc-400">No applications yet</div>}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-light text-zinc-400">
                  {['Applied', 'Under Review', 'Shortlisted', 'Rejected'].map((status) => (
                    <span key={status} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />{status}: {applications.filter((application) => application.status === status).length}</span>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm backdrop-blur-md">
                <h2 className="font-semibold text-zinc-100">Match score distribution</h2>
                <p className="mt-1 text-sm font-light text-zinc-400">Applicants grouped by resume-to-job match</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                      <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 12, color: '#f4f4f5' }} />
                      <Bar dataKey="applicants" name="Applicants" radius={[5, 5, 0, 0]}>
                        {scoreData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm backdrop-blur-md xl:col-span-2">
                <h2 className="font-semibold text-zinc-100">Jobs and applicant match</h2>
                <p className="mt-1 text-sm font-light text-zinc-400">Applicant volume and average scored match for each opening (up to 8 jobs)</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                      <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="title" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 12, color: '#f4f4f5' }} />
                      <Bar yAxisId="left" dataKey="applicants" name="Applicants" fill="#71717a" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="average" name="Average match %" fill="#f4f4f5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm backdrop-blur-md xl:col-span-2">
                <div className="border-b border-zinc-800 px-5 py-4"><h2 className="font-semibold text-zinc-100">Highest matching applicants</h2><p className="mt-1 text-sm font-light text-zinc-400">Top candidates across your openings</p></div>
                {topApplicants.length ? (
                  <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-400"><tr><th className="px-5 py-3 font-medium">Candidate</th><th className="px-5 py-3 font-medium">Job</th><th className="px-5 py-3 font-medium">Match</th><th className="px-5 py-3 font-medium">ATS</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
                    <tbody className="divide-y divide-zinc-800">{topApplicants.map((application) => <tr key={application.id} className="hover:bg-zinc-900/40 transition-colors"><td className="px-5 py-3.5"><p className="font-medium text-zinc-100">{application.student_name}</p><p className="mt-0.5 text-xs font-light text-zinc-400">{application.student_email}</p></td><td className="px-5 py-3.5 text-zinc-300 font-light">{application.job_title}</td><td className="px-5 py-3.5 font-semibold text-zinc-100">{Number(application.match_score).toFixed(1)}%</td><td className="px-5 py-3.5 text-zinc-300 font-light">{application.ats_score == null ? '—' : `${Number(application.ats_score).toFixed(1)}%`}</td><td className="px-5 py-3.5 text-zinc-300 font-light">{application.status}</td></tr>)}</tbody>
                  </table></div>
                ) : <p className="p-8 text-center text-sm font-light text-zinc-400">Scores will appear here after applicants have been evaluated.</p>}
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}