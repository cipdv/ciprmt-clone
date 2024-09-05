import TreatmentNotes from "@/components/rmt/TreatmentNotes";
import { Suspense } from "react";
import { getTreatmentById } from "@/app/_actions";

const treatmentPage = async ({ params }) => {
  const { id } = params;
  const treatment = await getTreatmentById(id);
  const { firstName, lastName, date, time } = treatment;

  // Convert ObjectId to string
  treatment._id = treatment._id.toString();

  return (
    <section>
      <Suspense fallback={<div>Loading...</div>}>
        <div>
          <h3>Treatment notes for:</h3>
          <h2>
            {firstName} {lastName}
          </h2>
          <h4>Date: {date}</h4>
          <h4>Time: {time}</h4>
        </div>
        <TreatmentNotes treatment={treatment} />
      </Suspense>
    </section>
  );
};

export default treatmentPage;
