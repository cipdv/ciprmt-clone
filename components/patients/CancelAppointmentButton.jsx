"use client";

import { useFormStatus } from "react-dom";
import { useFormState } from "react-dom";
import { cancelAppointment } from "@/app/_actions";

const initialState = {
  message: "",
};

function CancelAppointmentButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn-small-delete">
      {pending ? "Cancelling..." : "Cancel appointment"}
    </button>
  );
}

export function CancelAppointmentForm({ id }) {
  const [state, formAction] = useFormState(cancelAppointment, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <CancelAppointmentButton />
      {state.message && (
        <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
          {state.message}
        </p>
      )}
    </form>
  );
}
