"use client";

import { useState, useEffect } from "react";
import { getTreatmentAndPlans } from "@/app/_actions";
import TreatmentDetails from "@/components/rmt/TreatmentDetails";
import TreatmentPlanDetails from "@/components/rmt/TreatmentPlanDetails";

const TreatmentPage = ({ params }) => {
  const [treatment, setTreatment] = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { id } = params;
        const result = await getTreatmentAndPlans(id);

        if (result.success) {
          setTreatment(result.treatment);
          setSelectedTreatment(result.treatment);
          setTreatmentPlans(result.treatmentPlans);
        } else {
          setError(result.message);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load treatment data. Please try again.");
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

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
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
