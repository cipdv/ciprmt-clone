import { resetStaleReschedulingAppointments } from "@/app/_actions";
import { NextResponse } from "next/server";

export const config = {
  runtime: "edge",
};
export default async function handler(req) {
  console.log(`Handler invoked at ${new Date().toISOString()}`);
  console.log(`Request method: ${req.method}`);

  if (req.method === "POST" || req.method === "GET") {
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
  } else {
    return NextResponse.json(
      { message: "This endpoint only accepts POST and GET requests" },
      { status: 405 }
    );
  }
}
