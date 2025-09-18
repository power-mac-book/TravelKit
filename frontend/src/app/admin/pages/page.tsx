'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import AdminLayout from '../../../components/AdminLayout'
import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

interface Page {
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

export default function PagesManagement() {
  const { user, token, isLoading } = useAuth()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!isLoading && !user) {
      window.location.href = '/admin/login'
      return
    }

    if (user && token) {
      fetchPages()
    }
  }, [user, token, isLoading])

  const fetchPages = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPages(data)
      } else {
        console.error('Failed to fetch pages')
      }
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePublishStatus = async (pageId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pages/admin/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_published: !currentStatus
        }),
      })

      if (response.ok) {
        // Refresh the pages list
        fetchPages()
      } else {
        console.error('Failed to update page status')
      }
    } catch (error) {
      console.error('Error updating page status:', error)
    }
  }

  const deletePage = async (pageId: number) => {
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pages/admin/${pageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // Refresh the pages list
        fetchPages()
      } else {
        console.error('Failed to delete page')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
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
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Link 
            href="/admin" 
            className="flex items-center hover:text-blue-600 transition-colors"
          >
            <Home className="h-4 w-4 mr-1" />
            Admin Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Page Management</span>
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
              <h1 className="text-2xl font-bold text-gray-900">Page Management</h1>
              <p className="text-gray-600">Manage your website pages like Privacy Policy, Terms of Service, etc.</p>
            </div>
          </div>
          <Link
            href="/admin/pages/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create New Page
          </Link>
        </div>

        {/* Pages List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {pages.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-500">
                No pages found. Create your first page to get started.
              </li>
            ) : (
              pages.map((page) => (
                <li key={page.id}>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{page.title}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          page.is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {page.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Slug: /{page.slug}</span>
                        <span>•</span>
                        <span>Created: {new Date(page.created_at).toLocaleDateString()}</span>
                        {page.updated_at && (
                          <>
                            <span>•</span>
                            <span>Updated: {new Date(page.updated_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      {page.meta_description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{page.meta_description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/admin/pages/${page.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => togglePublishStatus(page.id, page.is_published)}
                        className={`text-sm font-medium ${
                          page.is_published 
                            ? 'text-gray-600 hover:text-gray-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {page.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                      <Link
                        href={`/${page.slug}`}
                        target="_blank"
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}