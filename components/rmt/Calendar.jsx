"use client";

import React, { useState } from "react";
import Image from "next/image";

const Calendar = ({ appointments }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 3;
  const currentDate = new Date();

  // Filter and sort upcoming appointments
  const upcomingAppointments = appointments
    .filter((appointment) => {
      const appointmentDate = new Date(
        `${appointment.appointmentDate}T${appointment.appointmentBeginsAt}`
      );
      return appointmentDate > currentDate && appointment.status === "booked";
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentBeginsAt}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentBeginsAt}`);
      return dateA - dateB;
    });

  // Get current appointments
  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const currentAppointments = upcomingAppointments.slice(
    indexOfFirstAppointment,
    indexOfLastAppointment
  );

  console.log("upcomingAppointments", upcomingAppointments);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Function to get areas to avoid
  const getAreasToAvoid = (consentForm) => {
    if (!consentForm || !consentForm.consentAreas) return [];

    const areasToAvoid = [];
    const { consentAreas } = consentForm;

    if (consentAreas.glutes === false) areasToAvoid.push("Glutes");
    if (consentAreas.abdomen === false) areasToAvoid.push("Abdomen");
    if (consentAreas.upperinnerthighs === false)
      areasToAvoid.push("Upper Inner Thighs");
    if (consentAreas.chest === false) areasToAvoid.push("Chest");

    // Add any custom areas to avoid
    if (consentForm.areasToAvoid) {
      const customAreas = consentForm.areasToAvoid
        .split(",")
        .map((area) => area.trim());
      areasToAvoid.push(...customAreas);
    }

    return areasToAvoid;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Upcoming Appointments
      </h2>
      {upcomingAppointments.length === 0 ? (
        <div className="p-8 bg-white rounded-md shadow-sm">
          <p className="text-gray-600 text-center text-lg">
            There are currently no upcoming appointments.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="mb-4">
                  <h3 className="font-semibold text-lg mb-2 text-gray-800">
                    {appointment.firstName} {appointment.lastName}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      {new Date(
                        `${appointment.appointmentDate}T${appointment.appointmentBeginsAt}`
                      ).toLocaleString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </p>
                    <p>Duration: {appointment.duration} minutes</p>
                  </div>
                </div>
                {appointment.consentForm && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-gray-700">
                      Consent Form Details:
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Reason for Massage:</span>{" "}
                      {appointment.consentForm.reasonForMassage}
                    </p>
                    <div className="mb-2">
                      <span className="font-medium text-sm text-gray-700">
                        Areas to Avoid:
                      </span>
                      <ul className="list-disc list-inside pl-4">
                        {getAreasToAvoid(appointment.consentForm).map(
                          (area, index) => (
                            <li key={index} className="text-sm text-gray-600">
                              {area}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    {appointment.consentForm.signature && (
                      <div>
                        <span className="font-medium text-sm text-gray-700">
                          Signature:
                        </span>
                        <div className="mt-2 border border-gray-300 rounded overflow-hidden">
                          <Image
                            src={appointment.consentForm.signature}
                            alt="Client Signature"
                            width={300}
                            height={100}
                            layout="responsive"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors duration-200"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Showing {indexOfFirstAppointment + 1}-
              {Math.min(indexOfLastAppointment, upcomingAppointments.length)} of{" "}
              {upcomingAppointments.length}
            </span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={indexOfLastAppointment >= upcomingAppointments.length}
              className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Calendar;
