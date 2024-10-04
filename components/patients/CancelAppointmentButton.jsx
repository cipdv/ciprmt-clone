"use client";

import { useState, useEffect } from "react";
import { useFormStatus, useFormState } from "react-dom";
import { cancelAppointment } from "@/app/_actions";

const initialState = {
  message: "",
  status: "idle",
};

function CancelButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-buttons disabled:opacity-50 transition-colors duration-200"
    >
      {pending ? "Cancelling..." : "Confirm Cancellation"}
    </button>
  );
}

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"
          onClick={onClose}
        ></div>
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-primary rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

export function CancelAppointmentForm({ id, appointmentDetails }) {
  const [state, formAction] = useFormState(cancelAppointment, initialState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  console.log(appointmentDetails);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    formAction(formData);
  };

  useEffect(() => {
    if (state.status === "success") {
      closeModal();
    }
  }, [state.status]);

  return (
    <>
      <button
        onClick={openModal}
        className="btn-small-delete transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Cancel Appointment
      </button>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div className="px-6 pt-6 pb-4 sm:p-6 sm:pb-4">
          <h3
            className="text-lg font-medium leading-6 text-gray-900 mb-4"
            id="modal-title"
          >
            Cancel Appointment
          </h3>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-gray-900">
              Are you sure you want to cancel this appointment:{" "}
              {appointmentDetails && (
                <p className="text-sm font-semibold text-gray-700">
                  {appointmentDetails}
                </p>
              )}
            </p>
          </div>
        </div>
        <div className="px-6 py-4 sm:flex sm:flex-row-reverse sm:px-6">
          <form onSubmit={handleSubmit} className="sm:ml-3 sm:w-auto">
            <input type="hidden" name="id" value={id} />
            <CancelButton />
          </form>
          <button
            type="button"
            className="mt-3 w-full sm:mt-0 sm:w-auto inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            onClick={closeModal}
          >
            Keep Appointment
          </button>
        </div>
      </Modal>

      {state?.message && (
        <p
          aria-live="polite"
          className={`mt-2 text-sm ${
            state.status === "error" ? "text-red-500" : "text-green-500"
          }`}
        >
          {state.message}
        </p>
      )}
    </>
  );
}
