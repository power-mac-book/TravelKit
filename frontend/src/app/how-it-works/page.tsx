'use client';

import Header from '@/components/Header';
import { 
  MapPin, 
  Users, 
  TrendingDown, 
  Calendar, 
  Shield, 
  Clock, 
  Heart,
  DollarSign,
  MessageCircle,
  CheckCircle,
  Star,
  Globe,
  Camera
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              How TravelKit Works
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Discover how thousands of travelers are saving money, making friends, and creating unforgettable memories through the power of group travel
            </p>
            <div className="inline-flex items-center gap-2 bg-white/20 px-6 py-3 rounded-full">
              <Star className="w-5 h-5 text-yellow-300" />
              <span className="text-lg font-semibold">4.9/5 from 2,500+ travelers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Travelers Love TravelKit
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join the travel revolution that's making dream destinations affordable and accessible for everyone
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Save Money */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Save 15-40% on Every Trip</h3>
              <p className="text-gray-700 mb-4">
                Group buying power means better rates on hotels, activities, and transportation. 
                The more people join, the more everyone saves.
              </p>
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-800">Example Savings:</p>
                <p className="text-sm text-gray-600">Goa Trip: ₹45,000 → ₹32,000 (8 people)</p>
              </div>
            </div>

            {/* Make Friends */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-2xl border border-blue-100">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Meet Like-Minded Travelers</h3>
              <p className="text-gray-700 mb-4">
                Connect with fellow adventurers who share your interests and travel style. 
                78% of our travelers made lasting friendships.
              </p>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-800">Community Features:</p>
                <p className="text-sm text-gray-600">Group chat, activity planning, local tips</p>
              </div>
            </div>

            {/* Hassle-Free Planning */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Effortless Trip Planning</h3>
              <p className="text-gray-700 mb-4">
                Skip the endless research and booking hassles. We handle accommodations, 
                activities, and logistics so you can focus on enjoying your trip.
              </p>
              <div className="bg-white p-4 rounded-lg border border-purple-200">
                <p className="text-sm font-semibold text-purple-800">We Handle:</p>
                <p className="text-sm text-gray-600">Hotels, activities, transport, permits</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Process */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Your Journey in 4 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">
              From interest to adventure in just a few clicks
            </p>
          </div>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Express Your Interest</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-lg text-gray-700">
                    Browse our curated destinations and express interest in your dream trip. 
                    Tell us your preferred dates, group size, and budget range.
                  </p>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tip:</h4>
                    <p className="text-gray-600">
                      Flexible dates increase your chances of finding a perfect group match!
                    </p>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Destination: Manali Adventure</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <span>Dates: Dec 15-20, 2025</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span>Group Size: 2 people</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        ✨ 12 other travelers interested in similar dates!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">2</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Get Matched with Groups</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-lg text-gray-700">
                    Our smart algorithm finds travelers with similar interests, dates, and preferences. 
                    You'll be matched with compatible groups within 24-48 hours.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-sm">Fast Matching</span>
                      </div>
                      <p className="text-xs text-gray-600">Average match time: 36 hours</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-sm">97% Satisfaction</span>
                      </div>
                      <p className="text-xs text-gray-600">Happy with group matches</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-gray-900">🎉 Group Match Found!</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Group Size</span>
                        <span className="font-semibold">8 travelers</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Your Savings</span>
                        <span className="font-semibold text-green-600">₹13,000 (29%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Trip Dates</span>
                        <span className="font-semibold">Dec 16-21</span>
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        🚀 Group confirmed! Payment due in 3 days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">3</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Connect & Plan Together</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-lg text-gray-700">
                    Join your group's private chat to get to know your travel buddies. 
                    Plan activities, share excitement, and coordinate arrival details.
                  </p>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                    <h4 className="font-semibold text-gray-900 mb-2">🤝 Group Features:</h4>
                    <ul className="text-gray-600 space-y-1 text-sm">
                      <li>• Private WhatsApp group</li>
                      <li>• Shared activity planning</li>
                      <li>• Local tips and recommendations</li>
                      <li>• Coordinator support</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-white p-6 rounded-2xl shadow-lg border">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-gray-900">💬 Group Chat Preview</h4>
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm"><strong>Rahul:</strong> So excited for Manali! 🏔️</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm"><strong>Priya:</strong> Anyone interested in paragliding?</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm"><strong>TravelKit:</strong> All documents uploaded! ✅</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageCircle className="w-4 h-4" />
                      <span>8 members • Active planning</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">4</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Travel & Create Memories</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-lg text-gray-700">
                    Embark on your adventure! Everything is organized for you - accommodations, 
                    activities, and transportation. Just focus on making memories with your new friends.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-sm">24/7 Support</span>
                      </div>
                      <p className="text-xs text-gray-600">On-trip assistance available</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-sm">Memory Book</span>
                      </div>
                      <p className="text-xs text-gray-600">Shared photo album created</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-2xl shadow-lg border border-orange-200">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-gray-900">🎊 Trip Highlights</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm">Luxury mountain resort booked</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm">Adventure activities arranged</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm">Local guide & transportation</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm">Group bonding activities</span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-orange-800 font-semibold">
                        💫 Lifetime memories guaranteed!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof & Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Travelers Are Saying
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from thousands of happy travelers
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Saved ₹18,000 on my Ladakh trip and made 6 new friends! The group chemistry was perfect 
                and everything was so well organized. Already planning my next TravelKit adventure."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-blue-800">A</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ananya Sharma</p>
                  <p className="text-sm text-gray-600">Software Engineer, Mumbai</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "As a solo female traveler, I was nervous about group trips. But TravelKit's community 
                is amazing! Felt safe, had so much fun, and the cost savings were incredible."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-green-800">P</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Pooja Reddy</p>
                  <p className="text-sm text-gray-600">Marketing Manager, Bangalore</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Been on 4 TravelKit trips now. The convenience is unmatched - no planning stress, 
                great people, amazing experiences. It's changed how I travel forever!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-purple-800">R</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Rohit Kumar</p>
                  <p className="text-sm text-gray-600">Entrepreneur, Delhi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Start Your Adventure?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of travelers who've discovered the joy of group travel. 
            Your next unforgettable experience is just one click away.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              <Globe className="w-5 h-5" />
              Browse Destinations
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors">
              Express Interest Now
            </button>
          </div>
          <p className="mt-6 text-blue-200 text-sm">
            💫 No booking fees • 💝 Best price guarantee • 🛡️ 100% secure
          </p>
        </div>
      </section>
    </div>
  );
}