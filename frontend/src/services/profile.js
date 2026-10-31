import { api } from './api';

export async function getUserProfile() {
  return (await api.get('/api/user/profile')).data;
}

export async function updateUserProfile(values) {
  return (await api.put('/api/user/profile', values)).data;
}

export async function updateUserPreferences(values) {
  return (await api.patch('/api/user/preferences', values)).data;
}

export async function uploadProfileAvatar(imageFile) {
  const formData = new FormData();
  formData.append('avatar', imageFile, imageFile.name);
  return (await api.post('/api/user/profile/avatar', formData)).data;
}

export async function getProfileAvatar() {
  return (await api.get('/api/user/profile/avatar', { responseType: 'blob' })).data;
}

export async function uploadCompanyLogo(imageFile) {
  const formData = new FormData();
  formData.append('logo', imageFile, imageFile.name);
  return (await api.post('/api/user/profile/company-logo', formData)).data;
}

export async function getCompanyLogo() {
  return (await api.get('/api/user/profile/company-logo', { responseType: 'blob' })).data;
}