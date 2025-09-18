'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import AdminLayout from '../../../../components/AdminLayout'
import ImageUpload from '../../../../components/ImageUpload'

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
  itinerary: any
  is_active: boolean
}

export default function NewDestination() {
  const { user, token, isLoading } = useAuth()
  const [loading, setLoading] = useState(false)
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
    itinerary: {},
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
  }, [user, token, isLoading])

  // Auto-generate slug from name
  useEffect(() => {
    if (form.name) {
      const slug = form.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setForm(prev => ({ ...prev, slug }))
    }
  }, [form.name])

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
    setForm(prev => ({ 
      ...prev, 
      gallery: [...prev.gallery, ...newUrls]
    }))
    
    setUploadError(null)
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/v1/destinations/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create destination')
      }

      setSuccess(true)
      // Redirect after a brief delay
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/destinations'
        }
      }, 2000)

    } catch (error) {
      console.error('Error creating destination:', error)
      setError(error instanceof Error ? error.message : 'Failed to create destination')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
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

  if (success) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Destination Created!</h2>
          <p className="text-gray-600 mb-8">Your new destination has been successfully created.</p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/admin/destinations'
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg"
          >
            Back to Destinations
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Destination</h1>
            <p className="text-gray-600">Add a new travel destination to your platform</p>
          </div>
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
        </div>

        {/* Error Message */}
        {(error || uploadError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error || uploadError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Basic Information */}
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
              <p className="text-xs text-gray-500 mt-1">Auto-generated from name, but you can customize it</p>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="e.g., Goa"
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
                placeholder="e.g., India"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Describe this destination..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Pricing */}
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

          {/* Images */}
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
                placeholder="https://example.com/image.jpg or upload above"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be auto-filled with first uploaded image, or enter manually
              </p>
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
                placeholder="Enter one URL per line&#10;https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;(Uploaded images will be added automatically)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Uploaded images are automatically added. You can also add external URLs manually.
              </p>
            </div>
          </div>

          {/* Status */}
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

          {/* Submit */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
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
              {loading ? 'Creating...' : 'Create Destination'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}