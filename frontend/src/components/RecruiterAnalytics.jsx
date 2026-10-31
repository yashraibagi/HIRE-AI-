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
  Applied: '#818cf8',
  'Under Review': '#fbbf24',
  Shortlisted: '#34d399',
  Rejected: '#fb7185',
};
const SCORE_COLORS = ['#fb7185', '#fbbf24', '#818cf8', '#34d399'];

function MetricCard({ label, value, detail, icon: Icon, accent }) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-lg p-3 ${accent}`}><Icon size={21} /></span>
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
    <section className="space-y-6 text-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Recruiting insights</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-1 text-slate-600">A live summary of your job openings and applicant pipeline.</p>
        </div>
        <button onClick={loadAnalytics} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading analytics…</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Open jobs" value={jobs.length} detail="Your active job postings" icon={BriefcaseBusiness} accent="bg-indigo-50 text-indigo-600" />
            <MetricCard label="Applicants" value={applications.length} detail="Across all your openings" icon={Users} accent="bg-sky-50 text-sky-600" />
            <MetricCard label="Average match" value={`${averageMatch.toFixed(1)}%`} detail={`${scoredApplications.length} applicants scored`} icon={Target} accent="bg-emerald-50 text-emerald-600" />
            <MetricCard label="Shortlisted" value={shortlisted} detail={applications.length ? `${((shortlisted / applications.length) * 100).toFixed(0)}% of applicants` : 'No applicants yet'} icon={Activity} accent="bg-amber-50 text-amber-600" />
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <BriefcaseBusiness className="mx-auto mb-3 text-slate-400" size={34} />
              <h2 className="font-semibold text-slate-900">Analytics will appear when you post jobs</h2>
              <p className="mt-1 text-sm text-slate-600">Create a job opening to start tracking applicants and match scores.</p>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Applicant statuses</h2>
                <p className="mt-1 text-sm text-slate-600">Current distribution across your hiring pipeline</p>
                {statusData.length ? (
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={48} paddingAngle={3}>
                          {statusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="grid h-64 place-items-center text-sm text-slate-500">No applications yet</div>}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-600">
                  {['Applied', 'Under Review', 'Shortlisted', 'Rejected'].map((status) => (
                    <span key={status} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />{status}: {applications.filter((application) => application.status === status).length}</span>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Match score distribution</h2>
                <p className="mt-1 text-sm text-slate-600">Applicants grouped by resume-to-job match</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a' }} />
                      <Bar dataKey="applicants" name="Applicants" radius={[5, 5, 0, 0]}>
                        {scoreData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <h2 className="font-semibold text-slate-900">Jobs and applicant match</h2>
                <p className="mt-1 text-sm text-slate-600">Applicant volume and average scored match for each opening (up to 8 jobs)</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="title" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a' }} />
                      <Bar yAxisId="left" dataKey="applicants" name="Applicants" fill="#818cf8" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="average" name="Average match %" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Highest matching applicants</h2><p className="mt-1 text-sm text-slate-600">Top candidates across your openings</p></div>
                {topApplicants.length ? (
                  <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">Job</th><th className="px-5 py-3">Match</th><th className="px-5 py-3">ATS</th><th className="px-5 py-3">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">{topApplicants.map((application) => <tr key={application.id}><td className="px-5 py-3"><p className="font-medium text-slate-900">{application.student_name}</p><p className="mt-0.5 text-xs text-slate-500">{application.student_email}</p></td><td className="px-5 py-3 text-slate-700">{application.job_title}</td><td className="px-5 py-3 font-semibold text-emerald-600">{Number(application.match_score).toFixed(1)}%</td><td className="px-5 py-3 text-slate-700">{application.ats_score == null ? '—' : `${Number(application.ats_score).toFixed(1)}%`}</td><td className="px-5 py-3 text-slate-700">{application.status}</td></tr>)}</tbody>
                  </table></div>
                ) : <p className="p-8 text-center text-sm text-slate-500">Scores will appear here after applicants have been evaluated.</p>}
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}
