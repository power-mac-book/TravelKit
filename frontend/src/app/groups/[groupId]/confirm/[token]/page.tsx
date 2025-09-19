'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  CreditCardIcon,
  UsersIcon,
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface GroupConfirmationData {
  id: number;
  name: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  confirmed_members: number;
  total_members: number;
  price_per_person: number;
  confirmation_deadline: string;
  deposit_amount: number;
  itinerary_highlights: string[];
  members: Array<{
    name: string;
    status: 'confirmed' | 'pending' | 'declined';
  }>;
}

interface ConfirmationStatus {
  id: number;
  confirmed: boolean | null;
  payment_status: 'pending' | 'paid' | 'failed';
  expires_at: string;
  decline_reason?: string;
}

export default function GroupConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { groupId, token } = params;
  
  const [groupData, setGroupData] = useState<GroupConfirmationData | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    fetchConfirmationData();
  }, [groupId, token]);

  const fetchConfirmationData = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/confirm/${token}`);
      if (!response.ok) {
        throw new Error('Failed to fetch confirmation data');
      }
      
      const data = await response.json();
      setGroupData(data.group);
      setConfirmationStatus(data.confirmation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/confirm/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmed: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm participation');
      }

      const result = await response.json();
      
      if (result.payment_required) {
        // Redirect to payment page
        window.location.href = result.payment_url;
      } else {
        // Confirmation successful
        await fetchConfirmationData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError('Please provide a reason for declining');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/confirm/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          confirmed: false,
          decline_reason: declineReason 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to decline participation');
      }

      await fetchConfirmationData();
      setShowDeclineForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day(s) ${hours} hour(s)`;
    return `${hours} hour(s)`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !groupData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-center text-gray-900 mb-2">
            Error Loading Confirmation
          </h1>
          <p className="text-gray-600 text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!groupData || !confirmationStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-center text-gray-900 mb-2">
            Confirmation Not Found
          </h1>
          <p className="text-gray-600 text-center">
            This confirmation link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  // Check if already responded
  if (confirmationStatus.confirmed === true) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
              Confirmation Successful!
            </h1>
            
            {confirmationStatus.payment_status === 'paid' ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Your participation has been confirmed and payment is complete.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    You're all set for your trip to {groupData.destination_name}!
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Your participation has been confirmed. Complete your payment to secure your spot.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Complete Payment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (confirmationStatus.confirmed === false) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
              Participation Declined
            </h1>
            <p className="text-gray-600 text-center mb-4">
              You have declined to participate in this group trip.
            </p>
            {confirmationStatus.decline_reason && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700">
                  <strong>Reason:</strong> {confirmationStatus.decline_reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main confirmation form
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-6 py-8">
            <h1 className="text-3xl font-bold mb-2">{groupData.name}</h1>
            <div className="flex items-center space-x-4 text-blue-100">
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-1" />
                {groupData.destination_name}
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-1" />
                {formatDate(groupData.start_date)} - {formatDate(groupData.end_date)}
              </div>
            </div>
          </div>

          {/* Time remaining alert */}
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-orange-400 mr-2" />
              <p className="text-orange-700">
                <strong>Time remaining to confirm:</strong> {getTimeRemaining(confirmationStatus.expires_at)}
              </p>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column - Trip Details */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Trip Details</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Price per person</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(groupData.price_per_person)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Deposit required</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(groupData.deposit_amount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Group size</span>
                    <div className="flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      {groupData.confirmed_members}/{groupData.total_members} confirmed
                    </div>
                  </div>
                </div>

                {groupData.itinerary_highlights.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Itinerary Highlights</h3>
                    <ul className="space-y-1">
                      {groupData.itinerary_highlights.map((highlight, index) => (
                        <li key={index} className="text-gray-600 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column - Group Members */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Group Members</h2>
                
                <div className="space-y-2">
                  {groupData.members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{member.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : member.status === 'declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {!showDeclineForm ? (
              <div className="mt-8 flex space-x-4">
                <button
                  onClick={handleConfirmation}
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Confirm & Pay Deposit
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowDeclineForm(true)}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Decline
                </button>
              </div>
            ) : (
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Why are you declining?</h3>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please let us know why you can't join this trip..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={handleDecline}
                    disabled={submitting || !declineReason.trim()}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Processing...' : 'Confirm Decline'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeclineForm(false);
                      setDeclineReason('');
                      setError(null);
                    }}
                    disabled={submitting}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}