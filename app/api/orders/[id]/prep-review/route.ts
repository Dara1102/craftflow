import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }

  try {
    // Fetch order with all related data for prep review
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId },
      include: {
        Customer: true,
        OrderAssignment: {
          include: {
            Staff: {
              select: { id: true, name: true, isManager: true }
            }
          }
        },
        ProductionPrepSignoff: {
          include: {
            SignedBy: {
              select: { id: true, name: true }
            }
          }
        },
        CakeTier: {
          include: {
            TierSize: true,
            CakeboardType: true,
            Recipe_CakeTier_batterRecipeIdToRecipe: { select: { id: true, name: true } },
            Recipe_CakeTier_frostingRecipeIdToRecipe: { select: { id: true, name: true } },
            Recipe_CakeTier_fillingRecipeIdToRecipe: { select: { id: true, name: true } }
          },
          orderBy: { tierIndex: 'asc' }
        },
        ProductionTask: {
          include: {
            AssignedToStaff: {
              select: { id: true, name: true }
            }
          },
          orderBy: { scheduledDate: 'asc' }
        },
        OrderDecoration: {
          include: {
            DecorationTechnique: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get all staff for assignment dropdowns
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, isManager: true },
      orderBy: { name: 'asc' }
    })

    // Get managers for sign-off dropdown
    const managers = staff.filter(s => s.isManager)

    // Get staff workload for the event week (3 days before to event date)
    const eventDate = order.eventDate
    const weekStart = new Date(eventDate)
    weekStart.setDate(weekStart.getDate() - 3)
    const weekEnd = new Date(eventDate)
    weekEnd.setDate(weekEnd.getDate() + 1)

    // Get all orders in the week with their assignments
    const weekOrders = await prisma.cakeOrder.findMany({
      where: {
        eventDate: {
          gte: weekStart,
          lte: weekEnd
        }
      },
      include: {
        OrderAssignment: {
          include: {
            Staff: { select: { id: true, name: true } }
          }
        },
        ProductionTask: {
          where: {
            assignedToId: { not: null }
          },
          select: {
            assignedToId: true,
            taskName: true,
            durationMinutes: true,
            status: true
          }
        },
        Customer: { select: { name: true } }
      }
    })

    // Build staff workload map
    const staffWorkload: Record<number, {
      orderCount: number
      taskCount: number
      totalMinutes: number
      orders: Array<{ orderId: number; customerName: string; eventDate: string; isLead: boolean }>
    }> = {}

    for (const s of staff) {
      staffWorkload[s.id] = { orderCount: 0, taskCount: 0, totalMinutes: 0, orders: [] }
    }

    for (const wo of weekOrders) {
      // Count order lead assignments
      if (wo.OrderAssignment) {
        const staffId = wo.OrderAssignment.staffId
        if (staffWorkload[staffId]) {
          staffWorkload[staffId].orderCount++
          staffWorkload[staffId].orders.push({
            orderId: wo.id,
            customerName: wo.Customer?.name || wo.customerName || 'Unknown',
            eventDate: wo.eventDate.toISOString(),
            isLead: true
          })
        }
      }

      // Count task assignments
      for (const task of wo.ProductionTask) {
        if (task.assignedToId && staffWorkload[task.assignedToId]) {
          staffWorkload[task.assignedToId].taskCount++
          staffWorkload[task.assignedToId].totalMinutes += task.durationMinutes || 0
        }
      }
    }

    // Get cakeboard types for tier editing
    const cakeboardTypes = await prisma.cakeboardType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    // Calculate checklist status
    const hasOrderLead = !!order.OrderAssignment
    const allTiersHaveCakeboards = order.CakeTier.every(t => t.cakeboardTypeId)
    const allTiersHaveRecipes = order.CakeTier.every(t =>
      t.Recipe_CakeTier_batterRecipeIdToRecipe || t.flavor
    )
    const hasTasks = order.ProductionTask.length > 0
    const allTasksAssigned = order.ProductionTask.every(t => t.assignedToId || t.assignedTo)

    // Get or create prep signoff record
    let prepSignoff = order.ProductionPrepSignoff
    const checklistItems = prepSignoff?.checklistItems as Record<string, boolean> || {}

    // Transform data for frontend
    const result = {
      order: {
        id: order.id,
        customerName: order.Customer?.name || order.customerName || 'Unknown',
        eventDate: order.eventDate.toISOString(),
        eventTime: order.isDelivery
          ? (order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null)
          : (order.pickupTime ? new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null),
        isDelivery: order.isDelivery,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        theme: order.theme,
        colors: order.colors
      },
      orderLead: order.OrderAssignment ? {
        staffId: order.OrderAssignment.staffId,
        staffName: order.OrderAssignment.Staff.name,
        isManager: order.OrderAssignment.Staff.isManager,
        assignedAt: order.OrderAssignment.assignedAt
      } : null,
      tiers: order.CakeTier.map(tier => ({
        id: tier.id,
        tierIndex: tier.tierIndex,
        size: tier.TierSize?.name || 'Unknown',
        shape: tier.TierSize?.shape || 'round',
        flavor: tier.flavor || tier.Recipe_CakeTier_batterRecipeIdToRecipe?.name || null,
        frosting: tier.finishType || tier.Recipe_CakeTier_frostingRecipeIdToRecipe?.name || null,
        filling: tier.filling || tier.Recipe_CakeTier_fillingRecipeIdToRecipe?.name || null,
        batterRecipe: tier.Recipe_CakeTier_batterRecipeIdToRecipe ? {
          id: tier.Recipe_CakeTier_batterRecipeIdToRecipe.id,
          name: tier.Recipe_CakeTier_batterRecipeIdToRecipe.name
        } : null,
        frostingRecipe: tier.Recipe_CakeTier_frostingRecipeIdToRecipe ? {
          id: tier.Recipe_CakeTier_frostingRecipeIdToRecipe.id,
          name: tier.Recipe_CakeTier_frostingRecipeIdToRecipe.name
        } : null,
        fillingRecipe: tier.Recipe_CakeTier_fillingRecipeIdToRecipe ? {
          id: tier.Recipe_CakeTier_fillingRecipeIdToRecipe.id,
          name: tier.Recipe_CakeTier_fillingRecipeIdToRecipe.name
        } : null,
        cakeboard: tier.CakeboardType ? {
          typeId: tier.cakeboardTypeId,
          typeName: tier.CakeboardType.name,
          shape: tier.cakeboardShape,
          sizeInches: tier.cakeboardSizeInches
        } : null
      })),
      tasks: order.ProductionTask.map(task => ({
        id: task.id,
        taskType: task.taskType,
        taskName: task.taskName,
        scheduledDate: task.scheduledDate.toISOString(),
        status: task.status,
        assignedTo: task.assignedTo,
        assignedToId: task.assignedToId,
        assignedToName: task.AssignedToStaff?.name || task.assignedTo || null
      })),
      decorations: order.OrderDecoration.map(d => ({
        id: d.id,
        techniqueName: d.DecorationTechnique?.name || 'Unknown',
        customText: d.customText,
        quantity: d.quantity
      })),
      prepStatus: prepSignoff?.status || 'NOT_STARTED',
      checklistItems: {
        staffAssigned: checklistItems.staffAssigned || false,
        cakeboardsConfirmed: checklistItems.cakeboardsConfirmed || false,
        recipesVerified: checklistItems.recipesVerified || false,
        ingredientsInStock: checklistItems.ingredientsInStock || false,
        timelineApproved: checklistItems.timelineApproved || false
      },
      autoChecks: {
        hasOrderLead,
        allTiersHaveCakeboards,
        allTiersHaveRecipes,
        hasTasks,
        allTasksAssigned
      },
      signoff: prepSignoff?.signedAt ? {
        signedById: prepSignoff.signedById,
        signedByName: prepSignoff.SignedBy?.name,
        signedAt: prepSignoff.signedAt,
        managerNotes: prepSignoff.managerNotes,
        lockedAt: prepSignoff.lockedAt
      } : null,
      staff,
      managers,
      cakeboardTypes,
      staffWorkload,
      // Derive skill requirements from decorations
      skillRequirements: deriveSkillRequirements(order.OrderDecoration)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch prep review:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prep review' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orderId = parseInt(id)

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { checklistItems, status } = body

    // Verify order exists
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Upsert prep signoff record
    const prepSignoff = await prisma.productionPrepSignoff.upsert({
      where: { orderId },
      create: {
        orderId,
        status: status || 'IN_REVIEW',
        checklistItems: checklistItems || {}
      },
      update: {
        ...(status && { status }),
        ...(checklistItems && { checklistItems })
      }
    })

    return NextResponse.json({
      success: true,
      status: prepSignoff.status,
      checklistItems: prepSignoff.checklistItems
    })
  } catch (error) {
    console.error('Failed to update prep review:', error)
    return NextResponse.json(
      { error: 'Failed to update prep review' },
      { status: 500 }
    )
  }
}

