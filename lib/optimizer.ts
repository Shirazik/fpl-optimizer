// Transfer Optimizer - Python Script Caller

import { spawn } from 'child_process'
import path from 'path'
import type { OptimizationParams, OptimizationResult } from '@/types/optimization'

/**
 * Check if running in Vercel serverless environment
 */
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined
}

/**
 * Run optimizer using Vercel Python serverless function
 */
async function runWithVercelFunction(
  params: OptimizationParams
): Promise<OptimizationResult> {
  // In Vercel, call the Python serverless function via internal fetch
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  // Check content-type before parsing to avoid "Unexpected token '<'" errors
  const contentType = response.headers.get('content-type')

  if (!response.ok) {
    if (contentType?.includes('application/json')) {
      const error = await response.json()
      throw new Error(error.error || 'Optimizer failed')
    }
    throw new Error(`Optimizer returned ${response.status}: endpoint may not exist`)
  }

  if (!contentType?.includes('application/json')) {
    throw new Error('Optimizer returned non-JSON response')
  }

  return response.json()
}

/**
 * Run the Python transfer optimizer script
 *
 * @param params - Optimization parameters including squad, players, budget, etc.
 * @returns Promise with optimization result
 */
export async function runTransferOptimizer(
  params: OptimizationParams
): Promise<OptimizationResult> {
  // Use Vercel Python serverless function in production
  if (isVercelEnvironment()) {
    return runWithVercelFunction(params)
  }

  // Local development: spawn Python process
  return new Promise((resolve, reject) => {
    // Path to the Python script
    const scriptPath = path.join(process.cwd(), 'python', 'optimize_transfers.py')
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python')

    // Try venv Python first, fall back to system python3
    const pythonPath = process.platform === 'win32'
      ? path.join(process.cwd(), 'venv', 'Scripts', 'python.exe')
      : venvPython

    // Spawn Python process
    const pythonProcess = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'  // Ensure output isn't buffered
      }
    })

    let stdout = ''
    let stderr = ''

    // Collect stdout
    pythonProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    // Collect stderr
    pythonProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    // Handle process completion
    pythonProcess.on('close', (code: number | null) => {
      if (code !== 0) {
        console.error('Python optimizer stderr:', stderr)
        reject(new Error(`Optimizer failed with code ${code}: ${stderr || 'Unknown error'}`))
        return
      }

      try {
        const result = JSON.parse(stdout) as OptimizationResult

        // Check for error in result
        if ('error' in result) {
          reject(new Error(result.error as string))
          return
        }

        resolve(result)
      } catch (parseError) {
        console.error('Failed to parse optimizer output:', stdout)
        reject(new Error(`Failed to parse optimizer output: ${parseError}`))
      }
    })

    // Handle spawn errors
    pythonProcess.on('error', (error: Error) => {
      // If venv Python fails, try system Python
      if (error.message.includes('ENOENT')) {
        runWithSystemPython(params, scriptPath)
          .then(resolve)
          .catch(reject)
      } else {
        reject(new Error(`Failed to start optimizer: ${error.message}`))
      }
    })

    // Send input data to Python script
    const inputJson = JSON.stringify(params)
    pythonProcess.stdin.write(inputJson)
    pythonProcess.stdin.end()
  })
}

/**
 * Fallback: Run optimizer with system Python
 */
async function runWithSystemPython(
  params: OptimizationParams,
  scriptPath: string
): Promise<OptimizationResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Optimizer failed: ${stderr || 'Unknown error'}`))
        return
      }

      try {
        const result = JSON.parse(stdout) as OptimizationResult
        if ('error' in result) {
          reject(new Error(result.error as string))
          return
        }
        resolve(result)
      } catch {
        reject(new Error(`Failed to parse optimizer output: ${stdout}`))
      }
    })

    pythonProcess.on('error', (error: Error) => {
      reject(new Error(`Python not found. Please ensure Python 3 is installed: ${error.message}`))
    })

    pythonProcess.stdin.write(JSON.stringify(params))
    pythonProcess.stdin.end()
  })
}

/**
 * Format transfer suggestion for display
 */
export function formatTransferSuggestion(
  playerOut: { name: string; price: number; expected_points: number },
  playerIn: { name: string; price: number; expected_points: number }
): string {
  const priceChange = playerIn.price - playerOut.price
  const priceChangeStr = priceChange >= 0 ? `+£${priceChange.toFixed(1)}m` : `-£${Math.abs(priceChange).toFixed(1)}m`
  const epGain = playerIn.expected_points - playerOut.expected_points

  return `${playerOut.name} → ${playerIn.name} (${priceChangeStr}, +${epGain.toFixed(1)} xP)`
}

/**
 * Check if the optimizer is available
 */
export async function isOptimizerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python')

    const checkProcess = spawn(venvPython, ['-c', 'import pulp; print("ok")'], {
      cwd: process.cwd()
    })

    checkProcess.on('close', (code) => {
      resolve(code === 0)
    })

    checkProcess.on('error', () => {
      // Try system Python
      const systemCheck = spawn('python3', ['-c', 'import pulp; print("ok")'])
      systemCheck.on('close', (code) => resolve(code === 0))
      systemCheck.on('error', () => resolve(false))
    })
  })
}
