import { NextResponse } from "next/server";
import {
  addAppointments,
  backfillAvailableAppointments,
  resetStaleReschedulingAppointments,
  sendAppointmentReminders,
  deleteExpiredAppointments,
  autoCompleteMonthlyMaintenanceLog,
  sendBenefitReminders,
} from "@/app/_actions";
import {
  acquireDailyCronLock,
  finishCronJobRun,
  releaseDailyCronLock,
  startCronJobRun,
  updateCronJobRunOperations,
} from "@/app/lib/cron/cron-job-tracking";
import { getEmailTransporter } from "@/app/lib/transporter/nodemailer";

const CRON_REPORT_EMAIL = "cipdevries@ciprmt.com";

function sanitizeForHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createStepResult(name, result) {
  const success = result?.success !== false;
  return {
    name,
    success,
    message: result?.message || (success ? "Completed successfully" : "Failed"),
    details: result ?? null,
    recordedAt: new Date().toISOString(),
  };
}

async function runCronStep(stepResults, name, fn, cronRunId = null) {
  try {
    const result = await fn();
    const stepResult = createStepResult(name, result);
    stepResults.push(stepResult);
    await updateCronJobRunOperations({
      runId: cronRunId,
      operations: stepResults,
    });
    return stepResult;
  } catch (error) {
    const stepResult = {
      name,
      success: false,
      message: error.message || "Unexpected error",
      details: null,
      recordedAt: new Date().toISOString(),
    };
    stepResults.push(stepResult);
    await updateCronJobRunOperations({
      runId: cronRunId,
      operations: stepResults,
    });
    return stepResult;
  }
}

function getTriggerSource({ request, runTarget, isLocalHost }) {
  const userAgent = request.headers.get("user-agent") || "";

  if (userAgent.toLowerCase().includes("vercel-cron")) {
    return "vercel-cron";
  }

  if (isLocalHost) {
    return "local";
  }

  if (runTarget) {
    return "manual";
  }

  return "unknown";
}

async function sendCronSummaryEmail({
  stepResults,
  executionTime,
  requestUrl,
  overallSuccess,
  fatalErrorMessage = null,
}) {
  const transporter = getEmailTransporter();
  const subject = `[${
    overallSuccess ? "SUCCESS" : "FAILED"
  }] Cron job report - ${executionTime}`;

  const lines = [
    `Cron job status: ${overallSuccess ? "SUCCESS" : "FAILED"}`,
    `Execution time: ${executionTime}`,
    `Request URL: ${requestUrl}`,
  ];

  if (fatalErrorMessage) {
    lines.push(`Fatal error: ${fatalErrorMessage}`);
  }

  lines.push("");
  lines.push("Step results:");

  for (const step of stepResults) {
    lines.push(
      `- ${step.name}: ${step.success ? "SUCCESS" : "FAILED"} - ${step.message}`,
    );
  }

  const htmlStepRows = stepResults
    .map(
      (step) => `
        <tr>
          <td style="padding:8px;border:1px solid #d1d5db;">${sanitizeForHtml(step.name)}</td>
          <td style="padding:8px;border:1px solid #d1d5db;font-weight:600;color:${
            step.success ? "#166534" : "#991b1b"
          };">${step.success ? "SUCCESS" : "FAILED"}</td>
          <td style="padding:8px;border:1px solid #d1d5db;">${sanitizeForHtml(step.message)}</td>
        </tr>
      `,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;">
      <h2 style="margin-bottom:12px;">Cron job ${
        overallSuccess ? "succeeded" : "failed"
      }</h2>
      <p><strong>Execution time:</strong> ${sanitizeForHtml(executionTime)}</p>
      <p><strong>Request URL:</strong> ${sanitizeForHtml(requestUrl)}</p>
      ${
        fatalErrorMessage
          ? `<p><strong>Fatal error:</strong> ${sanitizeForHtml(fatalErrorMessage)}</p>`
          : ""
      }
      <table style="border-collapse:collapse;width:100%;margin-top:16px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Step</th>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Message</th>
          </tr>
        </thead>
        <tbody>${htmlStepRows}</tbody>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: CRON_REPORT_EMAIL,
    to: CRON_REPORT_EMAIL,
    subject,
    text: lines.join("\n"),
    html,
  });
}

