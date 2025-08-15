"use client";

import { useState } from "react";
import { addAppointments } from "@/app/_actions";

export default function TestCronPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTestCron = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await addAppointments();
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Cron Job Function</h1>

      <div className="mb-6">
        <button
          onClick={handleTestCron}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded"
        >
          {loading ? "Running Test..." : "Test Add Appointments Function"}
        </button>
      </div>

      {result && (
        <div
          className={`p-4 rounded border ${
            result.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <h2 className="font-semibold mb-2">
            {result.success ? "✅ Success" : "❌ Error"}
          </h2>

          {result.success ? (
            <div className="space-y-2">
              <p>
                <strong>Message:</strong> {result.message}
              </p>
              <p>
                <strong>Appointments Created:</strong>{" "}
                {result.appointmentsCreated}
              </p>
              {result.futureDate && (
                <p>
                  <strong>Future Date:</strong> {result.futureDate}
                </p>
              )}
              {result.dayName && (
                <p>
                  <strong>Day:</strong> {result.dayName}
                </p>
              )}
            </div>
          ) : (
            <p>
              <strong>Error:</strong> {result.error}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">What this test does:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Checks if you're working today based on work_days2 table</li>
          <li>
            Gets your appointment time slots from appointment_times2 table
          </li>
          <li>Simulates creating appointments 8 weeks in the future</li>
          <li>
            Shows what appointments would be created (without actually inserting
            to treatments table)
          </li>
        </ul>
      </div>
    </div>
  );
}

// // "use client";
// // import { useState } from "react";
// // import {
// //   consolidateUsers,
// //   consolidateTreatments,
// //   consolidateHealthHistories,
// //   consolidateTreatmentPlans,
// //   migrateToPostgres,
// //   addAppointments,
// //   addAppointmentsForEightWeeks,
// // } from "@/app/_actions";

// // const TestPage = () => {
// //   const [consolidationStatus, setConsolidationStatus] = useState(null);
// //   const [isConsolidating, setIsConsolidating] = useState(false);
// //   const [activeFunction, setActiveFunction] = useState(null);
// //   const [operationStatus, setOperationStatus] = useState(null);
// //   const [isProcessing, setIsProcessing] = useState(false);

// //   const handleConsolidateUsers = async () => {
// //     if (
// //       confirm(
// //         "Are you sure you want to consolidate users data? This will create a new migrateUsers collection."
// //       )
// //     ) {
// //       setIsConsolidating(true);
// //       setActiveFunction("users");
// //       try {
// //         const result = await consolidateUsers();
// //         setConsolidationStatus(result);
// //       } catch (error) {
// //         console.error("Consolidation error:", error);
// //         setConsolidationStatus({
// //           success: false,
// //           error: error.message,
// //         });
// //       } finally {
// //         setIsConsolidating(false);
// //       }
// //     }
// //   };

// //   const handleConsolidateTreatments = async () => {
// //     if (
// //       confirm(
// //         "Are you sure you want to consolidate treatments and appointments data? This will create a new migrateTreatments collection."
// //       )
// //     ) {
// //       setIsConsolidating(true);
// //       setActiveFunction("treatments");
// //       try {
// //         const result = await consolidateTreatments();
// //         setConsolidationStatus(result);
// //       } catch (error) {
// //         console.error("Consolidation error:", error);
// //         setConsolidationStatus({
// //           success: false,
// //           error: error.message,
// //         });
// //       } finally {
// //         setIsConsolidating(false);
// //       }
// //     }
// //   };

// //   const handleConsolidateHealthHistories = async () => {
// //     if (
// //       confirm(
// //         "Are you sure you want to consolidate health histories data? This will create a new migrateHealthHistories collection."
// //       )
// //     ) {
// //       setIsConsolidating(true);
// //       setActiveFunction("healthHistories");
// //       try {
// //         const result = await consolidateHealthHistories();
// //         setConsolidationStatus(result);
// //       } catch (error) {
// //         console.error("Consolidation error:", error);
// //         setConsolidationStatus({
// //           success: false,
// //           error: error.message,
// //         });
// //       } finally {
// //         setIsConsolidating(false);
// //       }
// //     }
// //   };

// //   const handleConsolidateTreatmentPlans = async () => {
// //     if (
// //       confirm(
// //         "Are you sure you want to consolidate treatment plans data? This will create a new migrateTreatmentPlans collection."
// //       )
// //     ) {
// //       setIsConsolidating(true);
// //       setActiveFunction("treatmentPlans");
// //       try {
// //         const result = await consolidateTreatmentPlans();
// //         setConsolidationStatus(result);
// //       } catch (error) {
// //         console.error("Consolidation error:", error);
// //         setConsolidationStatus({
// //           success: false,
// //           error: error.message,
// //         });
// //       } finally {
// //         setIsConsolidating(false);
// //       }
// //     }
// //   };

// //   const handleMigrateToPostgres = async () => {
// //     if (
// //       confirm(
// //         "Are you sure you want to migrate data to PostgreSQL? This process may take a long time and should be run only after all consolidation steps are complete."
// //       )
// //     ) {
// //       setIsConsolidating(true);
// //       setActiveFunction("postgres");
// //       try {
// //         const result = await migrateToPostgres();
// //         setConsolidationStatus(result);
// //       } catch (error) {
// //         console.error("Migration error:", error);
// //         setConsolidationStatus({
// //           success: false,
// //           error: error.message,
// //         });
// //       } finally {
// //         setIsConsolidating(false);
// //       }
// //     }
// //   };

// //   const handleAddAppointments = async () => {
// //     if (
// //       confirm(
// //         "Are you sure you want to add appointments? This will create new appointments 8 weeks from today."
// //       )
// //     ) {
// //       setIsProcessing(true);
// //       try {
// //         const result = await addAppointments();
// //         setOperationStatus(result);
// //       } catch (error) {
// //         console.error("Error adding appointments:", error);
// //         setOperationStatus({
// //           success: false,
// //           error: error.message,
// //         });
// //       } finally {
// //         setIsProcessing(false);
// //       }
// //     }
// //   };

// //   const handleAddAppointmentsForEightWeeks = async () => {
// //     if (
// //       confirm(
// //         "Are you sure you want to add appointments for the next 8 weeks? This will create new appointments for each day with a work schedule."
// //       )
// //     ) {
// //       setIsProcessing(true);
// //       try {
// //         const result = await addAppointmentsForEightWeeks();
// //         setOperationStatus(result);
// //       } catch (error) {
// //         console.error("Error adding appointments for eight weeks:", error);
// //         setOperationStatus({
// //           success: false,
// //           error: error.message,
// //         });
// //       } finally {
// //         setIsProcessing(false);
// //       }
// //     }
// //   };

// //   return (
// //     <div className="space-y-4 m-8">
// //       <h1 className="text-2xl font-bold">MongoDB Consolidation Tool</h1>

// //       <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
// //         <h2 className="font-semibold text-yellow-800">
// //           Consolidation Information
// //         </h2>
// //         <p className="mt-2">
// //           This tool helps consolidate MongoDB collections to ensure all
// //           documents have the same structure before migrating to PostgreSQL.
// //         </p>
// //       </div>

// //       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// //         <button
// //           className="btn bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
// //           onClick={handleConsolidateUsers}
// //           disabled={isConsolidating}
// //         >
// //           {isConsolidating && activeFunction === "users"
// //             ? "Consolidating Users..."
// //             : "Consolidate Users Collection"}
// //         </button>

// //         <button
// //           className="btn bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
// //           onClick={handleConsolidateTreatments}
// //           disabled={isConsolidating}
// //         >
// //           {isConsolidating && activeFunction === "treatments"
// //             ? "Consolidating Treatments..."
// //             : "Consolidate Treatments & Appointments"}
// //         </button>

// //         <button
// //           className="btn bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
// //           onClick={handleConsolidateHealthHistories}
// //           disabled={isConsolidating}
// //         >
// //           {isConsolidating && activeFunction === "healthHistories"
// //             ? "Consolidating Health Histories..."
// //             : "Consolidate Health Histories"}
// //         </button>

// //         <button
// //           className="btn bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded"
// //           onClick={handleConsolidateTreatmentPlans}
// //           disabled={isConsolidating}
// //         >
// //           {isConsolidating && activeFunction === "treatmentPlans"
// //             ? "Consolidating Treatment Plans..."
// //             : "Consolidate Treatment Plans"}
// //         </button>

// //         <button
// //           className="btn bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded col-span-1 md:col-span-2"
// //           onClick={handleMigrateToPostgres}
// //           disabled={isConsolidating}
// //         >
// //           {isConsolidating && activeFunction === "postgres"
// //             ? "Migrating to PostgreSQL..."
// //             : "Migrate to PostgreSQL"}
// //         </button>

// //         <button
// //           className="btn bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
// //           onClick={handleAddAppointments}
// //           disabled={isProcessing}
// //         >
// //           {isProcessing
// //             ? "Adding Appointments..."
// //             : "Add Appointments (8 weeks from today)"}
// //         </button>

// //         <button
// //           className="btn bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded"
// //           onClick={handleAddAppointmentsForEightWeeks}
// //           disabled={isProcessing}
// //         >
// //           {isProcessing
// //             ? "Adding Appointments..."
// //             : "Add Appointments (For Next 8 Weeks)"}
// //         </button>
// //       </div>

// //       {consolidationStatus && (
// //         <div
// //           className={`mt-4 p-4 border rounded ${
// //             consolidationStatus.success
// //               ? "bg-green-50 border-green-200"
// //               : "bg-red-50 border-red-200"
// //           }`}
// //         >
// //           <h3 className="font-bold">Results:</h3>
// //           <p>Success: {consolidationStatus.success ? "Yes" : "No"}</p>

// //           {consolidationStatus.message && (
// //             <p className="mt-2">{consolidationStatus.message}</p>
// //           )}

// //           {consolidationStatus.stats && activeFunction === "users" && (
// //             <div className="mt-2">
// //               <h4 className="font-bold">Statistics:</h4>
// //               <ul className="list-disc pl-5">
// //                 <li>
// //                   Original users: {consolidationStatus.stats.originalCount}
// //                 </li>
// //                 <li>
// //                   Migrated users: {consolidationStatus.stats.migratedCount}
// //                 </li>
// //                 <li>
// //                   Fields in migrated collection:
// //                   <ul className="list-disc pl-5 mt-1">
// //                     {consolidationStatus.stats.fields.map((field, index) => (
// //                       <li key={index}>{field}</li>
// //                     ))}
// //                   </ul>
// //                 </li>
// //               </ul>
// //             </div>
// //           )}

// //           {consolidationStatus.stats && activeFunction === "treatments" && (
// //             <div className="mt-2">
// //               <h4 className="font-bold">Statistics:</h4>
// //               <ul className="list-disc pl-5">
// //                 <li>
// //                   Original treatments:{" "}
// //                   {consolidationStatus.stats.totalTreatments}
// //                 </li>
// //                 <li>
// //                   Original appointments:{" "}
// //                   {consolidationStatus.stats.totalAppointments}
// //                 </li>
// //                 <li>
// //                   Consolidated records:{" "}
// //                   {consolidationStatus.stats.consolidatedCount}
// //                 </li>
// //                 <li>
// //                   Fields in migrated collection:
// //                   <ul className="list-disc pl-5 mt-1">
// //                     {consolidationStatus.stats.fields.map((field, index) => (
// //                       <li key={index}>{field}</li>
// //                     ))}
// //                   </ul>
// //                 </li>
// //               </ul>
// //             </div>
// //           )}

// //           {consolidationStatus.stats &&
// //             activeFunction === "healthHistories" && (
// //               <div className="mt-2">
// //                 <h4 className="font-bold">Statistics:</h4>
// //                 <ul className="list-disc pl-5">
// //                   <li>
// //                     Original health histories:{" "}
// //                     {consolidationStatus.stats.totalDocuments}
// //                   </li>
// //                   <li>
// //                     Consolidated records:{" "}
// //                     {consolidationStatus.stats.consolidatedCount}
// //                   </li>
// //                   <li>
// //                     Already encrypted:{" "}
// //                     {consolidationStatus.stats.alreadyEncrypted}
// //                   </li>
// //                   <li>
// //                     Newly encrypted: {consolidationStatus.stats.newlyEncrypted}
// //                   </li>
// //                   {consolidationStatus.stats.missingUserIdCount !==
// //                     undefined && (
// //                     <li
// //                       className={
// //                         consolidationStatus.stats.missingUserIdCount > 0
// //                           ? "text-orange-600 font-semibold"
// //                           : ""
// //                       }
// //                     >
// //                       Documents with missing userId:{" "}
// //                       {consolidationStatus.stats.missingUserIdCount}
// //                     </li>
// //                   )}
// //                   <li>
// //                     Fields in migrated collection:
// //                     <ul className="list-disc pl-5 mt-1">
// //                       {consolidationStatus.stats.fields.map((field, index) => (
// //                         <li key={index}>{field}</li>
// //                       ))}
// //                     </ul>
// //                   </li>
// //                 </ul>
// //               </div>
// //             )}

// //           {consolidationStatus.stats && activeFunction === "treatmentPlans" && (
// //             <div className="mt-2">
// //               <h4 className="font-bold">Statistics:</h4>
// //               <ul className="list-disc pl-5">
// //                 <li>
// //                   Original treatment plans:{" "}
// //                   {consolidationStatus.stats.totalDocuments}
// //                 </li>
// //                 <li>
// //                   Consolidated records:{" "}
// //                   {consolidationStatus.stats.consolidatedCount}
// //                 </li>
// //                 <li>
// //                   Already encrypted:{" "}
// //                   {consolidationStatus.stats.alreadyEncrypted}
// //                 </li>
// //                 <li>
// //                   Newly encrypted: {consolidationStatus.stats.newlyEncrypted}
// //                 </li>
// //                 <li>
// //                   Fields in migrated collection:
// //                   <ul className="list-disc pl-5 mt-1">
// //                     {consolidationStatus.stats.fields.map((field, index) => (
// //                       <li key={index}>{field}</li>
// //                     ))}
// //                   </ul>
// //                 </li>
// //               </ul>
// //             </div>
// //           )}

// //           {consolidationStatus.stats && activeFunction === "postgres" && (
// //             <div className="mt-2">
// //               <h4 className="font-bold">Migration Statistics:</h4>
// //               <ul className="list-disc pl-5">
// //                 <li>
// //                   <strong>Users:</strong>{" "}
// //                   {consolidationStatus.stats.users.success} of{" "}
// //                   {consolidationStatus.stats.users.total} migrated
// //                   {consolidationStatus.stats.users.errors > 0 && (
// //                     <span className="text-red-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.users.errors} errors)
// //                     </span>
// //                   )}
// //                 </li>
// //                 <li>
// //                   <strong>RMT Locations:</strong>{" "}
// //                   {consolidationStatus.stats.rmtLocations.success} of{" "}
// //                   {consolidationStatus.stats.rmtLocations.total} migrated
// //                   {consolidationStatus.stats.rmtLocations.skipped > 0 && (
// //                     <span className="text-orange-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.rmtLocations.skipped} skipped)
// //                     </span>
// //                   )}
// //                   {consolidationStatus.stats.rmtLocations.errors > 0 && (
// //                     <span className="text-red-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.rmtLocations.errors} errors)
// //                     </span>
// //                   )}
// //                 </li>
// //                 <li>
// //                   <strong>Health Histories:</strong>{" "}
// //                   {consolidationStatus.stats.healthHistories.success} of{" "}
// //                   {consolidationStatus.stats.healthHistories.total} migrated
// //                   {consolidationStatus.stats.healthHistories.skipped > 0 && (
// //                     <span className="text-orange-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.healthHistories.skipped}{" "}
// //                       skipped)
// //                     </span>
// //                   )}
// //                   {consolidationStatus.stats.healthHistories.errors > 0 && (
// //                     <span className="text-red-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.healthHistories.errors}{" "}
// //                       errors)
// //                     </span>
// //                   )}
// //                 </li>
// //                 <li>
// //                   <strong>Treatment Plans:</strong>{" "}
// //                   {consolidationStatus.stats.treatmentPlans.success} of{" "}
// //                   {consolidationStatus.stats.treatmentPlans.total} migrated
// //                   {consolidationStatus.stats.treatmentPlans.skipped > 0 && (
// //                     <span className="text-orange-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.treatmentPlans.skipped}{" "}
// //                       skipped)
// //                     </span>
// //                   )}
// //                   {consolidationStatus.stats.treatmentPlans.errors > 0 && (
// //                     <span className="text-red-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.treatmentPlans.errors} errors)
// //                     </span>
// //                   )}
// //                 </li>
// //                 <li>
// //                   <strong>Treatments:</strong>{" "}
// //                   {consolidationStatus.stats.treatments.success} of{" "}
// //                   {consolidationStatus.stats.treatments.total} migrated
// //                   {consolidationStatus.stats.treatments.skipped > 0 && (
// //                     <span className="text-orange-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.treatments.skipped} skipped)
// //                     </span>
// //                   )}
// //                   {consolidationStatus.stats.treatments.errors > 0 && (
// //                     <span className="text-red-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.treatments.errors} errors)
// //                     </span>
// //                   )}
// //                 </li>
// //                 <li>
// //                   <strong>Relationships:</strong>{" "}
// //                   {consolidationStatus.stats.relationships.success}{" "}
// //                   treatment-plan relationships created
// //                   {consolidationStatus.stats.relationships.skipped > 0 && (
// //                     <span className="text-orange-600">
// //                       {" "}
// //                       ({consolidationStatus.stats.relationships.skipped} plans
// //                       skipped)
// //                     </span>
// //                   )}
// //                 </li>
// //                 <li>
// //                   <strong>Work Days:</strong>{" "}
// //                   {consolidationStatus.stats.workDays.workDaysSuccess} work days
// //                   and{" "}
// //                   {consolidationStatus.stats.workDays.appointmentTimesSuccess}{" "}
// //                   appointment times created
// //                 </li>
// //                 <li>
// //                   <strong>Messages:</strong>{" "}
// //                   {consolidationStatus.stats.messages.success} of{" "}
// //                   {consolidationStatus.stats.messages.total} migrated
// //                 </li>
// //               </ul>
// //             </div>
// //           )}

// //           {consolidationStatus.errors &&
// //             consolidationStatus.errors.length > 0 && (
// //               <div>
// //                 <h4 className="font-bold mt-2">
// //                   Errors ({consolidationStatus.errors.length}):
// //                 </h4>
// //                 <ul className="list-disc pl-5">
// //                   {consolidationStatus.errors
// //                     .slice(0, 10)
// //                     .map((error, index) => (
// //                       <li key={index}>
// //                         {error.type ? `${error.type}: ` : ""}
// //                         {error.id ? `ID ${error.id} - ` : ""}
// //                         {error.message || error.error}
// //                       </li>
// //                     ))}
// //                   {consolidationStatus.errors.length > 10 && (
// //                     <li>
// //                       ...and {consolidationStatus.errors.length - 10} more
// //                       errors
// //                     </li>
// //                   )}
// //                 </ul>
// //               </div>
// //             )}

// //           {consolidationStatus.error && (
// //             <p className="text-red-500">Error: {consolidationStatus.error}</p>
// //           )}
// //         </div>
// //       )}
// //       {operationStatus && (
// //         <div
// //           className={`mt-4 p-4 border rounded ${
// //             operationStatus.success
// //               ? "bg-green-50 border-green-200"
// //               : "bg-red-50 border-red-200"
// //           }`}
// //         >
// //           <h3 className="font-bold">Results:</h3>
// //           <p>Success: {operationStatus.success ? "Yes" : "No"}</p>

// //           {operationStatus.message && (
// //             <p className="mt-2">{operationStatus.message}</p>
// //           )}

// //           {operationStatus.dates && operationStatus.dates.length > 0 && (
// //             <div className="mt-2">
// //               <h4 className="font-bold">Dates with appointments created:</h4>
// //               <div className="max-h-40 overflow-y-auto mt-2">
// //                 <ul className="list-disc pl-5">
// //                   {operationStatus.dates.map((date, index) => (
// //                     <li key={index}>{date}</li>
// //                   ))}
// //                 </ul>
// //               </div>
// //             </div>
// //           )}

// //           {operationStatus.error && (
// //             <p className="text-red-500">Error: {operationStatus.error}</p>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default TestPage;
// import React from "react";

// const page = () => {
//   return <div>page</div>;
// };

// export default page;
