'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../../contexts/AuthContext'
import AdminLayout from '../../../../../components/AdminLayout'
import { useRouter } from 'next/navigation'

interface PageData {
  id: number
  slug: string
  title: string
  content: string
  meta_title?: string
  meta_description?: string
  is_published: boolean
  created_at: string
  updated_at?: string
}

export default function EditPage({ params }: { params: { id: string } }) {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    meta_title: '',
    meta_description: '',
    is_published: true
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!isLoading && !user) {
      window.location.href = '/admin/login'
      return
    }

    if (user && token) {
      fetchPage()
    }
  }, [user, token, isLoading, params.id])

  const fetchPage = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pages/admin/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPageData(data)
        setFormData({
          slug: data.slug,
          title: data.title,
          content: data.content,
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          is_published: data.is_published
        })
      } else if (response.status === 404) {
        alert('Page not found')
        router.push('/admin/pages')
      } else {
        console.error('Failed to fetch page')
      }
    } catch (error) {
      console.error('Error fetching page:', error)
    } finally {
      setPageLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pages/admin/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          is_published: formData.is_published
        }),
      })

      if (response.ok) {
        router.push('/admin/pages')
      } else {
        const errorData = await response.json()
        alert('Failed to update page: ' + (errorData.detail || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating page:', error)
      alert('Failed to update page. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (isLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !pageData) {
    return null
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Page: {pageData.title}</h1>
          <p className="text-gray-600">Update your page content and settings</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow px-6 py-6 rounded-lg">
            <div className="grid grid-cols-1 gap-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Page Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              {/* Slug (read-only) */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                  URL Slug
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    /
                  </span>
                  <input
                    type="text"
                    name="slug"
                    id="slug"
                    value={formData.slug}
                    readOnly
                    className="flex-1 block w-full border-gray-300 rounded-none rounded-r-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  URL slugs cannot be changed after creation to maintain SEO and avoid broken links.
                </p>
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Page Content *
                </label>
                <textarea
                  name="content"
                  id="content"
                  required
                  rows={20}
                  value={formData.content}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">
                  You can use HTML tags for formatting (e.g., &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;, etc.)
                </p>
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-white shadow px-6 py-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
            <div className="grid grid-cols-1 gap-6">
              {/* Meta Title */}
              <div>
                <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="meta_title"
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Leave empty to use page title"
                />
              </div>

              {/* Meta Description */}
              <div>
                <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700">
                  Meta Description
                </label>
                <textarea
                  name="meta_description"
                  id="meta_description"
                  rows={3}
                  value={formData.meta_description}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Brief description of the page for search engines"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Recommended length: 150-160 characters
                </p>
              </div>
            </div>
          </div>

          {/* Publication Settings */}
          <div className="bg-white shadow px-6 py-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Publication Settings</h3>
            <div className="flex items-center">
              <input
                id="is_published"
                name="is_published"
                type="checkbox"
                checked={formData.is_published}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900">
                Publish this page
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              If unchecked, the page will be saved as a draft and won&apos;t be visible to the public.
            </p>
          </div>

          {/* Page Info */}
          <div className="bg-gray-50 px-6 py-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Page Information</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Created: {new Date(pageData.created_at).toLocaleString()}</div>
              {pageData.updated_at && (
                <div>Last Updated: {new Date(pageData.updated_at).toLocaleString()}</div>
              )}
              <div>Page URL: <a href={`/${pageData.slug}`} target="_blank" className="text-indigo-600 hover:text-indigo-900">/{pageData.slug}</a></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/admin/pages')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Page'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}