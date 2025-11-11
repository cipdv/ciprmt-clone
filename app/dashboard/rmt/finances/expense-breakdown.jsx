export function ExpenseBreakdown({ expensesData }) {
  const formatCurrency = (value) => {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Group expenses by category and subcategory
  const categoryTotals = {};
  let grandTotal = 0;
  let grandTotalHST = 0;

  expensesData.forEach((expense) => {
    const category = expense.category;
    const subcategory = expense.subcategory || "General";
    const amount = Number(expense.amount) || 0;
    const hst = Number(expense.hst) || 0;

    if (!categoryTotals[category]) {
      categoryTotals[category] = {
        total: 0,
        totalHST: 0,
        subcategories: {},
      };
    }

    if (!categoryTotals[category].subcategories[subcategory]) {
      categoryTotals[category].subcategories[subcategory] = {
        total: 0,
        totalHST: 0,
      };
    }

    categoryTotals[category].subcategories[subcategory].total += amount;
    categoryTotals[category].subcategories[subcategory].totalHST += hst;
    categoryTotals[category].total += amount;
    categoryTotals[category].totalHST += hst;

    grandTotal += amount;
    grandTotalHST += hst;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold">
          Expense Breakdown by Category
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Total expenses grouped by category and subcategory
        </p>
      </div>
      <div className="p-6">
        {Object.keys(categoryTotals).length === 0 ? (
          <p className="text-gray-600 text-center py-8">No expenses found</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(categoryTotals)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, data]) => (
                <div
                  key={category}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg">{category}</h3>
                      <div className="flex gap-6">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Amount</div>
                          <div className="font-semibold">
                            {formatCurrency(data.total)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">HST</div>
                          <div className="font-semibold">
                            {formatCurrency(data.totalHST)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="font-semibold">
                            {formatCurrency(data.total + data.totalHST)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {Object.keys(data.subcategories).length > 1 ||
                  (Object.keys(data.subcategories).length === 1 &&
                    !Object.keys(data.subcategories).includes("General")) ? (
                    <div className="divide-y divide-gray-200">
                      {Object.entries(data.subcategories)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([subcategory, subData]) => (
                          <div
                            key={subcategory}
                            className="px-4 py-3 bg-white hover:bg-gray-50"
                          >
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-gray-700 pl-4">
                                {subcategory}
                              </div>
                              <div className="flex gap-6 text-sm">
                                <div className="text-right w-24">
                                  {formatCurrency(subData.total)}
                                </div>
                                <div className="text-right w-24">
                                  {formatCurrency(subData.totalHST)}
                                </div>
                                <div className="text-right w-24">
                                  {formatCurrency(
                                    subData.total + subData.totalHST
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))}

            <div className="rounded-md border-2 border-gray-300 bg-gray-50 p-6 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Total Expenses</h3>
                <div className="flex gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Amount</div>
                    <div className="text-xl font-semibold">
                      {formatCurrency(grandTotal)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">HST</div>
                    <div className="text-xl font-semibold">
                      {formatCurrency(grandTotalHST)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Total</div>
                    <div className="text-xl font-semibold">
                      {formatCurrency(grandTotal + grandTotalHST)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
