import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId: orderIdStr } = await params
    const orderId = parseInt(orderIdStr)

    const { searchParams } = new URL(request.url)
    const staffIdStr = searchParams.get('staffId')
    const staffId = staffIdStr ? parseInt(staffIdStr) : null

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    // Get order with all details
    const order = await prisma.cakeOrder.findUnique({
      where: { id: orderId },
      include: {
        Customer: { select: { name: true } },
        OrderAssignment: {
          include: {
            Staff: { select: { id: true, name: true } }
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
        OrderDecoration: {
          include: {
            DecorationTechnique: true
          }
        },
        ProductionTask: {
          include: {
            AssignedToStaff: { select: { id: true, name: true } }
          },
          orderBy: { scheduledDate: 'asc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if staff is lead
    const isLead = staffId ? order.OrderAssignment?.staffId === staffId : false

    // Get tasks for this staff member
    const myTasks = staffId
      ? order.ProductionTask.filter(t => t.assignedToId === staffId)
      : []

    // Transform data
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
        theme: order.theme,
        colors: order.colors,
        notes: order.specialInstructions,
        status: order.status
      },
      isLead,
      tiers: order.CakeTier.map(tier => ({
        id: tier.id,
        tierIndex: tier.tierIndex,
        size: tier.TierSize?.name || 'Unknown',
        shape: tier.TierSize?.shape || 'round',
        flavor: tier.flavor || tier.Recipe_CakeTier_batterRecipeIdToRecipe?.name || null,
        frosting: tier.finishType || tier.Recipe_CakeTier_frostingRecipeIdToRecipe?.name || null,
        filling: tier.filling || tier.Recipe_CakeTier_fillingRecipeIdToRecipe?.name || null,
        cakeboard: tier.CakeboardType?.name || null
      })),
      decorations: order.OrderDecoration.map(dec => ({
        id: dec.id,
        techniqueName: dec.DecorationTechnique?.name || 'Unknown',
        customText: dec.customText,
        quantity: dec.quantity,
        notes: dec.notes
      })),
      myTasks: myTasks.map(task => ({
        id: task.id,
        taskType: task.taskType,
        taskName: task.taskName,
        scheduledDate: task.scheduledDate.toISOString(),
        scheduledStart: task.scheduledStart?.toISOString() || null,
        scheduledEnd: task.scheduledEnd?.toISOString() || null,
        durationMinutes: task.durationMinutes,
        status: task.status,
        notes: task.notes
      })),
      allTasks: [...order.ProductionTask]
        .sort((a, b) => {
          // Sort by task type sequence: BAKE → PREP → STACK → COOL → FROST → FINAL → PACKAGE
          const taskOrder = ['BAKE', 'PREP', 'STACK', 'COOL', 'FROST', 'FINAL', 'PACKAGE']
          return taskOrder.indexOf(a.taskType) - taskOrder.indexOf(b.taskType)
        })
        .map(task => ({
          id: task.id,
          taskType: task.taskType,
          taskName: task.taskName,
          status: task.status,
          assignedToName: task.AssignedToStaff?.name || task.assignedTo || null
        })),
      recipes: order.CakeTier.flatMap(tier => {
        const recipes = []
        if (tier.Recipe_CakeTier_batterRecipeIdToRecipe) {
          recipes.push({
            id: tier.Recipe_CakeTier_batterRecipeIdToRecipe.id,
            name: tier.Recipe_CakeTier_batterRecipeIdToRecipe.name,
            type: 'Batter',
            tierIndex: tier.tierIndex
          })
        }
        if (tier.Recipe_CakeTier_frostingRecipeIdToRecipe) {
          recipes.push({
            id: tier.Recipe_CakeTier_frostingRecipeIdToRecipe.id,
            name: tier.Recipe_CakeTier_frostingRecipeIdToRecipe.name,
            type: 'Frosting',
            tierIndex: tier.tierIndex
          })
        }
        if (tier.Recipe_CakeTier_fillingRecipeIdToRecipe) {
          recipes.push({
            id: tier.Recipe_CakeTier_fillingRecipeIdToRecipe.id,
            name: tier.Recipe_CakeTier_fillingRecipeIdToRecipe.name,
            type: 'Filling',
            tierIndex: tier.tierIndex
          })
        }
        return recipes
      }),
      skillRequirements: deriveSkillRequirements(order.OrderDecoration)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch assignment spec:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignment spec' },
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
