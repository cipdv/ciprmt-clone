import { resetStaleReschedulingAppointments } from "@/app/_actions";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await resetStaleReschedulingAppointments();
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

// Optional: Handle GET requests
export async function GET() {
  return NextResponse.json(
    { message: "This endpoint only accepts POST requests" },
    { status: 405 }
  );
}
