'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTraveler } from '@/contexts/TravelerContext';
import TravelerLayout from '@/components/TravelerLayout';
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
    case 'flight_ticket':
    case 'ticket':
      return <Plane className="h-5 w-5 text-blue-600" />;
    case 'visa_info':
    case 'visa':
      return <FileText className="h-5 w-5 text-green-600" />;
    case 'hotel_voucher':
    case 'hotel':
      return <MapPin className="h-5 w-5 text-purple-600" />;
    case 'insurance':
      return <Shield className="h-5 w-5 text-red-600" />;
    case 'train_ticket':
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

  const handleTravelDocumentDownload = async (fileUrl: string, fileName: string) => {
    try {
      // Extract filename from file path and use secure download endpoint
      const filename = fileUrl.split('/').pop();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/files/travel_documents/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } else {
        console.error('Download failed:', response.statusText);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isLoading || isLoadingTravel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TravelerLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <p className="text-gray-600 mt-1">Manage your travel documents and view uploaded files</p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showUpload ? 'Cancel Upload' : 'Upload Document'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('travel-docs')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'travel-docs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Plane className="h-4 w-4" />
                  <span>Travel Documents</span>
                  {travelDocuments && travelDocuments.length > 0 && (
                    <span className="bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                      {travelDocuments.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('my-docs')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'my-docs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>My Uploads</span>
                  {documents && documents.length > 0 && (
                    <span className="bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                      {documents.length}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Travel Documents Tab */}
        {activeTab === 'travel-docs' && (
          <div>
            {travelDocuments && travelDocuments.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {travelDocuments.map((doc) => (
                    <div key={doc.id} className="border-b border-gray-200 last:border-b-0 p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          {getCategoryIcon(doc.document_type)}
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">{doc.document_title}</h3>
                            <p className="text-sm text-gray-500 capitalize">
                              {doc.document_type.replace('_', ' ')}
                            </p>
                            {doc.document_description && (
                              <p className="text-sm text-gray-600 mt-1">{doc.document_description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const filename = doc.file_url.split('/').pop();
                              window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/files/travel_documents/${filename}`, '_blank');
                            }}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => handleTravelDocumentDownload(doc.file_url, doc.document_title)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                        {doc.travel_date && (
                          <p><strong>Travel Date:</strong> {format(new Date(doc.travel_date), 'MMM dd, yyyy')}</p>
                        )}
                        {doc.validity_start && (
                          <p><strong>Valid From:</strong> {format(new Date(doc.validity_start), 'MMM dd, yyyy')}</p>
                        )}
                        {doc.validity_end && (
                          <p><strong>Valid Until:</strong> {format(new Date(doc.validity_end), 'MMM dd, yyyy')}</p>
                        )}
                        {doc.vendor_name && (
                          <p><strong>Vendor:</strong> {doc.vendor_name}</p>
                        )}
                        {doc.booking_reference && (
                          <p><strong>Reference:</strong> {doc.booking_reference}</p>
                        )}
                        {doc.cost && (
                          <p><strong>Cost:</strong> {doc.currency} {doc.cost}</p>
                        )}
                        <p><strong>Size:</strong> {(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                        <p><strong>Uploaded:</strong> {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}</p>
                      </div>

                      {doc.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">{doc.notes}</p>
                        </div>
                      )}
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
                    ? "You haven't uploaded any documents yet. Click 'Upload Document' above to get started."
                    : "No documents match your current filters."
                  }
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <FileText className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{doc.file_name}</h3>
                            <p className="text-sm text-gray-500">{doc.document_type}</p>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                              <span>Uploaded: {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}</span>
                            </div>
                            {doc.description && (
                              <p className="mt-2 text-sm text-gray-600">{doc.description}</p>
                            )}
                            {doc.rejection_reason && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-sm text-red-700">
                                  <strong>Rejection Reason:</strong> {doc.rejection_reason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(doc.verification_status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.verification_status)}`}>
                            {doc.verification_status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end space-x-2">
                        <button
                          onClick={() => handleDownload(doc.id, doc.file_name)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 sm:hidden">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>
    </TravelerLayout>
  );
}