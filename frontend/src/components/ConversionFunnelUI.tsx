'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  UserCheck, 
  Phone, 
  CreditCard,
  ChevronDown,
  Filter,
  Calendar,
  Download,
  Info,
  AlertTriangle
} from 'lucide-react'

// Conversion Funnel Types
interface FunnelStage {
  stage: string
  stage_name: string
  count: number
  conversion_rate: number
  drop_off_rate: number
  avg_time_to_next_stage: number // in hours
  stage_description: string
}

interface FunnelData {
  funnel_stages: FunnelStage[]
  total_entries: number
  overall_conversion_rate: number
  time_period: string
  filters_applied: {
    date_range: string
    destination_id?: number
    user_segment?: string
  }
  stage_details: {
    [key: string]: {
      bottlenecks: string[]
      optimization_suggestions: string[]
      benchmark_comparison: {
        industry_avg: number
        previous_period: number
      }
    }
  }
  generated_at: string
}

interface ConversionFunnelProps {
  destinationId?: number
  dateRange?: string
  userSegment?: string
  autoRefresh?: boolean
}

export function ConversionFunnelUI({ 
  destinationId,
  dateRange = '30d',
  userSegment,
  autoRefresh = true
}: ConversionFunnelProps) {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null)
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [showDropOff, setShowDropOff] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    dateRange: dateRange,
    destinationId: destinationId,
    userSegment: userSegment
  })

  // Fetch funnel data
  const fetchFunnelData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        date_range: filters.dateRange,
        ...(filters.destinationId && { destination_id: filters.destinationId.toString() }),
        ...(filters.userSegment && { user_segment: filters.userSegment })
      })
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/advanced-analytics/conversion-funnel?${params}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversion funnel data')
      }
      
      const data = await response.json()
      setFunnelData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error fetching funnel data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    fetchFunnelData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchFunnelData, 300000) // Refresh every 5 minutes
      return () => clearInterval(interval)
    }
  }, [filters, autoRefresh])

  // Get stage icon
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'interest_expressed': return <Users className="h-5 w-5" />
      case 'matched': return <UserCheck className="h-5 w-5" />
      case 'contacted': return <Phone className="h-5 w-5" />
      case 'converted': return <CreditCard className="h-5 w-5" />
      default: return <Users className="h-5 w-5" />
    }
  }

  // Get conversion rate color
  const getConversionRateColor = (rate: number, benchmark?: number) => {
    if (benchmark) {
      if (rate >= benchmark * 1.1) return 'text-green-600'
      if (rate <= benchmark * 0.9) return 'text-red-600'
    }
    
    if (rate >= 50) return 'text-green-600'
    if (rate >= 25) return 'text-orange-500'
    return 'text-red-600'
  }

  // Calculate funnel width for each stage
  const getFunnelWidth = (count: number, totalEntries: number) => {
    return Math.max((count / totalEntries) * 100, 10) // Minimum 10% width
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel Analysis
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDropOff(!showDropOff)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showDropOff ? 'Hide' : 'Show'} Drop-offs
              </Button>
              
              <Button onClick={fetchFunnelData} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Funnel Visualization */}
      {funnelData && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Total Entries: {funnelData.total_entries.toLocaleString()}</span>
              <span>Overall Conversion: {funnelData.overall_conversion_rate.toFixed(1)}%</span>
              <span>Period: {funnelData.time_period}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Funnel Stages */}
              <div className="space-y-4">
                {funnelData.funnel_stages.map((stage, index) => {
                  const isSelected = selectedStage === stage.stage
                  const width = getFunnelWidth(stage.count, funnelData.total_entries)
                  const stageDetails = funnelData.stage_details[stage.stage]
                  
                  return (
                    <div key={stage.stage} className="relative">
                      {/* Main Stage */}
                      <div
                        className={`relative bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg cursor-pointer transition-all duration-300 ${
                          isSelected ? 'ring-4 ring-blue-300 scale-105' : 'hover:scale-102'
                        }`}
                        style={{ width: `${width}%` }}
                        onClick={() => setSelectedStage(isSelected ? '' : stage.stage)}
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStageIcon(stage.stage)}
                            <div>
                              <div className="font-semibold">{stage.stage_name}</div>
                              <div className="text-xs opacity-90">{stage.stage_description}</div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold">{stage.count.toLocaleString()}</div>
                            <div className="text-xs opacity-90">
                              {stage.conversion_rate.toFixed(1)}% conversion
                            </div>
                          </div>
                        </div>
                        
                        {/* Drop-off Indicator */}
                        {index < funnelData.funnel_stages.length - 1 && (
                          <div className="absolute -bottom-2 right-4 bg-red-500 text-white px-2 py-1 rounded text-xs">
                            -{stage.drop_off_rate.toFixed(1)}% drop-off
                          </div>
                        )}
                      </div>
                      
                      {/* Stage Details (Expanded) */}
                      {isSelected && stageDetails && (
                        <Card className="mt-3 border-blue-200 bg-blue-50">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Bottlenecks */}
                              <div>
                                <h4 className="font-medium text-red-600 mb-2 flex items-center gap-1">
                                  <AlertTriangle className="h-4 w-4" />
                                  Bottlenecks
                                </h4>
                                <ul className="text-sm space-y-1">
                                  {stageDetails.bottlenecks.map((bottleneck, idx) => (
                                    <li key={idx} className="text-red-700">• {bottleneck}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              {/* Optimization Suggestions */}
                              <div>
                                <h4 className="font-medium text-green-600 mb-2">
                                  Optimization Suggestions
                                </h4>
                                <ul className="text-sm space-y-1">
                                  {stageDetails.optimization_suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="text-green-700">• {suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              {/* Benchmarks */}
                              <div>
                                <h4 className="font-medium text-blue-600 mb-2">Benchmarks</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Industry Avg:</span>
                                    <span className={getConversionRateColor(
                                      stage.conversion_rate, 
                                      stageDetails.benchmark_comparison.industry_avg
                                    )}>
                                      {stageDetails.benchmark_comparison.industry_avg.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Previous Period:</span>
                                    <span className={
                                      stage.conversion_rate > stageDetails.benchmark_comparison.previous_period 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                    }>
                                      {stageDetails.benchmark_comparison.previous_period.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Avg Time to Next:</span>
                                    <span className="text-gray-600">
                                      {stage.avg_time_to_next_stage}h
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {funnelData.total_entries.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {funnelData.overall_conversion_rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Conversion</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {funnelData.funnel_stages[funnelData.funnel_stages.length - 1]?.count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Conversions</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(funnelData.funnel_stages.reduce((sum, stage) => sum + stage.avg_time_to_next_stage, 0) / funnelData.funnel_stages.length).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Avg Journey Time</div>
                </div>
              </div>
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
              <p className="font-medium">Error loading conversion funnel</p>
              <p className="text-sm">{error}</p>
              <Button 
                onClick={fetchFunnelData}
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
      {isLoading && !funnelData && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 animate-pulse" />
              <p>Loading conversion funnel data...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ConversionFunnelUI