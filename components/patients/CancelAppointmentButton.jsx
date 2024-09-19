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
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

export function CancelAppointmentForm({ id, appointmentDetails }) {
  const [state, formAction] = useFormState(cancelAppointment, initialState);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <button onClick={openModal} className="btn-small-delete">
        Cancel Appointment
      </button>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
          <h3
            className="text-lg font-medium leading-6 text-gray-900"
            id="modal-title"
          >
            Cancel Appointment
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              Are you sure you want to cancel this appointment? This action
              cannot be undone.
            </p>
            {appointmentDetails && (
              <p className="mt-2 text-sm text-gray-700">
                Appointment Details: {appointmentDetails}
              </p>
            )}
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={id} />
            <CancelButton />
          </form>
          <button
            type="button"
            className=" inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

// "use client";

// import { useFormStatus } from "react-dom";
// import { useFormState } from "react-dom";
// import { cancelAppointment } from "@/app/_actions";

// const initialState = {
//   message: "",
// };

// function CancelAppointmentButton() {
//   const { pending } = useFormStatus();

//   return (
//     <button type="submit" disabled={pending} className="btn-small-delete">
//       {pending ? "Cancelling..." : "Cancel appointment"}
//     </button>
//   );
// }

// export function CancelAppointmentForm({ id }) {
//   const [state, formAction] = useFormState(cancelAppointment, initialState);

//   return (
//     <form action={formAction}>
//       <input type="hidden" name="id" value={id} />
//       <CancelAppointmentButton />
//       {state?.message && (
//         <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
//           {state?.message}
//         </p>
//       )}
//     </form>
//   );
// }
