'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Plane, 
  Baby, 
  Target, 
  Settings,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// User Segment Types
interface UserSegment {
  id: string
  name: string
  description: string
  targeting_rules: {
    visit_count?: { min?: number; max?: number }
    days_since_last_visit?: { min?: number; max?: number }
    avg_session_duration?: { min?: number }
    page_views_per_session?: { min?: number }
    has_previous_bookings?: boolean
    price_sensitivity_score?: { min?: number; max?: number }
    preferred_destinations?: string[]
    travel_frequency?: 'low' | 'medium' | 'high'
    group_size_preference?: { min?: number; max?: number }
    booking_lead_time?: { min?: number; max?: number }
    device_type?: 'mobile' | 'desktop' | 'tablet'
    traffic_source?: string[]
  }
  messaging_preferences: {
    tone: 'formal' | 'casual' | 'friendly' | 'urgent'
    focus: 'price' | 'quality' | 'convenience' | 'social_proof' | 'urgency'
    preferred_channels: string[]
    frequency_cap: number
  }
  is_active: boolean
  created_at: string
  updated_at: string
  total_users?: number
  conversion_rate?: number
}

// Predefined segment templates
const SEGMENT_TEMPLATES: Partial<UserSegment>[] = [
  {
    name: 'First-Time Visitor',
    description: 'New users exploring the platform for the first time',
    targeting_rules: {
      visit_count: { max: 1 },
      has_previous_bookings: false
    },
    messaging_preferences: {
      tone: 'friendly',
      focus: 'social_proof',
      preferred_channels: ['email', 'in_app'],
      frequency_cap: 2
    }
  },
  {
    name: 'Budget Conscious',
    description: 'Price-sensitive travelers looking for deals',
    targeting_rules: {
      price_sensitivity_score: { min: 7 },
      avg_session_duration: { min: 300 }
    },
    messaging_preferences: {
      tone: 'urgent',
      focus: 'price',
      preferred_channels: ['email', 'whatsapp'],
      frequency_cap: 3
    }
  },
  {
    name: 'Frequent Traveler',
    description: 'Regular users with multiple bookings',
    targeting_rules: {
      has_previous_bookings: true,
      travel_frequency: 'high',
      visit_count: { min: 5 }
    },
    messaging_preferences: {
      tone: 'formal',
      focus: 'quality',
      preferred_channels: ['email', 'sms'],
      frequency_cap: 1
    }
  },
  {
    name: 'Family Traveler',
    description: 'Users traveling with families and children',
    targeting_rules: {
      group_size_preference: { min: 3 },
      booking_lead_time: { min: 14 }
    },
    messaging_preferences: {
      tone: 'friendly',
      focus: 'convenience',
      preferred_channels: ['email', 'in_app'],
      frequency_cap: 2
    }
  }
]

interface UserSegmentationUIProps {
  onSegmentUpdate?: (segments: UserSegment[]) => void
  adminMode?: boolean
}

