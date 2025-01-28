import OfficeAuthForm from "@/components/offices/OfficeAuthForm";
import React from "react";

const page = ({ params }) => {
  return (
    <section>
      <OfficeAuthForm officename={params.officename} />
    </section>
  );
};

export default page;
