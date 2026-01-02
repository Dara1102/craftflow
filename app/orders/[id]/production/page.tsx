import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { calculateOrderCosting } from '@/lib/costing'
import PrintButton from '@/app/components/PrintButton'

export default async function ProductionSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderId = parseInt(id)

  const order = await prisma.cakeOrder.findUnique({
    where: { id: orderId },
    include: {
      Customer: true,
      CakeTier: {
        include: {
          TierSize: true
        },
        orderBy: { tierIndex: 'asc' }
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
          Packaging: true
        }
      }
    }
  })

  if (!order) {
    notFound()
  }

  // Get full costing with recipe data for production
  const costing = await calculateOrderCosting(orderId, true)

  // Calculate total production time
  const totalPrepMinutes = costing.productionRecipes?.reduce((sum, tier) => {
    return sum +
      (tier.batter?.scaledPrepMinutes || 0) +
      (tier.filling?.scaledPrepMinutes || 0) +
      (tier.frosting?.scaledPrepMinutes || 0)
  }, 0) || 0

  const totalBakeMinutes = costing.productionRecipes?.reduce((sum, tier) => {
    return sum +
      (tier.batter?.scaledBakeMinutes || 0) +
      (tier.filling?.scaledBakeMinutes || 0) +
      (tier.frosting?.scaledBakeMinutes || 0)
  }, 0) || 0

  const totalCoolMinutes = costing.productionRecipes?.reduce((sum, tier) => {
    return sum +
      (tier.batter?.scaledCoolMinutes || 0) +
      (tier.filling?.scaledCoolMinutes || 0) +
      (tier.frosting?.scaledCoolMinutes || 0)
  }, 0) || 0

  const decorationMinutes = costing.decorations.reduce((sum, d) => sum + d.laborMinutes, 0)

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 print:max-w-none print:p-2">
      {/* Print Header - Only shows when printing */}
      <div className="hidden print:block mb-4 border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold">Production Sheet - Order #{order.id}</h1>
        <p className="text-sm">{order.Customer?.name || order.customerName} | {new Date(order.eventDate).toLocaleDateString()}</p>
      </div>

      {/* Screen Header */}
      <div className="print:hidden">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-pink-600">Orders</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/orders/${order.id}`} className="hover:text-pink-600">{order.Customer?.name || order.customerName}</Link>
          <svg className="mx-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900">Production Sheet</span>
        </nav>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Sheet</h1>
            <p className="text-sm text-gray-500 mt-1">
              Order #{order.id} | {order.Customer?.name || order.customerName} | {new Date(order.eventDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <PrintButton className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition text-sm font-medium print:hidden" />
            <Link
              href={`/orders/${order.id}/costing`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium"
            >
              View Costing
            </Link>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-300">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Order Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Customer:</span>
            <p className="font-medium">{order.Customer?.name || order.customerName}</p>
          </div>
          <div>
            <span className="text-gray-500">Event Date:</span>
            <p className="font-medium">{new Date(order.eventDate).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-gray-500">Total Servings:</span>
            <p className="font-medium">{costing.totalServings}</p>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <p className="font-medium">{order.status}</p>
          </div>
        </div>
        {order.notes && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-gray-500 text-sm">Notes:</span>
            <p className="text-sm mt-1">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Production Timeline */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 print:bg-white">
        <h2 className="text-lg font-semibold mb-3">Estimated Production Time</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Prep:</span>
            <p className="font-medium">{Math.round(totalPrepMinutes)} min</p>
          </div>
          <div>
            <span className="text-gray-500">Bake:</span>
            <p className="font-medium">{Math.round(totalBakeMinutes)} min</p>
          </div>
          <div>
            <span className="text-gray-500">Cool:</span>
            <p className="font-medium">{Math.round(totalCoolMinutes)} min</p>
          </div>
          <div>
            <span className="text-gray-500">Decorate:</span>
            <p className="font-medium">{Math.round(decorationMinutes)} min</p>
          </div>
          <div>
            <span className="text-gray-500 font-semibold">Total:</span>
            <p className="font-bold">{Math.round((totalPrepMinutes + totalBakeMinutes + totalCoolMinutes + decorationMinutes) / 60 * 10) / 10} hrs</p>
          </div>
        </div>
      </div>

      {/* Tier Recipes */}
      {costing.productionRecipes && costing.productionRecipes.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-300">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Cake Tiers</h2>

          {costing.productionRecipes.map((tier) => (
            <div key={tier.tierId} className="mb-6 last:mb-0">
              <h3 className="font-semibold text-pink-600 mb-2">
                Tier {tier.tierIndex}: {tier.tierName}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Batter */}
                {tier.batter && (
                  <div className="border rounded p-3">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">
                      Batter: {tier.batter.recipe.name}
                      <span className="text-xs text-gray-500 ml-2">({tier.batter.multiplier}x)</span>
                    </h4>
                    <ul className="text-xs space-y-1">
                      {tier.batter.scaledIngredients?.map(ing => (
                        <li key={ing.ingredientId} className="flex justify-between">
                          <span>{ing.name}</span>
                          <span className="font-mono">{ing.quantity} {ing.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Filling */}
                {tier.filling && (
                  <div className="border rounded p-3">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">
                      Filling: {tier.filling.recipe.name}
                      <span className="text-xs text-gray-500 ml-2">({tier.filling.multiplier}x)</span>
                    </h4>
                    <ul className="text-xs space-y-1">
                      {tier.filling.scaledIngredients?.map(ing => (
                        <li key={ing.ingredientId} className="flex justify-between">
                          <span>{ing.name}</span>
                          <span className="font-mono">{ing.quantity} {ing.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Frosting */}
                {tier.frosting && (
                  <div className="border rounded p-3">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">
                      Frosting: {tier.frosting.recipe.name}
                      <span className="text-xs text-gray-500 ml-2">({tier.frosting.multiplier}x)</span>
                    </h4>
                    <ul className="text-xs space-y-1">
                      {tier.frosting.scaledIngredients?.map(ing => (
                        <li key={ing.ingredientId} className="flex justify-between">
                          <span>{ing.name}</span>
                          <span className="font-mono">{ing.quantity} {ing.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aggregated Ingredient Shopping List */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-300">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Shopping List (All Ingredients)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {costing.ingredients.map(ing => (
            <div key={ing.ingredientId} className="flex justify-between py-1 border-b border-gray-100">
              <span>{ing.name}</span>
              <span className="font-mono text-gray-600">{ing.quantity} {ing.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorations */}
      {costing.decorations.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-300">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Decorations</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Technique</th>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {costing.decorations.map(dec => (
                <tr key={dec.techniqueId} className="border-b border-gray-100">
                  <td className="py-2">{dec.name}</td>
                  <td className="py-2 text-gray-600">{dec.category}</td>
                  <td className="py-2 text-right">{dec.quantity} {dec.unit}</td>
                  <td className="py-2 text-right">{Math.round(dec.laborMinutes)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Products (Cupcakes, Cake Pops, etc.) */}
      {costing.products.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-300">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Additional Products</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Labor</th>
              </tr>
            </thead>
            <tbody>
              {costing.products.map(product => (
                <tr key={product.menuItemId} className="border-b border-gray-100">
                  <td className="py-2 font-medium">{product.name}</td>
                  <td className="py-2 text-gray-600">{product.productType}</td>
                  <td className="py-2 text-right">{product.quantity}</td>
                  <td className="py-2 text-right">{product.laborMinutes ? `${product.laborMinutes} min` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Packaging */}
      {costing.packaging.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-300">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Packaging Required</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {costing.packaging.map(pkg => (
                <tr key={pkg.packagingId} className="border-b border-gray-100">
                  <td className="py-2 font-medium">{pkg.name}</td>
                  <td className="py-2 text-gray-600">{pkg.type}</td>
                  <td className="py-2 text-right">{pkg.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Labor Assignment */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 print:shadow-none print:border print:border-gray-300">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Labor Assignment</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Role</th>
              <th className="text-right py-2">Hours</th>
            </tr>
          </thead>
          <tbody>
            {costing.laborBreakdown.map(labor => (
              <tr key={labor.role} className="border-b border-gray-100">
                <td className="py-2 font-medium">{labor.role}</td>
                <td className="py-2 text-right">{labor.hours.toFixed(1)} hrs</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-2">Total Labor</td>
              <td className="py-2 text-right">
                {costing.laborBreakdown.reduce((sum, l) => sum + l.hours, 0).toFixed(1)} hrs
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Checklist */}
      <div className="bg-white shadow rounded-lg p-4 print:shadow-none print:border print:border-gray-300">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Production Checklist</h2>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>All ingredients gathered</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Batter prepared</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Cakes baked and cooled</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Filling prepared</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Frosting prepared</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Tiers assembled and crumb coated</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Final frosting applied</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Decorations complete</span>
          </label>
          {costing.products.length > 0 && (
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Additional products complete</span>
            </label>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Packaged for delivery/pickup</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Quality check complete</span>
          </label>
        </div>
      </div>
    </div>
  )
}
