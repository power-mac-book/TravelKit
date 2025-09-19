'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Activity, 
  TrendingUp, 
  Users, 
  Target,
  RefreshCw,
  Eye,
  BarChart3
} from 'lucide-react'

import EnhancedSocialProof from '@/components/EnhancedSocialProof'
import UserSegmentationUI from '@/components/UserSegmentationUI'
import MomentumDisplay from '@/components/MomentumDisplay'

export default function EnhancedSocialProofDashboard() {
  const [selectedDestination, setSelectedDestination] = useState<number>(1)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  // Mock destinations for the demo
  const mockDestinations = [
    { id: 1, name: 'Goa Beach Paradise', country: 'India' },
    { id: 2, name: 'Kerala Backwaters', country: 'India' },
    { id: 3, name: 'Himachal Adventure', country: 'India' },
    { id: 4, name: 'Rajasthan Heritage', country: 'India' }
  ]

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <TrendingUp className="h-6 w-6" />
                  Enhanced Social Proof Dashboard
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Advanced A/B testing, user segmentation, and momentum tracking for social proof optimization
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {mockDestinations.map((dest) => (
                    <option key={dest.id} value={dest.id}>
                      {dest.name}
                    </option>
                  ))}
                </select>
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="ab-testing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ab-testing" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              A/B Testing
            </TabsTrigger>
            <TabsTrigger value="segmentation" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Segmentation
            </TabsTrigger>
            <TabsTrigger value="momentum" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Momentum Tracking
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          {/* A/B Testing Tab */}
          <TabsContent value="ab-testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  A/B Testing Variants
                </CardTitle>
                <p className="text-gray-600">
                  Test different social proof messaging strategies and measure their effectiveness
                </p>
              </CardHeader>
              <CardContent>
                <EnhancedSocialProof
                  key={`ab-${refreshKey}`}
                  destinationId={selectedDestination}
                  showVariantSelector={true}
                  showSegmentSelector={true}
                  autoRefresh={true}
                />
              </CardContent>
            </Card>

            {/* A/B Testing Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Variant Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Urgency Focused</span>
                    <Badge variant="default">24.3% CTR</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Social Focused</span>
                    <Badge variant="secondary">19.8% CTR</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Momentum Focused</span>
                    <Badge variant="outline">21.5% CTR</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Conversion Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">+18.5%</div>
                    <div className="text-sm text-gray-600">Interest Conversion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">+12.3%</div>
                    <div className="text-sm text-gray-600">Group Formation</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Statistical Significance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">98.7%</div>
                    <div className="text-sm text-gray-600">Confidence Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">2,847</div>
                    <div className="text-sm text-gray-600">Sample Size</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Segmentation Tab */}
          <TabsContent value="segmentation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  User Segmentation Management
                </CardTitle>
                <p className="text-gray-600">
                  Create and manage user segments for personalized social proof messaging
                </p>
              </CardHeader>
              <CardContent>
                <UserSegmentationUI
                  key={`segmentation-${refreshKey}`}
                  adminMode={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Momentum Tracking Tab */}
          <TabsContent value="momentum" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Momentum Tracking
                </CardTitle>
                <p className="text-gray-600">
                  Monitor destination momentum, trending indicators, and automated alerts
                </p>
              </CardHeader>
              <CardContent>
                <MomentumDisplay
                  key={`momentum-${refreshKey}`}
                  destinationId={selectedDestination}
                  showAlerts={true}
                  showTrending={true}
                  autoRefresh={true}
                  compact={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">87.3%</div>
                    <div className="text-sm text-gray-600">Social Proof Effectiveness</div>
                    <div className="text-xs text-green-600 mt-1">+12.5% vs last month</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">156</div>
                    <div className="text-sm text-gray-600">Active A/B Tests</div>
                    <div className="text-xs text-blue-600 mt-1">23 with significance</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">8.2x</div>
                    <div className="text-sm text-gray-600">Avg Momentum Score</div>
                    <div className="text-xs text-green-600 mt-1">+2.1x vs baseline</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">24.8%</div>
                    <div className="text-sm text-gray-600">Personalization Lift</div>
                    <div className="text-xs text-green-600 mt-1">vs generic messaging</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Status & Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Enhanced APIs Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Enhanced Social Proof API</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>User Segmentation API</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Momentum Tracking API</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>A/B Testing Engine</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Auto-refresh Interval</span>
                        <span className="text-gray-600">30 seconds</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Default Variant</span>
                        <span className="text-gray-600">social_focused</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Momentum Threshold</span>
                        <span className="text-gray-600">2.0x</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Statistical Confidence</span>
                        <span className="text-gray-600">95%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline">
                    Export A/B Test Results
                  </Button>
                  <Button variant="outline">
                    Download Segment Report
                  </Button>
                  <Button variant="outline">
                    Configure Alerts
                  </Button>
                  <Button variant="outline">
                    System Health Check
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}