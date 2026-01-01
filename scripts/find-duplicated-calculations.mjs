#!/usr/bin/env node

/**
 * Script to find duplicated calculations in the codebase
 * Helps identify places where calculations need to be centralized
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const CALCULATION_PATTERNS = [
  // Pricing calculations
  {
    name: 'Markup Calculation',
    pattern: /(?:totalCost|cost|price)\s*\*\s*\(?\s*1\s*\+\s*markupPercent|markupPercent\s*\*\s*(?:totalCost|cost|price)/gi,
    description: 'Calculating price with markup'
  },
  {
    name: 'Final Price Calculation',
    pattern: /(?:suggestedPrice|price)\s*-\s*discountAmount|discountAmount\s*-\s*(?:suggestedPrice|price)/gi,
    description: 'Calculating final price after discount'
  },
  {
    name: 'Discount Calculation',
    pattern: /(?:price|suggestedPrice)\s*\*\s*\(?\s*discount(?:Value|Percent|Amount)\s*\/\s*100|discount(?:Value|Percent|Amount)\s*\*\s*(?:price|suggestedPrice)\s*\/\s*100/gi,
    description: 'Calculating discount amount'
  },
  {
    name: 'Cost Per Serving',
    pattern: /(?:totalCost|finalPrice|suggestedPrice)\s*\/\s*(?:totalServings|servings)/gi,
    description: 'Calculating cost per serving'
  },
  {
    name: 'Labor Cost Calculation',
    pattern: /(?:hours|minutes)\s*\*\s*(?:rate|hourlyRate)|(?:rate|hourlyRate)\s*\*\s*(?:hours|minutes)/gi,
    description: 'Calculating labor cost'
  },
  {
    name: 'Currency Rounding',
    pattern: /Math\.round\([^)]*\*\s*100\)\s*\/\s*100|toFixed\(2\)/gi,
    description: 'Rounding currency values'
  }
]

const EXCLUDE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build']
const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']

function shouldProcessFile(filePath) {
  const ext = extname(filePath)
  return INCLUDE_EXTENSIONS.includes(ext)
}

function shouldExcludeDir(dirName) {
  return EXCLUDE_DIRS.includes(dirName)
}

function findFiles(dir, fileList = []) {
  const files = readdirSync(dir)
  
  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    
    if (stat.isDirectory()) {
      if (!shouldExcludeDir(file)) {
        findFiles(filePath, fileList)
      }
    } else if (stat.isFile() && shouldProcessFile(filePath)) {
      fileList.push(filePath)
    }
  }
  
  return fileList
}

function findMatchesInFile(filePath, patterns) {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const matches = []
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags)
    let match
    
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length
      const lineContent = lines[lineNumber - 1]?.trim() || ''
      
      matches.push({
        pattern: pattern.name,
        description: pattern.description,
        line: lineNumber,
        match: match[0],
        context: lineContent.substring(0, 100)
      })
    }
  }
  
  return matches
}

function groupByPattern(matches) {
  const grouped = {}
  
  for (const match of matches) {
    if (!grouped[match.pattern]) {
      grouped[match.pattern] = []
    }
    grouped[match.pattern].push(match)
  }
  
  return grouped
}

function main() {
  const rootDir = process.cwd()
  const appDir = join(rootDir, 'app')
  const libDir = join(rootDir, 'lib')
  
  console.log('🔍 Scanning for duplicated calculations...\n')
  
  // Find all files
  const appFiles = findFiles(appDir)
  const libFiles = findFiles(libDir)
  const allFiles = [...appFiles, ...libFiles]
  
  console.log(`Found ${allFiles.length} files to scan\n`)
  
  // Find matches
  const allMatches = []
  for (const file of allFiles) {
    const matches = findMatchesInFile(file, CALCULATION_PATTERNS)
    if (matches.length > 0) {
      allMatches.push({ file, matches })
    }
  }
  
  // Group by pattern
  const groupedMatches = {}
  for (const { file, matches } of allMatches) {
    for (const match of matches) {
      if (!groupedMatches[match.pattern]) {
        groupedMatches[match.pattern] = []
      }
      groupedMatches[match.pattern].push({ file, ...match })
    }
  }
  
  // Report results
  console.log('='.repeat(80))
  console.log('DUPLICATED CALCULATIONS FOUND')
  console.log('='.repeat(80))
  console.log()
  
  let totalDuplications = 0
  
  for (const [patternName, matches] of Object.entries(groupedMatches)) {
    if (matches.length > 1) {
      totalDuplications += matches.length
      console.log(`\n📊 ${patternName}`)
      console.log(`   ${matches.length} occurrences found`)
      console.log(`   Description: ${matches[0].description}`)
      console.log()
      
      // Group by file
      const byFile = {}
      for (const match of matches) {
        if (!byFile[match.file]) {
          byFile[match.file] = []
        }
        byFile[match.file].push(match)
      }
      
      for (const [file, fileMatches] of Object.entries(byFile)) {
        const relativePath = file.replace(rootDir + '/', '')
        console.log(`   📄 ${relativePath}`)
        for (const match of fileMatches) {
          console.log(`      Line ${match.line}: ${match.match}`)
          console.log(`      Context: ${match.context}`)
        }
        console.log()
      }
    }
  }
  
  if (totalDuplications === 0) {
    console.log('✅ No duplicated calculations found!')
  } else {
    console.log('='.repeat(80))
    console.log(`\n⚠️  Found ${totalDuplications} potential duplications`)
    console.log('\nRecommendation: Refactor these into centralized calculation functions')
    console.log('See docs/AVOIDING_REGRESSIONS.md for guidance\n')
  }
  
  // Check if calculations are in lib/ (good) vs app/ (needs refactoring)
  console.log('='.repeat(80))
  console.log('CALCULATION LOCATION ANALYSIS')
  console.log('='.repeat(80))
  console.log()
  
  const libCalculations = allMatches.filter(({ file }) => file.includes('/lib/'))
  const appCalculations = allMatches.filter(({ file }) => file.includes('/app/'))
  
  console.log(`📚 Calculations in lib/ (centralized): ${libCalculations.length} files`)
  console.log(`📱 Calculations in app/ (may need refactoring): ${appCalculations.length} files`)
  console.log()
  
  if (appCalculations.length > 0) {
    console.log('Files in app/ with calculations (consider moving to lib/):')
    for (const { file } of appCalculations) {
      const relativePath = file.replace(rootDir + '/', '')
      console.log(`  - ${relativePath}`)
    }
  }
}

main()
