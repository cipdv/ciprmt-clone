import React from "react";
import Link from "next/link";
import { getAllTreatments } from "@/app/_actions";

const NotesToComplete = async () => {
  const treatmentResults = await getAllTreatments();

  const treatments = treatmentResults.map((todo) => ({
    ...todo,
    _id: todo._id.toString(),
  }));
  return (
    <div className="bg-blue-200 p-4 mb-4 space-y-4">
      <h1>Notes to complete</h1>
      <ul className="space-y-2">
        {treatments.map(
          (treatment) =>
            !treatment.findings && (
              <li key={treatment._id}>
                <Link href={`/dashboard/rmt/treatments/${treatment._id}`}>
                  <h2>{treatment.date}</h2>
                  <p>{treatment.duration}</p>
                  <p>
                    {treatment?.firstName} {treatment?.preferredName}{" "}
                    {treatment?.lastName}
                  </p>
                </Link>
              </li>
            )
        )}
      </ul>
    </div>
  );
};

export default NotesToComplete;
