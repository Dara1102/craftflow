'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Simplified costing interface for client component (excludes recipeMatches with Decimals)
interface CostingData {
  totalServings: number
  ingredients: { ingredientId: number; name: string; quantity: number; unit: string; cost: number }[]
  decorations: { techniqueId: number; sku: string; name: string; category: string; quantity: number; unit: string; materialCost: number; laborMinutes: number; laborRole: string; laborRate: number; laborCost: number; totalCost: number }[]
  topper: { type: string; text: string | null; cost: number } | null
  delivery: { zoneName: string; baseFee: number; perMileFee: number | null; estimatedDistance: number | null; totalFee: number } | null
  discount: { type: 'PERCENT' | 'FIXED'; value: number; reason: string | null; amount: number } | null
  laborBreakdown: { role: string; hours: number; rate: number; cost: number }[]
  ingredientCost: number
  decorationMaterialCost: number
  decorationLaborCost: number
  topperCost: number
  deliveryCost: number
  baseLaborCost: number
  totalLaborCost: number
  totalCost: number
  markupPercent: number
  suggestedPrice: number
  discountAmount: number
  finalPrice: number
  costPerServing: number
  suggestedPricePerServing: number
}

interface RevisionInfo {
  id: number
  quoteNumber: string
  version: number
  status: string
  createdAt: string
}

interface QuoteData {
  id: number
  quoteNumber: string
  status: string
  customerName: string
  customerId: number | null
  customer: {
    id: number
    name: string
    email: string | null
    phone: string | null
    company: string | null
  } | null
  eventDate: string
  eventType: string | null
  theme: string | null
  occasion: string | null
  colors: string | null
  accentColors: string | null
  desiredServings: number | null
  budgetMin: number | null
  budgetMax: number | null
  isDelivery: boolean
  deliveryZone: { id: number; name: string } | null
  deliveryAddress: string | null
  deliveryTime: string | null
  topperType: string | null
  topperText: string | null
  termsAndConditions: string
  expiresAt: string | null
  sentAt: string | null
  notes: string | null
  convertedOrderId: number | null
  depositPercent: number | null
  version: number
  originalQuoteId: number | null
  revisionHistory: RevisionInfo[]
  quoteTiers: {
    id: number
    tierIndex: number
    tierSize: { id: number; name: string; servings: number; shape: string }
    flavor: string | null
    filling: string | null
    finishType: string | null
    batterRecipe: { id: number; name: string } | null
    fillingRecipe: { id: number; name: string } | null
    frostingRecipe: { id: number; name: string } | null
  }[]
  quoteDecorations: {
    id: number
    quantity: number
    notes: string | null
    decorationTechnique: { id: number; name: string; category: string }
  }[]
}

interface Props {
  quote: QuoteData
  costing: CostingData
  defaultPolicy: string
  defaultDepositPercent: number
}

