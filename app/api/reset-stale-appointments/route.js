import { NextResponse } from "next/server";
import { resetStaleReschedulingAppointments } from "@/app/_actions";

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
    return NextResponse.json({
      message: "Stale appointments reset successfully",
      executionTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resetting stale appointments:", error);
    return NextResponse.json(
      {
        message: "Error resetting stale appointments",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
