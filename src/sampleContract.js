// The contract the example report was written from. It exists so the demo can
// make the app's central promise checkable: every clause Redline quotes should
// be findable, word for word, in the document. If you can't hold the report and
// the paper side by side, you're taking the machine's word for it — which is
// exactly what this tool is meant to stop.
//
// Kept as structured clauses rather than one blob so the viewer can render it
// like a document and highlight the exact clause a quote came from. `npm run
// check` asserts that every quote in sampleReport.js resolves to a clause here.
export const SAMPLE_CONTRACT = {
  title: "Contract of Employment",
  parties: [
    "BETWEEN: Northbank Software Limited (company number 09123456), whose registered office is at 14 Wharf Street, Manchester M1 5AB (“the Company”)",
    "AND: the Employee named in Schedule 1 (“the Employee”)",
  ],
  sections: [
    {
      number: "1",
      heading: "Position",
      clauses: [
        { number: "1.1", text: "The Employee is employed as Senior Customer Support Engineer." },
        { number: "1.2", text: "The Employee shall report to the Head of Customer Operations." },
      ],
    },
    {
      number: "2",
      heading: "Commencement and probation",
      clauses: [
        { number: "2.1", text: "Employment commences on 1 September 2026." },
        {
          number: "2.2",
          text: "The first six (6) months of employment shall be a probationary period during which either party may terminate on one week's notice.",
        },
      ],
    },
    {
      number: "3",
      heading: "Duties",
      clauses: [
        {
          number: "3.1",
          text: "The Employee shall administer the Company's Zendesk instance, manage escalations, and support the Company's SaaS billing platform.",
        },
      ],
    },
    {
      number: "4",
      heading: "Remuneration",
      clauses: [
        {
          number: "4.1",
          text: "The Employee shall be paid a basic salary of £52,000 per annum, payable monthly in arrears on the last working day of each month.",
        },
        {
          number: "4.2",
          text: "The Employee may be eligible for a discretionary annual bonus of up to 10% of basic salary.",
        },
      ],
    },
    {
      number: "5",
      heading: "Place of work",
      clauses: [
        {
          number: "5.1",
          text: "The Employee's normal place of work shall be the Company's offices at 14 Wharf Street, Manchester.",
        },
      ],
    },
    {
      number: "6",
      heading: "Hours of work",
      clauses: [
        {
          number: "6.1",
          text: "Normal working hours are 9:00am to 5:30pm Monday to Friday, together with such additional hours as may be reasonably necessary for the proper performance of the Employee's duties, for which no additional payment shall be made.",
        },
      ],
    },
    {
      number: "7",
      heading: "Holiday",
      clauses: [
        {
          number: "7.1",
          text: "The Employee is entitled to 25 days' paid holiday per holiday year in addition to the usual public holidays in England and Wales.",
        },
      ],
    },
    {
      number: "8",
      heading: "Sickness",
      clauses: [
        {
          number: "8.1",
          text: "Save for statutory sick pay, the Company operates no contractual sick pay scheme.",
        },
      ],
    },
    {
      number: "9",
      heading: "Pension",
      clauses: [
        {
          number: "9.1",
          text: "The Company will comply with its auto-enrolment obligations and contribute 3% of qualifying earnings.",
        },
      ],
    },
    {
      number: "10",
      heading: "Intellectual property",
      clauses: [
        {
          number: "10.1",
          text: "All intellectual property created by the Employee in the course of employment shall vest absolutely in the Company.",
        },
      ],
    },
    {
      number: "11",
      heading: "Notice",
      clauses: [
        { number: "11.1", text: "The Employee shall give not less than three (3) months' written notice." },
        { number: "11.2", text: "The Company shall give not less than one (1) month's written notice." },
      ],
    },
    {
      number: "12",
      heading: "Confidentiality",
      clauses: [
        {
          number: "12.1",
          text: "The Employee shall not at any time disclose Confidential Information belonging to the Company or its customers.",
        },
      ],
    },
    {
      number: "13",
      heading: "Termination",
      clauses: [
        { number: "13.1", text: "The Company may terminate employment immediately for gross misconduct." },
      ],
    },
    {
      number: "14",
      heading: "Restrictive covenants",
      clauses: [
        {
          number: "14.1",
          text: "For a period of twelve (12) months following termination the Employee shall not be engaged in any business competing with the Company within the United Kingdom.",
        },
      ],
    },
    {
      number: "15",
      heading: "Governing law",
      clauses: [
        { number: "15.1", text: "This Agreement is governed by the laws of England and Wales." },
      ],
    },
  ],
};

// Every clause in reading order — what the viewer renders and the matcher walks.
export const SAMPLE_CLAUSES = SAMPLE_CONTRACT.sections.flatMap((section) =>
  section.clauses.map((clause) => ({ ...clause, heading: section.heading }))
);

const normalise = (text) =>
  (text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// A quote can legitimately span two clauses — an asymmetric notice period reads
// as one point but lives in 11.1 and 11.2 — so match sentence by sentence and
// return every clause the quote touches, in document order.
export function findClauses(quote) {
  if (!quote || quote === "not in the contract") return [];

  const sentences = quote
    .split(/(?<=\.)\s+/)
    .map(normalise)
    .filter((s) => s.length > 12);
  const needles = sentences.length ? sentences : [normalise(quote)];

  return SAMPLE_CLAUSES.filter((clause) => {
    const haystack = normalise(clause.text);
    return needles.some((n) => haystack.includes(n) || n.includes(haystack));
  }).map((clause) => clause.number);
}
