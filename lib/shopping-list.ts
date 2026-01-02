import { prisma } from './db'

export interface ShoppingListItem {
  ingredientId: number
  ingredientName: string
  ingredientUnit: string
  totalQuantityNeeded: number

  // Vendor info (preferred vendor or first available)
  vendorId: number | null
  vendorName: string | null
  vendorSku: string | null
  packSize: number | null
  packUnit: string | null
  pricePerPack: number | null
  packsNeeded: number | null
  estimatedCost: number | null
  reorderUrl: string | null
}

export interface VendorShoppingGroup {
  vendorId: number | null
  vendorName: string
  items: ShoppingListItem[]
  totalEstimatedCost: number
}

export interface ShoppingListResult {
  orderIds: number[]
  orderCount: number
  generatedAt: string
  vendorGroups: VendorShoppingGroup[]
  grandTotal: number
  unlinkedIngredients: ShoppingListItem[]
}

/**
 * Generate a shopping list from orders
 * Aggregates all ingredients needed across recipes and groups by vendor
 */
export async function generateShoppingList(orderIds: number[]): Promise<ShoppingListResult> {
  // Fetch orders with all recipe data
  const orders = await prisma.cakeOrder.findMany({
    where: { id: { in: orderIds } },
    include: {
      CakeTier: {
        include: {
          TierSize: true,
          Recipe_CakeTier_batterRecipeIdToRecipe: {
            include: {
              RecipeIngredient: {
                include: { Ingredient: true }
              }
            }
          },
          Recipe_CakeTier_fillingRecipeIdToRecipe: {
            include: {
              RecipeIngredient: {
                include: { Ingredient: true }
              }
            }
          },
          Recipe_CakeTier_frostingRecipeIdToRecipe: {
            include: {
              RecipeIngredient: {
                include: { Ingredient: true }
              }
            }
          }
        }
      },
      OrderItem: {
        include: {
          MenuItem: {
            include: {
              Recipe_MenuItem_batterRecipeIdToRecipe: {
                include: {
                  RecipeIngredient: {
                    include: { Ingredient: true }
                  }
                }
              },
              Recipe_MenuItem_fillingRecipeIdToRecipe: {
                include: {
                  RecipeIngredient: {
                    include: { Ingredient: true }
                  }
                }
              },
              Recipe_MenuItem_frostingRecipeIdToRecipe: {
                include: {
                  RecipeIngredient: {
                    include: { Ingredient: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  // Aggregate ingredients
  const ingredientTotals: Map<number, { ingredient: { id: number, name: string, unit: string }, quantity: number }> = new Map()

  for (const order of orders) {
    // Process cake tiers
    for (const tier of order.CakeTier) {
      const multiplier = Number(tier.batterMultiplier) || 1

      // Batter recipe ingredients
      if (tier.Recipe_CakeTier_batterRecipeIdToRecipe) {
        for (const ri of tier.Recipe_CakeTier_batterRecipeIdToRecipe.RecipeIngredient) {
          const qty = Number(ri.quantity) * multiplier
          const existing = ingredientTotals.get(ri.ingredientId)
          if (existing) {
            existing.quantity += qty
          } else {
            ingredientTotals.set(ri.ingredientId, {
              ingredient: { id: ri.Ingredient.id, name: ri.Ingredient.name, unit: ri.Ingredient.unit },
              quantity: qty
            })
          }
        }
      }

      // Filling recipe ingredients
      if (tier.Recipe_CakeTier_fillingRecipeIdToRecipe) {
        const fillingMultiplier = Number(tier.fillingMultiplier) || 1
        for (const ri of tier.Recipe_CakeTier_fillingRecipeIdToRecipe.RecipeIngredient) {
          const qty = Number(ri.quantity) * fillingMultiplier
          const existing = ingredientTotals.get(ri.ingredientId)
          if (existing) {
            existing.quantity += qty
          } else {
            ingredientTotals.set(ri.ingredientId, {
              ingredient: { id: ri.Ingredient.id, name: ri.Ingredient.name, unit: ri.Ingredient.unit },
              quantity: qty
            })
          }
        }
      }

      // Frosting recipe ingredients
      if (tier.Recipe_CakeTier_frostingRecipeIdToRecipe) {
        const frostingMultiplier = Number(tier.frostingMultiplier) || 1
        for (const ri of tier.Recipe_CakeTier_frostingRecipeIdToRecipe.RecipeIngredient) {
          const qty = Number(ri.quantity) * frostingMultiplier
          const existing = ingredientTotals.get(ri.ingredientId)
          if (existing) {
            existing.quantity += qty
          } else {
            ingredientTotals.set(ri.ingredientId, {
              ingredient: { id: ri.Ingredient.id, name: ri.Ingredient.name, unit: ri.Ingredient.unit },
              quantity: qty
            })
          }
        }
      }
    }

    // Process order items (cupcakes, etc.)
    for (const item of order.OrderItem) {
      if (!item.MenuItem) continue

      const yieldsPerRecipe = item.MenuItem.yieldsPerRecipe || 1
      const batchesNeeded = Math.ceil(item.quantity / yieldsPerRecipe)

      // Batter recipe
      if (item.MenuItem.Recipe_MenuItem_batterRecipeIdToRecipe) {
        for (const ri of item.MenuItem.Recipe_MenuItem_batterRecipeIdToRecipe.RecipeIngredient) {
          const qty = Number(ri.quantity) * batchesNeeded
          const existing = ingredientTotals.get(ri.ingredientId)
          if (existing) {
            existing.quantity += qty
          } else {
            ingredientTotals.set(ri.ingredientId, {
              ingredient: { id: ri.Ingredient.id, name: ri.Ingredient.name, unit: ri.Ingredient.unit },
              quantity: qty
            })
          }
        }
      }

      // Filling recipe
      if (item.MenuItem.Recipe_MenuItem_fillingRecipeIdToRecipe) {
        for (const ri of item.MenuItem.Recipe_MenuItem_fillingRecipeIdToRecipe.RecipeIngredient) {
          const qty = Number(ri.quantity) * batchesNeeded
          const existing = ingredientTotals.get(ri.ingredientId)
          if (existing) {
            existing.quantity += qty
          } else {
            ingredientTotals.set(ri.ingredientId, {
              ingredient: { id: ri.Ingredient.id, name: ri.Ingredient.name, unit: ri.Ingredient.unit },
              quantity: qty
            })
          }
        }
      }

      // Frosting recipe
      if (item.MenuItem.Recipe_MenuItem_frostingRecipeIdToRecipe) {
        for (const ri of item.MenuItem.Recipe_MenuItem_frostingRecipeIdToRecipe.RecipeIngredient) {
          const qty = Number(ri.quantity) * batchesNeeded
          const existing = ingredientTotals.get(ri.ingredientId)
          if (existing) {
            existing.quantity += qty
          } else {
            ingredientTotals.set(ri.ingredientId, {
              ingredient: { id: ri.Ingredient.id, name: ri.Ingredient.name, unit: ri.Ingredient.unit },
              quantity: qty
            })
          }
        }
      }
    }
  }

  // Get vendor links for all ingredients
  const ingredientIds = Array.from(ingredientTotals.keys())
  const vendorLinks = await prisma.ingredientVendor.findMany({
    where: { ingredientId: { in: ingredientIds } },
    include: { Vendor: true },
    orderBy: [
      { isPreferred: 'desc' },
      { pricePerPack: 'asc' }
    ]
  })

  // Create lookup map (preferred vendor first)
  const vendorLinkMap: Map<number, typeof vendorLinks[0]> = new Map()
  for (const link of vendorLinks) {
    if (!vendorLinkMap.has(link.ingredientId)) {
      vendorLinkMap.set(link.ingredientId, link)
    }
  }

  // Build shopping list items
  const shoppingItems: ShoppingListItem[] = []
  for (const [ingredientId, data] of ingredientTotals) {
    const vendorLink = vendorLinkMap.get(ingredientId)

    let packsNeeded: number | null = null
    let estimatedCost: number | null = null

    if (vendorLink) {
      const packSize = Number(vendorLink.packSize)
      // TODO: Unit conversion logic - for now assume same units
      packsNeeded = Math.ceil(data.quantity / packSize)
      estimatedCost = packsNeeded * Number(vendorLink.pricePerPack)
    }

    shoppingItems.push({
      ingredientId,
      ingredientName: data.ingredient.name,
      ingredientUnit: data.ingredient.unit,
      totalQuantityNeeded: data.quantity,
      vendorId: vendorLink?.vendorId || null,
      vendorName: vendorLink?.Vendor.name || null,
      vendorSku: vendorLink?.vendorSku || null,
      packSize: vendorLink ? Number(vendorLink.packSize) : null,
      packUnit: vendorLink?.packUnit || null,
      pricePerPack: vendorLink ? Number(vendorLink.pricePerPack) : null,
      packsNeeded,
      estimatedCost,
      reorderUrl: vendorLink?.reorderUrl || null
    })
  }

  // Group by vendor
  const vendorGroupsMap: Map<number | null, ShoppingListItem[]> = new Map()
  const unlinkedIngredients: ShoppingListItem[] = []

  for (const item of shoppingItems) {
    if (item.vendorId === null) {
      unlinkedIngredients.push(item)
    } else {
      const existing = vendorGroupsMap.get(item.vendorId)
      if (existing) {
        existing.push(item)
      } else {
        vendorGroupsMap.set(item.vendorId, [item])
      }
    }
  }

  // Convert to array and calculate totals
  const vendorGroups: VendorShoppingGroup[] = []
  let grandTotal = 0

  for (const [vendorId, items] of vendorGroupsMap) {
    const totalEstimatedCost = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0)
    grandTotal += totalEstimatedCost

    vendorGroups.push({
      vendorId,
      vendorName: items[0].vendorName || 'Unknown Vendor',
      items: items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)),
      totalEstimatedCost
    })
  }

  // Sort vendor groups by name
  vendorGroups.sort((a, b) => a.vendorName.localeCompare(b.vendorName))

  return {
    orderIds,
    orderCount: orders.length,
    generatedAt: new Date().toISOString(),
    vendorGroups,
    grandTotal,
    unlinkedIngredients: unlinkedIngredients.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
  }
}
