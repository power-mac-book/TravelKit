'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTraveler } from '@/contexts/TravelerContext';
import TravelerLayout from '@/components/TravelerLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Filter,
  Search,
  Eye,
  Trash2,
  Edit3,
  RefreshCw
} from 'lucide-react';

interface Interest {
  id: number;
  destination_id: number;
  destination_name: string;
  destination_location: string;
  travel_dates: {
    date_from: string;
    date_to: string;
    date_flexibility: 'exact' | 'flexible';
  };
  group_size: number;
  budget_per_person: number;
  special_requirements?: string;
  status: 'open' | 'matched' | 'converted' | 'expired';
  created_at: string;
  updated_at: string;
  matched_group?: {
    id: number;
    total_members: number;
    group_price_per_person: number;
    status: 'forming' | 'confirmed' | 'completed';
  };
}

interface InterestsResponse {
  interests: Interest[];
  total: number;
  by_status?: {
    open: number;
    matched: number;
    converted: number;
    expired: number;
  };
}

const fetchInterests = async (token: string): Promise<InterestsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/interests`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // For development, return mock data if API is not available
    if (response.status === 404 || response.status === 500) {
      console.warn('API not available, using mock data for interests');
      return {
        interests: [],
        total: 0,
        by_status: {
          open: 0,
          matched: 0,
          converted: 0,
          expired: 0,
        },
      };
    }
    throw new Error('Failed to fetch interests');
  }

  return response.json();
};

const deleteInterest = async (token: string, interestId: number): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/interests/${interestId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete interest');
  }
};

export default function InterestsPage() {
  const { user, token, loading } = useTraveler();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const { data: interestsData, isLoading, error, refetch } = useQuery({
    queryKey: ['traveler-interests'],
    queryFn: () => fetchInterests(token!),
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: (interestId: number) => deleteInterest(token!, interestId),
    onSuccess: () => {
      toast.success('Interest deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['traveler-interests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete interest');
    },
  });

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/traveler/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter interests based on status and search
  const filteredInterests = (interestsData?.interests || []).filter(interest => {
    const matchesFilter = filter === 'all' || interest.status === filter;
    const matchesSearch = !search || 
      interest.destination_name.toLowerCase().includes(search.toLowerCase()) ||
      interest.destination_location.toLowerCase().includes(search.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleDelete = (interestId: number) => {
    if (confirm('Are you sure you want to delete this interest? This action cannot be undone.')) {
      deleteMutation.mutate(interestId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'matched': return 'bg-green-100 text-green-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Active';
      case 'matched': return 'Group Found';
      case 'converted': return 'Booked';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <TravelerLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Travel Interests</h1>
            <p className="text-gray-600 mt-1">Track your travel interests and group matches</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {interestsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                      <dd className="text-lg font-medium text-gray-900">{interestsData.by_status?.open || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Groups Found</dt>
                      <dd className="text-lg font-medium text-gray-900">{interestsData.by_status?.matched || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Booked</dt>
                      <dd className="text-lg font-medium text-gray-900">{interestsData.by_status?.converted || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                      <dd className="text-lg font-medium text-gray-900">{interestsData.total || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="open">Active</option>
                  <option value="matched">Groups Found</option>
                  <option value="converted">Booked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search destinations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Interests List */}
        {isLoading ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading your interests...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-12 text-center">
              <p className="text-red-600">Error loading interests. Please try again.</p>
              <button
                onClick={() => refetch()}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredInterests.length === 0 ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-12 text-center">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No interests found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : "You haven't expressed interest in any destinations yet"
                }
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/destinations')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Browse Destinations
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredInterests.map((interest) => (
              <div key={interest.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {interest.destination_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(interest.status)}`}>
                          {getStatusText(interest.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <MapPin className="w-4 h-4 mr-1" />
                        {interest.destination_location}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {formatDate(interest.travel_dates.date_from)} - {formatDate(interest.travel_dates.date_to)}
                            {interest.travel_dates.date_flexibility === 'flexible' && (
                              <span className="text-blue-600 ml-1">(Flexible)</span>
                            )}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{interest.group_size} {interest.group_size === 1 ? 'person' : 'people'}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="text-green-600 font-medium">
                            {formatCurrency(interest.budget_per_person)} per person
                          </span>
                        </div>
                      </div>

                      {interest.special_requirements && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <strong>Special Requirements:</strong> {interest.special_requirements}
                          </p>
                        </div>
                      )}

                      {interest.matched_group && (
                        <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-800">
                                Group Found! 🎉
                              </p>
                              <p className="text-sm text-green-700">
                                {interest.matched_group.total_members} members • {formatCurrency(interest.matched_group.group_price_per_person)} per person
                              </p>
                            </div>
                            <button
                              onClick={() => router.push(`/traveler/groups/${interest.matched_group!.id}`)}
                              className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Group
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => router.push(`/destinations/${interest.destination_id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="View destination"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {interest.status === 'open' && (
                        <>
                          <button
                            onClick={() => router.push(`/traveler/interests/${interest.id}/edit`)}
                            className="p-2 text-gray-400 hover:text-green-600"
                            title="Edit interest"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(interest.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                            title="Delete interest"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span>Created {formatDate(interest.created_at)}</span>
                    <span>Updated {formatDate(interest.updated_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TravelerLayout>
  );
}