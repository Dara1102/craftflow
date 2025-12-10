import { notFound } from 'next/navigation'
import { calculateOrderCosting } from '@/lib/costing'
import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function OrderCosting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = parseInt(id)

  const order = await prisma.cakeOrder.findUnique({
    where: { id: orderId },
    include: {
      cakeTiers: {
        include: {
          tierSize: true
        }
      }
    }
  })

  if (!order) {
    notFound()
  }

  const costing = await calculateOrderCosting(orderId)

  return (
    <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-pink-600">Orders</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/orders/${order.id}`} className="hover:text-pink-600">{order.customerName}</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">Costing</span>
        </nav>

        {/* Header with actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Order Costing Report</h3>
            <p className="mt-1 text-sm text-gray-500">Detailed cost breakdown for {order.customerName}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/orders/${order.id}/summary`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium"
            >
              Customer Summary
            </Link>
            <Link
              href={`/orders/${order.id}`}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition text-sm font-medium"
            >
              Edit Order
            </Link>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Order Summary</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Event Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(order.eventDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.status === 'DRAFT' ? 'Quote' : order.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Servings</dt>
                <dd className="mt-1 text-sm text-gray-900">{costing.totalServings}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Suggested Price</dt>
                <dd className="mt-1 text-2xl font-bold text-pink-600">
                  ${costing.suggestedPrice.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Price per Serving</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ${costing.suggestedPricePerServing.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h4>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Ingredients</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${costing.ingredientCost.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Decoration Materials</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${costing.decorationMaterialCost.toFixed(2)}
                </dd>
              </div>
              {costing.topperCost > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">
                    Topper ({costing.topper?.type === 'custom' ? 'Custom' : costing.topper?.type?.replace('_', ' ')})
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    ${costing.topperCost.toFixed(2)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Total Labor</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${costing.totalLaborCost.toFixed(2)}
                </dd>
              </div>
              {costing.deliveryCost > 0 && costing.delivery && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">
                    <div>Delivery ({costing.delivery.zoneName})</div>
                    <div className="text-xs text-gray-400">
                      ${costing.delivery.baseFee.toFixed(2)} base
                      {costing.delivery.perMileFee && costing.delivery.estimatedDistance && (
                        <> + ${costing.delivery.perMileFee.toFixed(2)}/mi x {costing.delivery.estimatedDistance} mi</>
                      )}
                    </div>
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    ${costing.deliveryCost.toFixed(2)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-900">Total Cost</dt>
                <dd className="text-sm font-bold text-gray-900">
                  ${costing.totalCost.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Markup ({(costing.markupPercent * 100).toFixed(0)}%)</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${(costing.suggestedPrice - costing.totalCost).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-900">Suggested Price</dt>
                <dd className="text-lg font-bold text-pink-600">
                  ${costing.suggestedPrice.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow sm:rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Labor Breakdown</h4>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Base Labor</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${costing.baseLaborCost.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Decoration Labor</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${costing.decorationLaborCost.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-900">Total Labor Cost</dt>
                <dd className="text-sm font-bold text-gray-900">
                  ${costing.totalLaborCost.toFixed(2)}
                </dd>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                Decoration labor is calculated from technique time estimates
              </div>
            </dl>
          </div>

          <div className="bg-white shadow sm:rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Per Serving</h4>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Cost per Serving</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${costing.costPerServing.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Price per Serving</dt>
                <dd className="text-sm font-medium text-gray-900">
                  ${costing.suggestedPricePerServing.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-900">Profit per Serving</dt>
                <dd className="text-sm font-bold text-green-600">
                  ${(costing.suggestedPricePerServing - costing.costPerServing).toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Ingredients Required
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingredient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {costing.ingredients.map((ingredient) => (
                  <tr key={ingredient.ingredientId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ingredient.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ingredient.quantity} {ingredient.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${ingredient.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Decoration Techniques
            </h3>
            <Link
              href={`/orders/${order.id}/decorations`}
              className="text-sm text-pink-600 hover:text-pink-800"
            >
              Manage Decorations
            </Link>
          </div>
          <div className="border-t border-gray-200">
            {costing.decorations.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No decoration techniques added to this order yet.</p>
                <Link
                  href={`/orders/${order.id}/decorations`}
                  className="mt-2 inline-block text-pink-600 hover:text-pink-800"
                >
                  Add decorations
                </Link>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Technique
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Labor (min)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Labor Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costing.decorations.map((dec) => (
                    <tr key={dec.techniqueId}>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{dec.name}</div>
                        <div className="text-xs text-gray-500">{dec.sku}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dec.category}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dec.quantity} {dec.unit}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${dec.materialCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dec.laborMinutes}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${dec.laborCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${dec.totalCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      Totals:
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${costing.decorationMaterialCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {costing.decorations.reduce((sum, d) => sum + d.laborMinutes, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${costing.decorationLaborCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      ${(costing.decorationMaterialCost + costing.decorationLaborCost).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
