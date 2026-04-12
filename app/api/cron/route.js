import { NextResponse } from "next/server";
import {
  addAppointments,
  resetStaleReschedulingAppointments,
  sendAppointmentReminders,
  deleteExpiredAppointments,
  autoCompleteMonthlyMaintenanceLog,
  sendBenefitReminders,
} from "@/app/_actions";

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
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const isLocalDebugRequest = searchParams.get("debug") === "benefit-reminders";

  // Local-only debug shortcut to avoid curl headers while testing on localhost.
  // Disabled automatically in production.
  if (
    isLocalDebugRequest &&
    process.env.NODE_ENV !== "production" &&
    isLocalHost
  ) {
    const benefitReminderResult = await sendBenefitReminders({
      dryRun,
      now: nowParam || null,
    });
    return NextResponse.json({
      message: "Local debug benefit reminder run completed",
      executionTime: new Date().toISOString(),
      dryRun,
      result: benefitReminderResult,
    });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const benefitRunDay = Number.parseInt(
      process.env.CRON_BENEFIT_REMINDER_DAY || "13",
      10,
    );

    // Secure manual trigger for troubleshooting benefit reminders:
    // /api/cron?run=benefit-reminders&force=true&dryRun=true
    if (runTarget === "benefit-reminders") {
      const benefitReminderResult = await sendBenefitReminders({
        dryRun,
        now: nowParam || null,
      });
      return NextResponse.json({
        message: "Manual benefit reminder run completed",
        executionTime: new Date().toISOString(),
        dryRun,
        result: benefitReminderResult,
      });
    }

    await resetStaleReschedulingAppointments();

    await addAppointments();

    await deleteExpiredAppointments();

    await sendAppointmentReminders();

    const torontoDayOfMonth = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        day: "numeric",
      }).format(new Date()),
    );

    let benefitReminderResult = null;
    if (forceBenefitRun || torontoDayOfMonth === benefitRunDay) {
      // Keep monthly maintenance tied to scheduled day only.
      // Forced benefit reminder runs should not create maintenance logs.
      if (!forceBenefitRun) {
        const maintenanceResult = await autoCompleteMonthlyMaintenanceLog();
        if (!maintenanceResult.success) {
          throw new Error(
            maintenanceResult.error ||
              "Failed to auto-complete monthly maintenance log",
          );
        }
      }

      benefitReminderResult = await sendBenefitReminders({
        dryRun,
        now: nowParam || null,
      });
      if (!benefitReminderResult.success) {
        throw new Error(
          benefitReminderResult.message ||
            "Failed to process monthly benefit reminders",
        );
      }
    }

    return NextResponse.json({
      message: "Cron job executed successfully",
      executionTime: new Date().toISOString(),
      benefitReminders: benefitReminderResult,
    });
  } catch (error) {
    console.error("Error executing cron job:", error);
    return NextResponse.json(
      {
        message: "Error executing cron job",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

