import Calendar from "@/components/rmt/Calendar/Calendar";
import NotesToComplete from "@/components/rmt/NotesToComplete";
import SearchBar from "@/components/rmt/SearchBar";
import SetUpForm2 from "@/components/rmt/SetUp/SetUpForm2";
import React from "react";

const rmtDashboardPage = async () => {
  return (
    <section>
      <SetUpForm2 />
      {/* <SearchBar />
      <NotesToComplete />

      <Calendar /> */}
    </section>
  );
};

export default rmtDashboardPage;
