import { notFound } from 'next/navigation'
import { calculateOrderCosting } from '@/lib/costing'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import PrintButton from './print-button'

export default async function OrderSummary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = parseInt(id)

  const order = await prisma.cakeOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      cakeTiers: {
        include: {
          tierSize: true
        },
        orderBy: {
          tierIndex: 'asc'
        }
      },
      orderDecorations: {
        include: {
          decorationTechnique: true
        }
      }
    }
  })

  if (!order) {
    notFound()
  }

  const costing = await calculateOrderCosting(orderId)
  const customerName = order.customer?.name || order.customerName || 'Valued Customer'

  // Format topper display
  const formatTopper = () => {
    if (!order.topperType) return null
    const topperLabels: Record<string, string> = {
      age: `Age Number: ${order.topperText}`,
      happy_birthday: 'Happy Birthday',
      its_a_boy: "It's a Boy",
      its_a_girl: "It's a Girl",
      initials: `Initials: ${order.topperText}`,
      congratulations: 'Congratulations',
      custom: order.topperText || 'Custom Topper'
    }
    return topperLabels[order.topperType] || order.topperType
  }

  // Generate cake description
  const getCakeDescription = () => {
    const parts: string[] = []

    if (order.cakeTiers.length > 1) {
      parts.push(`${order.cakeTiers.length}-tier`)
    }

    const mainTier = order.cakeTiers[0]
    if (mainTier?.flavor) {
      parts.push(mainTier.flavor.toLowerCase())
    }

    parts.push('cake')

    if (mainTier?.finishType) {
      parts.push(`with ${mainTier.finishType.toLowerCase()} finish`)
    }

    return parts.join(' ')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        {/* Back link - only visible for admin */}
        <nav className="flex items-center text-sm text-gray-500 mb-6 print:hidden">
          <Link href={`/orders/${order.id}/costing`} className="hover:text-pink-600">
            ← Back to Costing Report
          </Link>
        </nav>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546V12a6 6 0 016-6h6a6 6 0 016 6v3.546z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmation</h1>
          <p className="text-gray-600">
            Thank you for your order, {customerName}!
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          {/* Event Info */}
          <div className="bg-pink-600 text-white px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-pink-100 text-sm">Event Date</p>
                <p className="text-xl font-semibold">
                  {new Date(order.eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-pink-100 text-sm">Order #</p>
                <p className="text-xl font-semibold">{order.id}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Cake Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Cake</h2>
              <p className="text-xl text-gray-800 capitalize mb-4">{getCakeDescription()}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Servings</p>
                  <p className="text-lg font-semibold text-gray-900">{costing.totalServings}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Tiers</p>
                  <p className="text-lg font-semibold text-gray-900">{order.cakeTiers.length}</p>
                </div>
              </div>
            </div>

            {/* Tier Details */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tier Details</h3>
              <div className="space-y-2">
                {order.cakeTiers.map((tier, index) => (
                  <div key={tier.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-medium text-gray-900">Tier {index + 1}: </span>
                      <span className="text-gray-600">{tier.tierSize.name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {tier.flavor} • {tier.filling}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
              {order.occasion && (
                <div>
                  <p className="text-sm text-gray-500">Occasion</p>
                  <p className="font-medium text-gray-900">{order.occasion}</p>
                </div>
              )}
              {order.theme && (
                <div>
                  <p className="text-sm text-gray-500">Theme</p>
                  <p className="font-medium text-gray-900">{order.theme}</p>
                </div>
              )}
              {order.colors && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Colors</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {order.colors.split(',').map((color, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        {color.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decorations */}
            {order.orderDecorations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Decorations</h3>
                <div className="flex flex-wrap gap-2">
                  {order.orderDecorations.map((dec) => (
                    <span
                      key={dec.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                    >
                      {dec.decorationTechnique.name}
                      {dec.quantity > 1 && ` (x${dec.quantity})`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Topper */}
            {formatTopper() && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Topper</h3>
                <p className="text-gray-900">{formatTopper()}</p>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Special Instructions</h3>
                <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{order.notes}</p>
              </div>
            )}

            {/* Delivery Info */}
            {order.isDelivery && (
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery Information</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  {order.deliveryTime && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Time:</span>{' '}
                      {new Date(order.deliveryTime).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {order.deliveryAddress && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Address:</span> {order.deliveryAddress}
                    </p>
                  )}
                  {order.deliveryContact && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Contact:</span> {order.deliveryContact}
                      {order.deliveryPhone && ` (${order.deliveryPhone})`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Price Section */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="space-y-2">
              {/* Base price (before discount and delivery) */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Cake Price</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${costing.suggestedPrice.toFixed(2)}
                </span>
              </div>

              {/* Delivery fee if applicable */}
              {costing.deliveryCost > 0 && costing.delivery && (
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500">
                      Delivery Fee ({costing.delivery.zoneName})
                    </span>
                    {costing.delivery.estimatedDistance && (
                      <span className="text-xs text-gray-400 block">
                        {costing.delivery.estimatedDistance} miles
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${costing.deliveryCost.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Discount if applicable */}
              {costing.discountAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Discount Applied</span>
                  <span className="text-lg font-semibold text-green-600">
                    -${costing.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-3xl font-bold text-pink-600">
                  ${costing.finalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="text-center mb-6">
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            order.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
            order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
            order.status === 'COMPLETED' ? 'bg-purple-100 text-purple-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            Status: {order.status === 'DRAFT' ? 'Quote' : order.status.replace('_', ' ')}
          </span>
        </div>

        {/* Contact Info */}
        <div className="text-center text-gray-500 text-sm">
          <p>Questions about your order? Contact us!</p>
          <p className="mt-2 font-medium text-gray-700">Craftflow Cakes</p>
        </div>

        {/* Print Button */}
        <PrintButton />
      </div>
    </div>
  )
}
