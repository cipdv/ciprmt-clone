// app/dashboard/rmt/treatments/[id]/page.jsx
"use client";

import { useState, useEffect } from "react";
import { getTreatmentById, getTreatmentPlansForUser } from "@/app/_actions";
import TreatmentDetails from "@/components/rmt/TreatmentDetails";
import TreatmentPlanDetails from "@/components/rmt/TreatmentPlanDetails";

const TreatmentPage = ({ params }) => {
  const [treatment, setTreatment] = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { id } = params;
        const treatmentData = await getTreatmentById(id);
        setTreatment(treatmentData);
        setSelectedTreatment(treatmentData);

        const { userId } = treatmentData;
        const plansData = await getTreatmentPlansForUser(userId);
        setTreatmentPlans(plansData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params]);

  const handleSelectTreatment = (treatment) => {
    setSelectedTreatment(treatment);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <section className="container mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {treatment && (
            <TreatmentDetails
              treatment={treatment}
              onSelectTreatment={handleSelectTreatment}
            />
          )}
        </div>
        <div>
          {treatment && (
            <TreatmentPlanDetails
              treatmentPlans={treatmentPlans}
              clientId={treatment.userId}
              selectedTreatment={selectedTreatment}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default TreatmentPage;
