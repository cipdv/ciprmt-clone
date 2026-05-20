import { sql } from "@vercel/postgres";

const DAILY_CRON_LOCK = { key1: 712345001, key2: 100 };

async function ensureCronJobsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_name TEXT NOT NULL,
      run_target TEXT,
      trigger_source TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      request_url TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      duration_ms INTEGER,
      http_status INTEGER,
      operations JSONB NOT NULL DEFAULT '[]'::jsonb,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function acquireDailyCronLock() {
  const { rows } = await sql`
    SELECT pg_try_advisory_lock(${DAILY_CRON_LOCK.key1}, ${DAILY_CRON_LOCK.key2}) AS locked
  `;

  return rows?.[0]?.locked === true;
}

export async function releaseDailyCronLock() {
  await sql`
    SELECT pg_advisory_unlock(${DAILY_CRON_LOCK.key1}, ${DAILY_CRON_LOCK.key2})
  `;
}

function serializeOperations(operations) {
  return JSON.stringify(
    (operations || []).map((operation) => ({
      name: operation.name,
      success: operation.success === true,
      message: operation.message || "",
      details: operation.details ?? null,
      recordedAt: operation.recordedAt || new Date().toISOString(),
    })),
  );
}

export async function startCronJobRun({
  jobName,
  runTarget = null,
  triggerSource = null,
  requestUrl = null,
}) {
  try {
    await ensureCronJobsTable();
    const { rows } = await sql`
      INSERT INTO cron_jobs (
        job_name,
        run_target,
        trigger_source,
        request_url,
        started_at,
        updated_at
      ) VALUES (
        ${jobName},
        ${runTarget || null},
        ${triggerSource || null},
        ${requestUrl || null},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return rows[0]?.id || null;
  } catch (error) {
    console.error("Failed to start cron job tracking:", error);
    return null;
  }
}

export async function updateCronJobRunOperations({ runId, operations }) {
  if (!runId) return;

  try {
    await ensureCronJobsTable();
    await sql`
      UPDATE cron_jobs
      SET
        operations = CAST(${serializeOperations(operations)} AS jsonb),
        updated_at = NOW()
      WHERE id = ${runId}
    `;
  } catch (error) {
    console.error("Failed to update cron job tracking operations:", error);
  }
}

export async function finishCronJobRun({
  runId,
  status,
  operations = [],
  httpStatus = null,
  errorMessage = null,
}) {
  if (!runId) return;

  try {
    await ensureCronJobsTable();
    await sql`
      UPDATE cron_jobs
      SET
        status = ${status},
        operations = CAST(${serializeOperations(operations)} AS jsonb),
        http_status = ${httpStatus},
        error_message = ${errorMessage || null},
        finished_at = NOW(),
        duration_ms = GREATEST(
          0,
          FLOOR(EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)::integer
        ),
        updated_at = NOW()
      WHERE id = ${runId}
    `;
  } catch (error) {
    console.error("Failed to finish cron job tracking:", error);
  }
}
