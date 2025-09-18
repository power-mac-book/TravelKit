'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import AdminLayout from '../../../components/AdminLayout'
import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

interface Destination {
  id: number
  name: string
  slug: string
  description: string
  location: string
  country: string
  base_price: number
  max_discount: number
  discount_per_member: number
  image_url?: string
  gallery?: string[]
  itinerary?: any
  is_active: boolean
  created_at: string
  updated_at?: string
  interest_summary?: {
    total_interested_last_30_days: number
    next_30_day_count: number
    recent_names_sample: string
  }
}

export default function AdminDestinations() {
  const { user, token, isLoading } = useAuth()
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    if (!isLoading && !user) {
      window.location.href = '/admin/login'
      return
    }

    if (user && token) {
      fetchDestinations()
    }
  }, [user, token, isLoading, showInactive])

  const fetchDestinations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = showInactive 
        ? 'http://localhost:8000/api/v1/destinations/admin/all?include_inactive=true'
        : 'http://localhost:8000/api/v1/destinations/admin/all'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch destinations')
      }

      const data = await response.json()
      setDestinations(data)
    } catch (error) {
      console.error('Error fetching destinations:', error)
      setError('Failed to load destinations')
    } finally {
      setLoading(false)
    }
  }

  const toggleDestinationStatus = async (destinationId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/destinations/${destinationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update destination status')
      }

      // Refresh the list
      fetchDestinations()
    } catch (error) {
      console.error('Error updating destination:', error)
      setError('Failed to update destination status')
    }
  }

  const deleteDestination = async (destinationId: number) => {
    if (!confirm('Are you sure you want to delete this destination? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/destinations/${destinationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete destination')
      }

      // Refresh the list
      fetchDestinations()
    } catch (error) {
      console.error('Error deleting destination:', error)
      setError('Failed to delete destination')
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
          <span className="text-gray-900 font-medium">Destinations</span>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link 
              href="/admin" 
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Destinations</h1>
              <p className="text-gray-600">Manage your travel destinations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Show inactive</span>
            </label>
            <Link
              href="/admin/destinations/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add Destination
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination) => (
            <div
              key={destination.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                !destination.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Image */}
              <div className="h-48 bg-gray-200 relative">
                {destination.image_url ? (
                  <img
                    src={destination.image_url}
                    alt={destination.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl">🏖️</span>
                  </div>
                )}
                {!destination.is_active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                    Inactive
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {destination.name}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  {destination.location}, {destination.country}
                </p>
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                  {destination.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Base Price:</span>
                    <p className="font-medium">₹{destination.base_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Interested (30d):</span>
                    <p className="font-medium">
                      {destination.interest_summary?.total_interested_last_30_days || 0}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/destinations/${destination.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleDestinationStatus(destination.id, destination.is_active)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {destination.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <button
                    onClick={() => deleteDestination(destination.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {destinations.length === 0 && !loading && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">🏖️</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No destinations found</h3>
            <p className="text-gray-600 mb-8">
              {showInactive 
                ? 'No destinations (including inactive) found.' 
                : 'Get started by creating your first destination.'
              }
            </p>
            <Link
              href="/admin/destinations/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Add First Destination
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}