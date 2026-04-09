export const ADDITIONAL_INCOME_SOURCE_DEFAULTS = {
  // Clinic T4A defaults to HST=false because clinics usually invoice clients
  // and remit GST/HST themselves; the contractor reports this for income tax.
  "Clinic T4A": {
    includeInIncomeTax: true,
    includeInHstQuickMethod: false,
    helperText:
      "Included in income tax, but normally excluded from GST/HST quick method because the clinic usually billed the patient and handled HST.",
  },
  "Outside Work": {
    includeInIncomeTax: true,
    includeInHstQuickMethod: false,
  },
  "Other Source": {
    includeInIncomeTax: true,
    includeInHstQuickMethod: false,
  },
  "Tax Credit": {
    includeInIncomeTax: false,
    includeInHstQuickMethod: false,
  },
  "Private Treatment Billed By Me": {
    includeInIncomeTax: true,
    includeInHstQuickMethod: true,
    helperText: "Use this when I billed the client directly and collected HST myself.",
  },
  "Reimbursement / Transfer": {
    includeInIncomeTax: false,
    includeInHstQuickMethod: false,
  },
  "Under-the-table": {
    includeInIncomeTax: false,
    includeInHstQuickMethod: false,
  },
};

export const ADDITIONAL_INCOME_SOURCE_OPTIONS = Object.keys(
  ADDITIONAL_INCOME_SOURCE_DEFAULTS
);
