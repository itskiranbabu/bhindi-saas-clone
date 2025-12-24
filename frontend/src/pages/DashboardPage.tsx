import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    conversations: 0,
    messages: 0,
    agents: 0,
    tools: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [conversations, agents, tools] = await Promise.all([
        apiClient.getConversations(),
        apiClient.getAgents(),
        apiClient.getTools(),
      ]);

      setStats({
        conversations: conversations.length,
        messages: conversations.reduce((acc: number, conv: any) => acc + (conv.messageCount || 0), 0),
        agents: agents.length,
        tools: tools.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Conversations</div>
          <div className="text-3xl font-bold text-gray-900">{stats.conversations}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Messages</div>
          <div className="text-3xl font-bold text-gray-900">{stats.messages}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Active Agents</div>
          <div className="text-3xl font-bold text-gray-900">{stats.agents}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Available Tools</div>
          <div className="text-3xl font-bold text-gray-900">{stats.tools}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to Bhindi SaaS Clone</h2>
        <p className="text-gray-600 mb-4">
          Get started by creating a new conversation or exploring the available agents and tools.
        </p>
        <div className="flex gap-4">
          <a
            href="/chat"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Start Chat
          </a>
          <a
            href="/workspace"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Manage Workspace
          </a>
        </div>
      </div>
    </div>
  );
}
