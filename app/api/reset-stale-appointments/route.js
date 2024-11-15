import { resetStaleReschedulingAppointments } from "@/app/_actions";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await resetStaleReschedulingAppointments();
      res
        .status(200)
        .json({ message: "Stale appointments reset successfully" });
    } catch (error) {
      console.error("Error resetting stale appointments:", error);
      res.status(500).json({ message: "Error resetting stale appointments" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
