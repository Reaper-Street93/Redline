import { useRef, useState } from "react";
import { fileToBase64, checkFile } from "./pdf.js";
import { EMPTY_PROFILE } from "./profile.js";
import { Label, micro } from "./ui.jsx";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <Label className="inline">{label}</Label>
      {hint && <span className="ml-2 text-xs text-ink/35">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-redline";

// Skills and must-haves are short and plural — chips beat a comma-soup
// textarea, and Enter or comma both commit.
function TagInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim().replace(/,$/, "");
    if (tag && !values.includes(tag)) onChange([...values, tag]);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap gap-1.5 border border-rule p-2 focus-within:border-redline">
      {values.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1.5 border border-rule px-2 py-0.5 text-xs"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(values.filter((t) => t !== tag))}
            className="text-ink/35 hover:text-redline"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={values.length ? "" : placeholder}
        className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

export default function ProfileSheet({ profile, onSave, onClear, onClose }) {
  const [draft, setDraft] = useState(profile ?? EMPTY_PROFILE);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  async function readCv(file) {
    const problem = checkFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setReading(true);
    setError(null);
    try {
      const pdf = await fileToBase64(file);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Couldn't read that CV.");
      }
      // Anything already typed by hand wins over anything the model inferred.
      setDraft((d) => ({
        ...data.profile,
        current_salary: d.current_salary || data.profile.current_salary,
        target_salary: d.target_salary || data.profile.target_salary,
        must_haves: d.must_haves?.length ? d.must_haves : data.profile.must_haves,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-rule bg-stock">
        <header className="sticky top-0 flex items-baseline justify-between border-b border-rule bg-stock px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl">Your side of the table</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink/50">
              What Redline weighs the contract against. Stays in this browser.
            </p>
          </div>
          <button
            onClick={onClose}
            className={`${micro} text-ink/45 hover:text-redline`}
          >
            close
          </button>
        </header>

        <div className="grid gap-5 px-6 py-6">
          {/* CV import */}
          <div className="border border-dashed border-rule p-4 text-center">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={reading}
              className="font-mono text-xs uppercase tracking-[0.18em] text-ink/70 underline-offset-4 hover:text-redline hover:underline disabled:text-ink/30"
            >
              {reading ? "reading your CV…" : "fill this in from my CV"}
            </button>
            <p className="mt-1.5 text-xs text-ink/40">
              PDF. Every field stays editable afterwards.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => readCv(e.target.files?.[0])}
            />
          </div>

          {error && (
            <p className="border-l-2 border-redline bg-redline/[0.05] px-3 py-2 text-sm">
              {error}
            </p>
          )}

          <Field label="Current role">
            <input
              className={inputClass}
              value={draft.current_role}
              onChange={(e) => set("current_role")(e.target.value)}
              placeholder="Senior Customer Support Engineer"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Years">
              <input
                type="number"
                min="0"
                max="60"
                className={inputClass}
                value={draft.years_experience}
                onChange={(e) =>
                  set("years_experience")(Number(e.target.value) || 0)
                }
              />
            </Field>
            <Field label="Now on">
              <input
                className={inputClass}
                value={draft.current_salary}
                onChange={(e) => set("current_salary")(e.target.value)}
                placeholder="£46,000"
              />
            </Field>
            <Field label="Aiming for">
              <input
                className={inputClass}
                value={draft.target_salary}
                onChange={(e) => set("target_salary")(e.target.value)}
                placeholder="£58,000"
              />
            </Field>
          </div>

          <Field label="Skills" hint="Enter to add">
            <TagInput
              values={draft.skills}
              onChange={set("skills")}
              placeholder="Zendesk administration, SQL…"
            />
          </Field>

          <Field label="Achievements" hint="one per line — numbers win arguments">
            <textarea
              rows={5}
              className={`${inputClass} resize-y leading-relaxed`}
              value={draft.achievements.join("\n")}
              onChange={(e) =>
                set("achievements")(
                  e.target.value.split("\n").filter((line) => line.trim())
                )
              }
              placeholder="Cut first-response time from 14h to 3h across a nine-person team"
            />
          </Field>

          <Field label="Must-haves" hint="what you won't sign without">
            <TagInput
              values={draft.must_haves}
              onChange={set("must_haves")}
              placeholder="Two days at home, no on-call…"
            />
          </Field>

          <Field label="Anything else">
            <textarea
              rows={3}
              className={`${inputClass} resize-y leading-relaxed`}
              value={draft.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Context a CV doesn't capture — a relocation, a notice period you're stuck in, a competing offer."
            />
          </Field>
        </div>

        <footer className="sticky bottom-0 mt-auto flex items-center justify-between border-t border-rule bg-stock px-6 py-4">
          <button
            onClick={onClear}
            className={`${micro} text-ink/40 hover:text-redline`}
          >
            forget me
          </button>
          <button
            onClick={() => onSave(draft)}
            className="border-2 border-ink px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] hover:bg-ink hover:text-stock"
          >
            Save profile
          </button>
        </footer>
      </aside>
    </div>
  );
}
