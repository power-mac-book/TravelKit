import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTraveler } from '../contexts/TravelerContext'
import { User, FileText, MapPin, Calendar, LogOut } from 'lucide-react'

interface TravelerLayoutProps {
  children: ReactNode
}

export default function TravelerLayout({ children }: TravelerLayoutProps) {
  const { user, logout } = useTraveler()
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/traveler/dashboard', icon: '📊' },
    { name: 'Documents', href: '/traveler/documents', icon: '📁' },
    { name: 'My Interests', href: '/traveler/interests', icon: '💌' },
    { name: 'Profile', href: '/traveler/profile', icon: '👤' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <h1 className="text-xl font-bold text-white">TravelKit</h1>
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
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <User className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.full_name || 'Traveler'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}