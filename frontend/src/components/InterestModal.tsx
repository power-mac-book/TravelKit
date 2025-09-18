'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar, Users, Mail, Phone, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { InterestCreate } from '@/types';
import { useCreateInterest } from '@/lib/queries';
import toast from 'react-hot-toast';

interface InterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationId: number;
  destinationName: string;
  basePrice: number;
  prefilledDate?: Date;
}

interface FormData {
  user_name: string;
  user_email: string;
  user_phone: string;
  num_people: number;
  date_from: string;
  date_to: string;
  budget_min?: number;
  budget_max?: number;
  special_requests?: string;
}

export default function InterestModal({ 
  isOpen, 
  onClose, 
  destinationId, 
  destinationName,
  basePrice,
  prefilledDate 
}: InterestModalProps) {
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      num_people: 2,
      date_from: prefilledDate ? format(prefilledDate, 'yyyy-MM-dd') : '',
      date_to: prefilledDate ? format(prefilledDate, 'yyyy-MM-dd') : '',
    }
  });

  const createInterest = useCreateInterest();
  const numPeople = watch('num_people');

  // Calculate estimated group discount
  const estimatedDiscount = Math.min(0.25, 0.03 * (numPeople - 1));
  const estimatedPrice = basePrice * (1 - estimatedDiscount);

  const onSubmit = async (data: FormData) => {
    try {
      const interest: InterestCreate = {
        ...data,
        destination_id: destinationId,
        client_uuid: crypto.randomUUID(),
        num_people: Number(data.num_people),
        budget_min: data.budget_min ? Number(data.budget_min) : undefined,
        budget_max: data.budget_max ? Number(data.budget_max) : undefined,
      };

      await createInterest.mutateAsync(interest);
      toast.success('Interest submitted successfully! We\'ll notify you when groups form.');
      reset();
      onClose();
    } catch (error) {
      toast.error('Failed to submit interest. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-primary-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Express Interest - {destinationName}
              </h3>
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4">
            {/* Personal Details */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Personal Details
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  {...register('user_name', { required: 'Name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your full name"
                />
                {errors.user_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.user_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  {...register('user_email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your email"
                />
                {errors.user_email && (
                  <p className="text-red-500 text-sm mt-1">{errors.user_email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  {...register('user_phone')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>

            {/* Travel Details */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Travel Details
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of People *
                </label>
                <select
                  {...register('num_people', { required: 'Number of people is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'person' : 'people'}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date *
                  </label>
                  <input
                    type="date"
                    {...register('date_from', { required: 'From date is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.date_from && (
                    <p className="text-red-500 text-sm mt-1">{errors.date_from.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date *
                  </label>
                  <input
                    type="date"
                    {...register('date_to', { required: 'To date is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.date_to && (
                    <p className="text-red-500 text-sm mt-1">{errors.date_to.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Min (₹)
                  </label>
                  <input
                    type="number"
                    {...register('budget_min')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="25,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Max (₹)
                  </label>
                  <input
                    type="number"
                    {...register('budget_max')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="50,000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  {...register('special_requests')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Any special requirements or preferences..."
                />
              </div>
            </div>

            {/* Pricing Preview */}
            <div className="bg-primary-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Estimated Group Pricing
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>₹{basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Group Discount ({Math.round(estimatedDiscount * 100)}%):</span>
                  <span className="text-green-600">-₹{(basePrice - estimatedPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Estimated Price:</span>
                  <span className="text-primary-600">₹{Math.round(estimatedPrice).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                * Final pricing depends on actual group size. Larger groups get bigger discounts!
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createInterest.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {createInterest.isPending ? 'Submitting...' : 'Express Interest'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}