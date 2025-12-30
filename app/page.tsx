import { OrderStatus } from '@prisma/client'
import Link from 'next/link'
import { calculateOrderCosting } from '@/lib/costing'
import { prisma } from '@/lib/db'

export default async function Dashboard() {
  const ordersRaw = await prisma.cakeOrder.findMany({
    include: {
      Customer: true,
      CakeTier: {
        include: {
          TierSize: true
        }
      }
    },
    orderBy: {
      eventDate: 'asc'
    }
  })

  // Transform to expected format
  const orders = ordersRaw.map(order => ({
    ...order,
    customer: order.Customer,
    cakeTiers: order.CakeTier.map(tier => ({
      ...tier,
      tierSize: tier.TierSize
    }))
  }))

  const ordersWithCosting = await Promise.all(
    orders.map(async (order) => {
      try {
        const costing = await calculateOrderCosting(order.id)
        return { ...order, costing }
      } catch {
        return { ...order, costing: null }
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Cake Orders</h1>
          <Link
            href="/orders/new"
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Create New Cake Order
          </Link>
        </div>

        {ordersWithCosting.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <p className="text-gray-500 text-center">No orders yet. Create your first order to get started!</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Servings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suggested Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersWithCosting.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-pink-600">
                      <Link href={`/orders/${order.id}`} className="hover:text-pink-800">
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.customer?.name || order.customerName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.eventDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.costing?.totalServings || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.costing ? `$${order.costing.suggestedPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === OrderStatus.CONFIRMED
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status === 'DRAFT' ? 'Quote' : order.status}
                        </span>
                        {order.isRush && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            RUSH
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/orders/${order.id}`} className="text-pink-600 hover:text-pink-900 mr-4">
                        Edit
                      </Link>
                      <Link href={`/orders/${order.id}/costing`} className="text-blue-600 hover:text-blue-900">
                        Costing
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}