export function UserSegmentationUI({ onSegmentUpdate, adminMode = true }: UserSegmentationUIProps) {
  const [segments, setSegments] = useState<UserSegment[]>([])
  const [selectedSegment, setSelectedSegment] = useState<string>('')
  const [editingSegment, setEditingSegment] = useState<UserSegment | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch existing segments
  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/user-segments`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch user segments')
      }
      
      const data = await response.json()
      setSegments(data.segments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error fetching segments:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Create new segment
  const createSegment = (template?: Partial<UserSegment>) => {
    const newSegment: UserSegment = {
      id: '',
      name: template?.name || '',
      description: template?.description || '',
      targeting_rules: template?.targeting_rules || {},
      messaging_preferences: template?.messaging_preferences || {
        tone: 'friendly',
        focus: 'social_proof',
        preferred_channels: ['email'],
        frequency_cap: 2
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setEditingSegment(newSegment)
    setIsCreating(true)
  }

  // Save segment (create or update)
  const saveSegment = async (segment: UserSegment) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const url = segment.id 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/user-segments/${segment.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/user-segments`
      
      const method = segment.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(segment)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to ${segment.id ? 'update' : 'create'} segment`)
      }
      
      setSuccess(`Segment ${segment.id ? 'updated' : 'created'} successfully`)
      setEditingSegment(null)
      setIsCreating(false)
      fetchSegments()
      
      if (onSegmentUpdate) {
        onSegmentUpdate(segments)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error saving segment:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete segment
  const deleteSegment = async (segmentId: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/enhanced-socialproof/user-segments/${segmentId}`,
        { method: 'DELETE' }
      )
      
      if (!response.ok) {
        throw new Error('Failed to delete segment')
      }
      
      setSuccess('Segment deleted successfully')
      fetchSegments()
      
      if (onSegmentUpdate) {
        onSegmentUpdate(segments.filter(s => s.id !== segmentId))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error deleting segment:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get segment icon
  const getSegmentIcon = (segment: UserSegment) => {
    if (segment.name.toLowerCase().includes('first')) return <UserCheck className="h-4 w-4" />
    if (segment.name.toLowerCase().includes('budget')) return <DollarSign className="h-4 w-4" />
    if (segment.name.toLowerCase().includes('frequent')) return <Plane className="h-4 w-4" />
    if (segment.name.toLowerCase().includes('family')) return <Baby className="h-4 w-4" />
    return <Users className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              User Segmentation Management
            </div>
            {adminMode && (
              <div className="flex items-center gap-2">
                <Select onValueChange={(value) => {
                  if (value === 'custom') {
                    createSegment()
                  } else {
                    const template = SEGMENT_TEMPLATES[parseInt(value)]
                    createSegment(template)
                  }
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Create Segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_TEMPLATES.map((template, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Segment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        
        {/* Status Messages */}
        {error && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        )}
        
        {success && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Segments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment) => (
          <Card key={segment.id} className={`cursor-pointer transition-colors ${
            selectedSegment === segment.id ? 'ring-2 ring-blue-500' : ''
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSegmentIcon(segment)}
                  <span className="font-medium">{segment.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={segment.is_active ? 'default' : 'secondary'}>
                    {segment.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {adminMode && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSegment(segment)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSegment(segment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-3">{segment.description}</p>
              
              {/* Segment Metrics */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">{segment.total_users || 0}</span>
                  <div className="text-gray-500">Users</div>
                </div>
                <div>
                  <span className="font-medium">{((segment.conversion_rate || 0) * 100).toFixed(1)}%</span>
                  <div className="text-gray-500">Conversion</div>
                </div>
              </div>
              
              {/* Messaging Preferences */}
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {segment.messaging_preferences.tone}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {segment.messaging_preferences.focus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segment Editor Modal/Form */}
      {editingSegment && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isCreating ? 'Create New Segment' : 'Edit Segment'}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSegment(null)
                    setIsCreating(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveSegment(editingSegment)}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Segment Name</label>
                <Input
                  value={editingSegment.name}
                  onChange={(e) => setEditingSegment({
                    ...editingSegment,
                    name: e.target.value
                  })}
                  placeholder="Enter segment name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingSegment.is_active}
                  onCheckedChange={(checked) => setEditingSegment({
                    ...editingSegment,
                    is_active: checked
                  })}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editingSegment.description}
                onChange={(e) => setEditingSegment({
                  ...editingSegment,
                  description: e.target.value
                })}
                placeholder="Describe this user segment"
                rows={2}
              />
            </div>

            {/* Targeting Rules */}
            <div>
              <h4 className="font-medium mb-2">Targeting Rules</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label>Visit Count (min-max)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={editingSegment.targeting_rules.visit_count?.min || ''}
                      onChange={(e) => setEditingSegment({
                        ...editingSegment,
                        targeting_rules: {
                          ...editingSegment.targeting_rules,
                          visit_count: {
                            ...editingSegment.targeting_rules.visit_count,
                            min: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        }
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={editingSegment.targeting_rules.visit_count?.max || ''}
                      onChange={(e) => setEditingSegment({
                        ...editingSegment,
                        targeting_rules: {
                          ...editingSegment.targeting_rules,
                          visit_count: {
                            ...editingSegment.targeting_rules.visit_count,
                            max: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        }
                      })}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingSegment.targeting_rules.has_previous_bookings || false}
                    onCheckedChange={(checked) => setEditingSegment({
                      ...editingSegment,
                      targeting_rules: {
                        ...editingSegment.targeting_rules,
                        has_previous_bookings: checked
                      }
                    })}
                  />
                  <label>Has Previous Bookings</label>
                </div>
              </div>
            </div>

            {/* Messaging Preferences */}
            <div>
              <h4 className="font-medium mb-2">Messaging Preferences</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Tone</label>
                  <Select
                    value={editingSegment.messaging_preferences.tone}
                    onValueChange={(value: any) => setEditingSegment({
                      ...editingSegment,
                      messaging_preferences: {
                        ...editingSegment.messaging_preferences,
                        tone: value
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm">Focus</label>
                  <Select
                    value={editingSegment.messaging_preferences.focus}
                    onValueChange={(value: any) => setEditingSegment({
                      ...editingSegment,
                      messaging_preferences: {
                        ...editingSegment.messaging_preferences,
                        focus: value
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                      <SelectItem value="convenience">Convenience</SelectItem>
                      <SelectItem value="social_proof">Social Proof</SelectItem>
                      <SelectItem value="urgency">Urgency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !editingSegment && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Settings className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading user segments...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default UserSegmentationUI