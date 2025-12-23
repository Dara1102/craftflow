# AI Cake Designer - Tier Builder Integration Plan

## Overview

This document outlines how the **current tier builder** (manual configuration) will integrate with the **future AI cake designer** feature. The tier builder provides the structured foundation that AI will use to generate design concepts.

---

## Current State: Manual Tier Builder

### What Exists Now

The tier builder (`app/orders/new/page.tsx`) allows manual configuration:

1. **Tier Configuration:**
   - Tier size selection (6", 8", 10", etc.)
   - Flavor selection (vanilla, chocolate, etc.)
   - Filling selection
   - Finish type (buttercream, fondant, ganache)

2. **Decoration Selection:**
   - Search and add decoration techniques
   - Quantity selection
   - Notes per decoration

3. **Event Details:**
   - Occasion, theme, colors, accent colors
   - Event date, servings target

4. **Real-Time Costing:**
   - Calculates costs as tiers are added
   - Shows ingredient costs, decoration costs, labor

### Data Structure

```typescript
interface TierBuilderData {
  tiers: {
    tierSizeId: number
    flavor: string
    filling: string
    finishType: string
  }[]
  decorations: {
    decorationTechniqueId: number
    quantity: number
    notes?: string
  }[]
  eventDetails: {
    occasion: string
    theme: string
    colors: string[]
    accentColors: string[]
    servingsTarget: number
  }
}
```

---

## Future State: AI Designer Integration

### How AI Will Use Tier Builder Data

Based on the future scope documents, the AI designer will:

1. **Use Structured Attributes** from tier builder:
   - Tier sizes → AI understands cake structure
   - Flavors/fillings → AI suggests complementary designs
   - Finish types → AI matches decoration styles
   - Event details → AI generates theme-appropriate concepts

2. **Generate Design Concepts:**
   - Text descriptions of design ideas
   - Optional image mockups
   - Decoration suggestions matching the tier configuration

3. **Refine Based on Constraints:**
   - User can refine: "fewer florals", "more rustic", "simpler design"
   - AI regenerates concepts maintaining tier structure

---

## Integration Architecture

### Phase 1: Enhanced Tier Builder (Current)

**Current tier builder collects:**
- ✅ Tier structure (sizes, flavors, fillings)
- ✅ Decoration techniques
- ✅ Event details (occasion, theme, colors)
- ✅ Costing data

**What's missing for AI integration:**
- ❌ Design description field (freeform text)
- ❌ Style tags (rustic, luxury, playful, etc.)
- ❌ Reference image uploads
- ❌ AI concept selection/storage

### Phase 2: AI Designer Integration (Future)

**New components needed:**

1. **Design Step in Order Flow:**
   ```
   Order Creation Flow:
   1. Customer & Event Details ✅ (exists)
   2. Tier Configuration ✅ (exists)
   3. Decorations ✅ (exists)
   4. Design Ideation ❌ (NEW - AI step)
   5. Pricing ✅ (exists)
   ```

2. **AI Design Interface:**
   ```
   Left Panel: Structured Tier Builder (current)
   Right Panel: AI Design Generator (new)
   
   - Freeform description input
   - Style tag selector
   - Reference image uploads
   - "Generate AI Concepts" button
   - Concept grid display
   - Refinement controls
   ```

3. **Data Model Extensions:**

```prisma
// Future schema additions (from Future Scope docs)

model ProductDesign {
  id              Int       @id @default(autoincrement())
  cakeOrderId    Int
  cakeOrder      CakeOrder @relation(fields: [cakeOrderId], references: [id])
  
  // Structured attributes (from tier builder)
  tierStructure  Json      // Current tier configuration
  decorations    Json      // Selected decorations
  
  // AI-generated content
  description    String?   // Freeform design description
  styleTags      String[]  // ["rustic", "luxury", "playful"]
  referenceImages Json?    // Array of uploaded image URLs
  
  // Selected concept
  selectedConceptId Int?
  selectedConcept  AIAsset? @relation(fields: [selectedConceptId], references: [id])
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model AIAsset {
  id              Int       @id @default(autoincrement())
  cakeOrderId     Int?
  cakeOrder       CakeOrder? @relation(fields: [cakeOrderId], references: [id])
  
  type            String    // "image_concept" | "text_concept"
  fileId          Int?      // FK to FileAsset (for images)
  contentJson     Json?     // Text concepts or metadata
  shortDescription String
  selected        Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model AIPromptLog {
  id                Int       @id @default(autoincrement())
  cakeOrderId       Int?
  promptType        String    // "design_ideation"
  promptText        String
  responseSummaryText String
  rawResponseJson   Json?
  modelName         String
  createdAt         DateTime  @default(now())
}
```

---

## How Tier Builder Feeds AI Designer

### Step 1: User Configures Tiers (Current)

```typescript
// User builds tier structure manually
const tierData = {
  tiers: [
    { tierSizeId: 1, flavor: "vanilla", filling: "strawberry", finishType: "buttercream" },
    { tierSizeId: 2, flavor: "chocolate", filling: "ganache", finishType: "fondant" }
  ],
  decorations: [
    { decorationTechniqueId: 5, quantity: 1 }, // "Sugar Flowers"
    { decorationTechniqueId: 12, quantity: 2 } // "Gold Leaf Accents"
  ],
  eventDetails: {
    occasion: "wedding",
    theme: "rustic garden",
    colors: ["ivory", "sage green"],
    servingsTarget: 100
  }
}
```

### Step 2: AI Uses Structured Data (Future)

```typescript
// AI prompt construction (future)
const aiPrompt = {
  businessProfile: "Custom bakery specializing in wedding cakes",
  productCategory: "Cakes",
  
  // Structured attributes from tier builder
  structuredAttributes: {
    tiers: tierData.tiers,
    decorations: tierData.decorations,
    eventDetails: tierData.eventDetails
  },
  
  // User-provided design input
  freeformDescription: "Elegant rustic wedding cake with garden florals",
  styleTags: ["rustic", "elegant", "garden"],
  referenceImages: [...]
}

// Send to AI model
const concepts = await generateAIConcepts(aiPrompt)
```

### Step 3: AI Generates Concepts (Future)

```typescript
// AI returns concepts matching tier structure
const concepts = [
  {
    title: "Rustic Garden Elegance",
    description: "Three-tier cake with buttercream finish on bottom two tiers, fondant top tier. Sugar flowers cascading down, gold leaf accents on edges.",
    image: "ai-generated-image-url",
    keyElements: {
      tiers: [
        { size: "10 inch", finish: "buttercream", decorations: ["sugar flowers"] },
        { size: "8 inch", finish: "buttercream", decorations: ["sugar flowers"] },
        { size: "6 inch", finish: "fondant", decorations: ["gold leaf"] }
      ],
      colorScheme: ["ivory", "sage green", "gold"],
      style: "rustic elegant"
    }
  },
  // ... more concepts
]
```

### Step 4: User Selects & Refines (Future)

```typescript
// User selects concept
const selectedConcept = concepts[0]

// User can refine
const refinedPrompt = {
  ...aiPrompt,
  constraints: "fewer florals, more gold accents, simpler design"
}

// Regenerate with constraints
const refinedConcepts = await generateAIConcepts(refinedPrompt)
```

### Step 5: Concept Applied to Order (Future)

```typescript
// Save selected concept to order
await prisma.productDesign.create({
  data: {
    cakeOrderId: orderId,
    tierStructure: tierData.tiers,
    decorations: tierData.decorations,
    description: selectedConcept.description,
    styleTags: ["rustic", "elegant"],
    selectedConceptId: selectedConcept.id
  }
})

// Order now has both:
// - Structured tier data (for costing)
// - AI design concept (for production)
```

---

## Key Integration Points

### 1. **Tier Builder → AI Prompt**

The tier builder provides structured data that AI uses to:
- Understand cake structure (number of tiers, sizes)
- Match flavors/fillings to appropriate designs
- Suggest decorations that complement the structure
- Generate theme-appropriate concepts

### 2. **AI Concepts → Tier Builder**

AI-generated concepts can:
- Suggest additional decorations
- Recommend tier size adjustments
- Propose flavor/filling combinations
- Refine color schemes

### 3. **Bidirectional Flow**

```
Manual Tier Builder → AI Designer
- User configures tiers manually
- AI generates concepts based on structure
- User selects concept

AI Designer → Manual Tier Builder
- AI suggests tier modifications
- User adjusts tiers based on AI concept
- Costing recalculates automatically
```

---

## Implementation Plan

### Phase 1: Enhance Tier Builder (Now)

**Add fields for future AI integration:**

1. **Design Description Field:**
   ```typescript
   // Add to order form
   const [designDescription, setDesignDescription] = useState('')
   
   // Textarea for freeform design notes
   <textarea
     value={designDescription}
     onChange={(e) => setDesignDescription(e.target.value)}
     placeholder="Describe the design vision..."
   />
   ```

2. **Style Tags Selector:**
   ```typescript
   const styleTags = [
     "rustic", "luxury", "playful", "elegant", "modern",
     "vintage", "minimalist", "elaborate", "garden", "geometric"
   ]
   
   // Multi-select component
   <StyleTagSelector
     selectedTags={selectedStyleTags}
     onChange={setSelectedStyleTags}
     options={styleTags}
   />
   ```

3. **Reference Image Upload:**
   ```typescript
   // Add image upload component
   <ImageUpload
     images={referenceImages}
     onUpload={handleImageUpload}
     maxImages={5}
   />
   ```

### Phase 2: AI Designer Component (Future)

**Create new component:**

```typescript
// app/components/AIDesigner.tsx
export function AIDesigner({ tierData, onConceptSelect }) {
  const [description, setDescription] = useState('')
  const [styleTags, setStyleTags] = useState([])
  const [concepts, setConcepts] = useState([])
  const [loading, setLoading] = useState(false)
  
  const generateConcepts = async () => {
    setLoading(true)
    const response = await fetch('/api/ai/generate-concepts', {
      method: 'POST',
      body: JSON.stringify({
        tierStructure: tierData.tiers,
        decorations: tierData.decorations,
        eventDetails: tierData.eventDetails,
        description,
        styleTags
      })
    })
    const data = await response.json()
    setConcepts(data.concepts)
    setLoading(false)
  }
  
  return (
    <div>
      {/* Design input */}
      <textarea value={description} onChange={...} />
      <StyleTagSelector ... />
      
      {/* Generate button */}
      <button onClick={generateConcepts}>Generate AI Concepts</button>
      
      {/* Concept grid */}
      <ConceptGrid concepts={concepts} onSelect={onConceptSelect} />
    </div>
  )
}
```

### Phase 3: AI API Endpoint (Future)

```typescript
// app/api/ai/generate-concepts/route.ts
export async function POST(request: Request) {
  const { tierStructure, decorations, eventDetails, description, styleTags } = await request.json()
  
  // Construct AI prompt
  const prompt = buildAIPrompt({
    tierStructure,
    decorations,
    eventDetails,
    description,
    styleTags
  })
  
  // Call AI service (OpenAI, Anthropic, etc.)
  const concepts = await generateConcepts(prompt)
  
  // Save to database
  const aiAssets = await saveAIAssets(concepts)
  
  // Log prompt
  await logAIPrompt(prompt, concepts)
  
  return Response.json({ concepts: aiAssets })
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Tier Builder (Current)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Tier Config  │  │ Decorations  │  │ Event Details│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Structured Design Data (JSON)                   │
│  {                                                           │
│    tiers: [...],                                            │
│    decorations: [...],                                      │
│    eventDetails: {...}                                       │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Designer (Future)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Description │  │ Style Tags   │  │ References   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Prompt Builder                         │
│  Combines:                                                   │
│  - Structured tier data                                     │
│  - User description                                         │
│  - Style tags                                               │
│  - Reference images                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Model (Future)                          │
│  Generates:                                                  │
│  - Design concepts (text)                                   │
│  - Image mockups (optional)                                 │
│  - Decoration suggestions                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Concept Selection                           │
│  User selects concept → Applied to order                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Order with Design                         │
│  - Tier structure (for costing)                             │
│  - AI design concept (for production)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits of This Integration

### 1. **Structured Foundation**
- Tier builder provides concrete structure
- AI uses structure to generate realistic concepts
- Costing remains accurate (based on actual tiers)

### 2. **Flexible Workflow**
- Users can start with tiers → AI generates designs
- Users can start with AI → refine tiers based on concept
- Both approaches work together

### 3. **Cost Accuracy**
- Tier structure drives costing (always accurate)
- AI design doesn't affect costing (visual only)
- Production gets both: structure + design vision

### 4. **Production Ready**
- Bakers get structured recipe data (from tiers)
- Bakers get design vision (from AI concept)
- Both feed into production workflow

---

## Next Steps

### Immediate (Current MVP)
1. ✅ Keep tier builder as-is (working well)
2. ✅ Add design description field (optional, for notes)
3. ✅ Add style tags selector (optional, for future use)
4. ✅ Store design data in order (even if not used yet)

### Future (AI Integration)
1. Create AI Designer component
2. Build AI prompt construction logic
3. Integrate with AI service (OpenAI, Anthropic, etc.)
4. Add concept selection/storage
5. Create production view showing design + structure

---

## Summary

The **tier builder is the foundation** for the AI designer:

- ✅ **Tier builder** = Structured data (tiers, decorations, event details)
- ✅ **AI designer** = Creative concepts based on structure
- ✅ **Together** = Complete order with both structure and design vision

The tier builder provides the "what" (structure), AI provides the "how" (design vision). Both are needed for a complete order that works for:
- **Costing** (uses tier structure)
- **Production** (uses tier structure + design vision)
- **Customer** (sees design concept + pricing)

This integration ensures AI enhances rather than replaces the structured tier builder! 🎂✨


