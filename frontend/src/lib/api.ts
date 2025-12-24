import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(data: { email: string; password: string; fullName: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async verifyToken() {
    const response = await this.client.get('/auth/verify');
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  // User
  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async updateUser(data: any) {
    const response = await this.client.patch('/users/me', data);
    return response.data;
  }

  // Workspaces
  async getWorkspaces() {
    const response = await this.client.get('/workspaces');
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    const response = await this.client.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async getWorkspaceMembers(workspaceId: string) {
    const response = await this.client.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  }

  // Conversations
  async getConversations(workspaceId?: string) {
    const response = await this.client.get('/conversations', {
      params: { workspaceId },
    });
    return response.data;
  }

  async getConversation(conversationId: string) {
    const response = await this.client.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async createConversation(data: { title?: string; workspaceId: string }) {
    const response = await this.client.post('/conversations', data);
    return response.data;
  }

  async sendMessage(conversationId: string, content: string) {
    const response = await this.client.post(`/conversations/${conversationId}/messages`, {
      content,
    });
    return response.data;
  }

  async updateConversation(conversationId: string, data: { title?: string }) {
    const response = await this.client.patch(`/conversations/${conversationId}`, data);
    return response.data;
  }

  async archiveConversation(conversationId: string) {
    const response = await this.client.delete(`/conversations/${conversationId}`);
    return response.data;
  }

  // Agents
  async getAgents(workspaceId?: string) {
    const response = await this.client.get('/agents', {
      params: { workspaceId },
    });
    return response.data;
  }

  async getAgentExecutions(limit?: number) {
    const response = await this.client.get('/agents/executions', {
      params: { limit },
    });
    return response.data;
  }

  // Tools
  async getTools(category?: string) {
    const response = await this.client.get('/tools', {
      params: { category },
    });
    return response.data;
  }

  async getToolExecutions(limit?: number) {
    const response = await this.client.get('/tools/executions', {
      params: { limit },
    });
    return response.data;
  }

  // Workflows
  async getWorkflows(workspaceId?: string) {
    const response = await this.client.get('/workflows', {
      params: { workspaceId },
    });
    return response.data;
  }

  async getWorkflow(workflowId: string) {
    const response = await this.client.get(`/workflows/${workflowId}`);
    return response.data;
  }

  async createWorkflow(data: any) {
    const response = await this.client.post('/workflows', data);
    return response.data;
  }

  async getWorkflowExecutions(workflowId: string, limit?: number) {
    const response = await this.client.get(`/workflows/${workflowId}/executions`, {
      params: { limit },
    });
    return response.data;
  }

  // Subscriptions
  async getSubscription(workspaceId?: string) {
    const response = await this.client.get('/subscriptions', {
      params: { workspaceId },
    });
    return response.data;
  }

  async getUsageQuotas(workspaceId?: string) {
    const response = await this.client.get('/subscriptions/usage', {
      params: { workspaceId },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
