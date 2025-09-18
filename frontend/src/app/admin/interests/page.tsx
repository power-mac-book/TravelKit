'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import AdminLayout from '../../../components/AdminLayout'
import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

interface Interest {
  id: number
  destination_id: number
  user_name: string
  user_email: string
  user_phone?: string
  num_people: number
  date_from: string
  date_to: string
  budget_min?: number
  budget_max?: number
  special_requests?: string
  client_uuid: string
  status: string
  group_id?: number
  created_at: string
  updated_at?: string
  destination_name: string
  destination_slug: string
  destination_country: string
}

interface InterestStats {
  total_interests: number
  open_interests: number
  matched_interests: number
  converted_interests: number
  interests_last_7_days: number
  interests_last_30_days: number
  top_destinations: Array<{
    destination_name: string
    destination_id: number
    interest_count: number
  }>
}

export default function AdminInterests() {
  const { user, token, isLoading } = useAuth()
  const [interests, setInterests] = useState<Interest[]>([])
  const [stats, setStats] = useState<InterestStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDestination, setSelectedDestination] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!isLoading && !user) {
      window.location.href = '/admin/login'
      return
    }

    if (user && token) {
      fetchInterests()
      fetchStats()
    }
  }, [user, token, isLoading, selectedStatus, selectedDestination, page])

  const fetchInterests = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        skip: (page * 50).toString(),
        limit: '50'
      })
      
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }
      
      if (selectedDestination !== 'all') {
        params.append('destination_id', selectedDestination)
      }
      
      const response = await fetch(`http://localhost:8000/api/v1/interests/admin/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch interests')
      }

      const data = await response.json()
      
      if (page === 0) {
        setInterests(data)
      } else {
        setInterests(prev => [...prev, ...data])
      }
      
      setHasMore(data.length === 50)
    } catch (error) {
      console.error('Error fetching interests:', error)
      setError('Failed to load interests')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/interests/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const updateInterestStatus = async (interestId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/interests/admin/${interestId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update interest status')
      }

      // Refresh the list
      setPage(0)
      fetchInterests()
      fetchStats()
    } catch (error) {
      console.error('Error updating interest:', error)
      setError('Failed to update interest status')
    }
  }

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status)
    setPage(0)
  }

  const handleDestinationFilter = (destinationId: string) => {
    setSelectedDestination(destinationId)
    setPage(0)
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      open: 'bg-green-100 text-green-800',
      matched: 'bg-blue-100 text-blue-800',
      converted: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified'
    if (min && max) return `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`
    if (min) return `₹${min.toLocaleString()}+`
    if (max) return `Up to ₹${max.toLocaleString()}`
    return 'Not specified'
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AdminLayout>
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
          <span className="text-gray-900 font-medium">Interest Management</span>
        </div>

        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/admin" 
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Interest Management</h1>
              <p className="mt-2 text-sm text-gray-700">
                Manage and track traveler interests across all destinations
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📧</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Interests</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total_interests}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🔓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Open Interests</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.open_interests}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🔗</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Matched</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.matched_interests}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Converted</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.converted_interests}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div className="flex space-x-4">
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={selectedStatus}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="matched">Matched</option>
                    <option value="converted">Converted</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="destination-filter" className="block text-sm font-medium text-gray-700">
                    Destination
                  </label>
                  <select
                    id="destination-filter"
                    value={selectedDestination}
                    onChange={(e) => handleDestinationFilter(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Destinations</option>
                    {stats?.top_destinations.map((dest) => (
                      <option key={dest.destination_id} value={dest.destination_id.toString()}>
                        {dest.destination_name} ({dest.interest_count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interests Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {interests.map((interest) => (
              <li key={interest.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-medium text-sm">
                            {interest.user_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {interest.user_name}
                          </p>
                          <div className="ml-2">
                            {getStatusBadge(interest.status)}
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              📍 {interest.destination_name}, {interest.destination_country}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              👥 {interest.num_people} people
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              📅 {formatDate(interest.date_from)} - {formatDate(interest.date_to)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={interest.status}
                        onChange={(e) => updateInterestStatus(interest.id, e.target.value)}
                        className="block text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="open">Open</option>
                        <option value="matched">Matched</option>
                        <option value="converted">Converted</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</h4>
                      <p className="mt-1 text-sm text-gray-900">{interest.user_email}</p>
                      {interest.user_phone && (
                        <p className="text-sm text-gray-900">{interest.user_phone}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budget</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatBudget(interest.budget_min, interest.budget_max)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(interest.created_at)}
                      </p>
                    </div>
                  </div>

                  {interest.special_requests && (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Special Requests</h4>
                      <p className="mt-1 text-sm text-gray-900">{interest.special_requests}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Load More Button */}
          {hasMore && !loading && (
            <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200">
              <button
                onClick={loadMore}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Load More
              </button>
            </div>
          )}

          {/* Empty State */}
          {interests.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No interests found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No interests match the current filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}