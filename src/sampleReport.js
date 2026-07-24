// A realistic report in the shape CONTRACT.md agreed, used to build the UI
// before any AI existed and to power the "see an example" button afterwards.
export const SAMPLE_REPORT = {
  document: {
    title: "Contract of Employment — Senior Customer Support Engineer",
    employer: "Northbank Software Ltd",
    role: "Senior Customer Support Engineer",
    contract_type: "permanent",
    jurisdiction: "England & Wales",
    read_confidence: "high",
  },
  summary:
    "A standard permanent contract at £52,000 with 25 days' holiday and a six-month probation. The pay sits below what your track record supports and the notice period is asymmetric — three months from you, one month from them. A twelve-month non-compete covering the whole UK is the one term here that deserves a proper look before you sign.",
  key_terms: [
    {
      label: "Base salary",
      value: "£52,000 per year, paid monthly",
      verbatim:
        "The Employee shall be paid a basic salary of £52,000 per annum, payable monthly in arrears on the last working day of each month.",
      assessment: "watch",
      note: "Six thousand under your target, and no annual review date is named anywhere in the document.",
    },
    {
      label: "Notice period",
      value: "3 months from you, 1 month from them",
      verbatim:
        "The Employee shall give not less than three (3) months' written notice. The Company shall give not less than one (1) month's written notice.",
      assessment: "red_flag",
      note: "Asymmetric notice locks you in for three times as long as it locks them.",
    },
    {
      label: "Restrictive covenants",
      value: "12-month non-compete, United Kingdom",
      verbatim:
        "For a period of twelve (12) months following termination the Employee shall not be engaged in any business competing with the Company within the United Kingdom.",
      assessment: "red_flag",
      note: "Twelve months across an entire country is broad for a support engineering role.",
    },
    {
      label: "Holiday",
      value: "25 days plus bank holidays",
      verbatim:
        "The Employee is entitled to 25 days' paid holiday per holiday year in addition to the usual public holidays in England and Wales.",
      assessment: "standard",
      note: "Ordinary for the sector and comfortably above the statutory minimum.",
    },
    {
      label: "Probation",
      value: "6 months, 1 week's notice during",
      verbatim:
        "The first six (6) months of employment shall be a probationary period during which either party may terminate on one week's notice.",
      assessment: "watch",
      note: "Six months is at the long end; three is more common for a senior hire.",
    },
    {
      label: "Place of work",
      value: "Manchester office, hybrid not specified",
      verbatim:
        "The Employee's normal place of work shall be the Company's offices at 14 Wharf Street, Manchester.",
      assessment: "watch",
      note: "Your two-days-at-home requirement has no basis in the contract as written.",
    },
    {
      label: "Working hours",
      value: "37.5 hours, plus reasonable additional hours",
      verbatim:
        "Normal working hours are 9:00am to 5:30pm Monday to Friday, together with such additional hours as may be reasonably necessary.",
      assessment: "standard",
      note: "The additional-hours clause is boilerplate, but it is unpaid and uncapped.",
    },
    {
      label: "On-call",
      value: "Not mentioned",
      verbatim: "not in the contract",
      assessment: "watch",
      note: "The job advert mentioned a weekend rota; the contract is silent, which cuts both ways.",
    },
    {
      label: "Intellectual property",
      value: "All work product assigned to the employer",
      verbatim:
        "All intellectual property created by the Employee in the course of employment shall vest absolutely in the Company.",
      assessment: "standard",
      note: "Normal wording, and it is limited to work created in the course of employment.",
    },
    {
      label: "Bonus",
      value: "Discretionary, up to 10%",
      verbatim:
        "The Employee may be eligible for a discretionary annual bonus of up to 10% of basic salary.",
      assessment: "watch",
      note: "\"Discretionary\" and \"may be eligible\" together mean this is not money you can count on.",
    },
    {
      label: "Sick pay",
      value: "Statutory only after probation",
      verbatim:
        "Save for statutory sick pay, the Company operates no contractual sick pay scheme.",
      assessment: "watch",
      note: "No company sick pay at all is meaner than the market average for a senior role.",
    },
    {
      label: "Pension",
      value: "Auto-enrolment, 3% employer",
      verbatim:
        "The Company will comply with its auto-enrolment obligations and contribute 3% of qualifying earnings.",
      assessment: "standard",
      note: "The legal minimum, matched exactly and not a penny more.",
    },
  ],
  fit: {
    score: 81,
    verdict: "strong",
    rationale:
      "You clear the bar this role sets on experience and on the tooling it names, and your escalation record is the strongest single card you hold going into the conversation.",
    matches: [
      "Six years of support engineering against the five the role asks for.",
      "Zendesk administration is named in clause 3.1 and you have run it at team scale.",
      "Cutting first-response time from 14h to 3h is a directly comparable result.",
    ],
    gaps: [
      "The contract mentions supporting a billing stack you have not named in your profile.",
      "No formal team-lead title, though the achievements read as lead work.",
    ],
  },
  overall: {
    fairness_score: 58,
    recommendation: "negotiate_then_sign",
    recommendation_reason:
      "Nothing here is a reason to walk away, but four terms sit below what your experience supports and two of them cost you nothing to raise. This is a contract worth signing after a conversation, not before one.",
  },
  asks: [
    {
      rank: 1,
      title: "Move base salary to £58,000",
      clause:
        "The Employee shall be paid a basic salary of £52,000 per annum, payable monthly in arrears on the last working day of each month.",
      why: "£52,000 is six thousand under your target and below the range for six years of senior support engineering in Manchester.",
      leverage:
        "You cut first-response time from 14 hours to 3 across a nine-person team — a number you can put in the email, and the exact problem this role exists to solve.",
      likelihood: 55,
      impact: 5,
      priority: "must",
      should_ask: true,
      suggested_wording:
        "I'm keen to accept. Before I do — given I'll be coming in with six years and a track record of taking first-response time from 14 hours to 3, could we look at £58,000? I'd sign same day at that number.",
    },
    {
      rank: 2,
      title: "Make the notice period symmetrical at one month each way",
      clause:
        "The Employee shall give not less than three (3) months' written notice. The Company shall give not less than one (1) month's written notice.",
      why: "As written you owe them three months while they owe you one. That is a real cost to you if you ever want to move, and no cost to them.",
      leverage:
        "This is a fairness point rather than a value one, which makes it cheap for them to concede and awkward for them to defend.",
      likelihood: 70,
      impact: 4,
      priority: "must",
      should_ask: true,
      suggested_wording:
        "One small thing on clause 11 — the notice period is three months from me and one from you. Could we make it even at one month each way, or two each way if you'd prefer the longer runway?",
    },
    {
      rank: 3,
      title: "Cut the non-compete to six months and narrow it to direct competitors",
      clause:
        "For a period of twelve (12) months following termination the Employee shall not be engaged in any business competing with the Company within the United Kingdom.",
      why: "Twelve months across the whole UK would sit between you and most of your next roles, in the one field you have spent six years building.",
      leverage:
        "Covenants this broad are routinely narrowed at offer stage, and asking shows you read the document rather than that you plan to leave.",
      likelihood: 45,
      impact: 5,
      priority: "must",
      should_ask: true,
      suggested_wording:
        "Clause 14 runs twelve months UK-wide, which is broader than I've seen for this kind of role. Would you be open to six months, limited to named direct competitors?",
    },
    {
      rank: 4,
      title: "Write the two-days-at-home arrangement into the contract",
      clause:
        "The Employee's normal place of work shall be the Company's offices at 14 Wharf Street, Manchester.",
      why: "Hybrid working was discussed but the contract names an office and nothing else. A verbal arrangement disappears the moment the manager who agreed it does.",
      leverage:
        "You listed two days at home as a must-have, and the ask costs the employer nothing they have not already agreed to in conversation.",
      likelihood: 75,
      impact: 4,
      priority: "should",
      should_ask: true,
      suggested_wording:
        "We talked about two days a week from home — the contract only names the Manchester office. Could that be added to clause 5 so it's written down?",
    },
    {
      rank: 5,
      title: "Shorten probation from six months to three",
      clause:
        "The first six (6) months of employment shall be a probationary period during which either party may terminate on one week's notice.",
      why: "Six months on one week's notice is a long stretch of insecurity for a senior hire.",
      leverage:
        "Your references and your measured results give them plenty to judge you on well inside three months.",
      likelihood: 50,
      impact: 3,
      priority: "should",
      should_ask: true,
      suggested_wording:
        "Would you consider a three-month probation rather than six? Happy to keep the review structure exactly as it is.",
    },
    {
      rank: 6,
      title: "Add contractual sick pay",
      clause:
        "Save for statutory sick pay, the Company operates no contractual sick pay scheme.",
      why: "Statutory sick pay is £118.75 a week. On a £58,000 salary that is a serious drop if you are ever ill for more than a few days.",
      leverage:
        "Little in your profile bears on this one, and it usually needs a policy change rather than a signature.",
      likelihood: 20,
      impact: 3,
      priority: "nice",
      should_ask: false,
      suggested_wording:
        "Worth raising only if salary and the covenant both land where you want them — spend the goodwill on those first.",
    },
  ],
  flags: [
    {
      severity: "high",
      title: "Twelve-month non-compete covering the whole United Kingdom",
      clause:
        "For a period of twelve (12) months following termination the Employee shall not be engaged in any business competing with the Company within the United Kingdom.",
      why: "Both the length and the geography are wide for this kind of role. Courts will only enforce what is reasonable to protect a genuine business interest, but that is argued after the fact and at your expense — far better to narrow it now.",
    },
    {
      severity: "medium",
      title: "Notice runs three months from you and one from them",
      clause:
        "The Employee shall give not less than three (3) months' written notice. The Company shall give not less than one (1) month's written notice.",
      why: "Asymmetric notice is legal but one-sided, and it is the single easiest term on this list to get changed.",
    },
    {
      severity: "medium",
      title: "Uncapped unpaid additional hours",
      clause:
        "Normal working hours are 9:00am to 5:30pm Monday to Friday, together with such additional hours as may be reasonably necessary.",
      why: "\"Reasonably necessary\" is undefined and unpaid. Combined with a support rota that the contract never mentions, it leaves your actual working week open-ended.",
    },
    {
      severity: "low",
      title: "Bonus is discretionary and unquantified in practice",
      clause:
        "The Employee may be eligible for a discretionary annual bonus of up to 10% of basic salary.",
      why: "No criteria, no floor, no obligation to pay. Treat the base salary as the whole offer when you are deciding.",
    },
  ],
  missing: [
    "No on-call or weekend rota terms, despite the advert describing one.",
    "No salary review date or mechanism.",
    "No redundancy terms beyond the statutory minimum.",
    "No mention of training budget or professional development.",
    "No garden leave clause, which usually sits alongside a covenant this broad.",
  ],
};
