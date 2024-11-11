// app/dashboard/rmt/treatments/[id]/page.jsx
import { getTreatmentById, getTreatmentPlansForUser } from "@/app/_actions";
import TreatmentDetails from "@/components/rmt/TreatmentDetails";
import TreatmentPlanDetails from "@/components/rmt/TreatmentPlanDetails";

const TreatmentPage = async ({ params }) => {
  const { id } = params;
  const treatment = await getTreatmentById(id);
  const { userId } = treatment;
  const treatmentPlans = await getTreatmentPlansForUser(userId);

  return (
    <section className="container mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <TreatmentDetails treatment={treatment} />
        </div>
        <div>
          <TreatmentPlanDetails
            treatmentPlans={treatmentPlans}
            clientId={userId}
          />
        </div>
      </div>
    </section>
  );
};

export default TreatmentPage;
