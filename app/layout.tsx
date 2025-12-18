import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CraftFlow - Cake Costing',
  description: 'Professional cake costing and order management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="text-2xl font-bold text-pink-600">
                    CraftFlow
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link href="/" className="text-gray-900 hover:text-pink-600 inline-flex items-center px-1 pt-1 text-sm font-medium">
                    Orders
                  </Link>
                  <Link href="/quotes" className="text-gray-500 hover:text-pink-600 inline-flex items-center px-1 pt-1 text-sm font-medium">
                    Quotes
                  </Link>
                  <Link href="/orders/new" className="text-gray-500 hover:text-pink-600 inline-flex items-center px-1 pt-1 text-sm font-medium">
                    + New Order
                  </Link>
                  <Link href="/quotes/new" className="text-gray-500 hover:text-pink-600 inline-flex items-center px-1 pt-1 text-sm font-medium">
                    + New Quote
                  </Link>

                  {/* Admin Dropdown */}
                  <div className="relative inline-flex items-center group">
                    <Link
                      href="/admin/ingredients"
                      className="text-gray-500 hover:text-pink-600 inline-flex items-center px-1 pt-1 text-sm font-medium"
                    >
                      Admin
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>

                    {/* Dropdown Menu */}
                    <div className="absolute left-0 top-full mt-0 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                      <div className="py-1">
                        <Link href="/admin/ingredients" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                          Ingredients
                        </Link>
                        <Link href="/admin/recipes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                          Recipes
                        </Link>
                        <Link href="/admin/tiers" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                          Tier Sizes
                        </Link>
                        <Link href="/admin/decorations" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                          Decorations
                        </Link>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link href="/admin/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                          Settings
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="sm:hidden flex items-center">
                <div className="flex items-center justify-center">
                  <a 
                    href="https://cursor.com/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn--ghost btn--sm"
                  >
                    Sign in
                  </a>
                  <details className="relative ml-4">
                    <summary className="list-none cursor-pointer p-2">
                      <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </summary>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <Link href="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">Orders</Link>
                        <Link href="/quotes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">Quotes</Link>
                        <Link href="/orders/new" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">+ New Order</Link>
                        <Link href="/quotes/new" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">+ New Quote</Link>
                        <div className="border-t border-gray-100 my-1"></div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Admin</div>
                        <Link href="/admin/ingredients" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">Ingredients</Link>
                        <Link href="/admin/recipes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">Recipes</Link>
                        <Link href="/admin/tiers" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">Tier Sizes</Link>
                        <Link href="/admin/decorations" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">Decorations</Link>
                        <Link href="/admin/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50">Settings</Link>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}