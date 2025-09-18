import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Interest {
  id: number
  destination_id: number
  user_name: string
  user_email: string
  user_phone?: string
  num_people: number
  date_from: string
  date_to: string
  budget_min?: number
  budget_max?: number
  special_requests?: string
  client_uuid: string
  status: string
  group_id?: number
  created_at: string
  updated_at?: string
  destination_name?: string
  destination_slug?: string
  destination_country?: string
}

interface InterestStats {
  total_interests: number
  open_interests: number
  matched_interests: number
  converted_interests: number
  interests_last_7_days: number
  interests_last_30_days: number
  top_destinations: Array<{
    destination_name: string
    destination_id: number
    interest_count: number
  }>
}

interface UseInterestsOptions {
  status?: string
  destination_id?: number
  skip?: number
  limit?: number
}

export function useInterests(options: UseInterestsOptions = {}) {
  const { token } = useAuth()
  const [interests, setInterests] = useState<Interest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInterests = async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.status) params.append('status', options.status)
      if (options.destination_id) params.append('destination_id', options.destination_id.toString())
      if (options.skip) params.append('skip', options.skip.toString())
      if (options.limit) params.append('limit', options.limit.toString())

      const response = await fetch(`http://localhost:8000/api/v1/interests/admin/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch interests')
      }

      const data = await response.json()
      setInterests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterests()
  }, [token, options.status, options.destination_id, options.skip, options.limit])

  return {
    interests,
    loading,
    error,
    refetch: fetchInterests
  }
}

export function useInterestStats() {
  const { token } = useAuth()
  const [stats, setStats] = useState<InterestStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('http://localhost:8000/api/v1/interests/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch interest statistics')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [token])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

export function useUpdateInterestStatus() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = async (interestId: number, status: string) => {
    if (!token) return false

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`http://localhost:8000/api/v1/interests/admin/${interestId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update interest status')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    updateStatus,
    loading,
    error
  }
}