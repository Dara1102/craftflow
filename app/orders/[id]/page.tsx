import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditOrderForm from './edit-form'
import { prisma } from '@/lib/db'

export default async function EditOrder({ params }: { params: Promise<{ id: string }> }) {
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
      }
    }
  })

  if (!order) {
    notFound()
  }

  const tierSizes = await prisma.tierSize.findMany({
    orderBy: {
      diameterCm: 'asc'
    }
  })

  // Convert Decimal to number for client component
  const plainOrder = {
    ...order,
    estimatedHours: Number(order.estimatedHours),
    cakeTiers: order.cakeTiers.map(tier => ({
      ...tier,
      tierSize: {
        ...tier.tierSize,
        diameterCm: Number(tier.tierSize.diameterCm),
        heightCm: Number(tier.tierSize.heightCm),
        batterMultiplier: Number(tier.tierSize.batterMultiplier),
        frostingMultiplier: tier.tierSize.frostingMultiplier ? Number(tier.tierSize.frostingMultiplier) : null,
      }
    }))
  }

  const plainTierSizes = tierSizes.map(ts => ({
    ...ts,
    diameterCm: Number(ts.diameterCm),
    heightCm: Number(ts.heightCm),
    batterMultiplier: Number(ts.batterMultiplier),
    frostingMultiplier: ts.frostingMultiplier ? Number(ts.frostingMultiplier) : null,
  }))

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-pink-600">Orders</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">{order.customer?.name || order.customerName || 'Unknown'}</span>
        </nav>

        {/* Quick Actions */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Order</h1>
          <Link
            href={`/orders/${order.id}/costing`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            View Costing
          </Link>
        </div>

        <EditOrderForm order={plainOrder} tierSizes={plainTierSizes} />
      </div>
    </div>
  )
}