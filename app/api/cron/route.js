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

    if (torontoDayOfMonth === 5) {
      const maintenanceResult = await autoCompleteMonthlyMaintenanceLog();
      if (!maintenanceResult.success) {
        throw new Error(
          maintenanceResult.error ||
            "Failed to auto-complete monthly maintenance log",
        );
      }

      const benefitReminderResult = await sendBenefitReminders();
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

