import { BaseRepository } from '../../BaseRepository'
import { type RealTimeAnomalyRecord, toRecord, toRow } from './entity'
import { selectRealtimeAnomaly } from './select'

export class RealTimeAnomaliesRepository extends BaseRepository {
  async upsert(record: RealTimeAnomalyRecord): Promise<void> {
    await this.upsertMany([record])
  }

  async upsertMany(records: RealTimeAnomalyRecord[]): Promise<number> {
    if (records.length === 0) return 0

    const rows = records.map(toRow)
    await this.batch(rows, 1_000, async (batch) => {
      await this.db
        .insertInto('RealTimeAnomaly')
        .values(batch)
        .onConflict((cb) =>
          cb.columns(['start', 'projectId', 'subtype']).doUpdateSet((eb) => ({
            status: eb.ref('excluded.status'),
            end: eb.ref('excluded.end'),
          })),
        )
        .execute()
    })
    return records.length
  }

  async deleteAll(): Promise<number> {
    const result = await this.db
      .deleteFrom('RealTimeAnomaly')
      .executeTakeFirst()
    return Number(result.numDeletedRows)
  }

  async getOngoingAnomalies(): Promise<
    RealTimeAnomalyRecord<'ongoing' | 'approved'>[]
  > {
    const rows = await this.db
      .selectFrom('RealTimeAnomaly')
      .select(selectRealtimeAnomaly)
      .where('status', 'in', ['ongoing', 'approved'])
      .execute()

    return rows.map((r) => toRecord(r))
  }

  async getApprovedAndRecoveredAnomaliesByProjectIds(
    projectIds: string[],
  ): Promise<RealTimeAnomalyRecord[]> {
    if (projectIds.length === 0) return []

    const rows = await this.db
      .selectFrom('RealTimeAnomaly')
      .select(selectRealtimeAnomaly)
      .where('status', 'in', ['approved', 'recovered'])
      .where('projectId', 'in', projectIds)
      .execute()

    return rows.map(toRecord)
  }

  async getAll(): Promise<RealTimeAnomalyRecord[]> {
    const rows = await this.db
      .selectFrom('RealTimeAnomaly')
      .select(selectRealtimeAnomaly)
      .execute()

    return rows.map(toRecord)
  }
}
