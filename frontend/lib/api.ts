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

// Token refresh state — prevents multiple concurrent refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors, and skip if this is already a retry or a refresh/login request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== 'undefined' &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/refresh') &&
      !originalRequest.url?.includes('/api/auth/admin/login')
    ) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token available — force logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is already in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = res.data;

        // Store new tokens
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update the default header
        apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;

        // Process queued requests with new token
        processQueue(null, access_token);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh token is also expired or invalid — force logout
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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

export async function syncUserToDialog(userId: string) {
  const res = await apiClient.post(`/api/users/${userId}/sync-dialog`);
  return res.data;
}

export async function syncAllAgentsToDialog() {
  const res = await apiClient.post('/api/users/sync-all-agents');
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

// Campaign Customers
export async function listCampaignCustomers(campaignId: string) {
  const res = await apiClient.get(`/api/campaigns/${campaignId}/customers`);
  return res.data;
}

export async function assignCustomersToCampaign(campaignId: string, customerIds: string[]) {
  const res = await apiClient.post(`/api/campaigns/${campaignId}/customers`, { customer_ids: customerIds });
  return res.data;
}

export async function removeCampaignCustomer(campaignId: string, customerId: string) {
  await apiClient.delete(`/api/campaigns/${campaignId}/customers/${customerId}`);
}

// Campaign Dialog Sync
export async function syncCampaignStatus(campaignId: string) {
  const res = await apiClient.post(`/api/campaigns/${campaignId}/sync-status`);
  return res.data;
}

export async function listMyCampaigns(type?: string, status?: string) {
  const params: any = {};
  if (type) params.type = type;
  if (status) params.status = status;
  const res = await apiClient.get('/api/campaigns/my-campaigns', { params });
  return res.data;
}

export async function dialContact(campaignId: string, customerId: string) {
  const res = await apiClient.post(`/api/campaigns/${campaignId}/dial`, { customer_id: customerId });
  return res.data;
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

export async function listDialogScripts() {
  const res = await apiClient.get('/api/dialog/scripts');
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

export async function deleteTenant(id: string) {
  await apiClient.delete(`/api/admin/tenants/${id}`);
}

export async function listTenantUsers(tenantId: string) {
  const res = await apiClient.get(`/api/admin/tenants/${tenantId}/users`);
  return res.data;
}

export async function getAdminStats() {
  const res = await apiClient.get('/api/admin/stats');
  return res.data;
}

export function formatError(err: any): string {
  const detail = err?.response?.data?.detail;
  if (!detail) {
    return err?.response?.data?.message || err?.message || 'Failed';
  }
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : '';
        return `${field ? field + ': ' : ''}${d.msg}`;
      })
      .join('\n');
  }
  return JSON.stringify(detail);
}

export async function configureDialog(data: { dialog_base_url: string; dialog_api_key: string }) {
  const res = await apiClient.patch('/api/tenant/dialog', data);
  return res.data;
}

export async function manualDial(data: { phone: string; contact_name?: string; customer_id?: string }) {
  const res = await apiClient.post('/api/dial/manual', data);
  return res.data;
}

// -- Agent self-service -----------------------------------------------------

export async function getAgentIncoming() {
  const res = await apiClient.get('/api/agent/me/incoming');
  return res.data;
}

export async function getAgentRecentTransfers() {
  const res = await apiClient.get('/api/agent/me/recent-transfers');
  return res.data;
}

export async function acceptIncomingCall(callId: string) {
  const res = await apiClient.post(`/api/agent/incoming/${callId}/accept`);
  return res.data;
}

export async function rejectIncomingCall(callId: string) {
  const res = await apiClient.post(`/api/agent/incoming/${callId}/reject`);
  return res.data;
}

export async function setMyStatus(status: 'online' | 'away' | 'offline') {
  const res = await apiClient.patch('/api/agent/me/status', { status });
  return res.data;
}

export async function getMyStats() {
  const res = await apiClient.get('/api/agent/me/stats');
  return res.data;
}

// -- Manager live monitor ---------------------------------------------------

export async function getLiveMonitor() {
  const res = await apiClient.get('/api/reports/monitor');
  return res.data;
}
