import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({
    include: {
      Customer: true,
      QuoteTier: {
        include: {
          TierSize: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  })

  const getTotalServings = (quote: typeof quotes[0]) => {
    return quote.QuoteTier.reduce((sum, tier) => sum + tier.TierSize.servings, 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'SENT':
        return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'DECLINED':
        return 'bg-red-100 text-red-800'
      case 'EXPIRED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
          <Link
            href="/quotes/new"
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
          >
            + New Quote
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">No quotes yet</p>
            <Link
              href="/quotes/new"
              className="text-pink-600 hover:text-pink-800 font-medium"
            >
              Create your first quote →
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {quotes.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="block hover:bg-gray-50 transition"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-pink-600 truncate">
                            {quote.quoteNumber}
                          </p>
                          <p className="ml-4 text-sm text-gray-900">
                            {quote.customerName}
                          </p>
                          {quote.Customer?.company && (
                            <p className="ml-2 text-sm text-gray-500">
                              ({quote.Customer.company})
                            </p>
                          )}
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quote.status)}`}
                          >
                            {quote.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Event: {new Date(quote.eventDate).toLocaleDateString()}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            Servings: {getTotalServings(quote)}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            Tiers: {quote.QuoteTier.length}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            Created: {new Date(quote.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

