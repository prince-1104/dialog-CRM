import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Axios client with auth header
// ============================================================================

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — redirect to login
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


// ============================================================================
// Auth
// ============================================================================

export async function loginTenantUser(email: string, password: string, tenant_slug: string) {
  const res = await axios.post(`${API_URL}/api/auth/login`, { email, password, tenant_slug });
  return res.data;
}

export async function loginSuperAdmin(email: string, password: string) {
  const res = await axios.post(`${API_URL}/api/auth/admin/login`, { email, password });
  return res.data;
}

export async function getMe() {
  const res = await apiClient.get('/api/auth/me');
  return res.data;
}


// ============================================================================
// Users (Tenant scope)
// ============================================================================

export async function listUsers(role?: string) {
  const params = role ? { role } : {};
  const res = await apiClient.get('/api/users/', { params });
  return res.data;
}

export async function createUser(data: any) {
  const res = await apiClient.post('/api/users/', data);
  return res.data;
}

export async function updateUser(userId: string, data: any) {
  const res = await apiClient.patch(`/api/users/${userId}`, data);
  return res.data;
}

export async function deleteUser(userId: string) {
  await apiClient.delete(`/api/users/${userId}`);
}

export async function updateAvailability(userId: string, status: string) {
  const res = await apiClient.patch(`/api/users/${userId}/availability?status=${status}`);
  return res.data;
}


// ============================================================================
// Campaigns
// ============================================================================

export async function listCampaigns(type?: string, status?: string) {
  const params: any = {};
  if (type) params.type = type;
  if (status) params.status = status;
  const res = await apiClient.get('/api/campaigns/', { params });
  return res.data;
}

export async function createCampaign(data: any) {
  const res = await apiClient.post('/api/campaigns/', data);
  return res.data;
}

export async function updateCampaign(id: string, data: any) {
  const res = await apiClient.patch(`/api/campaigns/${id}`, data);
  return res.data;
}

export async function deleteCampaign(id: string) {
  await apiClient.delete(`/api/campaigns/${id}`);
}

export async function listCampaignAgents(campaignId: string) {
  const res = await apiClient.get(`/api/campaigns/${campaignId}/agents`);
  return res.data;
}

export async function assignAgent(campaignId: string, agentId: string, priority?: number) {
  const res = await apiClient.post(`/api/campaigns/${campaignId}/agents`, { agent_id: agentId, priority: priority || 0 });
  return res.data;
}

export async function unassignAgent(campaignId: string, agentId: string) {
  await apiClient.delete(`/api/campaigns/${campaignId}/agents/${agentId}`);
}


// ============================================================================
// Customers (CRM)
// ============================================================================

export async function listCustomers(params?: { status?: string; search?: string; page?: number }) {
  const res = await apiClient.get('/api/customers/', { params });
  return res.data;
}

export async function createCustomer(data: any) {
  const res = await apiClient.post('/api/customers/', data);
  return res.data;
}

export async function updateCustomer(id: string, data: any) {
  const res = await apiClient.patch(`/api/customers/${id}`, data);
  return res.data;
}

export async function deleteCustomer(id: string) {
  await apiClient.delete(`/api/customers/${id}`);
}

export async function listCustomerNotes(customerId: string) {
  const res = await apiClient.get(`/api/customers/${customerId}/notes`);
  return res.data;
}

export async function createCustomerNote(customerId: string, content: string) {
  const res = await apiClient.post(`/api/customers/${customerId}/notes`, { content });
  return res.data;
}


// ============================================================================
// Scripts
// ============================================================================

export async function listScripts() {
  const res = await apiClient.get('/api/scripts/');
  return res.data;
}

export async function createScript(data: any) {
  const res = await apiClient.post('/api/scripts/', data);
  return res.data;
}

export async function updateScript(id: string, data: any) {
  const res = await apiClient.patch(`/api/scripts/${id}`, data);
  return res.data;
}

export async function deleteScript(id: string) {
  await apiClient.delete(`/api/scripts/${id}`);
}


// ============================================================================
// Dispositions
// ============================================================================

export async function listDispositions() {
  const res = await apiClient.get('/api/dispositions/');
  return res.data;
}

export async function createDisposition(data: any) {
  const res = await apiClient.post('/api/dispositions/', data);
  return res.data;
}


// ============================================================================
// Call Logs (CDR)
// ============================================================================

export async function listCallLogs(params?: { campaign_id?: string; agent_id?: string; direction?: string; page?: number }) {
  const res = await apiClient.get('/api/call-logs/', { params });
  return res.data;
}

export async function createCallLog(data: any) {
  const res = await apiClient.post('/api/call-logs/', data);
  return res.data;
}

export async function updateCallLog(id: string, data: any) {
  const res = await apiClient.patch(`/api/call-logs/${id}`, data);
  return res.data;
}

export async function getCallStats() {
  const res = await apiClient.get('/api/call-logs/stats');
  return res.data;
}


// ============================================================================
// Reports
// ============================================================================

export async function getDashboardStats() {
  const res = await apiClient.get('/api/reports/dashboard');
  return res.data;
}

export async function getCampaignReport(campaignId: string) {
  const res = await apiClient.get(`/api/reports/campaign/${campaignId}`);
  return res.data;
}

export async function getAgentReport() {
  const res = await apiClient.get('/api/reports/agents');
  return res.data;
}


// ============================================================================
// Callbacks
// ============================================================================

export async function listCallbacks(status?: string) {
  const params = status ? { status } : {};
  const res = await apiClient.get('/api/callbacks/', { params });
  return res.data;
}

export async function createCallback(data: any) {
  const res = await apiClient.post('/api/callbacks/', data);
  return res.data;
}


// ============================================================================
// Super Admin
// ============================================================================

export async function listTenants() {
  const res = await apiClient.get('/api/admin/tenants');
  return res.data;
}

export async function createTenant(data: any) {
  const res = await apiClient.post('/api/admin/tenants', data);
  return res.data;
}

export async function updateTenant(id: string, data: any) {
  const res = await apiClient.patch(`/api/admin/tenants/${id}`, data);
  return res.data;
}

export async function listTenantUsers(tenantId: string) {
  const res = await apiClient.get(`/api/admin/tenants/${tenantId}/users`);
  return res.data;
}

export async function getAdminStats() {
  const res = await apiClient.get('/api/admin/stats');
  return res.data;
}
