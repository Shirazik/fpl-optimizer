// Transfer Optimizer - Python Script Caller

import { spawn } from 'child_process'
import path from 'path'
import type { OptimizationParams, OptimizationResult } from '@/types/optimization'

/**
 * Check if running in Vercel serverless environment
 */
export function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined
}

/**
 * Resolve the base URL we should use to self-invoke the Python function on Vercel.
 * Prefers the full origin header when the caller has a Request, falls back to
 * Vercel's env hints, then to localhost for dev.
 */
function resolveVercelBaseUrl(originHeader?: string | null): string {
  if (originHeader && /^https?:\/\//i.test(originHeader)) return originHeader
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Call the Python serverless function (Vercel production path).
 *
 * Notes:
 *  - Tries /api/optimize first; falls back to /api/optimize.py.
 *  - If Vercel Deployment Protection intercepts the call it returns an HTML
 *    SSO page. We detect that and surface a clear error instead of the
 *    confusing "Unexpected token <" JSON-parse failure.
 *  - Honors VERCEL_AUTOMATION_BYPASS_SECRET if provided, so operators can
 *    bypass protection for this specific self-call.
 */
export async function callPythonOptimizer(
  params: OptimizationParams,
  { originHeader }: { originHeader?: string | null } = {},
): Promise<OptimizationResult> {
  const baseUrl = resolveVercelBaseUrl(originHeader)
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (bypass) headers['x-vercel-protection-bypass'] = bypass

  let lastError: Error | null = null
  for (const endpoint of ['/api/optimize', '/api/optimize.py']) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    if (response.status === 404 && endpoint === '/api/optimize') {
      continue
    }

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      if (looksLikeHtmlAuthPage(body, contentType)) {
        throw new Error(
          'Vercel Deployment Protection intercepted the internal /api/optimize call ' +
          '(received an HTML sign-in page instead of JSON). Disable protection for this ' +
          'project or set VERCEL_AUTOMATION_BYPASS_SECRET in the function environment.'
        )
      }
      if (isJson) {
        try {
          const payload = JSON.parse(body) as { error?: string }
          lastError = new Error(payload.error || `Optimizer returned ${response.status}`)
        } catch {
          lastError = new Error(`Optimizer returned ${response.status}: ${body.substring(0, 200)}`)
        }
      } else {
        lastError = new Error(`Optimizer returned ${response.status}: ${body.substring(0, 200)}`)
      }
      continue
    }

    if (!isJson) {
      const text = await response.text().catch(() => '')
      if (looksLikeHtmlAuthPage(text, contentType)) {
        throw new Error(
          'Vercel Deployment Protection is blocking the internal /api/optimize call.'
        )
      }
      throw new Error(`Optimizer returned non-JSON response: ${text.substring(0, 200)}`)
    }

    return response.json() as Promise<OptimizationResult>
  }

  throw lastError || new Error('Failed to call Python optimizer')
}

function looksLikeHtmlAuthPage(body: string, contentType: string): boolean {
  if (contentType.includes('text/html')) return true
  const head = body.slice(0, 200).toLowerCase()
  return head.includes('<html') || head.includes('vercel sso') || head.includes('sign in')
}

/**
 * Run the Python transfer optimizer.
 * Uses the Vercel serverless function in production and spawns the local
 * script during development.
 */
export async function runTransferOptimizer(
  params: OptimizationParams,
): Promise<OptimizationResult> {
  if (isVercelEnvironment()) {
    return callPythonOptimizer(params)
  }

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'python', 'optimize_transfers.py')
    const venvPython = process.platform === 'win32'
      ? path.join(process.cwd(), 'venv', 'Scripts', 'python.exe')
      : path.join(process.cwd(), 'venv', 'bin', 'python')

    const pythonProcess = spawn(venvPython, [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    pythonProcess.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    pythonProcess.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      if (code !== 0) {
        if (stderr) console.error('Python optimizer stderr:', stderr)
        const suffix = signal ? ` (signal ${signal})` : ''
        reject(new Error(`Optimizer exited with code ${code}${suffix}: ${stderr || 'unknown error'}`))
        return
      }
      try {
        const result = JSON.parse(stdout) as OptimizationResult & { error?: string }
        if (result.error) {
          reject(new Error(result.error))
          return
        }
        resolve(result)
      } catch (parseError) {
        reject(new Error(`Failed to parse optimizer output: ${String(parseError)}\n${stdout.slice(0, 500)}`))
      }
    })

    pythonProcess.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        runWithSystemPython(params, scriptPath).then(resolve).catch(reject)
      } else {
        reject(new Error(`Failed to start optimizer: ${error.message}`))
      }
    })

    pythonProcess.stdin.write(JSON.stringify(params))
    pythonProcess.stdin.end()
  })
}

/**
 * Fallback: run the optimizer with system Python if the venv interpreter
 * isn't available.
 */
function runWithSystemPython(
  params: OptimizationParams,
  scriptPath: string,
): Promise<OptimizationResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    pythonProcess.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    pythonProcess.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Optimizer failed: ${stderr || 'unknown error'}`))
        return
      }
      try {
        const result = JSON.parse(stdout) as OptimizationResult & { error?: string }
        if (result.error) {
          reject(new Error(result.error))
          return
        }
        resolve(result)
      } catch {
        reject(new Error(`Failed to parse optimizer output: ${stdout.slice(0, 500)}`))
      }
    })

    pythonProcess.on('error', (error: Error) => {
      reject(new Error(`Python 3 not found: ${error.message}`))
    })

    pythonProcess.stdin.write(JSON.stringify(params))
    pythonProcess.stdin.end()
  })
}

/**
 * Format a transfer suggestion for display.
 */
export function formatTransferSuggestion(
  playerOut: { name: string; price: number; expected_points: number },
  playerIn: { name: string; price: number; expected_points: number },
): string {
  const priceChange = playerIn.price - playerOut.price
  const priceChangeStr = priceChange >= 0
    ? `+£${priceChange.toFixed(1)}m`
    : `-£${Math.abs(priceChange).toFixed(1)}m`
  const epGain = playerIn.expected_points - playerOut.expected_points
  return `${playerOut.name} → ${playerIn.name} (${priceChangeStr}, +${epGain.toFixed(1)} xP)`
}
