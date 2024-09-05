import UpcomingAppointments from "@/components/patients/UpcomingAppointments";
import LatestReceipt from "@/components/patients/LatestReceipt";
import { Suspense } from "react";

const patientDashboardPage = async () => {
  return (
    <section>
      <Suspense
        fallback={
          <div className="flex justify-center h-screen text-2xl mt-20">
            Loading...
          </div>
        }
      >
        <LatestReceipt />

        {/* show what appointments are coming up, if it's unconfirmed show a confirm and give consent section. If there's no appointments, show a book a massage button that takes the page down to calendar */}
        <UpcomingAppointments />

        {/* show a list of upcoming available appointments that the user can click on to book. Include a "show more" button to take to full page of avilable appts with calendar */}
        {/* section for what has passed: show recent receipts, and stretching videos recommended to the patient */}
      </Suspense>
    </section>
  );
};

export default patientDashboardPage;
