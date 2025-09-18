'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ActivityItem {
  user_name: string
  destination_name: string
  destination_id: number
  time_ago: string
  action: string
  timestamp: string
}

interface MomentumDestination {
  destination_id: number
  destination_name: string
  recent_count: number
  previous_count: number
  momentum_score: number
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

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activity && activity.activity_feed.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activity.activity_feed.length)
      }, 4000) // Rotate every 4 seconds
      return () => clearInterval(interval)
    }
  }, [activity])

  const fetchActivity = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/socialproof/activity?hours=6')
      if (response.ok) {
        const data = await response.json()
        setActivity(data)
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    }
  }

  if (!activity || activity.activity_feed.length === 0) {
    return null
  }

  const currentActivity = activity.activity_feed[currentIndex]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-gray-600">Live Activity</span>
      </div>
      
      <div className="text-sm text-gray-700 transition-opacity duration-300">
        <span className="font-medium text-indigo-600">{currentActivity.user_name}</span>
        {' '}expressed interest in{' '}
        <span className="font-medium">{currentActivity.destination_name}</span>
        <div className="text-xs text-gray-500 mt-1">{currentActivity.time_ago}</div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {activity.total_activity_count} people active in the last 6 hours
      </div>
    </div>
  )
}

export function TrendingDestinations() {
  const [trending, setTrending] = useState<TrendingDestination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrending()
  }, [])

  const fetchTrending = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/socialproof/trending?limit=3')
      if (response.ok) {
        const data = await response.json()
        setTrending(data)
      }
    } catch (error) {
      console.error('Failed to fetch trending destinations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (trending.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-lg">🔥</span>
        <h3 className="font-semibold text-gray-800">Trending Now</h3>
      </div>
      
      <div className="space-y-3">
        {trending.map((destination, index) => (
          <div
            key={destination.id}
            className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex-1">
              <div className="font-medium text-gray-800">{destination.name}</div>
              <div className="text-sm text-gray-600">
                {destination.social_proof.social_proof_text}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-orange-600">
                +{destination.recent_interest_count}
              </div>
              <div className="text-xs text-gray-500">this week</div>
            </div>
          </div>
        ))}
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