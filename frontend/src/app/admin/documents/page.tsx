'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';
import { 
  Upload, 
  User, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle,
  FileText,
  Plane,
  MapPin,
  Calendar,
  ArrowLeft,
  Home,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface TravelerProfile {
  id: number;
  email: string;
  name: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  documents_verified?: boolean;
}

interface TravelDocument {
  id: number;
  document_category: string;
  document_name: string;
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
  traveler?: {
    id: number;
    name: string;
    email: string;
  };
}

interface UploadFormData {
  traveler_id: number;
  document_category: string;
  document_name: string;
  travel_date?: string;
  validity_start?: string;
  validity_end?: string;
  vendor_name?: string;
  booking_reference?: string;
  cost?: number;
  currency: string;
  notes?: string;
}

const fetchTravelers = async (): Promise<TravelerProfile[]> => {
  const token = localStorage.getItem('admin_token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/admin/travelers`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch travelers');
  }

  return response.json();
};

const fetchAllDocuments = async (): Promise<TravelDocument[]> => {
  const token = localStorage.getItem('admin_token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/admin/travel-documents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  return response.json();
};

const uploadDocument = async (file: File, data: UploadFormData): Promise<any> => {
  const token = localStorage.getItem('admin_token');
  const formData = new FormData();
  
  formData.append('file', file);
  formData.append('traveler_id', data.traveler_id.toString());
  formData.append('document_type', data.document_category);
  formData.append('document_title', data.document_name);
  formData.append('currency', data.currency);
  
  if (data.travel_date) formData.append('travel_date', data.travel_date);
  if (data.validity_start) formData.append('validity_start', data.validity_start);
  if (data.validity_end) formData.append('validity_end', data.validity_end);
  if (data.vendor_name) formData.append('vendor_name', data.vendor_name);
  if (data.booking_reference) formData.append('booking_reference', data.booking_reference);
  if (data.cost) formData.append('cost', data.cost.toString());
  if (data.notes) formData.append('notes', data.notes);

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/admin/travel-documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
};

const uploadMultipleDocuments = async (files: File[], data: UploadFormData): Promise<any[]> => {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileData = {
      ...data,
      document_name: data.document_name || file.name.split('.')[0], // Use filename if no name provided
    };
    
    try {
      const result = await uploadDocument(file, fileData);
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw new Error(`Failed to upload ${file.name}: ${error}`);
    }
  }
  
  return results;
};

