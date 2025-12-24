import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import toast from 'react-hot-toast';

export default function WorkspacePage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const loadWorkspaceData = async () => {
    try {
      const workspaces = await apiClient.getWorkspaces();
      if (workspaces.length > 0) {
        const ws = workspaces[0];
        setWorkspace(ws);
        const wsMembers = await apiClient.getWorkspaceMembers(ws.id);
        setMembers(wsMembers);
      }
    } catch (error) {
      toast.error('Failed to load workspace data');
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

  if (!workspace) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Workspace Found</h2>
          <p className="text-gray-600">Create a workspace to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Workspace Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Workspace Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <p className="text-gray-900">{workspace.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <p className="text-gray-900">{workspace.slug}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <p className="text-gray-900 capitalize">{workspace.planType}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Members</h2>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{member.user?.fullName || member.user?.email}</p>
                <p className="text-sm text-gray-500">{member.user?.email}</p>
              </div>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800 capitalize">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
