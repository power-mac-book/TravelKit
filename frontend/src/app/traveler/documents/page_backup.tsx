'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTraveler } from '@/contexts/TravelerContext';
import DocumentUpload from '@/components/DocumentUpload';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Download, 
  Eye,
  Plus,
  Filter,
  Search,
  Plane,
  MapPin,
  CreditCard,
  Shield,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface TravelerDocument {
  id: number;
  document_type: string;
  category: string;
  file_name: string;
  file_path: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  description?: string;
  uploaded_at: string;
  verified_at?: string;
  verified_by?: number;
  rejection_reason?: string;
}

interface TravelDocument {
  id: number;
  document_type: string;
  document_title: string;
  document_description?: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
  travel_date?: string;
  validity_start?: string;
  validity_end?: string;
  vendor_name?: string;
  booking_reference?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  uploaded_by: number;
  file_path: string;
  mime_type?: string;
  is_active: boolean;
  is_public: boolean;
  tags?: any;
}

const fetchTravelerDocuments = async (token: string): Promise<TravelerDocument[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/documents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  return response.json();
};

const fetchTravelDocuments = async (token: string): Promise<TravelDocument[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/my-travel-documents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch travel documents');
  }

  return response.json();
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'verified':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-red-600" />;
    default:
      return <Clock className="h-5 w-5 text-yellow-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'ticket':
      return <Plane className="h-5 w-5 text-blue-600" />;
    case 'visa':
      return <FileText className="h-5 w-5 text-green-600" />;
    case 'hotel':
      return <MapPin className="h-5 w-5 text-purple-600" />;
    case 'insurance':
      return <Shield className="h-5 w-5 text-red-600" />;
    case 'transport':
      return <CreditCard className="h-5 w-5 text-orange-600" />;
    default:
      return <FileText className="h-5 w-5 text-gray-600" />;
  }
};

export default function DocumentsPage() {
  const { token } = useTraveler();
  const [showUpload, setShowUpload] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'my-docs' | 'travel-docs'>('travel-docs');

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['traveler-documents'],
    queryFn: () => fetchTravelerDocuments(token!),
    enabled: !!token,
  });

  const { data: travelDocuments, isLoading: isLoadingTravel, refetch: refetchTravel } = useQuery({
    queryKey: ['travel-documents'],
    queryFn: () => fetchTravelDocuments(token!),
    enabled: !!token,
  });

  const filteredDocuments = documents?.filter(doc => {
    const matchesStatus = filterStatus === 'all' || doc.verification_status === filterStatus;
    const matchesSearch = doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">TravelKit</h1>
              <span className="ml-2 text-sm text-gray-500">Documents</span>
            </div>
            <nav className="flex space-x-4">
              <a href="/traveler/dashboard" className="text-gray-600 hover:text-blue-600">
                Dashboard
              </a>
              <a href="/traveler/profile" className="text-gray-600 hover:text-blue-600">
                Profile
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Documents</h2>
            <p className="mt-2 text-gray-600">
              View travel documents and manage your verification documents.
            </p>
          </div>
          {activeTab === 'my-docs' && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Documents
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('travel-docs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'travel-docs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plane className="h-4 w-4 inline mr-2" />
              Travel Documents
              {travelDocuments && travelDocuments.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                  {travelDocuments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('my-docs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-docs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              My Uploads
              {documents && documents.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                  {documents.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Travel Documents Tab */}
        {activeTab === 'travel-docs' && (
          <div>
            {isLoadingTravel ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading travel documents...</p>
              </div>
            ) : travelDocuments && travelDocuments.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Documents from Admin</h3>
                  <p className="text-sm text-gray-600">Travel documents uploaded for your trips</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {travelDocuments.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          {getCategoryIcon(doc.document_category)}
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-gray-900">{doc.document_name}</h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {doc.document_category}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        {doc.vendor_name && (
                          <p><strong>Vendor:</strong> {doc.vendor_name}</p>
                        )}
                        {doc.booking_reference && (
                          <p><strong>Reference:</strong> {doc.booking_reference}</p>
                        )}
                        {doc.travel_date && (
                          <p><strong>Travel Date:</strong> {format(new Date(doc.travel_date), 'MMM dd, yyyy')}</p>
                        )}
                        {doc.cost && (
                          <p><strong>Cost:</strong> {doc.currency} {doc.cost}</p>
                        )}
                        <p><strong>Size:</strong> {(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                        <p><strong>Uploaded:</strong> {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}</p>
                      </div>

                      {doc.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">{doc.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => window.open(doc.file_url, '_blank')}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => window.open(doc.file_url, '_blank')}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-600 bg-green-100 hover:bg-green-200"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Plane className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No travel documents</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your admin will upload travel documents for your trips here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* My Documents Tab */}
        {activeTab === 'my-docs' && (
          <div>
            {/* Upload Section */}
            {showUpload && (
              <div className="mb-8">
                <DocumentUpload onUploadComplete={() => {
                  refetch();
                  setShowUpload(false);
                }} />
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Documents List */}
            {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500 mb-4">
              {documents?.length === 0 
                ? "You haven't uploaded any documents yet."
                : "No documents match your current filters."
              }
            </p>
            {documents?.length === 0 && (
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Your First Document
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredDocuments.map((document) => (
                <li key={document.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {document.file_name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.verification_status)}`}>
                            {document.verification_status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500">
                            Type: {document.document_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            Category: {document.category}
                          </p>
                          <p className="text-sm text-gray-500">
                            Uploaded: {format(new Date(document.uploaded_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {document.description && (
                          <p className="text-sm text-gray-500 mt-1">{document.description}</p>
                        )}
                        {document.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-700">
                              <strong>Rejection Reason:</strong> {document.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(document.verification_status)}
                      <button
                        onClick={() => handleDownload(document.id, document.file_name)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Documents
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {documents?.length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Verified
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {documents?.filter(d => d.verification_status === 'verified').length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Review
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {documents?.filter(d => d.verification_status === 'pending').length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}