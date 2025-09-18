'use client';

import { useDestinations, useHomepageMessages } from '@/lib/queries';
import Header from '@/components/Header';
import DestinationCard from '@/components/DestinationCard';
import SocialProofBanner from '@/components/SocialProofBanner';
import { LiveActivityFeed, TrendingDestinations, SmartSocialProofBanner } from '@/components/SocialProof';
import { MapPin, Users, TrendingUp, Zap } from 'lucide-react';

export default function HomePage() {
  const { data: destinations, isLoading: destinationsLoading } = useDestinations();
  const { data: messages, isLoading: messagesLoading } = useHomepageMessages();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Travel Together, Save Together
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Express interest in destinations and join group trips with dynamic pricing
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/destinations"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors text-center"
              >
                Browse Destinations
              </a>
              <a 
                href="/how-it-works"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white hover:text-primary-600 transition-colors text-center"
              >
                How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How TravelKit Works</h2>
            <p className="text-lg text-gray-600">Simple steps to join group trips and save money</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Express Interest</h3>
              <p className="text-gray-600">Browse destinations and express interest with your preferred dates and group size.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Matched</h3>
              <p className="text-gray-600">Our system finds similar interests and forms groups automatically.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Save Money</h3>
              <p className="text-gray-600">Enjoy group discounts with transparent pricing based on group size.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Messages */}
      {messages && messages.length > 0 && (
        <section className="py-8 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-4">
              {messages.slice(0, 2).map((message) => (
                <SocialProofBanner key={message.id} message={message} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Enhanced Social Proof Section */}
      <section className="py-12 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Travel Activity</h2>
            <p className="text-gray-600">See what other travelers are planning right now</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <LiveActivityFeed />
            </div>
            <div>
              <TrendingDestinations />
            </div>
          </div>
        </div>
      </section>

      {/* Smart Social Proof Banner */}
      <SmartSocialProofBanner />

      {/* Featured Destinations */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Destinations</h2>
            <p className="text-lg text-gray-600">Discover where others are planning to travel</p>
          </div>
          
          {destinationsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : destinations && destinations.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {destinations.slice(0, 6).map((destination) => (
                <DestinationCard key={destination.id} destination={destination} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No destinations available yet.</p>
            </div>
          )}
          
          {destinations && destinations.length > 6 && (
            <div className="text-center mt-8">
              <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                View All Destinations
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">1,250+</div>
              <div className="text-gray-600">Happy Travelers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">89</div>
              <div className="text-gray-600">Destinations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">₹2.5L+</div>
              <div className="text-gray-600">Total Savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <MapPin className="w-6 h-6" />
              <span className="text-xl font-bold">TravelKit</span>
            </div>
            <p className="text-gray-400 mb-6">Travel together, save together</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/contact" className="hover:text-white transition-colors">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}