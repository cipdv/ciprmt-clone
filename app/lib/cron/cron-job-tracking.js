import { sql } from "@vercel/postgres";

const DEFAULT_LOCK_TTL_MINUTES = 55;

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

async function ensureCronLocksTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS cron_locks (
      lock_name TEXT PRIMARY KEY,
      acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function acquireCronLock(
  lockName,
  ttlMinutes = DEFAULT_LOCK_TTL_MINUTES,
) {
  await ensureCronLocksTable();

  const { rows } = await sql`
    INSERT INTO cron_locks (
      lock_name,
      acquired_at,
      expires_at,
      updated_at
    ) VALUES (
      ${lockName},
      NOW(),
      NOW() + (${ttlMinutes}::text || ' minutes')::interval,
      NOW()
    )
    ON CONFLICT (lock_name) DO UPDATE
    SET
      acquired_at = NOW(),
      expires_at = NOW() + (${ttlMinutes}::text || ' minutes')::interval,
      updated_at = NOW()
    WHERE cron_locks.expires_at < NOW()
    RETURNING lock_name
  `;

  return rows.length > 0;
}

export async function releaseCronLock(lockName) {
  await ensureCronLocksTable();

  await sql`
    DELETE FROM cron_locks
    WHERE lock_name = ${lockName}
  `;
}

export async function acquireDailyCronLock() {
  return acquireCronLock("daily-rmt-cron", DEFAULT_LOCK_TTL_MINUTES);
}

export async function releaseDailyCronLock() {
  return releaseCronLock("daily-rmt-cron");
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
