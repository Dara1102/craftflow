'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Quote {
  id: number
  quoteNumber: string
  customerName: string
  status: string
  eventDate: string
  createdAt: string
  sentAt: string | null
  lockedAt: string | null
  lockedCosting: string | null
  estimatedCost: number | null
  version: number
  customer: {
    company: string | null
  } | null
  quoteTiers: {
    tierSize: { servings: number }
  }[]
}

export default function QuotesPage() {
  const router = useRouter()
  const { data: quotes, mutate } = useSWR<Quote[]>('/api/quotes', fetcher)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [revisingId, setRevisingId] = useState<number | null>(null)

  const getTotalServings = (quote: Quote) => {
    return quote.quoteTiers?.reduce((sum, tier) => sum + (tier.tierSize?.servings || 0), 0) || 0
  }

  const getQuoteAmount = (quote: Quote) => {
    // Use estimatedCost which is calculated for all quotes
    return quote.estimatedCost
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

  const getStatusTimestamp = (quote: Quote) => {
    if (quote.status === 'ACCEPTED' && quote.lockedAt) {
      return `Accepted ${new Date(quote.lockedAt).toLocaleDateString()}`
    }
    if (quote.status === 'SENT' && quote.sentAt) {
      return `Sent ${new Date(quote.sentAt).toLocaleDateString()}`
    }
    if (quote.status === 'DRAFT') {
      return `Created ${new Date(quote.createdAt).toLocaleDateString()}`
    }
    return new Date(quote.createdAt).toLocaleDateString()
  }

  const handleDelete = async (e: React.MouseEvent, quoteId: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this quote?')) return

    setDeletingId(quoteId)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' })
      if (res.ok) {
        mutate()
      } else {
        alert('Failed to delete quote')
      }
    } catch {
      alert('Failed to delete quote')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRevise = async (e: React.MouseEvent, quoteId: number) => {
    e.preventDefault()
    e.stopPropagation()

    setRevisingId(quoteId)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/revise`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        router.push(`/quotes/${data.revision.id}/edit`)
      } else {
        const error = await res.json()
        alert(`Failed to create revision: ${error.error}`)
      }
    } catch {
      alert('Failed to create revision')
    } finally {
      setRevisingId(null)
    }
  }

  if (!quotes) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
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
              Create your first quote &rarr;
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {quotes.map((quote) => {
                const amount = getQuoteAmount(quote)
                return (
                  <li key={quote.id} className="hover:bg-gray-50 transition">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="text-sm font-medium text-pink-600 truncate hover:text-pink-800"
                          >
                            {quote.quoteNumber}
                          </Link>
                          <p className="ml-4 text-sm text-gray-900 truncate">
                            {quote.customerName}
                          </p>
                          {quote.customer?.company && (
                            <p className="ml-2 text-sm text-gray-500 hidden sm:block">
                              ({quote.customer.company})
                            </p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="ml-4 flex-shrink-0 text-right">
                          {amount ? (
                            <>
                              <span className={`text-lg font-bold ${quote.lockedCosting ? 'text-green-600' : 'text-gray-600'}`}>
                                ${amount.toFixed(2)}
                              </span>
                              {!quote.lockedCosting && (
                                <span className="block text-xs text-gray-400">est.</span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              --
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="ml-4 flex-shrink-0">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quote.status)}`}
                          >
                            {quote.status}
                            {quote.version > 1 && ` v${quote.version}`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span>Event: {new Date(quote.eventDate).toLocaleDateString()}</span>
                          <span>Servings: {getTotalServings(quote)}</span>
                          <span>Tiers: {quote.quoteTiers?.length || 0}</span>
                          <span>{getStatusTimestamp(quote)}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                          >
                            View
                          </Link>
                          <Link
                            href={`/quotes/${quote.id}/edit`}
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={(e) => handleRevise(e, quote.id)}
                            disabled={revisingId === quote.id}
                            className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition disabled:opacity-50"
                          >
                            {revisingId === quote.id ? '...' : 'Revise'}
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, quote.id)}
                            disabled={deletingId === quote.id}
                            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition disabled:opacity-50"
                          >
                            {deletingId === quote.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
