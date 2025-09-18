'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  User, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle,
  Eye,
  Shield,
  Calendar,
  Phone,
  Mail,
  ArrowLeft,
  Home
} from 'lucide-react';
import { format } from 'date-fns';

interface TravelerProfile {
  id: number;
  email: string;
  name: string;
  phone?: string;
  is_admin: boolean;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  nationality?: string;
  is_active: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  documents_verified?: boolean;
  kyc_status?: string;
  created_at: string;
  updated_at?: string;
}

const fetchTravelers = async (): Promise<TravelerProfile[]> => {
  const token = localStorage.getItem('admin_token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/admin/travelers`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch travelers');
  }

  return response.json();
};

export default function TravelerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerified, setFilterVerified] = useState<string>('all');

  const { data: travelers, isLoading } = useQuery({
    queryKey: ['admin-travelers'],
    queryFn: fetchTravelers,
  });

  const filteredTravelers = travelers?.filter((traveler: any) => {
    const matchesSearch = !searchTerm || 
      traveler.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      traveler.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterVerified === 'all' || 
      (filterVerified === 'verified' && traveler.documents_verified) ||
      (filterVerified === 'unverified' && !traveler.documents_verified);
    
    return matchesSearch && matchesFilter;
  }) || [];

  return (
    <div className="p-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <Link 
          href="/admin" 
          className="flex items-center hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4 mr-1" />
          Admin Dashboard
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Traveler Management</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin" 
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Traveler Management</h1>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search travelers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Travelers</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Travelers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Traveler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading travelers...
                  </td>
                </tr>
              ) : filteredTravelers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No travelers found
                  </td>
                </tr>
              ) : (
                filteredTravelers.map((traveler: any) => (
                  <tr key={traveler.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {traveler.name}
                            </div>
                            {traveler.documents_verified && (
                              <Shield className="ml-2 h-4 w-4 text-green-600" />
                            )}
                            {traveler.is_admin && (
                              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">ID: {traveler.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        {traveler.email}
                      </div>
                      {traveler.phone && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          {traveler.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center">
                          {traveler.is_active ? (
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              <span className="text-sm text-green-600 font-medium">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <XCircle className="h-4 w-4 text-red-600 mr-2" />
                              <span className="text-sm text-red-600 font-medium">Inactive</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          KYC: {traveler.kyc_status || 'pending'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(traveler.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}