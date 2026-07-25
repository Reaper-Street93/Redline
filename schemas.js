// The output shapes agreed in CONTRACT.md, expressed as JSON Schema so the
// model's replies are guaranteed to parse. Kept apart from the server because
// they are the product's contract, not its plumbing: changing anything here
// changes what the UI can render, and should mean editing CONTRACT.md too.

export const REPORT_SCHEMA = {
  type: "object",
  properties: {
    document: {
      type: "object",
      properties: {
        title: { type: "string", description: "The document's own title, or one inferred from it." },
        employer: { type: "string", description: "The party offering the work. 'not stated' if absent." },
        role: { type: "string", description: "Job title exactly as written." },
        contract_type: {
          type: "string",
          enum: ["permanent", "fixed_term", "contractor", "zero_hours", "internship", "other"],
        },
        jurisdiction: {
          type: "string",
          description: "Governing law as stated, e.g. 'England & Wales'. 'not stated' if absent.",
        },
        read_confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "How well you could actually read the PDF. 'low' for poor scans or photographs.",
        },
      },
      required: ["title", "employer", "role", "contract_type", "jurisdiction", "read_confidence"],
      additionalProperties: false,
    },
    summary: {
      type: "string",
      description: "2-4 sentences in plain English telling the reader what they would be signing.",
    },
    key_terms: {
      type: "array",
      description:
        "6 to 12 terms. Cover at least: pay, hours, holiday, notice, probation, place of work, termination, restrictive covenants, IP, pension, sick pay, bonus.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Short, e.g. 'Notice period'." },
          value: { type: "string", description: "The answer in one line, e.g. '3 months either way'." },
          theme: {
            type: "string",
            enum: ["pay", "time", "leaving", "working", "other"],
            description:
              "Which part of working life this term belongs to. pay: salary, bonus, pension, sick pay. time: hours, holiday, probation. leaving: notice, termination, restrictive covenants. working: place of work, on-call, IP, confidentiality. other: anything that fits none of these.",
          },
          verbatim: {
            type: "string",
            description:
              "Quoted word-for-word from the contract. Never paraphrased, never invented. Use 'not in the contract' if the term is absent.",
          },
          assessment: { type: "string", enum: ["favourable", "standard", "watch", "red_flag"] },
          note: { type: "string", description: "One sentence on why it earned that assessment." },
        },
        required: ["label", "value", "verbatim", "assessment", "note"],
        additionalProperties: false,
      },
    },
    fit: {
      type: "object",
      properties: {
        score: { type: "integer", description: "0-100. How well the reader's profile matches this role." },
        verdict: { type: "string", enum: ["strong", "good", "stretch", "mismatch"] },
        rationale: { type: "string", description: "One or two sentences." },
        matches: {
          type: "array",
          description: "2-5 places the reader's experience meets or beats what the role asks for.",
          items: { type: "string" },
        },
        experience_gaps: {
          type: "array",
          description:
            "0-5 things THIS ROLE REQUIRES THAT THE READER'S CV DOES NOT EVIDENCE. Every entry must name a duty, system or seniority marker from the contract and say the reader has not shown it. Never mention salary, notice, covenants, hours or location here — those are properties of the offer, not of the reader. Empty array if their CV covers everything the role asks for.",
          items: { type: "string" },
        },
      },
      required: ["score", "verdict", "rationale", "matches", "experience_gaps"],
      additionalProperties: false,
    },
    overall: {
      type: "object",
      properties: {
        fairness_score: {
          type: "integer",
          description: "0-100. How these terms sit against ordinary practice for this kind of role.",
        },
        recommendation: {
          type: "string",
          enum: ["sign", "negotiate_then_sign", "push_back_hard", "walk_away"],
        },
        recommendation_reason: { type: "string", description: "Two or three sentences." },
      },
      required: ["fairness_score", "recommendation", "recommendation_reason"],
      additionalProperties: false,
    },
    asks: {
      type: "array",
      description: "3 to 7 negotiation points, ranked by what is worth spending capital on. Rank 1 first.",
      items: {
        type: "object",
        properties: {
          rank: { type: "integer", description: "1 = ask for this first." },
          title: {
            type: "string",
            description:
              "The ask itself, specific and numeric where possible, e.g. 'Move base salary to £58,000'. Sentence case, not Title Case.",
          },
          clause: {
            type: "string",
            description:
              "The verbatim clause this ask attaches to, or exactly 'not in the contract' if it adds something absent.",
          },
          why: { type: "string", description: "Why it matters to this reader specifically." },
          leverage: {
            type: "string",
            description:
              "The thing in the reader's own history they can point at to win it. Cite something real from their profile.",
          },
          likelihood: { type: "integer", description: "0-100. Odds an employer says yes to this ask." },
          impact: { type: "integer", description: "1-5. How much the reader's working life improves if they do." },
          priority: {
            type: "string",
            enum: ["must", "should", "nice"],
            description:
              "Must agree with impact: impact 5 is 'must', impact 4 is 'must' or 'should', impact 1-2 is never above 'nice'.",
          },
          should_ask: {
            type: "boolean",
            description:
              "False when the ask is real but not worth the goodwill it costs. Explain that in suggested_wording.",
          },
          suggested_wording: {
            type: "string",
            description: "One or two sentences, ready to send, polite and specific.",
          },
        },
        required: [
          "rank", "title", "clause", "why", "leverage",
          "likelihood", "impact", "priority", "should_ask", "suggested_wording",
        ],
        additionalProperties: false,
      },
    },
    flags: {
      type: "array",
      description: "0 to 6 unusual or onerous terms worth a closer look.",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          clause: { type: "string", description: "Verbatim from the contract." },
          why: { type: "string", description: "Plain English: what this would do to the reader." },
        },
        required: ["severity", "title", "clause", "why"],
        additionalProperties: false,
      },
    },
    missing: {
      type: "array",
      description:
        "0 to 6 terms you would expect in a contract of this type but which are not present at all.",
      items: { type: "string" },
    },
  },
  required: ["document", "summary", "key_terms", "fit", "overall", "asks", "flags", "missing"],
  additionalProperties: false,
};

export const PROFILE_SCHEMA = {
  type: "object",
  properties: {
    current_role: { type: "string", description: "Their most recent job title." },
    years_experience: {
      type: "integer",
      description: "Total relevant years of experience, rounded. 0 if it cannot be worked out.",
    },
    skills: {
      type: "array",
      description: "5-12 concrete skills, tools or systems named in the CV. No soft-skill filler.",
      items: { type: "string" },
    },
    achievements: {
      type: "array",
      description:
        "3-6 achievements, quoted or tightened from the CV. Prefer ones carrying a number — those are the negotiating cards.",
      items: { type: "string" },
    },
    current_salary: { type: "string", description: "Only if the CV states it. Otherwise empty string." },
    target_salary: { type: "string", description: "Only if the CV states it. Otherwise empty string." },
    must_haves: {
      type: "array",
      description: "0-5 working conditions the CV signals they care about. Empty if it says nothing.",
      items: { type: "string" },
    },
    notes: { type: "string", description: "One or two lines the fields above don't capture. May be empty." },
  },
  required: [
    "current_role", "years_experience", "skills", "achievements",
    "current_salary", "target_salary", "must_haves", "notes",
  ],
  additionalProperties: false,
};
