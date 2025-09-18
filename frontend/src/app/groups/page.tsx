'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Group, Destination } from '@/types';

// Mock data for development (replace with API calls)
const mockGroups = [
  {
    id: 1,
    destination_id: 1,
    name: 'Goa Beach Paradise Group',
    destination: {
      id: 1,
      name: 'Goa Beach Paradise',
      location: 'Goa, India',
      images: ['/api/placeholder/600/400']
    },
    status: 'forming',
    current_size: 6,
    max_size: 12,
    min_size: 6,
    final_price_per_person: 28000,
    base_price: 40000,
    date_from: '2025-12-15',
    date_to: '2025-12-20',
    created_at: '2024-11-15T10:00:00Z'
  },
  {
    id: 2,
    destination_id: 2,
    name: 'Himachal Adventure Trek Group',
    destination: {
      id: 2,
      name: 'Himachal Adventure Trek',
      location: 'Himachal Pradesh, India',
      images: ['/api/placeholder/600/400']
    },
    status: 'confirmed',
    current_size: 8,
    max_size: 10,
    min_size: 6,
    final_price_per_person: 22000,
    base_price: 35000,
    date_from: '2025-11-28',
    date_to: '2025-12-03',
    created_at: '2024-11-10T15:30:00Z'
  },
  {
    id: 3,
    destination_id: 3,
    name: 'Kerala Backwaters & Culture Group',
    destination: {
      id: 3,
      name: 'Kerala Backwaters & Culture',
      location: 'Kerala, India',
      images: ['/api/placeholder/600/400']
    },
    status: 'forming',
    current_size: 4,
    max_size: 15,
    min_size: 8,
    final_price_per_person: 32000,
    base_price: 45000,
    date_from: '2026-01-10',
    date_to: '2026-01-17',
    created_at: '2024-11-20T09:15:00Z'
  },
  {
    id: 4,
    destination_id: 4,
    name: 'Rajasthan Royal Heritage Group',
    destination: {
      id: 4,
      name: 'Rajasthan Royal Heritage',
      location: 'Rajasthan, India',
      images: ['/api/placeholder/600/400']
    },
    status: 'forming',
    current_size: 3,
    max_size: 12,
    min_size: 6,
    final_price_per_person: 35000,
    base_price: 50000,
    date_from: '2026-02-20',
    date_to: '2026-02-28',
    created_at: '2024-11-22T14:45:00Z'
  }
];

interface GroupCardProps {
  group: any;
  onJoinGroup: (groupId: number) => void;
}

function GroupCard({ group, onJoinGroup }: GroupCardProps) {
  const savings = group.base_price - group.final_price_per_person;
  const savingsPercentage = Math.round((savings / group.base_price) * 100);
  const spotsLeft = group.max_size - group.current_size;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'forming': return 'bg-yellow-100 text-yellow-800';
      case 'full': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'forming': return 'Forming';
      case 'full': return 'Full';
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
      {/* Group Image */}
      <div className="relative h-48 bg-gradient-to-r from-blue-400 to-purple-500">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(group.status)}`}>
            {getStatusText(group.status)}
          </span>
        </div>
        <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-1">
          <span className="text-sm font-bold text-green-600">Save {savingsPercentage}%</span>
        </div>
        <div className="absolute bottom-4 left-4 text-white">
          <h3 className="text-xl font-bold">{group.destination.name}</h3>
          <p className="text-sm opacity-90">📍 {group.destination.location}</p>
        </div>
      </div>

      {/* Group Details */}
      <div className="p-6">
        {/* Date Range */}
        <div className="flex items-center text-gray-600 mb-3">
          <span className="text-sm">
            📅 {formatDate(group.date_from)} - {formatDate(group.date_to)}
          </span>
        </div>

        {/* Members Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {group.current_size} of {group.max_size} travelers
            </span>
            <span className="text-sm text-gray-500">
              {spotsLeft} spots left
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(group.current_size / group.max_size) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-2xl font-bold text-gray-900">
              ₹{group.final_price_per_person.toLocaleString()}
            </span>
            <span className="text-lg text-gray-500 line-through">
              ₹{group.base_price.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-green-600 font-medium">
            Save ₹{savings.toLocaleString()} per person!
          </p>
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          {group.status === 'confirmed' ? (
            <button
              onClick={() => onJoinGroup(group.id)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Join Confirmed Group
            </button>
          ) : group.status === 'forming' ? (
            <button
              onClick={() => onJoinGroup(group.id)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Join Forming Group
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-gray-400 text-white py-3 rounded-lg font-medium cursor-not-allowed"
            >
              Group Full
            </button>
          )}
          <Link
            href={`/destinations/${group.destination.id}`}
            className="block w-full text-center border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Destination Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ActiveGroupsPage() {
  const [groups, setGroups] = useState(mockGroups);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const handleJoinGroup = (groupId: number) => {
    // In a real app, this would make an API call to join the group
    console.log('Joining group:', groupId);
    alert('Group join functionality would be implemented here!');
  };

  const filteredGroups = groups.filter(group => {
    if (filter === 'all') return true;
    return group.status === filter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
              <span>←</span>
              <span className="text-xl font-bold">TravelKit</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/destinations" className="text-gray-600 hover:text-gray-900 transition-colors">
                Destinations
              </Link>
              <Link href="/how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </Link>
              <Link href="/express-interest" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Express Interest
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Active Travel Groups
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join existing groups and start your adventure! Save money by traveling with like-minded people.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Groups
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                filter === 'confirmed' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setFilter('forming')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                filter === 'forming' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Forming
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onJoinGroup={handleJoinGroup}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏝️</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No groups found
            </h3>
            <p className="text-gray-600 mb-6">
              No groups match your current filter. Try a different filter or check back later!
            </p>
            <Link
              href="/express-interest"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Express Your Interest
            </Link>
          </div>
        )}

        {/* Call to Action */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Don't See a Group for Your Dream Destination?
          </h2>
          <p className="text-gray-600 mb-6">
            Express your interest and we'll match you with travelers who share your wanderlust!
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/express-interest"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Express Interest
            </Link>
            <Link
              href="/destinations"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Browse All Destinations
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}