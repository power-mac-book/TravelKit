import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: '📊' },
    { name: 'Destinations', href: '/admin/destinations', icon: '🏖️' },
    { name: 'Interests', href: '/admin/interests', icon: '💌' },
    { name: 'Groups', href: '/admin/groups', icon: '👥' },
    { name: 'Travelers', href: '/admin/travelers', icon: '🧳' },
    { name: 'Documents', href: '/admin/documents', icon: '📁' },
    { name: 'Pages', href: '/admin/pages', icon: '📄' },
    { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-indigo-600">
            <h1 className="text-xl font-bold text-white">TravelKit Admin</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {navigation.find(item => item.href === pathname)?.name || 'Admin Panel'}
            </h1>
          </div>
        </header>

        <main className="px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}