import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditOrderForm from './edit-form'
import { prisma } from '@/lib/db'

export default async function EditOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = parseInt(id)

  const orderRaw = await prisma.cakeOrder.findUnique({
    where: { id: orderId },
    include: {
      Customer: true,
      CakeTier: {
        include: {
          TierSize: true
        },
        orderBy: {
          tierIndex: 'asc'
        }
      },
      OrderDecoration: {
        include: {
          DecorationTechnique: true
        }
      },
      OrderItem: {
        include: {
          MenuItem: {
            include: {
              ProductType: true
            }
          },
          Packaging: true,
          OrderItemPackaging: {
            include: {
              Packaging: true
            }
          }
        }
      },
      OrderPackaging: {
        include: {
          Packaging: true
        }
      }
    }
  })

  if (!orderRaw) {
    notFound()
  }

  // Transform to expected format for frontend - exclude PascalCase relations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { Customer, CakeTier, OrderDecoration, OrderItem, OrderPackaging, ...orderBase } = orderRaw
  const order = {
    ...orderBase,
    customer: Customer,
    cakeTiers: CakeTier.map(tier => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { TierSize, ...tierBase } = tier
      return {
        ...tierBase,
        tierSize: TierSize
      }
    }),
    orderDecorations: OrderDecoration.map(dec => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { DecorationTechnique, ...decBase } = dec
      return {
        ...decBase,
        decorationTechnique: DecorationTechnique
      }
    }),
    orderItems: OrderItem.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { MenuItem, Packaging, OrderItemPackaging: ItemPackaging, ...itemBase } = item
      return {
        ...itemBase,
        menuItem: MenuItem ? {
          ...MenuItem,
          productType: MenuItem.ProductType
        } : null,
        packaging: Packaging,
        // Include multiple packaging selections
        packagingSelections: ItemPackaging?.map(oip => ({
          packagingId: oip.packagingId,
          quantity: oip.quantity,
          packaging: oip.Packaging
        })) || []
      }
    }),
    // Order-level packaging (not tied to products)
    orderPackaging: OrderPackaging.map(op => ({
      id: op.id,
      packagingId: op.packagingId,
      quantity: op.quantity,
      notes: op.notes,
      packaging: op.Packaging
    }))
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
    bakerHours: order.bakerHours ? Number(order.bakerHours) : null,
    assistantHours: order.assistantHours ? Number(order.assistantHours) : null,
    customTopperFee: order.customTopperFee ? Number(order.customTopperFee) : null,
    discountValue: order.discountValue ? Number(order.discountValue) : null,
    deliveryDistance: order.deliveryDistance ? Number(order.deliveryDistance) : null,
    markupPercent: order.markupPercent ? Number(order.markupPercent) : null,
    deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : null,
    cakeTiers: order.cakeTiers.map(tier => ({
      ...tier,
      tierSize: {
        ...tier.tierSize,
        diameterCm: Number(tier.tierSize.diameterCm),
        lengthCm: tier.tierSize.lengthCm ? Number(tier.tierSize.lengthCm) : null,
        widthCm: tier.tierSize.widthCm ? Number(tier.tierSize.widthCm) : null,
        heightCm: Number(tier.tierSize.heightCm),
      }
    })),
    orderDecorations: order.orderDecorations.map(dec => ({
      ...dec,
      decorationTechnique: {
        ...dec.decorationTechnique,
        defaultCostPerUnit: Number(dec.decorationTechnique.defaultCostPerUnit),
      }
    })),
    orderItems: order.orderItems
      .filter(item => item.menuItem !== null)
      .map(item => ({
        id: item.id,
        menuItemId: item.menuItemId!,
        quantity: item.quantity,
        packagingId: item.packagingId,
        packagingQty: item.packagingQty,
        notes: item.notes,
        menuItem: {
          id: item.menuItem!.id,
          name: item.menuItem!.name,
          menuPrice: Number(item.menuItem!.menuPrice),
          productType: { name: item.menuItem!.productType.name }
        },
        packaging: item.packaging ? {
          id: item.packaging.id,
          name: item.packaging.name,
          type: item.packaging.type,
          costPerUnit: Number(item.packaging.costPerUnit)
        } : null,
        packagingSelections: (item.packagingSelections || []).map(ps => ({
          packagingId: ps.packagingId,
          quantity: ps.quantity
        }))
      })),
    orderPackaging: order.orderPackaging.map(op => ({
      id: op.id,
      packagingId: op.packagingId,
      quantity: op.quantity,
      notes: op.notes,
      packaging: {
        id: op.packaging.id,
        name: op.packaging.name,
        type: op.packaging.type,
        costPerUnit: Number(op.packaging.costPerUnit)
      }
    }))
  }

  const plainTierSizes = tierSizes.map(ts => ({
    ...ts,
    diameterCm: Number(ts.diameterCm),
    lengthCm: ts.lengthCm ? Number(ts.lengthCm) : null,
    widthCm: ts.widthCm ? Number(ts.widthCm) : null,
    heightCm: Number(ts.heightCm),
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Order #{order.id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {order.customer?.name || order.customerName} &bull; {new Date(order.eventDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/orders/${order.id}/production`}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm font-medium"
            >
              Production Sheet
            </Link>
            <Link
              href={`/orders/${order.id}/costing`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium"
            >
              View Costing
            </Link>
          </div>
        </div>

        <EditOrderForm order={plainOrder} tierSizes={plainTierSizes} />
      </div>
    </div>
  )
}