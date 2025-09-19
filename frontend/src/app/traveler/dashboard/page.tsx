'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTraveler } from '@/contexts/TravelerContext';
import TravelerLayout from '@/components/TravelerLayout';
import { User, FileText, Bell, Settings, LogOut, Shield, Calendar, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  traveler: {
    id: number;
    full_name: string;
    email: string;
    phone?: string;
    is_verified: boolean;
    kyc_status: string;
  };
  interests: {
    total: number;
    by_status: {
      open: number;
      matched: number;
      converted: number;
      expired: number;
    };
  };
  documents: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
  };
}

const fetchDashboardStats = async (token: string): Promise<DashboardStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/summary`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }

  return response.json();
};

export default function TravelerDashboard() {
  const { user, token, logout, loading } = useTraveler();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetchDashboardStats(token!),
    enabled: !!token,
  });

  useEffect(() => {
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

  const handleLogout = () => {
    logout();
    router.push('/traveler/login');
  };

  return (
    <TravelerLayout>
      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Traveler'}!
          </h2>
          <p className="mt-2 text-gray-600">
            Manage your travel documents, track your interests, and join group trips.
          </p>
        </div>

        {/* Verification Status */}
        {user && !user.is_verified && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Account Verification Required
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please upload your documents to verify your account and join group trips.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Documents
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? '...' : stats?.documents?.total || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Verified Documents
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? '...' : stats?.documents?.verified || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Interests
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? '...' : stats?.interests?.total || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Matched Groups
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? '...' : stats?.interests?.by_status?.matched || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                  <p className="text-sm text-gray-500">Upload and manage your travel documents</p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/traveler/documents"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Manage Documents
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-500">Update your personal information</p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/traveler/profile"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Edit Profile
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Interests</h3>
                  <p className="text-sm text-gray-500">View your travel interests and groups</p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/traveler/interests"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  View Interests
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TravelerLayout>
  );
}