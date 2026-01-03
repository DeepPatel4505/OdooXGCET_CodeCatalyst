/**
 * Script to validate that all API calls in the frontend exist in the integration spec
 * 
 * Usage: node scripts/validate-integration.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the integration spec
const specPath = path.join(__dirname, '../src/backend-integration.json')
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))

// Collect all endpoints from spec
const specEndpoints = new Set()
for (const [category, endpoints] of Object.entries(spec.endpoints)) {
  for (const [endpointName, endpoint] of Object.entries(endpoints)) {
    const key = `${endpoint.method} ${endpoint.path}`
    specEndpoints.add(key)
  }
}

// Find all API calls in the frontend
const frontendFiles = glob.sync('src/**/*.{js,jsx}', {
  cwd: path.join(__dirname, '..'),
  ignore: ['node_modules/**', 'dist/**', 'src/mocks/**'],
})

const apiCalls = new Set()
const apiCallPattern = /apiClient\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g

for (const file of frontendFiles) {
  const filePath = path.join(__dirname, '..', file)
  const content = fs.readFileSync(filePath, 'utf8')
  
  let match
  while ((match = apiCallPattern.exec(content)) !== null) {
    const method = match[1].toUpperCase()
    const path = match[2]
    const key = `${method} ${path}`
    apiCalls.add(key)
  }
}

// Validate
const missing = []
const unused = []

for (const call of apiCalls) {
  if (!specEndpoints.has(call)) {
    missing.push(call)
  }
}

for (const endpoint of specEndpoints) {
  if (!apiCalls.has(endpoint)) {
    unused.push(endpoint)
  }
}

// Report results
console.log('🔍 Integration Validation Report\n')
console.log(`📊 Total API calls in frontend: ${apiCalls.size}`)
console.log(`📊 Total endpoints in spec: ${specEndpoints.size}\n`)

if (missing.length > 0) {
  console.log('❌ Missing endpoints in spec:')
  missing.forEach(endpoint => {
    console.log(`   - ${endpoint}`)
  })
  console.log()
}

if (unused.length > 0) {
  console.log('⚠️  Unused endpoints in spec (not called in frontend):')
  unused.forEach(endpoint => {
    console.log(`   - ${endpoint}`)
  })
  console.log()
}

if (missing.length === 0 && unused.length === 0) {
  console.log('✅ All API calls are covered in the integration spec!')
  process.exit(0)
} else {
  console.log('❌ Validation failed. Please update the integration spec.')
  process.exit(1)
}

