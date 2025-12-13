import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const order = await prisma.cakeOrder.findFirst({
    where: {
      OR: [
        { customerName: { contains: 'Dara Roach', mode: 'insensitive' } },
        { customer: { name: { contains: 'Dara Roach', mode: 'insensitive' } } }
      ]
    },
    include: {
      customer: true,
      orderDecorations: {
        include: {
          decorationTechnique: true
        }
      },
      cakeTiers: true
    }
  })

  if (!order) {
    console.log('Order not found')
    return
  }

  console.log('Order ID:', order.id)
  console.log('Customer:', order.customer?.name || order.customerName)
  console.log('Estimated Hours:', Number(order.estimatedHours))
  console.log('')
  console.log('Decorations:')

  let totalDecorationMinutes = 0
  const tierCount = order.cakeTiers.length

  for (const od of order.orderDecorations) {
    const tech = od.decorationTechnique
    let quantityMultiplier = od.quantity
    if (tech.unit === 'TIER') {
      quantityMultiplier = od.quantity * tierCount
    }
    const laborMins = tech.laborMinutes * quantityMultiplier
    totalDecorationMinutes += laborMins
    console.log(`  - ${tech.name}: ${od.quantity} x ${tech.laborMinutes} min = ${laborMins} min (unit: ${tech.unit})`)
  }

  const decorationHours = totalDecorationMinutes / 60
  const totalHours = Number(order.estimatedHours)
  const baseHours = Math.max(0, totalHours - decorationHours)

  console.log('')
  console.log('Labor Breakdown:')
  console.log(`  Total Estimated Hours: ${totalHours}h`)
  console.log(`  Decoration Labor: ${decorationHours.toFixed(2)}h (${totalDecorationMinutes} min)`)
  console.log(`  Base Labor: ${baseHours.toFixed(2)}h`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
