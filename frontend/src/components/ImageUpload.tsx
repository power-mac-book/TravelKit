'use client'

import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UploadedImage {
  id: number
  filename: string
  file_url: string
  thumbnail_url?: string
  file_size: number
  width?: number
  height?: number
  uploaded_at: string
}

interface ImageUploadProps {
  multiple?: boolean
  onUpload?: (images: UploadedImage[]) => void
  onError?: (error: string) => void
  existingImages?: string[]
  maxFiles?: number
}

export default function ImageUpload({ 
  multiple = false, 
  onUpload, 
  onError, 
  existingImages = [],
  maxFiles = 10 
}: ImageUploadProps) {
  const { token } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList) => {
    if (!token) {
      onError?.('Authentication required')
      return
    }

    if (files.length === 0) return

    // Validate file count
    const totalFiles = uploadedImages.length + existingImages.length + files.length
    if (totalFiles > maxFiles) {
      onError?.(`Maximum ${maxFiles} images allowed`)
      return
    }

    setUploading(true)
    const formData = new FormData()

    // Validate files and add to FormData
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        onError?.(`${file.name} is not an image file`)
        setUploading(false)
        return
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        onError?.(`${file.name} is larger than 10MB`)
        setUploading(false)
        return
      }

      if (multiple) {
        formData.append('files', file)
      } else {
        formData.append('file', file)
        break // Only take first file for single upload
      }
    }

    try {
      const endpoint = multiple ? '/api/v1/files/upload/gallery' : '/api/v1/files/upload/image'
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const result = await response.json()
      const newImages = Array.isArray(result) ? result : [result]
      
      setUploadedImages(prev => [...prev, ...newImages])
      onUpload?.(newImages)

    } catch (error) {
      console.error('Upload error:', error)
      onError?.(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleFileSelect(files)
    }
  }

  const removeImage = async (imageId: number) => {
    if (!token) return

    try {
      const response = await fetch(`http://localhost:8000/api/v1/files/upload/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setUploadedImages(prev => prev.filter(img => img.id !== imageId))
      }
    } catch (error) {
      console.error('Delete error:', error)
      onError?.('Failed to delete image')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="space-y-2">
          <div className="text-4xl">📸</div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {uploading ? 'Uploading...' : 'Drop images here or click to browse'}
            </p>
            <p className="text-sm text-gray-500">
              {multiple ? `Upload up to ${maxFiles} images` : 'Upload 1 image'} • PNG, JPG, WebP • Max 10MB each
            </p>
          </div>
          
          {!uploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Choose {multiple ? 'Images' : 'Image'}
            </button>
          )}
          
          {uploading && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Uploaded Images</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={image.thumbnail_url || image.file_url}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                
                <div className="mt-1 text-xs text-gray-500">
                  <div className="truncate">{image.filename}</div>
                  <div>{formatFileSize(image.file_size)}</div>
                  {image.width && image.height && (
                    <div>{image.width}×{image.height}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image URLs for easy copying */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Image URLs</h4>
          <div className="space-y-1">
            {uploadedImages.map((image) => (
              <div key={image.id} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={image.file_url}
                  readOnly
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(image.file_url)}
                  className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}