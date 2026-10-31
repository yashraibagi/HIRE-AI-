import { api } from './api';

export async function createJob(_owner, values) {
  const body = {
    ...values,
    required_skills: Array.isArray(values.required_skills)
      ? values.required_skills.map((skill) => skill.trim()).filter(Boolean)
      : values.required_skills.split(',').map((skill) => skill.trim()).filter(Boolean),
    minimum_threshold_score: values.minimum_threshold_score === ''
      ? null
      : Number(values.minimum_threshold_score),
  };
  return (await api.post('/api/jobs', body)).data;
}

export async function updateJob(jobId, values) {
  return (await api.patch(`/api/jobs/${jobId}`, values)).data;
}

export async function listRecruiterJobs() {
  return (await api.get('/api/jobs/mine')).data;
}

export async function listOpenJobs() {
  return (await api.get('/api/jobs')).data;
}

export async function listApplications(jobId) {
  return (await api.get(`/api/jobs/${jobId}/applications`)).data;
}

export async function listRecruiterApplications() {
  return (await api.get('/api/applications/recruiter')).data;
}

export async function listMyApplications() {
  return (await api.get('/api/applications/mine')).data;
}

export async function getMyProfile() {
  return (await api.get('/api/users/me')).data;
}

export async function saveProfileResume(pdfFile) {
  const formData = new FormData();
  formData.append('resume', pdfFile, pdfFile.name || 'resume.pdf');
  return (await api.post('/api/users/me/profile-resume', formData)).data;
}

export async function submitApplication(job, _applicant, { pdfFile, useProfileResume }) {
  const formData = new FormData();
  if (useProfileResume) {
    formData.append('use_profile_resume', 'true');
  } else if (pdfFile) {
    formData.append('resume', pdfFile, pdfFile.name || 'resume.pdf');
  } else {
    throw new Error('Choose your saved profile resume or upload a PDF.');
  }
  return (await api.post(`/api/jobs/${job.id}/apply`, formData)).data;
}

export async function evaluateJobApplications(jobId) {
  return (await api.post(`/api/jobs/${jobId}/evaluate`)).data;
}

export async function updateApplicationStatus(applicationId, status) {
  return (await api.patch(`/api/applications/${applicationId}/status`, { status })).data;
}

export async function shortlistApplication(applicationId) {
  return (await api.post(`/api/applications/${applicationId}/shortlist`)).data;
}

export async function emailCandidate(applicationId, values) {
  return (await api.post(`/api/applications/${applicationId}/email`, values)).data;
}