// Helper to derive skill requirements from decorations
interface DecorationWithTechnique {
  DecorationTechnique: {
    name: string
    category: string | null
  } | null
}

function deriveSkillRequirements(decorations: DecorationWithTechnique[]): string[] {
  const skills: Set<string> = new Set()

  for (const dec of decorations) {
    const name = dec.DecorationTechnique?.name?.toLowerCase() || ''
    const category = dec.DecorationTechnique?.category?.toLowerCase() || ''

    // Map decoration types to skill requirements
    if (name.includes('fondant') || category.includes('fondant')) {
      skills.add('Fondant Work')
    }
    if (name.includes('flower') || name.includes('floral') || name.includes('rose')) {
      skills.add('Sugar Flowers')
    }
    if (name.includes('paint') || name.includes('watercolor')) {
      skills.add('Hand Painting')
    }
    if (name.includes('piping') || name.includes('buttercream')) {
      skills.add('Piping')
    }
    if (name.includes('isomalt') || name.includes('sugar glass')) {
      skills.add('Isomalt/Sugar Work')
    }
    if (name.includes('airbrush')) {
      skills.add('Airbrushing')
    }
    if (name.includes('sculpt') || name.includes('figure') || name.includes('topper')) {
      skills.add('Figure Sculpting')
    }
    if (name.includes('edible print') || name.includes('image')) {
      skills.add('Edible Printing')
    }
    if (name.includes('gold') || name.includes('metallic') || name.includes('luster')) {
      skills.add('Metallic Finishes')
    }
    if (name.includes('texture') || name.includes('stencil')) {
      skills.add('Texturing')
    }
  }

  return Array.from(skills)
}
