// The profile the example report was written against — the other half of the
// demo's honesty. The contract backs every quoted clause; this backs every
// claim the report makes about the person: six years, Zendesk at team scale,
// first-response time cut from 14h to 3h, two days a week at home.
//
// Deliberately imperfect, because the example is more useful if the fit section
// has something real to bite on: there is no SaaS billing experience here and
// no team-lead title, which is exactly what the report's two experience gaps
// call out. Edit one without the other and `npm run check` fails.
export const SAMPLE_PROFILE = {
  current_role: "Senior Customer Support Engineer",
  years_experience: 6,
  skills: [
    "Zendesk administration",
    "SQL",
    "JavaScript",
    "REST API troubleshooting",
    "Escalation management",
    "Runbook authoring",
    "Jira",
    "Confluence",
  ],
  achievements: [
    "Cut first-response time from 14h to 3h across a nine-person team",
    "Reduced repeat contacts by 22% by rewriting the top 20 help articles",
    "Built the escalation runbook now used across the whole support organisation",
    "Ran the Zendesk instance end to end: triggers, automations, SLA policies, 1,200 macros",
    "Handled 40+ tickets a day across API and authentication issues",
  ],
  current_salary: "£46,000",
  target_salary: "£58,000",
  must_haves: ["Two days a week at home", "No weekend on-call"],
  notes:
    "Six years across three SaaS companies, always customer-facing and always close to engineering. Never held a team-lead title, though the last two years have been lead work in practice.",
};

// How the profile is shown and what a leverage line can point at. The scalar
// fields are listed too, because "you're asking for £58,000" is a claim about
// the profile just as much as an achievement is.
export const PROFILE_ITEMS = [
  { key: "current_role", label: "Current role", text: SAMPLE_PROFILE.current_role },
  { key: "years", label: "Experience", text: `${SAMPLE_PROFILE.years_experience} years` },
  { key: "current_salary", label: "Currently on", text: SAMPLE_PROFILE.current_salary },
  { key: "target_salary", label: "Aiming for", text: SAMPLE_PROFILE.target_salary },
  ...SAMPLE_PROFILE.achievements.map((text, i) => ({
    key: `achievement-${i}`,
    label: "Achievement",
    text,
  })),
  ...SAMPLE_PROFILE.skills.map((text, i) => ({ key: `skill-${i}`, label: "Skill", text })),
  ...SAMPLE_PROFILE.must_haves.map((text, i) => ({
    key: `must-${i}`,
    label: "Must-have",
    text,
  })),
  { key: "notes", label: "Notes", text: SAMPLE_PROFILE.notes },
];

// Words that carry no evidence — matching on these would tie every leverage
// line to every achievement.
const STOPWORDS = new Set(
  `a an and are as at be been but by can for from give giving has have how in into is it its
   more most no not of on one or our out over own so than that the their them then there these
   they this to up was were what when which who will with you your yours across able about
   after all also any because before both did do does each few had he her here him his if just
   like made make many may me might much must never new now off only other own per put same
   should since some such take taken than those through too under until very well were while
   would rather plenty well inside them exact real little`.split(/\s+/)
);

const contentWords = (text) =>
  new Set(
    (text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );

// A leverage line is grounded when it repeats enough of a specific profile item
// to be pointing at it. Three shared content words is the threshold: "two days
// home" ties an ask to a must-have, while a sentence about general market
// practice ties to nothing — which is the answer that matters, because an ask
// resting on nothing in your record is one you should know is doing that.
const MIN_SHARED = 3;

export function findProfileItems(text) {
  if (!text) return [];
  const words = contentWords(text);
  return PROFILE_ITEMS.filter((item) => {
    const itemWords = contentWords(item.text);
    let shared = 0;
    for (const word of itemWords) if (words.has(word)) shared += 1;
    // Short items (a skill, a salary) can never reach three words, so they also
    // count as cited when the leverage repeats all of them.
    return shared >= MIN_SHARED || (itemWords.size > 0 && shared === itemWords.size);
  }).map((item) => item.key);
}