export async function GET(request) {
  return handleRequest(request);
}

export async function POST(request) {
  return handleRequest(request);
}

async function handleRequest(request) {
  const { searchParams, hostname } = new URL(request.url);
  const runTarget = (searchParams.get("run") || "").trim().toLowerCase();
  const forceBenefitRun =
    searchParams.get("force") === "true" ||
    searchParams.get("forceBenefitReminders") === "true";
  const dryRun =
    searchParams.get("dryRun") === "true" ||
    searchParams.get("benefitDryRun") === "true";
  const nowParam = searchParams.get("now");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const isLocalDebugRequest = searchParams.get("debug") === "benefit-reminders";
  const isLocalBackfillRequest = runTarget === "backfill-appointments";
  const stepResults = [];
  const cronRunId = await startCronJobRun({
    jobName: "daily-rmt-cron",
    runTarget: runTarget || "daily",
    triggerSource: getTriggerSource({ request, runTarget, isLocalHost }),
    requestUrl: request.url,
  });
  let cronLockAcquired = false;

  // Local-only debug shortcut to avoid curl headers while testing on localhost.
  // Disabled automatically in production.
  if (
    isLocalDebugRequest &&
    process.env.NODE_ENV !== "production" &&
    isLocalHost
  ) {
    const benefitReminderResult = await runCronStep(
      stepResults,
      "sendBenefitReminders (local debug)",
      () =>
        sendBenefitReminders({
          dryRun,
          now: nowParam || null,
        }),
      cronRunId,
    );
    await finishCronJobRun({
      runId: cronRunId,
      status: benefitReminderResult.success ? "success" : "failed",
      operations: stepResults,
      httpStatus: benefitReminderResult.success ? 200 : 500,
      errorMessage: benefitReminderResult.success
        ? null
        : benefitReminderResult.message,
    });
    return NextResponse.json({
      message: "Local debug benefit reminder run completed",
      executionTime: new Date().toISOString(),
      dryRun,
      result: benefitReminderResult.details,
    }, { status: benefitReminderResult.success ? 200 : 500 });
  }

  if (
    isLocalBackfillRequest &&
    process.env.NODE_ENV !== "production" &&
    isLocalHost
  ) {
    const backfillResult = await runCronStep(
      stepResults,
      "backfillAvailableAppointments",
      () =>
        backfillAvailableAppointments({
          startDate: startDateParam,
          endDate: endDateParam,
        }),
      cronRunId,
    );
    const executionTime = new Date().toISOString();
    const overallSuccess = backfillResult.success;
    await runCronStep(
      stepResults,
      "sendCronSummaryEmail",
      () =>
        sendCronSummaryEmail({
          stepResults,
          executionTime,
          requestUrl: request.url,
          overallSuccess,
        }).then(() => ({ success: true, message: "Cron summary email sent" })),
      cronRunId,
    );
    await finishCronJobRun({
      runId: cronRunId,
      status: stepResults.every((step) => step.success) ? "success" : "failed",
      operations: stepResults,
      httpStatus: overallSuccess ? 200 : 500,
      errorMessage: overallSuccess ? null : backfillResult.message,
    });
    return NextResponse.json(
      {
        message: overallSuccess
          ? "Local backfill appointments run completed"
          : "Local backfill appointments run failed",
        executionTime,
        result: backfillResult.details,
      },
      { status: overallSuccess ? 200 : 500 },
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    await finishCronJobRun({
      runId: cronRunId,
      status: "failed",
      operations: stepResults,
      httpStatus: 500,
      errorMessage: "Cron secret not configured",
    });
    return NextResponse.json(
      { message: "Cron secret not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  const headerToken = request.headers.get("x-cron-secret") || "";

  if (bearerToken !== cronSecret && headerToken !== cronSecret) {
    await finishCronJobRun({
      runId: cronRunId,
      status: "unauthorized",
      operations: stepResults,
      httpStatus: 401,
      errorMessage: "Unauthorized",
    });
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    cronLockAcquired = await acquireDailyCronLock();

    if (!cronLockAcquired) {
      stepResults.push({
        name: "dailyCronLock",
        success: true,
        message: "Skipped daily cron: another run is already in progress.",
        details: { skipped: true },
        recordedAt: new Date().toISOString(),
      });
      await finishCronJobRun({
        runId: cronRunId,
        status: "skipped",
        operations: stepResults,
        httpStatus: 200,
      });
      return NextResponse.json({
        message: "Cron job skipped because another run is already in progress",
        executionTime: new Date().toISOString(),
        steps: stepResults,
      });
    }

    const benefitRunDay = Number.parseInt(
      process.env.CRON_BENEFIT_REMINDER_DAY || "13",
      10,
    );

    // Secure manual trigger for troubleshooting benefit reminders:
    // /api/cron?run=benefit-reminders&force=true&dryRun=true
    if (runTarget === "benefit-reminders") {
      const benefitReminderResult = await runCronStep(
        stepResults,
        "sendBenefitReminders (manual)",
        () =>
          sendBenefitReminders({
            dryRun,
            now: nowParam || null,
          }),
        cronRunId,
      );
      const executionTime = new Date().toISOString();
      const overallSuccess = benefitReminderResult.success;
      await runCronStep(
        stepResults,
        "sendCronSummaryEmail",
        () =>
          sendCronSummaryEmail({
            stepResults,
            executionTime,
            requestUrl: request.url,
            overallSuccess,
          }).then(() => ({ success: true, message: "Cron summary email sent" })),
        cronRunId,
      );
      const finalSuccess = stepResults.every((step) => step.success);
      await finishCronJobRun({
        runId: cronRunId,
        status: finalSuccess ? "success" : "failed",
        operations: stepResults,
        httpStatus: finalSuccess ? 200 : 500,
        errorMessage: finalSuccess
          ? null
          : stepResults.find((step) => !step.success)?.message,
      });
      return NextResponse.json(
        {
          message: overallSuccess
            ? "Manual benefit reminder run completed"
            : "Manual benefit reminder run failed",
          executionTime,
          dryRun,
          result: benefitReminderResult.details,
        },
        { status: finalSuccess ? 200 : 500 },
      );
    }

    if (runTarget === "backfill-appointments") {
      const backfillResult = await runCronStep(
        stepResults,
        "backfillAvailableAppointments",
        () =>
          backfillAvailableAppointments({
            startDate: startDateParam,
            endDate: endDateParam,
          }),
        cronRunId,
      );
      const executionTime = new Date().toISOString();
      const overallSuccess = backfillResult.success;
      await runCronStep(
        stepResults,
        "sendCronSummaryEmail",
        () =>
          sendCronSummaryEmail({
            stepResults,
            executionTime,
            requestUrl: request.url,
            overallSuccess,
          }).then(() => ({ success: true, message: "Cron summary email sent" })),
        cronRunId,
      );
      const finalSuccess = stepResults.every((step) => step.success);
      await finishCronJobRun({
        runId: cronRunId,
        status: finalSuccess ? "success" : "failed",
        operations: stepResults,
        httpStatus: finalSuccess ? 200 : 500,
        errorMessage: finalSuccess
          ? null
          : stepResults.find((step) => !step.success)?.message,
      });
      return NextResponse.json(
        {
          message: overallSuccess
            ? "Backfill appointments run completed"
            : "Backfill appointments run failed",
          executionTime,
          result: backfillResult.details,
        },
        { status: finalSuccess ? 200 : 500 },
      );
    }

    const resetResult = await runCronStep(
      stepResults,
      "resetStaleReschedulingAppointments",
      () => resetStaleReschedulingAppointments(),
      cronRunId,
    );

    const addAppointmentsResult = await runCronStep(
      stepResults,
      "addAppointments",
      () => addAppointments(),
      cronRunId,
    );

    const deleteExpiredResult = await runCronStep(
      stepResults,
      "deleteExpiredAppointments",
      () => deleteExpiredAppointments(),
      cronRunId,
    );

    const appointmentReminderResult = await runCronStep(
      stepResults,
      "sendAppointmentReminders",
      () => sendAppointmentReminders(),
      cronRunId,
    );

    const torontoDayOfMonth = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        day: "numeric",
      }).format(new Date()),
    );

    let maintenanceResult = null;
    let benefitReminderResult = null;
    if (forceBenefitRun || torontoDayOfMonth === benefitRunDay) {
      if (!forceBenefitRun) {
        maintenanceResult = await runCronStep(
          stepResults,
          "autoCompleteMonthlyMaintenanceLog",
          () => autoCompleteMonthlyMaintenanceLog(),
          cronRunId,
        );
      }

      benefitReminderResult = await runCronStep(
        stepResults,
        "sendBenefitReminders",
        () =>
          sendBenefitReminders({
            dryRun,
            now: nowParam || null,
          }),
        cronRunId,
      );
    }

    const overallSuccess = stepResults.every((step) => step.success);
    const executionTime = new Date().toISOString();
    await runCronStep(
      stepResults,
      "sendCronSummaryEmail",
      () =>
        sendCronSummaryEmail({
          stepResults,
          executionTime,
          requestUrl: request.url,
          overallSuccess,
        }).then(() => ({ success: true, message: "Cron summary email sent" })),
      cronRunId,
    );
    const finalSuccess = stepResults.every((step) => step.success);
    await finishCronJobRun({
      runId: cronRunId,
      status: finalSuccess ? "success" : "failed",
      operations: stepResults,
      httpStatus: finalSuccess ? 200 : 500,
      errorMessage: finalSuccess
        ? null
        : stepResults.find((step) => !step.success)?.message,
    });

    return NextResponse.json(
      {
        message: finalSuccess
          ? "Cron job executed successfully"
          : "Cron job completed with failures",
        executionTime,
        steps: stepResults,
        benefitReminders: benefitReminderResult?.details || null,
        maintenance: maintenanceResult?.details || null,
        resetStaleReschedulingAppointments: resetResult.details,
        addAppointments: addAppointmentsResult.details,
        deleteExpiredAppointments: deleteExpiredResult.details,
        sendAppointmentReminders: appointmentReminderResult.details,
      },
      { status: finalSuccess ? 200 : 500 },
    );
  } catch (error) {
    const executionTime = new Date().toISOString();
    stepResults.push({
      name: "cronRoute",
      success: false,
      message: error.message || "Unexpected error",
      details: null,
      recordedAt: executionTime,
    });

    try {
      await sendCronSummaryEmail({
        stepResults,
        executionTime,
        requestUrl: request.url,
        overallSuccess: false,
        fatalErrorMessage: error.message || "Unexpected error",
      });
    } catch (emailError) {
      console.error("Failed to send cron summary email:", emailError);
    }

    await finishCronJobRun({
      runId: cronRunId,
      status: "failed",
      operations: stepResults,
      httpStatus: 500,
      errorMessage: error.message || "Unexpected error",
    });

    console.error("Error executing cron job:", error);
    return NextResponse.json(
      {
        message: "Error executing cron job",
        error: error.message,
      },
      { status: 500 },
    );
  } finally {
    if (cronLockAcquired) {
      try {
        await releaseDailyCronLock();
      } catch (unlockError) {
        console.error("Failed to release daily cron lock:", unlockError);
      }
    }
  }
}

