import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Users, Clock, TrendingUp } from 'lucide-react';
import { Destination } from '@/types';

interface DestinationCardProps {
  destination: Destination;
}

export default function DestinationCard({ destination }: DestinationCardProps) {
  const { interest_summary } = destination;
  const hasRecentInterest = interest_summary && interest_summary.total_interested_last_30_days > 0;

  // Calculate potential discount
  const maxSavings = Math.round(destination.base_price * destination.max_discount);

  return (
    <Link href={`/destinations/${destination.id}`}>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 group cursor-pointer">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {destination.image_url ? (
            <Image
              src={destination.image_url}
              alt={destination.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-primary-500" />
            </div>
          )}
          
          {/* Trending Badge */}
          {hasRecentInterest && interest_summary!.total_interested_last_30_days >= 5 && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>Trending</span>
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-lg text-sm font-semibold">
            ₹{destination.base_price.toLocaleString()}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Header */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
              {destination.name}
            </h3>
            <div className="flex items-center text-gray-500 text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              {destination.location}, {destination.country}
            </div>
          </div>

          {/* Description */}
          {destination.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {destination.description}
            </p>
          )}

          {/* Social Proof */}
          {interest_summary && (
            <div className="mb-4 p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium text-primary-800">
                  {interest_summary.recent_names_sample}
                </span>
              </div>
              {interest_summary.next_30_day_count > 0 && (
                <div className="flex items-center space-x-2 text-xs text-primary-600">
                  <Clock className="w-3 h-3" />
                  <span>{interest_summary.next_30_day_count} people interested in next 30 days</span>
                </div>
              )}
            </div>
          )}

          {/* Group Pricing Info */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Save up to <span className="font-semibold text-green-600">₹{maxSavings.toLocaleString()}</span> in groups
            </div>
            <div className="text-primary-600 font-medium text-sm group-hover:text-primary-700">
              View Details →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}