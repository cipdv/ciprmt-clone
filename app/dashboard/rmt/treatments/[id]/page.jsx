"use client";

import { useState, useEffect } from "react";
import {
  getTreatmentAndPlans,
  createTreatmentPlan, // Updated to use comprehensive createTreatmentPlan function
  setDNSTreatmentStatusAttachment,
  getClientWithHealthHistory, // Using comprehensive client data function
} from "@/app/_actions";
import TreatmentNotesForm from "@/components/rmt/TreatmentNotesForm";
import NewTreatmentPlanForm from "@/components/rmt/NewTreatmentPlanForm";
import BookAppointmentModal from "@/components/rmt/BookAppointmentModal";
import ClientHealthHistory from "@/components/rmt/ClientHealthHistory";

const TreatmentPage = ({ params }) => {
  const [treatment, setTreatment] = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("treatment-notes");
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [draggedNote, setDraggedNote] = useState(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [healthHistory, setHealthHistory] = useState(null);
  const [healthHistoryLoading, setHealthHistoryLoading] = useState(false);
  const [healthHistoryError, setHealthHistoryError] = useState(null);
  const [clientInfo, setClientInfo] = useState(null); // Added client info state
  const [autoScrollInterval, setAutoScrollInterval] = useState(null); // Added auto-scroll state for drag operations

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { id } = await params; // Await params for Next.js 15 compatibility
        const result = await getTreatmentAndPlans(id);

        if (result.success) {
          setTreatment(result.treatment);
          setTreatmentPlans(result.treatmentPlans);

          if (result.treatment?.userId) {
            try {
              const clientResult = await getClientWithHealthHistory(
                result.treatment.userId
              );
              setClientInfo(clientResult.client);
              setHealthHistory(clientResult.healthHistory || []);
            } catch (clientError) {
              console.error("Error fetching client info:", clientError);
              // Don't fail the whole page if client info fails
            }
          }
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
  }, []);

  useEffect(() => {
    const handleDragMove = (e) => {
      if (!draggedNote) return;

      const scrollThreshold = 100; // Distance from edge to trigger scroll
      const scrollSpeed = 10; // Pixels to scroll per interval
      const viewportHeight = window.innerHeight;
      const mouseY = e.clientY;

      // Clear existing interval
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }

      // Check if near top edge
      if (mouseY < scrollThreshold) {
        const interval = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16); // ~60fps
        setAutoScrollInterval(interval);
      }
      // Check if near bottom edge
      else if (mouseY > viewportHeight - scrollThreshold) {
        const interval = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16); // ~60fps
        setAutoScrollInterval(interval);
      }
    };

    const handleDragEnd = () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    };

    if (draggedNote) {
      document.addEventListener("dragover", handleDragMove);
      document.addEventListener("dragend", handleDragEnd);
      document.addEventListener("drop", handleDragEnd);
    }

    return () => {
      document.removeEventListener("dragover", handleDragMove);
      document.removeEventListener("dragend", handleDragEnd);
      document.removeEventListener("drop", handleDragEnd);
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
      }
    };
  }, [draggedNote, autoScrollInterval]);

  const handleDragStart = (e, note) => {
    setDraggedNote(note);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, planId) => {
    e.preventDefault();
    if (draggedNote) {
      setExpandedPlanId(planId);
      setDraggedNote(null);
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    }
  };

  const handleCreateNewPlan = async (formData) => {
    try {
      const result = await createTreatmentPlan(formData, treatment?.userId);
      if (result.success) {
        const refreshResult = await getTreatmentAndPlans(treatment.id);
        if (refreshResult.success) {
          setTreatmentPlans(refreshResult.treatmentPlans);
        }
        setShowNewPlanForm(false);
        console.log("Treatment plan created successfully");
      } else {
        console.error("Failed to create treatment plan:", result.message);
        alert("Failed to create treatment plan: " + result.message);
      }
    } catch (error) {
      console.error("Error creating treatment plan:", error);
      alert("An error occurred while creating the treatment plan");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return String(dateString);
    }
  };

  const handleDidNotShow = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!treatment?.id) return;

    setDnsLoading(true);
    try {
      const result = await setDNSTreatmentStatusAttachment(treatment.id);
      if (result.success) {
        setTreatment((prev) => ({ ...prev, status: "dns" }));
        console.log("Treatment marked as DNS successfully");
      } else {
        console.error("Failed to mark as DNS:", result.message);
        alert("Failed to mark as DNS: " + result.message);
      }
    } catch (error) {
      console.error("Error marking as DNS:", error);
      alert("An error occurred while marking as DNS");
    } finally {
      setDnsLoading(false);
    }
  };

  const handleButtonMouseDown = (e) => {
    e.stopPropagation();
  };

  const handleHealthHistoryTabClick = async () => {
    setActiveTab("health-history");

    if (!healthHistory && treatment?.userId && !healthHistoryLoading) {
      setHealthHistoryLoading(true);
      setHealthHistoryError(null);

      try {
        const result = await getClientWithHealthHistory(treatment.userId);
        setHealthHistory(result.healthHistory || []);
      } catch (error) {
        console.error("Error fetching health history:", error);
        setHealthHistoryError("Failed to load health history");
      } finally {
        setHealthHistoryLoading(false);
      }
    }
  };

  const parseConditions = (conditionsJson) => {
    if (!conditionsJson) return [];
    try {
      const conditions =
        typeof conditionsJson === "string"
          ? JSON.parse(conditionsJson)
          : conditionsJson;
      return Object.entries(conditions)
        .filter(([key, value]) => value === true)
        .map(([key]) => key);
    } catch (e) {
      return [];
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-formBackground min-h-screen">
      {(clientInfo || treatment) && (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-black">
            {clientInfo
              ? `${clientInfo.firstName} ${clientInfo.lastName}`
              : `${treatment.firstName} ${treatment.lastName}`}
          </h1>
          <button onClick={() => setIsBookingModalOpen(true)} className="btn">
            Book appointment
          </button>
        </div>
      )}

      <div className="border border-gray-300 bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("treatment-notes")}
            className={`flex-1 py-4 px-6 text-lg font-semibold border-r border-gray-300 transition-colors duration-200 ${
              activeTab === "treatment-notes"
                ? "bg-white text-black"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Treatment Notes
          </button>
          <button
            onClick={handleHealthHistoryTabClick}
            className={`flex-1 py-4 px-6 text-lg font-semibold transition-colors duration-200 ${
              activeTab === "health-history"
                ? "bg-white text-black"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Health History
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === "treatment-notes" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-6">Unfinished Notes</h2>
                {treatment &&
                  !treatment.treatmentNotes &&
                  treatment.status !== "dns" && (
                    <div
                      className="border border-gray-300 p-6 bg-white rounded-lg cursor-move hover:shadow-lg transition-all duration-200 hover:border-indigo-300"
                      draggable
                      onDragStart={(e) => handleDragStart(e, treatment)}
                    >
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          Date: {formatDate(treatment.appointmentDate)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Duration: {treatment.duration || "Not specified"}{" "}
                          minutes
                        </div>
                        <button
                          className={`btn ${
                            dnsLoading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          onClick={handleDidNotShow}
                          onMouseDown={handleButtonMouseDown}
                          draggable={false}
                          disabled={dnsLoading}
                        >
                          {dnsLoading ? "Processing..." : "Did not show"}
                        </button>
                      </div>
                    </div>
                  )}
                {(treatment && treatment.treatmentNotes) ||
                (treatment && treatment.status === "dns") ? (
                  <div className="text-gray-600 italic">
                    No unfinished notes
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Treatment Plans</h2>
                  <button
                    onClick={() => setShowNewPlanForm(true)}
                    className="btn text-sm"
                  >
                    create new treatment plan
                  </button>
                </div>

                {showNewPlanForm && (
                  <div className="border border-gray-300 p-6 mb-6 bg-gray-50 rounded-lg shadow-sm">
                    <NewTreatmentPlanForm
                      clientId={treatment?.userId}
                      onClose={() => setShowNewPlanForm(false)}
                      onSubmit={handleCreateNewPlan}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {treatmentPlans.map((plan) => {
                    return (
                      <div
                        key={plan.id}
                        className="border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        <div
                          className="p-6 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, plan.id)}
                          onClick={() =>
                            setExpandedPlanId(
                              expandedPlanId === plan.id ? null : plan.id
                            )
                          }
                        >
                          <div className="space-y-3">
                            <div className="font-medium text-gray-900 text-lg">
                              Goals:{" "}
                              {plan.decryptedData?.clientGoals ||
                                plan.clientGoals ||
                                plan.goals ||
                                "Not specified"}
                            </div>
                            {(plan.decryptedData?.areasToBeTreated ||
                              plan.areasToTreat) && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">
                                  Areas to treat:
                                </span>{" "}
                                {plan.decryptedData?.areasToBeTreated ||
                                  plan.areasToTreat}
                              </div>
                            )}
                            {(plan.decryptedData?.durationAndFrequency ||
                              plan.durationFrequency) && (
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">
                                  Duration/Frequency:
                                </span>{" "}
                                {plan.decryptedData?.durationAndFrequency ||
                                  plan.durationFrequency}
                              </div>
                            )}
                            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                              {formatDate(plan.startDate)} -{" "}
                              {formatDate(plan.endDate)}
                            </div>
                            {plan.status && (
                              <div className="text-xs text-gray-500 capitalize">
                                <span className="font-medium">Status:</span>{" "}
                                {plan.status}
                              </div>
                            )}
                          </div>
                        </div>

                        {expandedPlanId === plan.id && (
                          <div className="border-t border-gray-300 p-6 bg-gray-50">
                            <TreatmentNotesForm
                              treatment={treatment}
                              planId={plan.id}
                              plan={plan}
                              planDetails={plan}
                              onClose={() => setExpandedPlanId(null)}
                              onSubmit={() => setExpandedPlanId(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "health-history" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Health History</h2>

              {healthHistoryLoading && (
                <div className="text-center py-8 text-gray-600">
                  Loading health history...
                </div>
              )}

              {healthHistoryError && (
                <div className="text-red-500 py-4 bg-red-50 rounded-lg px-4">
                  {healthHistoryError}
                </div>
              )}

              {!healthHistoryLoading &&
                !healthHistoryError &&
                (!healthHistory || healthHistory.length === 0) && (
                  <div className="text-gray-600 py-4 italic">
                    No health history found for this client.
                  </div>
                )}

              {healthHistory && healthHistory.length > 0 && (
                <ClientHealthHistory healthHistory={healthHistory} />
              )}
            </div>
          )}
        </div>
      </div>

      {treatment && (
        <BookAppointmentModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          clientId={treatment.userId}
        />
      )}
    </div>
  );
};

export default TreatmentPage;

// "use client";

// import { useState, useEffect } from "react";
// import {
//   getTreatmentAndPlans,
//   createTreatmentPlan,
//   setDNSTreatmentStatusAttachment,
// } from "@/app/_actions";
// import TreatmentNotesForm from "@/components/rmt/TreatmentNotesForm";
// import NewTreatmentPlanForm from "@/components/rmt/NewTreatmentPlanForm";
// import BookAppointmentModal from "@/components/rmt/BookAppointmentModal";

// const TreatmentPage = ({ params }) => {
//   const [treatment, setTreatment] = useState(null);
//   const [treatmentPlans, setTreatmentPlans] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
//   const [activeTab, setActiveTab] = useState("treatment-notes");
//   const [expandedPlanId, setExpandedPlanId] = useState(null);
//   const [draggedNote, setDraggedNote] = useState(null);
//   const [showNewPlanForm, setShowNewPlanForm] = useState(false);
//   const [dnsLoading, setDnsLoading] = useState(false);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const { id } = await params;
//         const result = await getTreatmentAndPlans(id);

//         if (result.success) {
//           setTreatment(result.treatment);
//           setTreatmentPlans(result.treatmentPlans);
//         } else {
//           setError(result.message);
//         }
//       } catch (error) {
//         console.error("Error fetching data:", error);
//         setError("Failed to load treatment data. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   const handleDragStart = (e, note) => {
//     setDraggedNote(note);
//     e.dataTransfer.effectAllowed = "move";
//   };

//   const handleDragOver = (e) => {
//     e.preventDefault();
//     e.dataTransfer.dropEffect = "move";
//   };

//   const handleDrop = (e, planId) => {
//     e.preventDefault();
//     if (draggedNote) {
//       setExpandedPlanId(planId);
//       setDraggedNote(null);
//     }
//   };

//   const handleCreateNewPlan = async (formData) => {
//     try {
//       const result = await createTreatmentPlan(formData);
//       if (result.success) {
//         setTreatmentPlans([...treatmentPlans, result.data]);
//         setShowNewPlanForm(false);
//       }
//     } catch (error) {
//       console.error("Error creating treatment plan:", error);
//     }
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return "Not specified";
//     try {
//       return new Date(dateString).toLocaleDateString();
//     } catch (e) {
//       return String(dateString);
//     }
//   };

//   const handleDidNotShow = async (e) => {
//     e.stopPropagation();
//     e.preventDefault();

//     if (!treatment?.id) return;

//     setDnsLoading(true);
//     try {
//       const result = await setDNSTreatmentStatusAttachment(treatment.id);
//       if (result.success) {
//         // Update treatment status locally to remove from unfinished notes
//         setTreatment((prev) => ({ ...prev, status: "dns" }));
//         console.log("Treatment marked as DNS successfully");
//       } else {
//         console.error("Failed to mark as DNS:", result.message);
//         alert("Failed to mark as DNS: " + result.message);
//       }
//     } catch (error) {
//       console.error("Error marking as DNS:", error);
//       alert("An error occurred while marking as DNS");
//     } finally {
//       setDnsLoading(false);
//     }
//   };

//   const handleButtonMouseDown = (e) => {
//     e.stopPropagation();
//   };

//   if (loading) {
//     return <div className="text-center py-8">Loading...</div>;
//   }

//   if (error) {
//     return <div className="text-center py-8 text-red-500">{error}</div>;
//   }

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
//       {treatment && (
//         <div className="flex justify-between items-center mb-8">
//           <h1 className="text-2xl font-semibold text-black">
//             {treatment.firstName} {treatment.lastName}
//           </h1>
//           <button
//             onClick={() => setIsBookingModalOpen(true)}
//             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
//           >
//             Book appointment
//           </button>
//         </div>
//       )}

//       <div className="border-4 border-black bg-white">
//         <div className="flex border-b-4 border-black">
//           <button
//             onClick={() => setActiveTab("treatment-notes")}
//             className={`flex-1 py-4 px-6 text-lg font-semibold border-r-4 border-black ${
//               activeTab === "treatment-notes"
//                 ? "bg-white text-black"
//                 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             Treatment Notes
//           </button>
//           <button
//             onClick={() => setActiveTab("health-history")}
//             className={`flex-1 py-4 px-6 text-lg font-semibold ${
//               activeTab === "health-history"
//                 ? "bg-white text-black"
//                 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             Health History
//           </button>
//         </div>

//         <div className="p-6">
//           {activeTab === "treatment-notes" && (
//             <div className="space-y-8">
//               <div>
//                 <h2 className="text-xl font-semibold mb-4">Unfinished Notes</h2>
//                 {treatment &&
//                   !treatment.treatmentNotes &&
//                   treatment.status !== "dns" && (
//                     <div
//                       className="border-2 border-gray-300 p-4 bg-white rounded cursor-move hover:shadow-md transition-shadow"
//                       draggable
//                       onDragStart={(e) => handleDragStart(e, treatment)}
//                     >
//                       <div className="text-sm text-gray-600 mb-2">
//                         Date: {formatDate(treatment.appointmentDate)}
//                       </div>
//                       <div className="text-sm text-gray-600 mb-2">
//                         Duration: {treatment.duration || "Not specified"}{" "}
//                         minutes
//                       </div>
//                       <button
//                         className={`px-3 py-1 rounded text-sm cursor-pointer ${
//                           dnsLoading
//                             ? "bg-gray-400 text-gray-200 cursor-not-allowed"
//                             : "bg-indigo-600 text-white hover:bg-indigo-700"
//                         }`}
//                         onClick={handleDidNotShow}
//                         onMouseDown={handleButtonMouseDown}
//                         draggable={false}
//                         disabled={dnsLoading}
//                       >
//                         {dnsLoading ? "Processing..." : "Did not show"}
//                       </button>
//                     </div>
//                   )}
//                 {(treatment && treatment.treatmentNotes) ||
//                 (treatment && treatment.status === "dns") ? (
//                   <div className="text-gray-600">No unfinished notes</div>
//                 ) : null}
//               </div>

//               <div>
//                 <div className="flex justify-between items-center mb-4">
//                   <h2 className="text-xl font-semibold">Treatment Plans</h2>
//                   <button
//                     onClick={() => setShowNewPlanForm(true)}
//                     className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
//                   >
//                     create new treatment plan
//                   </button>
//                 </div>

//                 {showNewPlanForm && (
//                   <div className="border-2 border-gray-300 p-6 mb-4 bg-gray-50">
//                     <NewTreatmentPlanForm
//                       clientId={treatment?.userId}
//                       onClose={() => setShowNewPlanForm(false)}
//                       onSubmit={handleCreateNewPlan}
//                     />
//                   </div>
//                 )}

//                 <div className="space-y-4">
//                   {treatmentPlans.map((plan) => (
//                     <div key={plan.id} className="border-2 border-gray-300">
//                       <div
//                         className="p-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
//                         onDragOver={handleDragOver}
//                         onDrop={(e) => handleDrop(e, plan.id)}
//                         onClick={() =>
//                           setExpandedPlanId(
//                             expandedPlanId === plan.id ? null : plan.id
//                           )
//                         }
//                       >
//                         <div className="font-medium text-gray-900 mb-2">
//                           Treatment plan goals:{" "}
//                           {plan.clientGoals || "Not specified"}
//                         </div>
//                         <div className="text-sm text-gray-600">
//                           {formatDate(plan.startDate)} -{" "}
//                           {formatDate(plan.endDate)}
//                         </div>
//                       </div>

//                       {expandedPlanId === plan.id && (
//                         <div className="border-t-2 border-gray-300 p-6 bg-gray-50">
//                           <TreatmentNotesForm
//                             treatment={treatment}
//                             planId={plan.id}
//                             plan={plan}
//                             planDetails={plan}
//                             onClose={() => setExpandedPlanId(null)}
//                             onSubmit={() => setExpandedPlanId(null)}
//                           />
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === "health-history" && (
//             <div>
//               <h2 className="text-xl font-semibold mb-4">Health History</h2>
//               <p className="text-gray-600">
//                 Health history content will be displayed here.
//               </p>
//             </div>
//           )}
//         </div>
//       </div>

//       {treatment && (
//         <BookAppointmentModal
//           isOpen={isBookingModalOpen}
//           onClose={() => setIsBookingModalOpen(false)}
//           clientId={treatment.userId}
//         />
//       )}
//     </div>
//   );
// };

// export default TreatmentPage;

// "use client";

// import { useState, useEffect } from "react";
// import { getTreatmentAndPlans } from "@/app/_actions";
// import TreatmentDetails from "@/components/rmt/TreatmentDetails";
// import TreatmentPlanDetails from "@/components/rmt/TreatmentPlanDetails";
// import BookAppointmentModal from "@/components/rmt/BookAppointmentModal";

// const TreatmentPage = ({ params }) => {
//   const [treatment, setTreatment] = useState(null);
//   const [treatmentPlans, setTreatmentPlans] = useState([]);
//   const [selectedTreatment, setSelectedTreatment] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const { id } = await params;
//         const result = await getTreatmentAndPlans(id);

//         console.log(result);

//         if (result.success) {
//           setTreatment(result.treatment);
//           setSelectedTreatment(result.treatment);
//           setTreatmentPlans(result.treatmentPlans);
//         } else {
//           setError(result.message);
//         }
//       } catch (error) {
//         console.error("Error fetching data:", error);
//         setError("Failed to load treatment data. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []); //

//   const handleSelectTreatment = (treatment) => {
//     setSelectedTreatment(treatment);
//   };

//   if (loading) {
//     return <div className="text-center py-8">Loading...</div>;
//   }

//   if (error) {
//     return <div className="text-center py-8 text-red-500">{error}</div>;
//   }

//   return (
//     <section className="container mx-auto max-w-6xl px-4 py-8">
//       {treatment && (
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold text-gray-900">
//             {`${treatmentPlans[0].clientFirstName} ${treatmentPlans[0].clientLastName}` ||
//               `Client ID: ${treatment.userId}`}
//           </h1>
//           <button onClick={() => setIsBookingModalOpen(true)} className="btn">
//             Book Appointment
//           </button>
//         </div>
//       )}

//       <div className="grid gap-6 md:grid-cols-2">
//         <div>
//           {treatment && (
//             <TreatmentDetails
//               treatment={treatment}
//               onSelectTreatment={handleSelectTreatment}
//             />
//           )}
//         </div>
//         <div>
//           {treatment && (
//             <TreatmentPlanDetails
//               treatmentPlans={treatmentPlans}
//               clientId={treatment.userId}
//               selectedTreatment={selectedTreatment}
//             />
//           )}
//         </div>
//       </div>

//       {treatment && (
//         <BookAppointmentModal
//           isOpen={isBookingModalOpen}
//           onClose={() => setIsBookingModalOpen(false)}
//           clientId={treatment.userId}
//         />
//       )}
//     </section>
//   );
// };

// export default TreatmentPage;

// // "use client";

// // import { useState, useEffect } from "react";
// // import { getTreatmentAndPlans } from "@/app/_actions";
// // import TreatmentDetails from "@/components/rmt/TreatmentDetails";
// // import TreatmentPlanDetails from "@/components/rmt/TreatmentPlanDetails";

// // const TreatmentPage = ({ params }) => {
// //   const [treatment, setTreatment] = useState(null);
// //   const [treatmentPlans, setTreatmentPlans] = useState([]);
// //   const [selectedTreatment, setSelectedTreatment] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);

// //   useEffect(() => {
// //     const fetchData = async () => {
// //       try {
// //         const { id } = await params;
// //         const result = await getTreatmentAndPlans(id);

// //         if (result.success) {
// //           setTreatment(result.treatment);
// //           setSelectedTreatment(result.treatment);
// //           setTreatmentPlans(result.treatmentPlans);
// //         } else {
// //           setError(result.message);
// //         }
// //       } catch (error) {
// //         console.error("Error fetching data:", error);
// //         setError("Failed to load treatment data. Please try again.");
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchData();
// //   }, []);

// //   const handleSelectTreatment = (treatment) => {
// //     setSelectedTreatment(treatment);
// //   };

// //   if (loading) {
// //     return <div className="text-center py-8">Loading...</div>;
// //   }

// //   if (error) {
// //     return <div className="text-center py-8 text-red-500">{error}</div>;
// //   }

// //   return (
// //     <section className="container mx-auto max-w-6xl px-4 py-8">
// //       <div className="grid gap-6 md:grid-cols-2">
// //         <div>
// //           {treatment && (
// //             <TreatmentDetails
// //               treatment={treatment}
// //               onSelectTreatment={handleSelectTreatment}
// //             />
// //           )}
// //         </div>
// //         <div>
// //           {treatment && (
// //             <TreatmentPlanDetails
// //               treatmentPlans={treatmentPlans}
// //               clientId={treatment.userId}
// //               selectedTreatment={selectedTreatment}
// //             />
// //           )}
// //         </div>
// //       </div>
// //     </section>
// //   );
// // };

// // export default TreatmentPage;
