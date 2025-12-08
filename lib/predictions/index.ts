// Prediction Provider Manager
// Manages different prediction sources and allows easy swapping

import { FormBasedProvider } from './form-based'
import type { PredictionProvider } from '@/types/predictions'

// Available providers
const providers = {
  form_based: new FormBasedProvider(),
  // fpl_review: new FPLReviewProvider(),  // Add when API key available
  // fpl_optimized: new FPLOptimizedProvider(),  // Add when implemented
}

/**
 * Get the active prediction provider
 * Checks environment variables for API keys and falls back to form-based
 */
export function getActivePredictionProvider(): PredictionProvider {
  // Check for FPL Review API key
  // if (process.env.FPL_REVIEW_API_KEY) {
  //   return providers.fpl_review
  // }

  // Default to form-based provider
  return providers.form_based
}

/**
 * Get a specific prediction provider by name
 */
export function getPredictionProvider(
  name: keyof typeof providers
): PredictionProvider | null {
  return providers[name] || null
}

/**
 * List all available providers
 */
export function listProviders(): string[] {
  return Object.keys(providers)
}

// Export individual providers for direct use
export { FormBasedProvider } from './form-based'
export { formBasedProvider } from './form-based'
