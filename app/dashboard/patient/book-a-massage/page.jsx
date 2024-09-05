import BookMassageForm from "@/components/patients/BookMassageForm";
import React from "react";
import {
  getSession,
  getRMTSetup,
  getAvailableAppointments,
} from "@/app/_actions";

const page = async () => {
  const currentUser = await getSession();

  const rmtSetup = await getRMTSetup(currentUser.resultObj.rmtId);

  // Ensure rmtSetup is a plain object
  const plainRmtSetup = JSON.parse(JSON.stringify(rmtSetup));

  return (
    <section>
      <BookMassageForm rmtSetup={plainRmtSetup} />
    </section>
  );
};

export default page;
