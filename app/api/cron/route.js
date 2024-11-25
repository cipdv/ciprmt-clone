import { NextResponse } from "next/server";
import {
  addAppointments,
  resetStaleReschedulingAppointments,
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

  try {
    await resetStaleReschedulingAppointments();
    console.log("Stale appointments reset successfully");

    // await addAppointments();
    // console.log("New appointments added successfully");

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
