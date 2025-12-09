'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScan: (barcode: string, productInfo: ProductInfo | null) => void
  onClose: () => void
}

interface ProductInfo {
  name: string
  brand?: string
  category?: string
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const lookupBarcode = useCallback(async (barcode: string): Promise<ProductInfo | null> => {
    setIsLookingUp(true)
    try {
      // Use Open Food Facts API - free and open source database
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await response.json()

      if (data.status === 1 && data.product) {
        return {
          name: data.product.product_name || data.product.generic_name || 'Unknown Product',
          brand: data.product.brands,
          category: data.product.categories_tags?.[0]?.replace('en:', '') || undefined
        }
      }
      return null
    } catch (err) {
      console.error('Barcode lookup error:', err)
      return null
    } finally {
      setIsLookingUp(false)
    }
  }, [])

  const handleScan = useCallback(async (decodedText: string) => {
    // Prevent duplicate scans
    if (decodedText === lastScannedCode) return
    setLastScannedCode(decodedText)

    // Stop scanning immediately
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
      } catch {
        // Scanner may already be stopped
      }
    }

    // Look up product info
    const productInfo = await lookupBarcode(decodedText)
    onScan(decodedText, productInfo)
  }, [lastScannedCode, lookupBarcode, onScan])

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return

    setError(null)
    setLastScannedCode(null)

    try {
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777,
        },
        handleScan,
        () => {} // Ignore scan failures
      )

      setIsScanning(true)
    } catch (err) {
      console.error('Scanner start error:', err)
      setError('Could not access camera. Please check permissions or enter barcode manually.')
      scannerRef.current = null
    }
  }, [handleScan])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualBarcode.trim()) return

    const productInfo = await lookupBarcode(manualBarcode.trim())
    onScan(manualBarcode.trim(), productInfo)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Scan Barcode</h3>
            <button
              onClick={() => {
                stopScanner()
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Scan a UPC/EAN barcode from a product package to auto-fill ingredient info
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Camera Scanner */}
          <div ref={containerRef} className="relative">
            <div
              id="barcode-reader"
              className="w-full bg-gray-100 rounded-lg overflow-hidden"
              style={{ minHeight: isScanning ? '300px' : '0' }}
            />

            {!isScanning && !error && (
              <div className="flex flex-col items-center py-8">
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <button
                  onClick={startScanner}
                  className="bg-pink-600 text-white px-6 py-2 rounded-md hover:bg-pink-700 transition"
                >
                  Start Camera
                </button>
              </div>
            )}

            {isScanning && (
              <button
                onClick={stopScanner}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-75 text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition"
              >
                Stop Camera
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isLookingUp && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700 flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Looking up product information...
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or enter manually</span>
            </div>
          </div>

          {/* Manual Entry */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Enter UPC/EAN barcode..."
              className="flex-1 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            />
            <button
              type="submit"
              disabled={!manualBarcode.trim() || isLookingUp}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition disabled:opacity-50"
            >
              Look Up
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center">
            Uses Open Food Facts database. Works best with packaged food products.
          </p>
        </div>
      </div>
    </div>
  )
}