export default function AdminDocumentManagement() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [selectedTraveler, setSelectedTraveler] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [formData, setFormData] = useState<UploadFormData>({
    traveler_id: 0,
    document_category: '',
    document_name: '',
    currency: 'INR',
  });

  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  const queryClient = useQueryClient();

  const { data: travelers, isLoading: loadingTravelers } = useQuery({
    queryKey: ['admin-travelers'],
    queryFn: fetchTravelers,
  });

  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: fetchAllDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ files, data }: { files: File[]; data: UploadFormData }) => uploadMultipleDocuments(files, data),
    onSuccess: () => {
      toast.success('Documents uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      // Reset form
      setSelectedFiles([]);
      setSelectedTraveler(null);
      setUploadProgress({});
      setFormData({
        traveler_id: 0,
        document_category: '',
        document_name: '',
        currency: 'INR',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setUploadProgress({});
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleTravelerSelect = (travelerId: number) => {
    setSelectedTraveler(travelerId);
    setFormData(prev => ({ ...prev, traveler_id: travelerId }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0 || !selectedTraveler) {
      toast.error('Please select a traveler and at least one file');
      return;
    }

    if (!formData.document_category) {
      toast.error('Please select a document category');
      return;
    }

    uploadMutation.mutate({ files: selectedFiles, data: formData });
  };

  const filteredTravelers = travelers?.filter((traveler: TravelerProfile) => {
    return !searchTerm || 
      traveler.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      traveler.email.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const filteredDocuments = documents?.filter((doc: TravelDocument) => {
    return filterCategory === 'all' || doc.document_category === filterCategory;
  }) || [];

  const selectedTravelerData = travelers?.find(t => t.id === selectedTraveler);

  return (
    <AdminLayout>
      <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
        <p className="text-gray-600 mt-1">Upload and manage documents for travelers</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Upload Documents
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Manage Documents
          </button>
        </nav>
      </div>

      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traveler Selection */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <User className="h-5 w-5 inline mr-2" />
              Select Traveler
            </h3>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search travelers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingTravelers ? (
                <div className="text-center py-4">Loading travelers...</div>
              ) : (
                filteredTravelers.map((traveler) => (
                  <div
                    key={traveler.id}
                    onClick={() => handleTravelerSelect(traveler.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTraveler === traveler.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{traveler.name}</p>
                        <p className="text-sm text-gray-500">{traveler.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {traveler.documents_verified && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {selectedTraveler === traveler.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Upload Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Upload className="h-5 w-5 inline mr-2" />
              Upload Document
            </h3>

            {selectedTravelerData && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected Traveler:</strong> {selectedTravelerData.name} ({selectedTravelerData.email})
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Document Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Category *
                </label>
                <select
                  value={formData.document_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  <option value="ticket">Flight Ticket</option>
                  <option value="visa">Visa</option>
                  <option value="hotel">Hotel Voucher</option>
                  <option value="transport">Transport</option>
                  <option value="insurance">Travel Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.document_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_name: e.target.value }))}
                  placeholder="Leave empty to use filename"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If empty, the filename will be used as the document name
                </p>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Files *
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">Selected {selectedFiles.length} file(s):</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span>{file.name}</span>
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Travel Date
                  </label>
                  <input
                    type="date"
                    value={formData.travel_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, travel_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor/Provider
                  </label>
                  <input
                    type="text"
                    value={formData.vendor_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                    placeholder="e.g., IndiGo, Taj Hotels"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking Reference
                  </label>
                  <input
                    type="text"
                    value={formData.booking_reference || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, booking_reference: e.target.value }))}
                    placeholder="PNR/Booking ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost
                  </label>
                  <div className="flex">
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <input
                      type="number"
                      value={formData.cost || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) }))}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border-l-0 border border-gray-300 rounded-r-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Validity Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.validity_start || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, validity_start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.validity_end || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, validity_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploadMutation.isPending || !selectedTraveler || selectedFiles.length === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? `Uploading ${selectedFiles.length} file(s)...` : `Upload ${selectedFiles.length || ''} Document${selectedFiles.length > 1 ? 's' : ''}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="bg-white rounded-lg shadow-sm">
          {/* Filter Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">All Documents</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="ticket">Flight Tickets</option>
                    <option value="visa">Visas</option>
                    <option value="hotel">Hotel Vouchers</option>
                    <option value="transport">Transport</option>
                    <option value="insurance">Travel Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Traveler
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingDocuments ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Loading documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {document.document_category === 'ticket' && <Plane className="h-5 w-5 text-blue-600" />}
                            {document.document_category === 'visa' && <FileText className="h-5 w-5 text-green-600" />}
                            {document.document_category === 'hotel' && <MapPin className="h-5 w-5 text-purple-600" />}
                            {!['ticket', 'visa', 'hotel'].includes(document.document_category) && <FileText className="h-5 w-5 text-gray-600" />}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{document.document_name}</p>
                            <p className="text-sm text-gray-500">
                              {(document.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {document.traveler && (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{document.traveler.name}</p>
                            <p className="text-sm text-gray-500">{document.traveler.email}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {document.document_category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {document.vendor_name && (
                            <p><strong>Vendor:</strong> {document.vendor_name}</p>
                          )}
                          {document.booking_reference && (
                            <p><strong>Reference:</strong> {document.booking_reference}</p>
                          )}
                          {document.cost && (
                            <p><strong>Cost:</strong> {document.currency} {document.cost}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(new Date(document.uploaded_at), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => window.open(document.file_url, '_blank')}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                            title="View Document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.open(document.file_url, '_blank')}
                            className="text-green-600 hover:text-green-900 text-sm"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}