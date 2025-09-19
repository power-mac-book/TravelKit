'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AdminLayout from '@/components/AdminLayout'
import ImageUpload from '@/components/ImageUpload'
import { useParams } from 'next/navigation'

interface UploadedImage {
  id: number
  filename: string
  file_url: string
  thumbnail_url?: string
  file_size: number
  width?: number
  height?: number
  uploaded_at: string
}

interface ItineraryDay {
  day: number
  title: string
  description: string
  activities: string[]
  accommodation?: string
  meals?: string[]
}

interface DestinationForm {
  name: string
  slug: string
  description: string
  location: string
  country: string
  base_price: number
  max_discount: number
  discount_per_member: number
  image_url: string
  gallery: string[]
  itinerary: ItineraryDay[]
  is_active: boolean
}

export default function EditDestination() {
  const { user, token, isLoading } = useAuth()
  const params = useParams()
  const destinationId = params.id as string
  
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<DestinationForm>({
    name: '',
    slug: '',
    description: '',
    location: '',
    country: '',
    base_price: 0,
    max_discount: 0.25,
    discount_per_member: 0.03,
    image_url: '',
    gallery: [],
    itinerary: [],
    is_active: true
  })

  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    if (!isLoading && !user) {
      window.location.href = '/admin/login'
      return
    }

    if (user && token && destinationId) {
      fetchDestination()
    }
  }, [user, token, isLoading, destinationId])

  const fetchDestination = async () => {
    try {
      setFetchLoading(true)
      const response = await fetch(`http://localhost:8000/api/v1/destinations/${destinationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch destination')
      }

      const destination = await response.json()
      setForm({
        name: destination.name || '',
        slug: destination.slug || '',
        description: destination.description || '',
        location: destination.location || '',
        country: destination.country || '',
        base_price: destination.base_price || 0,
        max_discount: destination.max_discount || 0.25,
        discount_per_member: destination.discount_per_member || 0.03,
        image_url: destination.image_url || '',
        gallery: destination.gallery || [],
        itinerary: destination.itinerary && Array.isArray(destination.itinerary) ? destination.itinerary : 
                   destination.itinerary && typeof destination.itinerary === 'object' ? Object.values(destination.itinerary) : 
                   [],
        is_active: destination.is_active !== false
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch destination')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleGalleryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const urls = e.target.value.split('\n').filter(url => url.trim() !== '')
    setForm(prev => ({ ...prev, gallery: urls }))
  }

  const handleImageUpload = (images: UploadedImage[]) => {
    // Set the first image as the main image if not already set
    if (!form.image_url && images.length > 0) {
      setForm(prev => ({ ...prev, image_url: images[0].file_url }))
    }
    
    // Add all uploaded images to gallery
    const newUrls = images.map(img => img.file_url)
    setForm(prev => {
      const uniqueUrls = Array.from(new Set([...prev.gallery, ...newUrls]))
      return {
        ...prev,
        gallery: uniqueUrls
      }
    })
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
  }

  // Itinerary management functions
  const addItineraryDay = () => {
    const newDay: ItineraryDay = {
      day: form.itinerary.length + 1,
      title: '',
      description: '',
      activities: [''],
      accommodation: '',
      meals: ['']
    }
    setForm(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, newDay]
    }))
  }

  const updateItineraryDay = (index: number, field: keyof ItineraryDay, value: any) => {
    setForm(prev => ({
      ...prev,
      itinerary: prev.itinerary.map((day, i) => 
        i === index ? { ...day, [field]: value } : day
      )
    }))
  }

  const removeItineraryDay = (index: number) => {
    setForm(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== index).map((day, i) => ({
        ...day,
        day: i + 1
      }))
    }))
  }

  const addActivity = (dayIndex: number) => {
    const updatedActivities = [...form.itinerary[dayIndex].activities, '']
    updateItineraryDay(dayIndex, 'activities', updatedActivities)
  }

  const updateActivity = (dayIndex: number, activityIndex: number, value: string) => {
    const updatedActivities = form.itinerary[dayIndex].activities.map((activity, i) =>
      i === activityIndex ? value : activity
    )
    updateItineraryDay(dayIndex, 'activities', updatedActivities)
  }

  const removeActivity = (dayIndex: number, activityIndex: number) => {
    const updatedActivities = form.itinerary[dayIndex].activities.filter((_, i) => i !== activityIndex)
    updateItineraryDay(dayIndex, 'activities', updatedActivities)
  }

  const addMeal = (dayIndex: number) => {
    const currentMeals = form.itinerary[dayIndex].meals || []
    const updatedMeals = [...currentMeals, '']
    updateItineraryDay(dayIndex, 'meals', updatedMeals)
  }

  const updateMeal = (dayIndex: number, mealIndex: number, value: string) => {
    const currentMeals = form.itinerary[dayIndex].meals || []
    const updatedMeals = currentMeals.map((meal, i) =>
      i === mealIndex ? value : meal
    )
    updateItineraryDay(dayIndex, 'meals', updatedMeals)
  }

  const removeMeal = (dayIndex: number, mealIndex: number) => {
    const currentMeals = form.itinerary[dayIndex].meals || []
    const updatedMeals = currentMeals.filter((_, i) => i !== mealIndex)
    updateItineraryDay(dayIndex, 'meals', updatedMeals)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Only send fields that are allowed in DestinationUpdate schema
      const updateData = {
        name: form.name?.trim() || '',
        description: form.description?.trim() || '',
        base_price: Number(form.base_price) || 0,
        max_discount: Number(form.max_discount) || 0.25,
        discount_per_member: Number(form.discount_per_member) || 0.03,
        image_url: form.image_url?.trim() || '',
        gallery: Array.isArray(form.gallery) ? form.gallery.filter(url => url.trim()) : [],
        // Convert itinerary array to dict format for backend compatibility
        itinerary: (() => {
          if (!form.itinerary || !Array.isArray(form.itinerary) || form.itinerary.length === 0) {
            return null;
          }
          return form.itinerary.reduce((acc, day, index) => {
            acc[`day_${day.day || index + 1}`] = day
            return acc
          }, {} as Record<string, any>);
        })(),
        is_active: Boolean(form.is_active)
      }

      console.log('Sending update data:', JSON.stringify(updateData, null, 2))

      const response = await fetch(`http://localhost:8000/api/v1/destinations/${destinationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Update failed with status:', response.status)
        console.error('Error response:', errorData)
        
        // Handle validation errors specifically
        if (response.status === 422 && errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            const validationErrors = errorData.detail.map((err: any) => 
              `${err.loc?.join('.')} - ${err.msg}`
            ).join(', ')
            throw new Error(`Validation errors: ${validationErrors}`)
          } else {
            throw new Error(`Validation error: ${errorData.detail}`)
          }
        }
        
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to update destination`)
      }

      setSuccess(true)
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/destinations'
        }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update destination')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || fetchLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading destination...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/admin/destinations'
              }
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Destinations
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Destination</h1>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">Destination updated successfully! Redirecting...</p>
          </div>
        )}

        {/* Error Message */}
        {(error || uploadError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error || uploadError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={form.slug}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (₹) *
                </label>
                <input
                  type="number"
                  id="base_price"
                  name="base_price"
                  value={form.base_price}
                  onChange={handleInputChange}
                  min="0"
                  step="100"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="max_discount" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Discount (%)
                </label>
                <input
                  type="number"
                  id="max_discount"
                  name="max_discount"
                  value={form.max_discount * 100}
                  onChange={(e) => setForm(prev => ({ ...prev, max_discount: parseFloat(e.target.value) / 100 || 0 }))}
                  min="0"
                  max="50"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="discount_per_member" className="block text-sm font-medium text-gray-700 mb-2">
                  Discount per Member (%)
                </label>
                <input
                  type="number"
                  id="discount_per_member"
                  name="discount_per_member"
                  value={form.discount_per_member * 100}
                  onChange={(e) => setForm(prev => ({ ...prev, discount_per_member: parseFloat(e.target.value) / 100 || 0 }))}
                  min="0"
                  max="10"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Images</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images
                </label>
                <ImageUpload
                  multiple={true}
                  onUpload={handleImageUpload}
                  onError={handleUploadError}
                  existingImages={form.gallery}
                  maxFiles={10}
                />
              </div>

              <div>
                <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-2">
                  Main Image URL
                </label>
                <input
                  type="url"
                  id="image_url"
                  name="image_url"
                  value={form.image_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="gallery" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Gallery URLs
                </label>
                <textarea
                  id="gallery"
                  name="gallery"
                  value={form.gallery.join('\n')}
                  onChange={handleGalleryChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Itinerary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Itinerary</h2>
              <button
                type="button"
                onClick={addItineraryDay}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add Day
              </button>
            </div>

            {form.itinerary.map((day, dayIndex) => (
              <div key={dayIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold text-gray-800">Day {day.day}</h3>
                  <button
                    type="button"
                    onClick={() => removeItineraryDay(dayIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove Day
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day Title
                    </label>
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => updateItineraryDay(dayIndex, 'title', e.target.value)}
                      placeholder="e.g., Arrival and Beach Time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={day.description}
                      onChange={(e) => updateItineraryDay(dayIndex, 'description', e.target.value)}
                      rows={3}
                      placeholder="Describe what happens on this day..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Activities
                    </label>
                    {day.activities.map((activity, activityIndex) => (
                      <div key={activityIndex} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={activity}
                          onChange={(e) => updateActivity(dayIndex, activityIndex, e.target.value)}
                          placeholder="Activity description"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeActivity(dayIndex, activityIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addActivity(dayIndex)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      + Add Activity
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accommodation
                    </label>
                    <input
                      type="text"
                      value={day.accommodation || ''}
                      onChange={(e) => updateItineraryDay(dayIndex, 'accommodation', e.target.value)}
                      placeholder="Hotel/accommodation details"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meals
                    </label>
                    {(day.meals || []).map((meal, mealIndex) => (
                      <div key={mealIndex} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={meal}
                          onChange={(e) => updateMeal(dayIndex, mealIndex, e.target.value)}
                          placeholder="Meal description"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeMeal(dayIndex, mealIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addMeal(dayIndex)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      + Add Meal
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {form.itinerary.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No itinerary days added yet.</p>
                <p className="text-sm">Click "Add Day" to start building the itinerary.</p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={form.is_active}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active (visible to users)
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/admin/destinations'
                }
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Destination'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}