export default function QuoteDetailClient({ quote, costing, defaultPolicy, defaultDepositPercent }: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'internal' | 'customer'>('internal')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)

  // Use costing totalServings which is calculated from actual tier sizes
  const totalServings = costing.totalServings

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(`Failed to update status: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateRevision = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/revise`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        // Navigate to the new revision
        router.push(`/quotes/${data.revision.id}`)
      } else {
        const data = await res.json()
        alert(`Failed to create revision: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to create revision')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePrint = () => {
    // Switch to customer view for printing
    setViewMode('customer')
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const handleConvertToOrder = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/orders/${data.orderId}`)
      } else {
        const data = await res.json()
        alert(`Failed to convert: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to convert quote to order')
    } finally {
      setIsUpdating(false)
      setShowConvertModal(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'SENT': return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED': return 'bg-green-100 text-green-800'
      case 'DECLINED': return 'bg-red-100 text-red-800'
      case 'EXPIRED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Render policy with basic markdown bold support
  const renderPolicy = (text: string) => {
    return text.split('\n').map((line, i) => {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return (
        <p
          key={i}
          className={`${line.startsWith('   ') ? 'ml-4' : ''} ${line === '' ? 'h-2' : ''}`}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      )
    })
  }

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header with Actions */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6 no-print">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">Quote {quote.quoteNumber}</h1>
                  {quote.version > 1 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      v{quote.version}
                    </span>
                  )}
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                  {quote.status}
                </span>
              </div>
              {quote.sentAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Sent: {formatDate(quote.sentAt)}
                </p>
              )}
              {quote.expiresAt && (
                <p className="text-sm text-gray-500">
                  Expires: {formatDate(quote.expiresAt)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/quotes"
                className="text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                &larr; Back
              </Link>
            </div>
          </div>

          {/* View Toggle & Action Buttons */}
          <div className="bg-white shadow rounded-lg p-4 mb-6 no-print">
            <div className="flex flex-wrap justify-between items-center gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">View:</span>
                <div className="inline-flex rounded-md shadow-sm">
                  <button
                    onClick={() => setViewMode('internal')}
                    className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                      viewMode === 'internal'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Internal
                  </button>
                  <button
                    onClick={() => setViewMode('customer')}
                    className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${
                      viewMode === 'customer'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Customer
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Edit - only for DRAFT */}
                {quote.status === 'DRAFT' && (
                  <Link
                    href={`/quotes/${quote.id}/edit`}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Edit Quote
                  </Link>
                )}

                {/* Send - only for DRAFT */}
                {quote.status === 'DRAFT' && (
                  <button
                    onClick={() => updateStatus('SENT')}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Mark as Sent'}
                  </button>
                )}

                {/* Accept/Decline - only for SENT */}
                {quote.status === 'SENT' && (
                  <>
                    <button
                      onClick={() => updateStatus('ACCEPTED')}
                      disabled={isUpdating}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {isUpdating ? 'Updating...' : 'Mark Accepted'}
                    </button>
                    <button
                      onClick={() => updateStatus('DECLINED')}
                      disabled={isUpdating}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {isUpdating ? 'Updating...' : 'Mark Declined'}
                    </button>
                  </>
                )}

                {/* Create Revision - for SENT or later statuses */}
                {(quote.status === 'SENT' || quote.status === 'ACCEPTED' || quote.status === 'DECLINED') && (
                  <button
                    onClick={handleCreateRevision}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isUpdating ? 'Creating...' : 'Create Revision'}
                  </button>
                )}

                {/* Convert to Order - only for ACCEPTED */}
                {quote.status === 'ACCEPTED' && !quote.convertedOrderId && (
                  <button
                    onClick={() => setShowConvertModal(true)}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700 disabled:opacity-50"
                  >
                    Convert to Order
                  </button>
                )}

                {/* View Order - if already converted */}
                {quote.convertedOrderId && (
                  <Link
                    href={`/orders/${quote.convertedOrderId}`}
                    className="px-4 py-2 text-sm font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-md hover:bg-pink-100"
                  >
                    View Order &rarr;
                  </Link>
                )}

                {/* Print/Download */}
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Print / PDF
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Print Area */}
          <div className="print-area">
            {/* Print Header - only visible in print */}
            <div className="hidden print-only mb-8">
              <h1 className="text-3xl font-bold">Quote {quote.quoteNumber}</h1>
              <p className="text-gray-600">Date: {formatDate(new Date().toISOString())}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Info */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer Name</p>
                      <p className="font-medium">{quote.customerName}</p>
                      {quote.customer && (
                        <>
                          {quote.customer.email && (
                            <p className="text-sm text-gray-600 mt-1">{quote.customer.email}</p>
                          )}
                          {quote.customer.phone && (
                            <p className="text-sm text-gray-600">{quote.customer.phone}</p>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Event Date</p>
                      <p className="font-medium">{formatDate(quote.eventDate)}</p>
                      {quote.eventType && (
                        <p className="text-sm text-gray-600 mt-1">{quote.eventType}</p>
                      )}
                    </div>
                  </div>
                  {quote.isDelivery && quote.deliveryAddress && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500">Delivery Address</p>
                      <p className="font-medium">{quote.deliveryAddress}</p>
                      {quote.deliveryZone && (
                        <p className="text-sm text-gray-600">Zone: {quote.deliveryZone.name}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Event Details */}
                {(quote.occasion || quote.theme || quote.colors || quote.accentColors || quote.desiredServings || quote.budgetMin || quote.budgetMax) && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Event Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {quote.occasion && (
                        <div>
                          <p className="text-sm text-gray-500">Occasion</p>
                          <p className="font-medium">{quote.occasion}</p>
                        </div>
                      )}
                      {quote.theme && (
                        <div>
                          <p className="text-sm text-gray-500">Theme</p>
                          <p className="font-medium">{quote.theme}</p>
                        </div>
                      )}
                      {quote.desiredServings && (
                        <div>
                          <p className="text-sm text-gray-500">Desired Servings</p>
                          <p className="font-medium">{quote.desiredServings}</p>
                        </div>
                      )}
                      {(quote.budgetMin || quote.budgetMax) && (
                        <div>
                          <p className="text-sm text-gray-500">Budget</p>
                          <p className="font-medium">
                            {quote.budgetMin && quote.budgetMax
                              ? `$${quote.budgetMin.toLocaleString()} - $${quote.budgetMax.toLocaleString()}`
                              : quote.budgetMin
                                ? `From $${quote.budgetMin.toLocaleString()}`
                                : `Up to $${quote.budgetMax?.toLocaleString()}`
                            }
                          </p>
                        </div>
                      )}
                      {quote.colors && (
                        <div>
                          <p className="text-sm text-gray-500">Colors</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {quote.colors.split(',').map((color, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded-full text-sm">
                                {color.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {quote.accentColors && (
                        <div>
                          <p className="text-sm text-gray-500">Accent Colors</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {quote.accentColors.split(',').map((color, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-sm">
                                {color.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cake Details */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Cake Details</h2>
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-gray-600">
                      <span className="font-medium">{quote.quoteTiers.length}</span> tier{quote.quoteTiers.length !== 1 ? 's' : ''} &bull;
                      <span className="font-medium ml-1">{totalServings}</span> servings
                    </p>
                  </div>
                  <div className="space-y-4">
                    {quote.quoteTiers.map((tier) => (
                      <div key={tier.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-medium mb-2">
                          Tier {tier.tierIndex}: {tier.tierSize.name}
                          <span className="text-gray-500 font-normal ml-2">
                            ({tier.tierSize.servings} servings)
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Flavor:</span>{' '}
                            {tier.batterRecipe?.name || tier.flavor || 'Not specified'}
                          </div>
                          <div>
                            <span className="text-gray-500">Filling:</span>{' '}
                            {tier.fillingRecipe?.name || tier.filling || 'Not specified'}
                          </div>
                          <div>
                            <span className="text-gray-500">Finish:</span>{' '}
                            {tier.frostingRecipe?.name || tier.finishType || 'Not specified'}
                          </div>
                          <div>
                            <span className="text-gray-500">Shape:</span>{' '}
                            {tier.tierSize.shape}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decorations */}
                {quote.quoteDecorations.length > 0 && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Decorations</h2>
                    <div className="space-y-2">
                      {quote.quoteDecorations.map(dec => (
                        <div key={dec.id} className="flex justify-between items-center p-3 border border-gray-200 rounded">
                          <div>
                            <span className="font-medium">{dec.decorationTechnique.name}</span>
                            <span className="text-gray-500 text-sm ml-2">({dec.decorationTechnique.category})</span>
                          </div>
                          <span className="text-gray-600">Qty: {dec.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topper */}
                {quote.topperType && quote.topperType !== 'none' && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Cake Topper</h2>
                    <p className="capitalize">{quote.topperType}</p>
                    {quote.topperText && (
                      <p className="text-gray-600 mt-1">Text: "{quote.topperText}"</p>
                    )}
                  </div>
                )}

                {/* Notes - Internal Only */}
                {viewMode === 'internal' && quote.notes && (
                  <div className="bg-yellow-50 shadow rounded-lg p-6 no-print">
                    <h2 className="text-xl font-semibold mb-4 text-yellow-800">Internal Notes</h2>
                    <p className="text-yellow-900 whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}

                {/* Terms & Conditions */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Terms & Conditions</h2>
                  <div className="text-sm text-gray-700 space-y-1">
                    {renderPolicy(quote.termsAndConditions)}
                  </div>
                </div>
              </div>

              {/* Pricing Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white shadow rounded-lg p-6 sticky top-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {viewMode === 'internal' ? 'Cost & Pricing' : 'Quote Summary'}
                  </h2>

                  {/* Customer View - Simple Pricing */}
                  {viewMode === 'customer' && (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Servings:</span>
                        <span className="font-medium">{costing.totalServings}</span>
                      </div>

                      {costing.deliveryCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery:</span>
                          <span>${costing.deliveryCost.toFixed(2)}</span>
                        </div>
                      )}

                      {costing.discount && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({costing.discount.type === 'PERCENT' ? `${costing.discount.value}%` : 'Fixed'}):</span>
                          <span>-${costing.discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between font-bold text-2xl text-pink-600">
                          <span>Total:</span>
                          <span>${costing.finalPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Deposit Info */}
                      {(() => {
                        const depositPct = quote.depositPercent !== null ? quote.depositPercent : defaultDepositPercent
                        return (
                          <div className="bg-pink-50 rounded-lg p-4 mt-4">
                            <p className="text-sm font-medium text-pink-800">Deposit Required</p>
                            <p className="text-lg font-bold text-pink-600">
                              ${(costing.finalPrice * depositPct).toFixed(2)}
                            </p>
                            <p className="text-xs text-pink-700 mt-1">
                              {depositPct === 1 ? 'Full payment' : `${(depositPct * 100).toFixed(0)}%`} to confirm order
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Internal View - Full Cost Breakdown */}
                  {viewMode === 'internal' && (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Servings:</span>
                        <span className="font-medium">{costing.totalServings}</span>
                      </div>

                      <div className="border-t pt-3 mt-3">
                        <p className="font-medium text-gray-900 mb-2">Cost Breakdown</p>
                        <div className="space-y-2 text-gray-600">
                          <div className="flex justify-between">
                            <span>Ingredients:</span>
                            <span>${costing.ingredientCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Decoration Materials:</span>
                            <span>${costing.decorationMaterialCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Decoration Labor:</span>
                            <span>${costing.decorationLaborCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Base Labor:</span>
                            <span>${costing.baseLaborCost.toFixed(2)}</span>
                          </div>
                          {costing.topperCost > 0 && (
                            <div className="flex justify-between">
                              <span>Topper:</span>
                              <span>${costing.topperCost.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Labor Breakdown */}
                      {costing.laborBreakdown.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <p className="font-medium text-gray-900 mb-2">Labor by Role</p>
                          <div className="space-y-1 text-gray-600">
                            {costing.laborBreakdown.map((labor, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span>{labor.role} ({labor.hours.toFixed(1)}h @ ${labor.rate}/hr):</span>
                                <span>${labor.cost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between font-medium">
                          <span>Total Cost:</span>
                          <span>${costing.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-xs mt-1">
                          <span>Markup ({(costing.markupPercent * 100).toFixed(0)}%):</span>
                          <span>+${(costing.suggestedPrice - costing.totalCost + costing.deliveryCost).toFixed(2)}</span>
                        </div>
                      </div>

                      {costing.deliveryCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery:</span>
                          <span>${costing.deliveryCost.toFixed(2)}</span>
                        </div>
                      )}

                      {costing.discount && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-${costing.discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="border-t pt-3 mt-3 space-y-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Final Price:</span>
                          <span className="text-pink-600">${costing.finalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Cost per serving:</span>
                          <span>${costing.costPerServing.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Price per serving:</span>
                          <span>${costing.suggestedPricePerServing.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-green-600">
                          <span>Profit Margin:</span>
                          <span>
                            ${(costing.finalPrice - costing.totalCost).toFixed(2)}
                            ({((costing.finalPrice - costing.totalCost) / costing.finalPrice * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Revision History - Only show if there are multiple versions */}
                {quote.revisionHistory.length > 1 && viewMode === 'internal' && (
                  <div className="bg-white shadow rounded-lg p-6 mt-6">
                    <h2 className="text-lg font-semibold mb-3">Revision History</h2>
                    <div className="space-y-2">
                      {quote.revisionHistory.map((rev) => (
                        <div
                          key={rev.id}
                          className={`flex items-center justify-between p-2 rounded ${
                            rev.id === quote.id ? 'bg-pink-50 border border-pink-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              v{rev.version}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(rev.status)}`}>
                              {rev.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatDate(rev.createdAt)}
                            </span>
                            {rev.id !== quote.id && (
                              <Link
                                href={`/quotes/${rev.id}`}
                                className="text-xs text-pink-600 hover:text-pink-800"
                              >
                                View
                              </Link>
                            )}
                            {rev.id === quote.id && (
                              <span className="text-xs text-gray-400">Current</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Convert to Order Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Convert Quote to Order</h3>
            <p className="text-gray-600 mb-6">
              This will create a new order from this quote with all the same details.
              The quote will be linked to the order for reference.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToOrder}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700 disabled:opacity-50"
              >
                {isUpdating ? 'Converting...' : 'Convert to Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
