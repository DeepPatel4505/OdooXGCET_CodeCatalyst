/**
 * Script to generate backend-integration.json from backendIntegration.js
 * 
 * Usage: node scripts/generate-integration-json.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { backendIntegrationSpec } from '../src/backendIntegration.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Convert the spec to JSON format
function convertSpecToJSON(spec) {
  const json = {
    version: spec.meta.version,
    lastUpdated: spec.meta.lastUpdated,
    author: spec.meta.author,
    frontendVersion: spec.meta.frontendVersion,
    baseUrl: spec.baseUrl,
    authentication: spec.authentication,
    endpoints: {},
  }

  // Convert endpoints
  for (const [category, endpoints] of Object.entries(spec.endpoints)) {
    json.endpoints[category] = {}
    
    for (const [endpointName, endpoint] of Object.entries(endpoints)) {
      json.endpoints[category][endpointName] = {
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        requiresAuth: endpoint.requiresAuth,
        requiredRoles: endpoint.requiredRoles || [],
        request: endpoint.request,
        response: endpoint.response,
        usedIn: endpoint.usedIn || [],
        mockStatus: endpoint.mockStatus || 'pending',
      }
    }
  }

  return json
}

// Generate JSON
const json = convertSpecToJSON(backendIntegrationSpec)
const jsonString = JSON.stringify(json, null, 2)

// Write to file
const outputPath = path.join(__dirname, '../src/backend-integration.json')
fs.writeFileSync(outputPath, jsonString, 'utf8')

console.log('✅ Generated backend-integration.json')
console.log(`📄 Output: ${outputPath}`)
console.log(`📊 Total endpoints: ${Object.values(json.endpoints).reduce((sum, cat) => sum + Object.keys(cat).length, 0)}`)

