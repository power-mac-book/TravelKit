'use client';

import { useState, useEffect } from 'react';
import { useDestinations } from '@/lib/queries';
import Header from '@/components/Header';
import DestinationCard from '@/components/DestinationCard';
import { Search, Filter, MapPin, TrendingUp, Users } from 'lucide-react';

export default function DestinationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12); // Show 12 destinations per page
  const { data: destinations, isLoading } = useDestinations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popular'); // popular, price-low, price-high, name

  // Filter destinations based on search and filters
  const filteredDestinations = destinations?.filter(destination => {
    const matchesSearch = !searchQuery || 
      destination.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      destination.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      destination.country.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = !selectedCountry || destination.country === selectedCountry;
    
    const matchesPrice = !priceRange || (() => {
      const price = destination.base_price;
      switch (priceRange) {
        case 'budget': return price < 25000;
        case 'mid': return price >= 25000 && price < 50000;
        case 'luxury': return price >= 50000;
        default: return true;
      }
    })();

    return matchesSearch && matchesCountry && matchesPrice;
  });

  // Sort destinations
  const sortedDestinations = filteredDestinations?.sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.base_price - b.base_price;
      case 'price-high':
        return b.base_price - a.base_price;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'popular':
      default:
        return (b.interest_summary?.total_interested_last_30_days || 0) - 
               (a.interest_summary?.total_interested_last_30_days || 0);
    }
  });

  // Get unique countries for filter
  const countries = Array.from(new Set(destinations?.map(d => d.country) || []));

  // Pagination logic
  const totalDestinations = sortedDestinations?.length || 0;
  const totalPages = Math.ceil(totalDestinations / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDestinations = sortedDestinations?.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCountry, priceRange, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore Destinations
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Find your next adventure and join group trips with great savings
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search destinations, locations, countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>

              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Prices</option>
                <option value="budget">Budget (Under ₹25k)</option>
                <option value="mid">Mid-range (₹25k - ₹50k)</option>
                <option value="luxury">Luxury (Above ₹50k)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {searchQuery || selectedCountry || priceRange ? 'Search Results' : 'All Destinations'}
              </h2>
              <p className="text-gray-600">
                {isLoading ? 'Loading...' : `${totalDestinations} destinations found${totalPages > 1 ? ` • Page ${page} of ${totalPages}` : ''}`}
              </p>
            </div>
            
            {(searchQuery || selectedCountry || priceRange || sortBy !== 'popular') && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCountry('');
                  setPriceRange('');
                  setSortBy('popular');
                }}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl h-80 animate-pulse"></div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && totalDestinations === 0 && (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No destinations found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCountry || priceRange || sortBy !== 'popular'
                  ? 'Try adjusting your search criteria or filters'
                  : 'No destinations are available at the moment'
                }
              </p>
              {(searchQuery || selectedCountry || priceRange || sortBy !== 'popular') && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCountry('');
                    setPriceRange('');
                    setSortBy('popular');
                  }}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Show All Destinations
                </button>
              )}
            </div>
          )}

          {/* Destinations Grid */}
          {!isLoading && paginatedDestinations && paginatedDestinations.length > 0 && (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedDestinations.map((destination) => (
                  <DestinationCard 
                    key={destination.id} 
                    destination={destination} 
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            page === pageNum
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Popular Trends */}
          {!isLoading && !searchQuery && !selectedCountry && !priceRange && sortBy === 'popular' && (
            <div className="mt-16 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <TrendingUp className="w-6 h-6 text-primary-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Popular This Week</h3>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {destinations?.slice(0, 4).map((destination) => (
                  <div key={destination.id} className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-900 mb-1">{destination.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{destination.location}</p>
                    {destination.interest_summary && (
                      <div className="flex items-center text-sm text-primary-600">
                        <Users className="w-4 h-4 mr-1" />
                        {destination.interest_summary.total_interested_last_30_days} interested
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}