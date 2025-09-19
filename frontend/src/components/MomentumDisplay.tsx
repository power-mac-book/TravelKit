'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Flame,
  ArrowUp,
  ArrowDown,
  Clock,
  Users,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

// Momentum Types
interface MomentumMetrics {
  destination_id: number
  destination_name: string
  momentum_score: number
  momentum_level: 'very_high' | 'high' | 'growing' | 'stable' | 'declining'
  change_24h: number
  change_7d: number
  interests_today: number
  interests_yesterday: number
  interests_last_week: number
  unique_users_today: number
  trend_direction: 'up' | 'down' | 'stable'
  alerts: {
    type: 'surge' | 'drop' | 'milestone' | 'threshold'
    message: string
    severity: 'low' | 'medium' | 'high'
    created_at: string
  }[]
  calculated_at: string
}

interface TrendingDestination {
  destination_id: number
  name: string
  country: string
  momentum_score: number
  interest_count: number
  unique_users: number
  trending_rank: number
  momentum_change: number
}

interface MomentumDisplayProps {
  destinationId?: number
  showAlerts?: boolean
  showTrending?: boolean
  autoRefresh?: boolean
  compact?: boolean
}

export function MomentumDisplay({ 
  destinationId,
  showAlerts = true,
  showTrending = true,
  autoRefresh = true,
  compact = false
}: MomentumDisplayProps) {
  const [momentumData, setMomentumData] = useState<MomentumMetrics | null>(null)
  const [trendingDestinations, setTrendingDestinations] = useState<TrendingDestination[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch momentum data
  const fetchMomentumData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (destinationId) {
        // Fetch specific destination momentum
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/momentum/${destinationId}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch momentum data')
        }
        
        const data = await response.json()
        setMomentumData(data)
      }
      
      if (showTrending) {
        // Fetch trending destinations
        const trendingResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/trending?limit=10`
        )
        
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json()
          setTrendingDestinations(trendingData.destinations || [])
        }
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error fetching momentum data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    fetchMomentumData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMomentumData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [destinationId, showTrending, autoRefresh])

  // Get momentum level configuration
  const getMomentumConfig = (level: string, score: number) => {
    switch (level) {
      case 'very_high':
        return {
          color: 'text-red-600 bg-red-100',
          icon: <Flame className="h-4 w-4" />,
          label: 'Very High',
          description: 'Exceptional interest surge',
          emoji: '🔥'
        }
      case 'high':
        return {
          color: 'text-orange-600 bg-orange-100',
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'High',
          description: 'Strong upward trend',
          emoji: '📈'
        }
      case 'growing':
        return {
          color: 'text-green-600 bg-green-100',
          icon: <ArrowUp className="h-4 w-4" />,
          label: 'Growing',
          description: 'Positive momentum',
          emoji: '📊'
        }
      case 'stable':
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: <Activity className="h-4 w-4" />,
          label: 'Stable',
          description: 'Consistent interest',
          emoji: '➡️'
        }
      case 'declining':
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: <TrendingDown className="h-4 w-4" />,
          label: 'Declining',
          description: 'Decreasing interest',
          emoji: '📉'
        }
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: <Activity className="h-4 w-4" />,
          label: 'Unknown',
          description: 'No data available',
          emoji: '❓'
        }
    }
  }

  // Get change indicator
  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return {
        icon: <ArrowUp className="h-3 w-3" />,
        color: 'text-green-600',
        sign: '+'
      }
    } else if (change < 0) {
      return {
        icon: <ArrowDown className="h-3 w-3" />,
        color: 'text-red-600',
        sign: ''
      }
    } else {
      return {
        icon: <Activity className="h-3 w-3" />,
        color: 'text-gray-600',
        sign: ''
      }
    }
  }

  // Get alert severity color
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-orange-200 bg-orange-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  if (compact && momentumData) {
    const config = getMomentumConfig(momentumData.momentum_level, momentumData.momentum_score)
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.emoji}</span>
        <span className="font-medium">{momentumData.momentum_score.toFixed(1)}x</span>
        <Badge variant="secondary" className="text-xs">
          {config.label}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Momentum Display */}
      {momentumData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Momentum Tracker - {momentumData.destination_name}
              </div>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-sm text-gray-500">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMomentumData}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Momentum Score Display */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-4xl">
                  {getMomentumConfig(momentumData.momentum_level, momentumData.momentum_score).emoji}
                </span>
                <div>
                  <div className="text-3xl font-bold">
                    {momentumData.momentum_score.toFixed(1)}x
                  </div>
                  <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                    getMomentumConfig(momentumData.momentum_level, momentumData.momentum_score).color
                  }`}>
                    {getMomentumConfig(momentumData.momentum_level, momentumData.momentum_score).label} Momentum
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                {getMomentumConfig(momentumData.momentum_level, momentumData.momentum_score).description}
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{momentumData.interests_today}</div>
                <div className="text-xs text-gray-600">Today</div>
                <div className={`flex items-center justify-center gap-1 text-xs ${
                  getChangeIndicator(momentumData.change_24h).color
                }`}>
                  {getChangeIndicator(momentumData.change_24h).icon}
                  {getChangeIndicator(momentumData.change_24h).sign}{Math.abs(momentumData.change_24h).toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{momentumData.interests_yesterday}</div>
                <div className="text-xs text-gray-600">Yesterday</div>
                <div className="text-xs text-gray-500">Previous day</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{momentumData.interests_last_week}</div>
                <div className="text-xs text-gray-600">Last Week</div>
                <div className={`flex items-center justify-center gap-1 text-xs ${
                  getChangeIndicator(momentumData.change_7d).color
                }`}>
                  {getChangeIndicator(momentumData.change_7d).icon}
                  {getChangeIndicator(momentumData.change_7d).sign}{Math.abs(momentumData.change_7d).toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{momentumData.unique_users_today}</div>
                <div className="text-xs text-gray-600">Unique Users</div>
                <div className="text-xs text-gray-500">Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {showAlerts && momentumData?.alerts && momentumData.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Momentum Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {momentumData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs">
                    {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trending Destinations */}
      {showTrending && trendingDestinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" />
              Trending Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendingDestinations.map((destination, index) => (
                <div
                  key={destination.destination_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-gray-600">
                      #{destination.trending_rank}
                    </div>
                    <div>
                      <div className="font-medium">{destination.name}</div>
                      <div className="text-sm text-gray-500">{destination.country}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{destination.interest_count}</div>
                      <div className="text-gray-500">Interests</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{destination.unique_users}</div>
                      <div className="text-gray-500">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <span className="text-lg">
                          {getMomentumConfig('', destination.momentum_score).emoji}
                        </span>
                        <span className="font-medium">
                          {destination.momentum_score.toFixed(1)}x
                        </span>
                      </div>
                      <div className={`flex items-center justify-center gap-1 ${
                        getChangeIndicator(destination.momentum_change).color
                      }`}>
                        {getChangeIndicator(destination.momentum_change).icon}
                        {getChangeIndicator(destination.momentum_change).sign}{Math.abs(destination.momentum_change).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              <p className="font-medium">Error loading momentum data</p>
              <p className="text-sm">{error}</p>
              <Button 
                onClick={fetchMomentumData}
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
      {isLoading && !momentumData && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading momentum data...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MomentumDisplay