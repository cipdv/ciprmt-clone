import OfficeAuthForm from "@/components/offices/OfficeAuthForm";
import OfficeMassageForm from "@/components/offices/OfficeMassageForm";
import React from "react";

const page = () => {
  return (
    <div>
      <h2>User not logged in:</h2>
      <OfficeAuthForm />
      <OfficeMassageForm />
    </div>
  );
};

export default page;
