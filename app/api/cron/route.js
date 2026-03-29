import { NextResponse } from "next/server";
import {
  addAppointments,
  resetStaleReschedulingAppointments,
  sendAppointmentReminders,
  deleteExpiredAppointments,
  autoCompleteMonthlyMaintenanceLog,
} from "@/app/_actions";

export async function GET(request) {
  return handleRequest(request);
}

export async function POST(request) {
  return handleRequest(request);
}

async function handleRequest(request) {
  console.log(`Handler invoked at ${new Date().toISOString()}`);
  console.log(`Request method: ${request.method}`);

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { message: "Cron secret not configured" },
      { status: 500 }
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
    console.log("Stale appointments reset successfully");

    await addAppointments();
    console.log("New appointments added successfully");

    await deleteExpiredAppointments();
    console.log("Expired appointments deleted successfully");

    await sendAppointmentReminders();
    console.log("Appointment reminders sent successfully");

    const torontoDayOfMonth = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        day: "numeric",
      }).format(new Date()),
    );

    if (torontoDayOfMonth === 1) {
      const maintenanceResult = await autoCompleteMonthlyMaintenanceLog();
      if (!maintenanceResult.success) {
        throw new Error(
          maintenanceResult.error ||
            "Failed to auto-complete monthly maintenance log",
        );
      }

      if (maintenanceResult.skipped) {
        console.log("Monthly maintenance log already exists for this month");
      } else {
        console.log("Monthly maintenance log auto-completed successfully");
      }
    } else {
      console.log(
        `Skipping monthly maintenance auto-complete (Toronto day ${torontoDayOfMonth})`,
      );
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
      { status: 500 }
    );
  }
}
