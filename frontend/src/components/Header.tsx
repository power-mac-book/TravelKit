import Link from 'next/link';
import { MapPin, Users, Calendar, TrendingUp } from 'lucide-react';

interface HeaderProps {
  className?: string;
}

export default function Header({ className = '' }: HeaderProps) {
  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">TravelKit</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/destinations" 
              className="text-gray-600 hover:text-primary-600 transition-colors"
            >
              Destinations
            </Link>
            <Link 
              href="/how-it-works" 
              className="text-gray-600 hover:text-primary-600 transition-colors"
            >
              How it Works
            </Link>
            <Link 
              href="/groups" 
              className="text-gray-600 hover:text-primary-600 transition-colors"
            >
              Active Groups
            </Link>
          </nav>

          {/* CTA Button */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/express-interest"
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Express Interest
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}