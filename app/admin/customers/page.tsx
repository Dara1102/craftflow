import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function CustomersAdmin() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: { CakeOrder: true }
      },
      CakeOrder: {
        orderBy: { eventDate: 'desc' },
        take: 1,
        select: {
          eventDate: true,
          status: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="mt-1 text-sm text-gray-500">
              {customers.length} customer{customers.length !== 1 ? 's' : ''} in your database
            </p>
          </div>
          <Link
            href="/admin/customers/new"
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            Add Customer
          </Link>
        </div>

        {customers.length === 0 ? (
          <div className="bg-white shadow sm:rounded-lg p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No customers yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Customers will appear here when you create orders with customer information.
            </p>
            <Link
              href="/orders/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-pink-700 bg-pink-100 hover:bg-pink-200"
            >
              Create your first order
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => {
                  const lastOrder = customer.CakeOrder[0]
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-pink-100 rounded-full flex items-center justify-center">
                            <span className="text-pink-600 font-medium text-sm">
                              {customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </div>
                            {customer.address && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {customer.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.email || '-'}</div>
                        <div className="text-sm text-gray-500">{customer.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {customer._count.CakeOrder} order{customer._count.CakeOrder !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lastOrder ? (
                          <div>
                            <div>{new Date(lastOrder.eventDate).toLocaleDateString()}</div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              lastOrder.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              lastOrder.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                              lastOrder.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                              lastOrder.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lastOrder.status}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="text-pink-600 hover:text-pink-900 font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
