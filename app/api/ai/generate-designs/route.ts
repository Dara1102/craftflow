import { NextRequest, NextResponse } from 'next/server'
import type { AIIntakeData } from '@/app/components/AIIntakeForm'

/**
 * POST /api/ai/generate-designs
 * 
 * Generates AI cake design concepts based on intake form parameters.
 * 
 * This is a placeholder for future AI integration. Currently returns mock data
 * structured to match what the AI would return.
 */
export async function POST(request: NextRequest) {
  try {
    const intakeData: AIIntakeData = await request.json()

    // Validate required fields
    if (!intakeData.desiredServings || intakeData.desiredServings <= 0) {
      return NextResponse.json(
        { error: 'Desired servings is required' },
        { status: 400 }
      )
    }

    // TODO: Integrate with actual AI service (OpenAI, Anthropic, etc.)
    // For now, return structured mock data that shows the expected format

    const mockConcepts = generateMockConcepts(intakeData)

    return NextResponse.json({
      concepts: mockConcepts,
      intakeData // Echo back intake data for reference
    })
  } catch (error) {
    console.error('AI design generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate designs' },
      { status: 500 }
    )
  }
}

/**
 * Generate mock concepts based on intake data
 * This will be replaced with actual AI calls
 */
function generateMockConcepts(intakeData: AIIntakeData) {
  const concepts = []

  // Concept 1: Budget-conscious if budget provided
  if (intakeData.budget) {
    concepts.push({
      id: 1,
      title: 'Elegant & Budget-Friendly',
      description: `A beautiful ${intakeData.cakeStructure} cake designed to serve ${intakeData.desiredServings} guests while staying within budget. Features ${intakeData.tierShapes?.join(' and ') || 'round'} tiers with ${intakeData.styleTags?.join(', ') || 'elegant'} styling.`,
      estimatedCost: intakeData.budget ? intakeData.budget * 0.9 : null,
      keyElements: {
        structure: intakeData.cakeStructure,
        tierShapes: intakeData.tierShapes || ['round'],
        style: intakeData.styleTags || ['elegant'],
        colors: intakeData.colors || ['ivory', 'white']
      },
      imageUrl: null // Will be AI-generated image URL
    })
  }

  // Concept 2: Premium design
  concepts.push({
    id: 2,
    title: 'Premium Design',
    description: `A stunning ${intakeData.cakeStructure} cake for ${intakeData.desiredServings} servings. Features ${intakeData.tierShapes?.join(' and ') || 'round'} tiers with ${intakeData.styleTags?.join(', ') || 'luxury'} styling${intakeData.designCues ? `: ${intakeData.designCues}` : ''}.`,
    estimatedCost: null,
    keyElements: {
      structure: intakeData.cakeStructure,
      tierShapes: intakeData.tierShapes || ['round'],
      style: intakeData.styleTags || ['luxury'],
      colors: intakeData.colors || ['ivory', 'gold'],
      occasion: intakeData.occasion,
      theme: intakeData.theme
    },
    imageUrl: null
  })

  // Concept 3: Custom based on design cues
  if (intakeData.designCues) {
    concepts.push({
      id: 3,
      title: 'Custom Design',
      description: intakeData.designCues,
      estimatedCost: null,
      keyElements: {
        structure: intakeData.cakeStructure,
        tierShapes: intakeData.tierShapes || ['round'],
        customDescription: intakeData.designCues,
        style: intakeData.styleTags || [],
        colors: intakeData.colors || []
      },
      imageUrl: null
    })
  }

  return concepts
}


