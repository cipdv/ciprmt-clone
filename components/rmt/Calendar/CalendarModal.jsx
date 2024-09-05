import React from "react";

const Modal = ({
  visible,
  onClose,
  blockStartTime,
  setBlockStartTime,
  blockEndTime,
  setBlockEndTime,
  appointmentStartTime,
  setAppointmentStartTime,
  appointmentEndTime,
  setAppointmentEndTime,
  clientName,
  setClientName,
  activeForm,
  setActiveForm,
}) => {
  if (!visible) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        {/* Modal form content goes here */}
        {/* Example form fields */}
        <input
          type="text"
          value={blockStartTime}
          onChange={(e) => setBlockStartTime(e.target.value)}
          placeholder="Block Start Time"
        />
        <input
          type="text"
          value={blockEndTime}
          onChange={(e) => setBlockEndTime(e.target.value)}
          placeholder="Block End Time"
        />
        <input
          type="text"
          value={appointmentStartTime}
          onChange={(e) => setAppointmentStartTime(e.target.value)}
          placeholder="Appointment Start Time"
        />
        <input
          type="text"
          value={appointmentEndTime}
          onChange={(e) => setAppointmentEndTime(e.target.value)}
          placeholder="Appointment End Time"
        />
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Client Name"
        />
        {/* Add more form fields as needed */}
      </div>
    </div>
  );
};

export default Modal;
