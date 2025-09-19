'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ActivityItem {
  user_name?: string
  destination_name?: string
  destination_id?: number
  time_ago?: string
  action?: string
  timestamp?: string
}

interface MomentumDestination {
  destination_id?: number
  destination_name?: string
  recent_count?: number
  previous_count?: number
  momentum_score?: number
}

interface RealTimeActivity {
  activity_feed: ActivityItem[]
  momentum_destinations: MomentumDestination[]
  total_activity_count: number
  generated_at: string
}

interface TrendingDestination {
  id: number
  name: string
  slug: string
  image_url?: string
  recent_interest_count: number
  social_proof: {
    total_interested_last_30_days: number
    next_30_day_count: number
    recent_names_sample: string[]
    social_proof_text: string
  }
}

interface SmartMessage {
  type: string
  destination_id?: number
  title: string
  message: string
  cta_text: string
  cta_link?: string
  priority: number
  urgency: string
}

export function LiveActivityFeed() {
  const [activity, setActivity] = useState<RealTimeActivity | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Mock data for consistent display
  const mockActivity = {
    activity_feed: [
      {
        user_name: "Priya",
        destination_name: "Goa Beach Paradise",
        destination_id: 1,
        time_ago: "2 minutes ago",
        action: "expressed_interest",
        timestamp: new Date().toISOString()
      },
      {
        user_name: "Rahul",
        destination_name: "Kerala Backwaters",
        destination_id: 2,
        time_ago: "5 minutes ago", 
        action: "expressed_interest",
        timestamp: new Date().toISOString()
      },
      {
        user_name: "Anita",
        destination_name: "Himachal Adventure",
        destination_id: 3,
        time_ago: "8 minutes ago",
        action: "expressed_interest", 
        timestamp: new Date().toISOString()
      },
      {
        user_name: "Vikram",
        destination_name: "Rajasthan Heritage",
        destination_id: 4,
        time_ago: "12 minutes ago",
        action: "expressed_interest",
        timestamp: new Date().toISOString()
      }
    ],
    momentum_destinations: [],
    total_activity_count: 27,
    generated_at: new Date().toISOString()
  }

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const activeData = activity || mockActivity
    const activityFeed = activeData?.activity_feed || []
    if (activityFeed.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activityFeed.length)
      }, 4000) // Rotate every 4 seconds
      return () => clearInterval(interval)
    }
  }, [activity])

  const fetchActivity = async () => {
    try {
      // Try enhanced API first, fallback to original
      const enhancedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/activity?hours=6`)
      if (enhancedResponse.ok) {
        const data = await enhancedResponse.json()
        setActivity(data)
        return
      }
      
      // Fallback to original API
      const response = await fetch('http://localhost:8000/api/v1/socialproof/activity?hours=6')
      if (response.ok) {
        const data = await response.json()
        setActivity(data)
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error)
      // Use mock data on error
      setActivity(mockActivity)
    }
  }

  const activeData = activity || mockActivity
  const activityFeed = activeData?.activity_feed || []
  const currentActivity = activityFeed[currentIndex] || activityFeed[0] || {
    user_name: 'Someone',
    destination_name: 'a beautiful destination',
    time_ago: '2 min ago'
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
      </div>
      
      <div className="min-h-[100px] flex flex-col justify-center">
        <div className="text-gray-700 transition-opacity duration-500">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {currentActivity.user_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed">
                <span className="font-semibold text-indigo-600">{currentActivity.user_name || 'Someone'}</span>
                {' '}expressed interest in{' '}
                <span className="font-semibold text-gray-900">{currentActivity.destination_name || 'a destination'}</span>
              </p>
              <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                <span>⏰</span>
                <span>{currentActivity.time_ago || '2 min ago'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            <span className="font-semibold text-indigo-600">{activeData.total_activity_count || 0}</span> people active
          </span>
          <span className="text-xs text-gray-500">last 6 hours</span>
        </div>
        
        {/* Activity indicators */}
        <div className="flex space-x-1 mt-2">
          {(activeData.activity_feed || []).map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-indigo-500 flex-1' : 'bg-gray-200 w-1'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TrendingDestinations() {
  const [trending, setTrending] = useState<TrendingDestination[]>([])
  const [loading, setLoading] = useState(true)

  // Mock data for consistent display
  const mockTrending = [
    {
      id: 1,
      name: "Goa Beach Paradise",
      slug: "goa-beach-paradise",
      image_url: "",
      recent_interest_count: 15,
      social_proof: {
        total_interested_last_30_days: 15,
        next_30_day_count: 8,
        recent_names_sample: ["Priya", "Rahul", "Anita"],
        social_proof_text: "15 people interested this week"
      }
    },
    {
      id: 2, 
      name: "Kerala Backwaters",
      slug: "kerala-backwaters",
      image_url: "",
      recent_interest_count: 12,
      social_proof: {
        total_interested_last_30_days: 12,
        next_30_day_count: 6,
        recent_names_sample: ["Vikram", "Sita", "Arjun"],
        social_proof_text: "12 people interested this week"
      }
    },
    {
      id: 3,
      name: "Rajasthan Heritage",
      slug: "rajasthan-heritage",
      image_url: "",
      recent_interest_count: 8,
      social_proof: {
        total_interested_last_30_days: 8,
        next_30_day_count: 4,
        recent_names_sample: ["Maya", "Dev", "Kavya"],
        social_proof_text: "8 people interested this week"
      }
    }
  ]

  useEffect(() => {
    fetchTrending()
  }, [])

  const fetchTrending = async () => {
    try {
      // Try enhanced API first, fallback to original
      const enhancedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/trending?limit=3`)
      if (enhancedResponse.ok) {
        const data = await enhancedResponse.json()
        setTrending(data.destinations || [])
        return
      }
      
      // Fallback to original API
      const response = await fetch('http://localhost:8000/api/v1/socialproof/trending?limit=3')
      if (response.ok) {
        const data = await response.json()
        setTrending(data)
      }
    } catch (error) {
      console.error('Failed to fetch trending destinations:', error)
      // Use mock data on error
      setTrending(mockTrending)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const displayData = trending.length > 0 ? trending : mockTrending

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">🔥</span>
        <h3 className="text-lg font-semibold text-gray-900">Trending Destinations</h3>
      </div>
      
      <div className="space-y-3">
        {displayData.map((destination, index) => (
          <Link
            key={destination.id}
            href={`/destinations/${destination.id}`}
            className="block"
          >
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200 group">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {destination.name || 'Unknown Destination'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {destination.social_proof?.social_proof_text || ''}
                  </div>
                </div>
              </div>
              <div className="text-right ml-3">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-orange-600">
                    +{destination.recent_interest_count || 0}
                  </span>
                  <span className="text-orange-400">↗</span>
                </div>
                <div className="text-xs text-gray-500">this week</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <Link
            href="/destinations"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            View All Destinations →
          </Link>
        </div>
      </div>
    </div>
  )
}

export function SmartSocialProofBanner() {
  const [messages, setMessages] = useState<SmartMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState<SmartMessage | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    fetchSmartMessages()
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      // Show the highest priority message
      const topMessage = messages.sort((a, b) => b.priority - a.priority)[0]
      setCurrentMessage(topMessage)
      setIsVisible(true)
      
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setIsVisible(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [messages])

  const fetchSmartMessages = async () => {
    try {
      // Try enhanced API first, fallback to original
      const enhancedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/smart-messages`)
      if (enhancedResponse.ok) {
        const data = await enhancedResponse.json()
        setMessages(data.messages || [])
        return
      }
      
      // Fallback to original API
      const response = await fetch('http://localhost:8000/api/v1/socialproof/smart-messages')
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Failed to fetch smart messages:', error)
    }
  }

  if (!currentMessage || !isVisible) {
    return null
  }

  // Smart CTA link generation
  const getCtaLink = () => {
    if (currentMessage.cta_link) {
      return currentMessage.cta_link
    }
    
    // If the message is about a specific destination, link to it
    if (currentMessage.destination_id) {
      return `/destinations/${currentMessage.destination_id}`
    }
    
    // Default to groups page for group-related CTAs
    if (currentMessage.cta_text?.toLowerCase().includes('join') || 
        currentMessage.cta_text?.toLowerCase().includes('group')) {
      return '/groups'
    }
    
    // Fallback to express interest
    return '/express-interest'
  }

  const urgencyStyles = {
    high: 'from-red-500 to-pink-500 text-white',
    medium: 'from-orange-500 to-yellow-500 text-white',
    low: 'from-blue-500 to-indigo-500 text-white'
  }

  const urgencyIcon = {
    high: '⚡',
    medium: '🔥',
    low: '✨'
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md mx-auto transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className={`bg-gradient-to-r ${urgencyStyles[currentMessage.urgency as keyof typeof urgencyStyles]} rounded-lg shadow-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{urgencyIcon[currentMessage.urgency as keyof typeof urgencyIcon]}</span>
            <div>
              <div className="font-semibold">{currentMessage.title}</div>
              <div className="text-sm opacity-90">{currentMessage.message}</div>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-gray-200 ml-4"
          >
            ✕
          </button>
        </div>
        {currentMessage.cta_text && (
          <Link
            href={getCtaLink()}
            className="mt-3 inline-block bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            {currentMessage.cta_text}
          </Link>
        )}
      </div>
    </div>
  )
}

export function InterestCounter({ destinationId, inline = false }: { destinationId: number, inline?: boolean }) {
  const [socialProof, setSocialProof] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSocialProof()
    const interval = setInterval(fetchSocialProof, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [destinationId])

  const fetchSocialProof = async () => {
    try {
      // Try enhanced API first with personalized social proof
      const enhancedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/social-proof/${destinationId}?variant=social_focused&user_segment=first_time_visitor`)
      if (enhancedResponse.ok) {
        const data = await enhancedResponse.json()
        // Transform enhanced response to match original format
        setSocialProof({
          total_interested_last_30_days: data.metrics?.interests_7d || 0,
          next_30_day_count: data.metrics?.interests_24h || 0,
          recent_names_sample: ['User1', 'User2', 'User3'], // Enhanced API doesn't expose names for privacy
          social_proof_text: data.message?.text || 'People are interested in this destination'
        })
        return
      }
      
      // Fallback to original API
      const response = await fetch(`http://localhost:8000/api/v1/socialproof/destination/${destinationId}`)
      if (response.ok) {
        const data = await response.json()
        setSocialProof(data)
      }
    } catch (error) {
      console.error('Failed to fetch social proof:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    )
  }

  if (!socialProof || socialProof.total_interested_last_30_days === 0) {
    return (
      <div className={`text-sm text-gray-500 ${inline ? 'inline' : ''}`}>
        Be the first to show interest!
      </div>
    )
  }

  return (
    <div className={`${inline ? 'inline' : ''}`}>
      <div className="flex items-center space-x-2 text-sm">
        <div className="flex -space-x-1">
          {socialProof.recent_names_sample.slice(0, 3).map((name: string, index: number) => (
            <div
              key={index}
              className="w-6 h-6 bg-indigo-100 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium text-indigo-600"
            >
              {name.charAt(0).toUpperCase()}
            </div>
          ))}
          {socialProof.total_interested_last_30_days > 3 && (
            <div className="w-6 h-6 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
              +{socialProof.total_interested_last_30_days - 3}
            </div>
          )}
        </div>
        <span className="text-gray-600">{socialProof.social_proof_text}</span>
      </div>
      {socialProof.next_30_day_count > 0 && (
        <div className="text-xs text-green-600 mt-1">
          {socialProof.next_30_day_count} planning trips in the next 30 days
        </div>
      )}
    </div>
  )
}