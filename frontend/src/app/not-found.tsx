import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 - Lost in the Travel Dimension | TravelKit',
  description: 'Oops! You\'ve wandered off the beaten path. Let us help you find your way back to amazing destinations.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Funny Travel-themed SVG Illustration */}
        <div className="mb-8">
          <svg
            className="w-64 h-64 mx-auto text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Lost tourist with oversized backpack */}
            <circle cx="200" cy="150" r="25" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3"/>
            {/* Confused face */}
            <circle cx="190" cy="145" r="2" fill="#374151"/>
            <circle cx="210" cy="145" r="2" fill="#374151"/>
            <path d="M185 160 Q200 170 215 160" stroke="#F59E0B" strokeWidth="2" fill="none"/>
            
            {/* Tourist body */}
            <rect x="175" y="175" width="50" height="80" rx="25" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2"/>
            
            {/* Oversized backpack */}
            <ellipse cx="160" cy="190" rx="20" ry="35" fill="#EF4444" stroke="#DC2626" strokeWidth="2"/>
            <rect x="150" y="170" width="20" height="10" rx="5" fill="#F97316"/>
            <rect x="150" y="185" width="20" height="8" rx="4" fill="#F97316"/>
            
            {/* Arms pointing in confusion */}
            <line x1="175" y1="195" x2="140" y2="185" stroke="#FEF3C7" strokeWidth="8" strokeLinecap="round"/>
            <line x1="225" y1="195" x2="260" y2="185" stroke="#FEF3C7" strokeWidth="8" strokeLinecap="round"/>
            
            {/* Legs */}
            <line x1="185" y1="255" x2="185" y2="290" stroke="#FEF3C7" strokeWidth="8" strokeLinecap="round"/>
            <line x1="215" y1="255" x2="215" y2="290" stroke="#FEF3C7" strokeWidth="8" strokeLinecap="round"/>
            
            {/* Travel map falling */}
            <rect x="280" y="120" width="40" height="30" rx="2" fill="#FFFFFF" stroke="#6B7280" strokeWidth="1" transform="rotate(25)"/>
            <line x1="285" y1="125" x2="315" y2="125" stroke="#EF4444" strokeWidth="1" transform="rotate(25)"/>
            <line x1="285" y1="135" x2="310" y2="135" stroke="#10B981" strokeWidth="1" transform="rotate(25)"/>
            <line x1="285" y1="145" x2="305" y2="145" stroke="#3B82F6" strokeWidth="1" transform="rotate(25)"/>
            
            {/* Question marks floating around */}
            <text x="120" y="100" fontSize="24" fill="#6366F1" fontWeight="bold">?</text>
            <text x="280" y="80" fontSize="20" fill="#8B5CF6" fontWeight="bold">?</text>
            <text x="320" y="200" fontSize="18" fill="#EC4899" fontWeight="bold">?</text>
            <text x="80" y="180" fontSize="22" fill="#F59E0B" fontWeight="bold">?</text>
            
            {/* Travel stickers on the ground */}
            <circle cx="120" cy="320" r="8" fill="#F59E0B"/>
            <text x="117" y="325" fontSize="8" fill="white" fontWeight="bold">✈</text>
            <circle cx="280" cy="310" r="8" fill="#EF4444"/>
            <text x="276" y="316" fontSize="8" fill="white" fontWeight="bold">🗺</text>
            
            {/* Dotted confused path */}
            <path
              d="M50 350 Q100 320 150 340 T250 330 T350 350"
              stroke="#6B7280"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />
          </svg>
        </div>

        {/* Humorous heading */}
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          4<span className="text-indigo-600">🧳</span>4
        </h1>
        
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Oops! You've Gone Off the Beaten Path! 🗺️
        </h2>
        
        {/* Funny travel-themed messages */}
        <div className="space-y-4 mb-8">
          <p className="text-xl text-gray-600 leading-relaxed">
            Looks like you've taken a scenic detour into the digital wilderness! 🌲
          </p>
          <p className="text-lg text-gray-500">
            Don't worry, even the best explorers sometimes end up in uncharted territory. 
            <span className="font-medium"> (Like that time you took a "shortcut" on vacation...)</span>
          </p>
          <p className="text-lg text-gray-500">
            The page you're looking for seems to have packed its bags and left for a mystery destination! ✈️
          </p>
        </div>

        {/* Travel puns */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-8 border border-indigo-100">
          <p className="text-lg text-indigo-700 font-medium mb-2">
            🎒 <span className="italic">"Not all who wander are lost... but this page definitely is!"</span>
          </p>
          <p className="text-sm text-gray-500">
            - Probably not J.R.R. Tolkien, but we'll pretend he said it
          </p>
        </div>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Base Camp (Home)
          </Link>
          
          <Link
            href="/destinations"
            className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg border-2 border-indigo-600 hover:bg-indigo-50 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Explore Real Destinations
          </Link>
        </div>

        {/* Fun travel tips */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400 mb-2">
            💡 <span className="font-medium">Pro Travel Tip:</span> Always double-check your URLs, just like you double-check your passport!
          </p>
          <p className="text-xs text-gray-400">
            (And maybe bookmark our destinations page so this doesn't happen again! 😉)
          </p>
        </div>

        {/* Easter egg */}
        <div className="mt-8 opacity-50 hover:opacity-100 transition-opacity duration-300">
          <p className="text-xs text-gray-400">
            🎯 Fun fact: You're now part of the exclusive "Digital Explorer Club" - 
            <br />
            Only the most adventurous visitors find this page!
          </p>
        </div>
      </div>
    </div>
  )
}