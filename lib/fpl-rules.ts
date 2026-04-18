// Shared FPL rules helpers

import { fetchTransferHistory } from './fpl-api'
import type { Transfer } from '@/types/fpl'

/**
 * Free-transfer cap. FPL currently allows banking up to 5 FTs
 * (2024/25 season). Keep it here so both routes agree.
 */
export const FREE_TRANSFER_CAP = 5

/**
 * Replay a manager's transfer history to compute the FTs they will have
 * entering `targetGW`. Falls back to 1 if history isn't available.
 */
export async function calculateFreeTransfers(
  teamId: string,
  targetGW: number,
  cap: number = FREE_TRANSFER_CAP,
): Promise<number> {
  if (targetGW <= 1) return 1

  let transfers: Transfer[]
  try {
    transfers = await fetchTransferHistory(teamId)
  } catch {
    return 1
  }

  const transfersPerGW = new Map<number, number>()
  for (const t of transfers) {
    transfersPerGW.set(t.event, (transfersPerGW.get(t.event) ?? 0) + 1)
  }

  let ft = 1
  for (let gw = 2; gw <= targetGW; gw++) {
    const made = transfersPerGW.get(gw - 1) ?? 0
    const unused = Math.max(0, ft - made)
    ft = Math.min(cap, unused + 1)
  }
  return ft
}
