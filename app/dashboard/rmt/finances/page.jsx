import AddExpense from "@/components/rmt/AddExpense";
import IncomeTracker from "@/components/rmt/IncomeTracker";
import React from "react";

const financesPage = () => {
  return (
    <section className="max-w-4xl mx-auto">
      <IncomeTracker />
      <AddExpense />
    </section>
  );
};

export default financesPage;
