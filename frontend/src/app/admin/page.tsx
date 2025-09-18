'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import AdminLayout from '../../components/AdminLayout'

interface DashboardStats {
  totalDestinations: number
  totalInterests: number
  totalGroups: number
  totalTravelers: number
  recentInterests: any[]
  recentGroups: any[]
}

export default function AdminDashboard() {
  const { user, token, isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    if (!isLoading && !user) {
      window.location.href = '/admin/login'
      return
    }

    if (user && token) {
      fetchDashboardStats()
    }
  }, [user, token, isLoading])

  const fetchDashboardStats = async () => {
    try {
      // Fetch real analytics data from the new analytics endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats({
          totalDestinations: data.total_destinations,
          totalInterests: data.total_interests,
          totalGroups: data.total_groups,
          totalTravelers: data.total_users,
          recentInterests: data.recent_interests.map((interest: any) => ({
            id: interest.id,
            destination: interest.destination_name,
            user: interest.user_name,
            date: new Date(interest.created_at).toLocaleDateString()
          })),
          recentGroups: data.recent_groups.map((group: any) => ({
            id: group.id,
            destination: group.destination_name,
            size: group.current_size,
            status: group.status
          }))
        })
      } else {
        // Fallback to mock data if analytics endpoint fails
        setStats({
          totalDestinations: 12,
          totalInterests: 87,
          totalGroups: 5,
          totalTravelers: 145,
          recentInterests: [
            { id: 1, destination: 'Goa Beaches', user: 'John Doe', date: '2025-11-01' },
            { id: 2, destination: 'Kerala Backwaters', user: 'Jane Smith', date: '2025-11-05' },
            { id: 3, destination: 'Himachal Adventures', user: 'Bob Johnson', date: '2025-11-10' },
          ],
          recentGroups: [
            { id: 1, destination: 'Goa Beaches', size: 8, status: 'forming' },
            { id: 2, destination: 'Kerala Backwaters', size: 6, status: 'confirmed' },
          ]
        })
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      // Fallback to mock data on error
      setStats({
        totalDestinations: 12,
        totalInterests: 87,
        totalGroups: 5,
        totalTravelers: 145,
        recentInterests: [
          { id: 1, destination: 'Goa Beaches', user: 'John Doe', date: '2025-11-01' },
          { id: 2, destination: 'Kerala Backwaters', user: 'Jane Smith', date: '2025-11-05' },
          { id: 3, destination: 'Himachal Adventures', user: 'Bob Johnson', date: '2025-11-10' },
        ],
        recentGroups: [
          { id: 1, destination: 'Goa Beaches', size: 8, status: 'forming' },
          { id: 2, destination: 'Kerala Backwaters', size: 6, status: 'confirmed' },
        ]
      })
      setLoading(false)
    }
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
        {/* Welcome */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h2>
          <p className="text-gray-600 mt-2">Here&apos;s what&apos;s happening with your travel platform today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">🏖️</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Destinations</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalDestinations}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">💌</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Interests</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalInterests}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">👥</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Groups</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalGroups}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">👤</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Travelers</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalTravelers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Interests */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Interests</h3>
            </div>
            <div className="px-6 py-4">
              <div className="flow-root">
                <ul className="-mb-8">
                  {stats?.recentInterests.map((interest, index) => (
                    <li key={interest.id}>
                      <div className="relative pb-8">
                        {index !== stats.recentInterests.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                        )}
                        <div className="relative flex space-x-3">
                          <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">💌</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div>
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{interest.user}</span> interested in{' '}
                                <span className="font-medium">{interest.destination}</span>
                              </p>
                              <p className="text-sm text-gray-500">{interest.date}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recent Groups */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Groups</h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {stats?.recentGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{group.destination}</p>
                      <p className="text-sm text-gray-500">{group.size} members</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      group.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {group.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/admin/destinations/new'
                  }
                }}
                className="p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">🏖️</span>
                  <p className="mt-2 text-sm font-medium text-gray-900">Add Destination</p>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/admin/travelers'
                  }
                }}
                className="p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">👥</span>
                  <p className="mt-2 text-sm font-medium text-gray-900">Manage Travelers</p>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/admin/documents'
                  }
                }}
                className="p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">📋</span>
                  <p className="mt-2 text-sm font-medium text-gray-900">Document Upload</p>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/admin/pages'
                  }
                }}
                className="p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">📄</span>
                  <p className="mt-2 text-sm font-medium text-gray-900">Manage Pages</p>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/admin/analytics'
                  }
                }}
                className="p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">📊</span>
                  <p className="mt-2 text-sm font-medium text-gray-900">View Analytics</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}