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

  console.log(rmtSetup);

  // Ensure rmtSetup is a plain object
  const plainRmtSetup = JSON.parse(JSON.stringify(rmtSetup));

  return (
    <section>
      <BookMassageForm rmtSetup={plainRmtSetup} user={currentUser} />
    </section>
  );
};

export default page;
