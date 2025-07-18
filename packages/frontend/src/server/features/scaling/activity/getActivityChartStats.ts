import { getActivityChart } from './getActivityChart'
import type { ActivityProjectFilter } from './utils/projectFilterUtils'

export type ActivityChartStats = {
  tps: {
    latestProjectsTxCount: number
    scalingFactor: number
  }
  uops: {
    latestProjectsTxCount: number
    scalingFactor: number
  }
}

export async function getActivityChartStats(
  filter: ActivityProjectFilter,
): Promise<ActivityChartStats> {
  // We should use the last 7 days but 30d is probably cached already so it's faster
  const { data: chartData } = await getActivityChart({
    filter,
    range: { type: '30d' },
  })

  const latestData = chartData.at(-1)
  if (!latestData) {
    return {
      tps: {
        latestProjectsTxCount: 0,
        scalingFactor: 0,
      },
      uops: {
        latestProjectsTxCount: 0,
        scalingFactor: 0,
      },
    }
  }

  const totalTxs = chartData.slice(-7)?.reduce(
    (acc, curr) => {
      acc.restTps += curr[1]
      acc.ethereumTps += curr[2]
      acc.restUops += curr[3]
      acc.ethereumUops += curr[4]
      return acc
    },
    { ethereumTps: 0, restTps: 0, ethereumUops: 0, restUops: 0 },
  )

  return {
    tps: {
      latestProjectsTxCount: latestData[1],
      scalingFactor:
        totalTxs.ethereumTps === 0
          ? 0
          : (totalTxs.restTps + totalTxs.ethereumTps) / totalTxs.ethereumTps,
    },
    uops: {
      latestProjectsTxCount: latestData[3],
      scalingFactor:
        totalTxs.ethereumUops === 0
          ? 0
          : (totalTxs.restUops + totalTxs.ethereumUops) / totalTxs.ethereumUops,
    },
  }
}
