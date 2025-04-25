'use client'

import { useState } from 'react'
import { QrReader, OnResultFunction } from 'react-qr-reader'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: Error) => void
  className?: string
}

/**
 * QR Scanner component that scans QR codes using the device camera
 * for quick member check-ins or other scanning purposes.
 */
export function QRScanner({ onScan, onError, className }: QRScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleScan: OnResultFunction = (result, error) => {
    if (result) {
      // We need to safely extract the QR code data from the result
      // The result will be of type Result from the library
      try {
        // Convert the result to a string format that we can use
        const qrData = String(result);
        onScan(qrData);
      } catch (err) {
        // Handle any conversion errors with the original error
        handleError(new Error(`Failed to process QR code data: ${err instanceof Error ? err.message : String(err)}`));
      }
    }
    
    if (error) {
      handleError(error)
    }
  }
  
  // Handle scan errors
  const handleError = (err: Error) => {
    console.error('QR scan error:', err)
    setError(`Camera error: ${err.message}`)
    if (onError) {
      onError(err)
    }
  }
  
  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {!isCameraActive ? (
        <div className="text-center p-8 border rounded-lg border-dashed border-gray-300 bg-gray-50">
          <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-medium text-lg mb-2">QR Check-in Scanner</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Scan member QR codes for quick check-in
          </p>
          <Button 
            onClick={() => setIsCameraActive(true)}
            className="w-full py-3"
          >
            Activate Camera
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="aspect-square overflow-hidden rounded-lg border">
            <QrReader
              constraints={{ facingMode: 'environment' }}
              onResult={handleScan}
              scanDelay={500}
            />
            <Button 
              variant="outline" 
              className="absolute top-2 right-2 rounded-full w-8 h-8 p-0 flex items-center justify-center bg-white"
              onClick={() => setIsCameraActive(false)}
            >
              ✕
            </Button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            Position the QR code within the frame to scan
          </p>
        </div>
      )}
    </div>
  )
} 