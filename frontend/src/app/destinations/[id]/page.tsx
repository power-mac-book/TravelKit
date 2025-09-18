'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Star, 
  Clock, 
  TrendingUp, 
  Heart,
  Share2,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useDestination, useDestinationCalendar } from '@/lib/queries';
import Header from '@/components/Header';
import CalendarView from '@/components/CalendarView';
import InterestModal from '@/components/InterestModal';
import { InterestCounter } from '@/components/SocialProof';

export default function DestinationDetailPage() {
  const params = useParams();
  const destinationId = parseInt(params.id as string);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);

  const { data: destination, isLoading } = useDestination(destinationId);
  const { data: calendarData } = useDestinationCalendar(
    destinationId, 
    format(currentMonth, 'yyyy-MM')
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsInterestModalOpen(true);
  };

  const handleExpressInterest = () => {
    setIsInterestModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-xl mb-8"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Destination Not Found</h1>
            <p className="text-gray-600 mb-8">The destination you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/" className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { interest_summary } = destination;
  const maxSavings = Math.round(destination.base_price * destination.max_discount);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Destinations
        </Link>
      </div>

      {/* Hero Image */}
      <div className="relative h-64 md:h-96">
        {destination.image_url ? (
          <Image
            src={destination.image_url}
            alt={destination.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center">
            <MapPin className="w-20 h-20 text-primary-600" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between">
              <div className="text-white mb-4 md:mb-0">
                <h1 className="text-3xl md:text-5xl font-bold mb-2">{destination.name}</h1>
                <div className="flex items-center text-lg">
                  <MapPin className="w-5 h-5 mr-2" />
                  {destination.location}, {destination.country}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors">
                  <Heart className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors">
                  <Share2 className="w-5 h-5 text-white" />
                </button>
                <button 
                  onClick={handleExpressInterest}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Express Interest
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enhanced Social Proof Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Live Interest Activity</h2>
                {interest_summary && interest_summary.total_interested_last_30_days >= 5 && (
                  <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    <span>Trending</span>
                  </div>
                )}
              </div>
              
              <InterestCounter destinationId={destinationId} />
            </div>

            {/* Description */}
            {destination.description && (
              <div className="bg-white rounded-xl shadow-sm p-6 border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Destination</h2>
                <p className="text-gray-600 leading-relaxed">{destination.description}</p>
              </div>
            )}

            {/* Itinerary */}
            {destination.itinerary && (
              <div className="bg-white rounded-xl shadow-sm p-6 border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Itinerary</h2>
                <div className="space-y-4">
                  {Object.entries(destination.itinerary).map(([day, activities]) => (
                    <div key={day} className="border-l-4 border-primary-200 pl-4">
                      <h3 className="font-medium text-gray-900 capitalize">{day}</h3>
                      <p className="text-gray-600 text-sm">{activities as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {destination.gallery && destination.gallery.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {destination.gallery.map((imageUrl, index) => (
                    <div key={index} className="relative h-32 rounded-lg overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={`${destination.name} gallery ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking & Calendar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border sticky top-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  ₹{destination.base_price.toLocaleString()}
                  <span className="text-lg font-normal text-gray-500"> per person</span>
                </div>
                <p className="text-green-600 font-medium">
                  Save up to ₹{maxSavings.toLocaleString()} in groups!
                </p>
              </div>

              {/* Group Pricing Examples */}
              <div className="space-y-3 mb-6">
                <h3 className="font-medium text-gray-900">Group Pricing Examples</h3>
                {[4, 6, 8].map(size => {
                  const discount = Math.min(destination.max_discount, destination.discount_per_member * (size - 1));
                  const price = destination.base_price * (1 - discount);
                  return (
                    <div key={size} className="flex justify-between text-sm">
                      <span className="text-gray-600">{size} people:</span>
                      <span className="font-medium text-gray-900">
                        ₹{Math.round(price).toLocaleString()} 
                        <span className="text-green-600 ml-1">(-{Math.round(discount * 100)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={handleExpressInterest}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-semibold transition-colors mb-4"
              >
                Express Interest
              </button>

              <div className="text-center text-sm text-gray-500">
                No commitment • Free to express interest
              </div>
            </div>

            {/* Calendar */}
            <CalendarView
              calendarData={calendarData?.data}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
            />
          </div>
        </div>
      </div>

      {/* Interest Modal */}
      <InterestModal
        isOpen={isInterestModalOpen}
        onClose={() => setIsInterestModalOpen(false)}
        destinationId={destinationId}
        destinationName={destination.name}
        basePrice={destination.base_price}
        prefilledDate={selectedDate}
      />
    </div>
  );
}