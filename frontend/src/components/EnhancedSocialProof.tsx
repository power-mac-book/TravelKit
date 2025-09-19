'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Users, Clock, DollarSign, AlertTriangle, Activity } from 'lucide-react'

// Enhanced Social Proof Types
interface SocialProofVariant {
  value: string
  label: string
  description: string
  icon: React.ReactNode
  example: string
}

interface UserSegment {
  value: string
  label: string
  description: string
  characteristics: string[]
}

interface PersonalizedMessage {
  destination_id: number
  variant: string
  user_segment: string
  message: {
    text: string
    type: string
    confidence: number
  }
  metrics: {
    interests_24h: number
    interests_7d: number
    momentum: number
    unique_visitors_today: number
  }
  generated_at: string
}

interface TrendingDestination {
  destination_id: number
  name: string
  country: string
  interest_count: number
  unique_users: number
  avg_group_size: number
  momentum_score: number
  trending_rank: number
}

// A/B Testing Variants Configuration
const SOCIAL_PROOF_VARIANTS: SocialProofVariant[] = [
  {
    value: 'urgency_focused',
    label: 'Urgency Focused',
    description: 'Creates urgency with scarcity messaging',
    icon: <AlertTriangle className="h-4 w-4" />,
    example: 'Only 3 spots left!'
  },
  {
    value: 'social_focused',
    label: 'Social Focused',
    description: 'Emphasizes social proof and community',
    icon: <Users className="h-4 w-4" />,
    example: '15 people interested this week'
  },
  {
    value: 'momentum_focused',
    label: 'Momentum Focused',
    description: 'Highlights trending and growth metrics',
    icon: <TrendingUp className="h-4 w-4" />,
    example: '🔥 50% more interest than usual!'
  },
  {
    value: 'benefit_focused',
    label: 'Benefit Focused',
    description: 'Emphasizes savings and group discounts',
    icon: <DollarSign className="h-4 w-4" />,
    example: 'Save ₹8,000 with group pricing'
  },
  {
    value: 'deadline_focused',
    label: 'Deadline Focused',
    description: 'Creates urgency with time constraints',
    icon: <Clock className="h-4 w-4" />,
    example: 'Booking closes in 2 days'
  }
]

// User Segments Configuration
const USER_SEGMENTS: UserSegment[] = [
  {
    value: 'first_time_visitor',
    label: 'First-Time Visitor',
    description: 'New users exploring the platform',
    characteristics: ['Trust-building messaging', 'Clear value proposition', 'Safety emphasis']
  },
  {
    value: 'return_visitor',
    label: 'Return Visitor',
    description: 'Users who have visited before',
    characteristics: ['Personalized greetings', 'Activity updates', 'Continuity messaging']
  },
  {
    value: 'budget_conscious',
    label: 'Budget Conscious',
    description: 'Price-sensitive travelers',
    characteristics: ['Savings emphasis', 'Group discount highlights', 'Value messaging']
  },
  {
    value: 'frequent_traveler',
    label: 'Frequent Traveler',
    description: 'Regular platform users',
    characteristics: ['Premium options', 'Exclusive access', 'Advanced features']
  },
  {
    value: 'family_traveler',
    label: 'Family Traveler',
    description: 'Users traveling with families',
    characteristics: ['Family-friendly options', 'Safety emphasis', 'Group activities']
  }
]

interface EnhancedSocialProofProps {
  destinationId?: number
  showVariantSelector?: boolean
  showSegmentSelector?: boolean
  autoRefresh?: boolean
}

