'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import Header from '@/components/Header';
import { useDestinations, useCreateInterest } from '@/lib/queries';
import { MapPin, Users, Calendar, Mail, Phone, MessageSquare, ArrowRight, Star, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

// Simple UUID generator function
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface FormData {
  user_name: string;
  user_email: string;
  user_phone: string;
  destination_id: number;
  num_people: number;
  date_from: string;
  date_to: string;
  budget_min?: number;
  budget_max?: number;
  special_requests?: string;
}

export default function ExpressInterestPage() {
  const { data: destinations } = useDestinations();
  const createInterest = useCreateInterest();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      num_people: 2,
    }
  });

  const watchedDestination = watch('destination_id');
  const selectedDestination = destinations?.find(d => d.id === parseInt(watchedDestination?.toString() || '0'));

  const onSubmit = async (data: FormData) => {
    if (!data.destination_id) {
      toast.error('Please select a destination');
      return;
    }

    setIsSubmitting(true);
    try {
      const interestData = {
        ...data,
        client_uuid: generateUUID(),
        destination_id: parseInt(data.destination_id.toString()),
        budget_min: data.budget_min || undefined,
        budget_max: data.budget_max || undefined,
      };

      await createInterest.mutateAsync(interestData);
      toast.success('Interest submitted successfully! We\'ll find you a perfect group match.');
      reset();
    } catch (error) {
      toast.error('Failed to submit interest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Express Your Travel Interest
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-green-100">
            Tell us where you want to go and we'll match you with like-minded travelers for the best group experience
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-300" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-300" />
              <span>2,500+ Happy Travelers</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-300" />
              <span>15-40% Savings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interest Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Start Your Journey
                </h2>
                <p className="text-lg text-gray-600">
                  Fill out your travel preferences and we'll find the perfect group for you
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      {...register('user_name', { required: 'Name is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                    {errors.user_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.user_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      {...register('user_email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                    {errors.user_email && (
                      <p className="text-red-500 text-sm mt-1">{errors.user_email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      {...register('user_phone')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+91 9876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Group Size *
                    </label>
                    <select
                      {...register('num_people', { required: 'Group size is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {[1,2,3,4,5,6,7,8].map(num => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'Person' : 'People'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Destination Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Destination *
                  </label>
                  <select
                    {...register('destination_id', { required: 'Destination is required' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select your dream destination</option>
                    {destinations?.map(destination => (
                      <option key={destination.id} value={destination.id}>
                        {destination.name} - {destination.location} (Starting from ₹{destination.base_price?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {errors.destination_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.destination_id.message}</p>
                  )}
                  
                  {selectedDestination && (
                    <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800">{selectedDestination.name}</h4>
                      <p className="text-green-700 text-sm">{selectedDestination.description}</p>
                      <p className="text-green-600 text-sm mt-1">
                        Base Price: ₹{selectedDestination.base_price?.toLocaleString()} 
                        <span className="ml-2 text-xs">💰 Save up to {Math.round((selectedDestination.max_discount || 0.25) * 100)}% with group booking!</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Travel Dates */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      From Date *
                    </label>
                    <input
                      type="date"
                      {...register('date_from', { required: 'Start date is required' })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {errors.date_from && (
                      <p className="text-red-500 text-sm mt-1">{errors.date_from.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      To Date *
                    </label>
                    <input
                      type="date"
                      {...register('date_to', { required: 'End date is required' })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {errors.date_to && (
                      <p className="text-red-500 text-sm mt-1">{errors.date_to.message}</p>
                    )}
                  </div>
                </div>

                {/* Budget Range */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Range (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        {...register('budget_min')}
                        placeholder="Min ₹"
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        {...register('budget_max')}
                        placeholder="Max ₹"
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Per person budget range</p>
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Special Requests (Optional)
                  </label>
                  <textarea
                    {...register('special_requests')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Any dietary preferences, accessibility needs, or special interests..."
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Express Interest Now
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center text-sm text-gray-500">
                  <p>✨ No commitment required • 🔄 Free to modify • 🛡️ 100% secure</p>
                  <p className="mt-2">
                    Need help? <Link href="/how-it-works" className="text-green-600 hover:underline">Learn how it works</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Travelers Trust TravelKit</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Perfect Group Matches</h4>
              <p className="text-gray-600">97% satisfaction rate with our intelligent matching algorithm</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Verified Destinations</h4>
              <p className="text-gray-600">Curated experiences with trusted local partners</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">24/7 Support</h4>
              <p className="text-gray-600">Dedicated support team available throughout your journey</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}