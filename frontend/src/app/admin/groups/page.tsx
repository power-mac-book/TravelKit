'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

interface Group {
  id: number;
  destination_id: number;
  name: string;
  date_from: string;
  date_to: string;
  min_size: number;
  max_size: number;
  current_size: number;
  base_price: number;
  final_price_per_person: number;
  price_calc?: any;
  status: 'forming' | 'confirmed' | 'full' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

interface GroupStatistics {
  total_groups: number;
  status_breakdown: {
    forming: number;
    confirmed: number;
    full: number;
    cancelled: number;
  };
  recent_groups_7_days: number;
  average_group_size: number;
  active_groups: number;
}

interface Destination {
  id: number;
  name: string;
}

const statusColors = {
  forming: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  full: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function GroupsPage() {
  const { token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [statistics, setStatistics] = useState<GroupStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    destination_id: '',
    status: '',
    skip: 0,
    limit: 20
  });

  // Create new group form state
  const [newGroup, setNewGroup] = useState({
    destination_id: '',
    name: '',
    date_from: '',
    date_to: '',
    min_size: 4,
    max_size: 20,
    base_price: '',
    admin_notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    fetchDestinations();
    fetchStatistics();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.destination_id) queryParams.append('destination_id', filters.destination_id);
      if (filters.status) queryParams.append('status', filters.status);
      queryParams.append('skip', filters.skip.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`http://localhost:8000/api/v1/groups?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchDestinations = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/destinations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDestinations(data);
      }
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/groups/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const groupData = {
        ...newGroup,
        destination_id: parseInt(newGroup.destination_id),
        base_price: parseFloat(newGroup.base_price),
        final_price_per_person: parseFloat(newGroup.base_price) // Will be calculated by backend
      };

      const response = await fetch('http://localhost:8000/api/v1/groups/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      setShowCreateForm(false);
      setNewGroup({
        destination_id: '',
        name: '',
        date_from: '',
        date_to: '',
        min_size: 4,
        max_size: 20,
        base_price: '',
        admin_notes: ''
      });
      fetchData();
      fetchStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleStatusChange = async (groupId: number, newStatus: string) => {
    try {
      let endpoint = `http://localhost:8000/api/v1/groups/${groupId}`;
      let method = 'PUT';
      let body: any = { status: newStatus };

      // Use specific endpoints for confirm/cancel
      if (newStatus === 'confirmed') {
        endpoint = `http://localhost:8000/api/v1/groups/${groupId}/confirm`;
        method = 'POST';
        body = {};
      } else if (newStatus === 'cancelled') {
        endpoint = `http://localhost:8000/api/v1/groups/${groupId}/cancel`;
        method = 'POST';
        body = {};
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update group status');
      }

      fetchData();
      fetchStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
    }
  };

  const handlePriceUpdate = async (groupId: number, newPrice: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ final_price_per_person: newPrice }),
      });

      if (!response.ok) {
        throw new Error('Failed to update price');
      }

      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading && groups.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Link 
          href="/admin" 
          className="flex items-center hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4 mr-1" />
          Admin Dashboard
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Group Management</span>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin" 
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create New Group
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Groups</h3>
            <p className="text-2xl font-bold text-gray-900">{statistics.total_groups}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Groups</h3>
            <p className="text-2xl font-bold text-green-600">{statistics.active_groups}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Forming</h3>
            <p className="text-2xl font-bold text-yellow-600">{statistics.status_breakdown.forming}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Confirmed</h3>
            <p className="text-2xl font-bold text-green-600">{statistics.status_breakdown.confirmed}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Size</h3>
            <p className="text-2xl font-bold text-blue-600">{statistics.average_group_size}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination
            </label>
            <select
              value={filters.destination_id}
              onChange={(e) => setFilters({ ...filters, destination_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Destinations</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="forming">Forming</option>
              <option value="confirmed">Confirmed</option>
              <option value="full">Full</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Groups Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pricing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {groups.map((group) => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{group.name}</div>
                    <div className="text-sm text-gray-500">ID: {group.id}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {formatDate(group.date_from)} - {formatDate(group.date_to)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {group.current_size} / {group.max_size}
                  </div>
                  <div className="text-xs text-gray-500">
                    Min: {group.min_size}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(group.final_price_per_person)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Base: {formatCurrency(group.base_price)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[group.status]}`}>
                    {group.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    {group.status === 'forming' && group.current_size >= group.min_size && (
                      <button
                        onClick={() => handleStatusChange(group.id, 'confirmed')}
                        className="text-green-600 hover:text-green-900 text-xs"
                      >
                        Confirm
                      </button>
                    )}
                    {group.status !== 'cancelled' && (
                      <button
                        onClick={() => handleStatusChange(group.id, 'cancelled')}
                        className="text-red-600 hover:text-red-900 text-xs"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="text-blue-600 hover:text-blue-900 text-xs"
                    >
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destination
                  </label>
                  <select
                    value={newGroup.destination_id}
                    onChange={(e) => setNewGroup({ ...newGroup, destination_id: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Destination</option>
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newGroup.date_from}
                      onChange={(e) => setNewGroup({ ...newGroup, date_from: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newGroup.date_to}
                      onChange={(e) => setNewGroup({ ...newGroup, date_to: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Size
                    </label>
                    <input
                      type="number"
                      value={newGroup.min_size}
                      onChange={(e) => setNewGroup({ ...newGroup, min_size: parseInt(e.target.value) })}
                      min="2"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Size
                    </label>
                    <input
                      type="number"
                      value={newGroup.max_size}
                      onChange={(e) => setNewGroup({ ...newGroup, max_size: parseInt(e.target.value) })}
                      min="2"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (₹)
                  </label>
                  <input
                    type="number"
                    value={newGroup.base_price}
                    onChange={(e) => setNewGroup({ ...newGroup, base_price: e.target.value })}
                    required
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={newGroup.admin_notes}
                    onChange={(e) => setNewGroup({ ...newGroup, admin_notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Group Details</h2>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedGroup.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[selectedGroup.status]}`}>
                    {selectedGroup.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dates</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedGroup.date_from)} - {formatDate(selectedGroup.date_to)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Size</label>
                  <p className="text-sm text-gray-900">
                    {selectedGroup.current_size} / {selectedGroup.max_size} (Min: {selectedGroup.min_size})
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Price</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedGroup.base_price)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Final Price</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      defaultValue={selectedGroup.final_price_per_person}
                      step="0.01"
                      className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                      onBlur={(e) => {
                        const newPrice = parseFloat(e.target.value);
                        if (newPrice !== selectedGroup.final_price_per_person) {
                          handlePriceUpdate(selectedGroup.id, newPrice);
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500">₹ per person</span>
                  </div>
                </div>
              </div>
              {selectedGroup.admin_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedGroup.admin_notes}
                  </p>
                </div>
              )}
              {selectedGroup.price_calc && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pricing Calculation</label>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(selectedGroup.price_calc, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}