export function EnhancedSocialProof({ 
  destinationId = 1, 
  showVariantSelector = true,
  showSegmentSelector = true,
  autoRefresh = true 
}: EnhancedSocialProofProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>('social_focused')
  const [selectedSegment, setSelectedSegment] = useState<string>('first_time_visitor')
  const [personalizedMessage, setPersonalizedMessage] = useState<PersonalizedMessage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch personalized social proof message
  const fetchPersonalizedMessage = async () => {
    if (!destinationId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/social-proof/${destinationId}?variant=${selectedVariant}&user_segment=${selectedSegment}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch personalized message')
      }
      
      const data = await response.json()
      setPersonalizedMessage(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error fetching personalized message:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    fetchPersonalizedMessage()
    
    if (autoRefresh) {
      const interval = setInterval(fetchPersonalizedMessage, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [destinationId, selectedVariant, selectedSegment, autoRefresh])

  // Get variant configuration
  const getCurrentVariant = () => {
    return SOCIAL_PROOF_VARIANTS.find(v => v.value === selectedVariant) || SOCIAL_PROOF_VARIANTS[0]
  }

  // Get segment configuration
  const getCurrentSegment = () => {
    return USER_SEGMENTS.find(s => s.value === selectedSegment) || USER_SEGMENTS[0]
  }

  // Get momentum indicator color and text
  const getMomentumIndicator = (momentum: number) => {
    if (momentum >= 2.0) {
      return { color: 'text-red-600', label: 'Very High', icon: '🔥' }
    } else if (momentum >= 1.5) {
      return { color: 'text-orange-500', label: 'High', icon: '📈' }
    } else if (momentum >= 1.0) {
      return { color: 'text-green-500', label: 'Growing', icon: '📊' }
    } else {
      return { color: 'text-gray-500', label: 'Stable', icon: '➡️' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      {(showVariantSelector || showSegmentSelector) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Enhanced Social Proof Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showVariantSelector && (
              <div className="space-y-2">
                <label className="text-sm font-medium">A/B Testing Variant</label>
                <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_PROOF_VARIANTS.map((variant) => (
                      <SelectItem key={variant.value} value={variant.value}>
                        <div className="flex items-center gap-2">
                          {variant.icon}
                          <div>
                            <div className="font-medium">{variant.label}</div>
                            <div className="text-xs text-gray-500">{variant.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-600">
                  Example: "{getCurrentVariant().example}"
                </div>
              </div>
            )}

            {showSegmentSelector && (
              <div className="space-y-2">
                <label className="text-sm font-medium">User Segment</label>
                <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_SEGMENTS.map((segment) => (
                      <SelectItem key={segment.value} value={segment.value}>
                        <div>
                          <div className="font-medium">{segment.label}</div>
                          <div className="text-xs text-gray-500">{segment.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-600">
                  Characteristics: {getCurrentSegment().characteristics.join(', ')}
                </div>
              </div>
            )}

            <Button 
              onClick={fetchPersonalizedMessage}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Generating...' : 'Generate Preview'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Personalized Message Preview */}
      {personalizedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Personalized Social Proof Message</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{personalizedMessage.variant.replace('_', ' ')}</Badge>
                <Badge variant="outline">{personalizedMessage.user_segment.replace('_', ' ')}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Message */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getCurrentVariant().icon}
                <span className="font-medium text-blue-900">
                  {personalizedMessage.message.type.charAt(0).toUpperCase() + personalizedMessage.message.type.slice(1)} Message
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {Math.round(personalizedMessage.message.confidence * 100)}% confidence
                </Badge>
              </div>
              <p className="text-blue-800 font-medium text-lg">
                {personalizedMessage.message.text}
              </p>
            </div>

            {/* Metrics Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {personalizedMessage.metrics.interests_24h}
                </div>
                <div className="text-xs text-gray-600">Interests (24h)</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {personalizedMessage.metrics.interests_7d}
                </div>
                <div className="text-xs text-gray-600">Interests (7d)</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {personalizedMessage.metrics.unique_visitors_today}
                </div>
                <div className="text-xs text-gray-600">Unique Visitors</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${getMomentumIndicator(personalizedMessage.metrics.momentum).color}`}>
                  {getMomentumIndicator(personalizedMessage.metrics.momentum).icon} {personalizedMessage.metrics.momentum.toFixed(1)}x
                </div>
                <div className="text-xs text-gray-600">
                  Momentum ({getMomentumIndicator(personalizedMessage.metrics.momentum).label})
                </div>
              </div>
            </div>

            {/* Generation Info */}
            <div className="text-xs text-gray-500 text-center">
              Generated at: {new Date(personalizedMessage.generated_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-800 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Error loading social proof</p>
              <p className="text-sm">{error}</p>
              <Button 
                onClick={fetchPersonalizedMessage}
                variant="outline"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !personalizedMessage && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Generating personalized social proof...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EnhancedSocialProof