import axios from 'axios';
import { auth } from '../firebase';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')
  || (import.meta.env.DEV ? 'http://localhost:8000' : '');
  console.log('API BASE URL:', BASE_URL);

export const api = axios.create({
  baseURL: BASE_URL,
});

function getApiErrorMessage(data, status) {
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((issue) => {
        const location = Array.isArray(issue.loc) ? issue.loc.slice(1).join('.') : '';
        return location ? `${location}: ${issue.msg}` : issue.msg;
      })
      .filter(Boolean)
      .join('; ');
  }
  return data?.message || data?.error || `status ${status}`;
}

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
    config.headers['X-User-Name'] = user.displayName || '';
    config.headers['X-User-Role'] = localStorage.getItem('hireai-role') || 'student';
  }
  return config;
});

/**
 * Uploads a PDF resume and a job description to the backend analyze endpoint.
 * @param {File|Blob} pdfFile - The resume file to upload.
 * @param {string} jobDescription - The job description text.
 * @returns {Promise<any>} - The parsed JSON response from the backend.
 * @throws {Error} - If the request fails, throws an Error with a helpful message.
 */
export async function analyzeResume(pdfFile, jobDescription) {
  try {
    if (!pdfFile) {
      throw new Error('pdfFile is required');
    }

    const formData = new FormData();
    // Use provided filename if available, otherwise fallback to resume.pdf
    const filename = pdfFile.name || 'resume.pdf';
    formData.append('resume', pdfFile, filename);
    formData.append('job_description', jobDescription ?? '');

    const response = await api.post('/analyze', formData);
    return response.data;
  } catch (err) {
    // Build a useful error message depending on axios error shape
    let message = 'Failed to analyze resume';
    if (err && err.response) {
      message = `Analyze failed: ${getApiErrorMessage(err.response.data, err.response.status)}`;
    } else if (err && err.request) {
      // Request was made but no response received
      if (err.code === 'ECONNREFUSED') {
        message = 'Could not reach backend: connection refused';
      } else {
        message = 'No response from backend while analyzing resume';
      }
    } else if (err && err.message) {
      message = err.message;
    }
    throw new Error(message);
  }
}

export async function openResume(resumeUrl) {
  const previewWindow = window.open('about:blank', '_blank');
  if (!previewWindow) throw new Error('Allow pop-ups to preview the resume.');
  try {
    const response = await api.get(resumeUrl, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(response.data);
    previewWindow.location.href = objectUrl;
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}

/**
 * Checks if the backend is reachable.
 * @returns {Promise<boolean>} - True if backend responded successfully; false otherwise.
 */
export async function healthCheck() {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (err) {
    // Any error means the backend isn't available for our purposes
    return false;
  }
}

export { getApiErrorMessage };