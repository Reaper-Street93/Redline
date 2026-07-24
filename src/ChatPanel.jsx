import { useEffect, useRef, useState } from "react";
import { micro } from "./ui.jsx";

// Openers that get someone past the blank-box problem. Deliberately the three
// things people actually want: a fact, a judgement, and a draft.
const SUGGESTIONS = [
  "What happens if I want to leave?",
  "Which of these asks should I lead with?",
  "Draft the email asking for the salary increase.",
];

export default function ChatPanel({ report, profile, pdf, onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send(text) {
    const question = text.trim();
    if (!question || thinking) return;

    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setDraft("");
    setThinking(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, report, profile, pdf }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Couldn't answer that. Try again.");
      }
      setMessages([...next, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(err.message);
      // Put the question back so it isn't lost to a network blip.
      setMessages(messages);
      setDraft(question);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-rule bg-stock">
        <header className="flex items-baseline justify-between border-b border-rule px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl">Ask the contract</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink/50">
              {pdf
                ? "Answering from the document itself."
                : "Answering from this report — re-upload the PDF for the full text."}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`${micro} text-ink/45 hover:text-redline`}
          >
            close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {messages.length === 0 && (
            <div className="pt-6">
              <p className="text-sm leading-relaxed text-ink/55">
                Ask anything about {report.document?.employer}&apos;s offer — a
                term you didn&apos;t follow, whether an ask is worth making, or
                the wording for an email.
              </p>
              <div className="mt-5 grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="border border-rule px-3 py-2.5 text-left text-sm hover:border-redline hover:text-redline"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p
                  key={i}
                  className="ml-auto max-w-[85%] border border-rule px-3 py-2 text-sm leading-relaxed"
                >
                  {m.text}
                </p>
              ) : (
                <div key={i} className="redlined">
                  <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                </div>
              )
            )}

            {thinking && (
              <p className={`${micro} text-ink/40`}>
                reading…
              </p>
            )}
            {error && (
              <p className="border-l-2 border-redline bg-redline/[0.05] px-3 py-2 text-sm">
                {error}
              </p>
            )}
          </div>
          <div ref={endRef} />
        </div>

        <footer className="border-t border-rule px-6 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter makes a new line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="Ask about a clause…"
              className="max-h-32 min-h-10 flex-1 resize-none border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-redline"
            />
            <button
              onClick={() => send(draft)}
              disabled={!draft.trim() || thinking}
              className={`border-2 border-ink px-4 py-2 ${micro} hover:bg-ink hover:text-stock disabled:border-ink/20 disabled:text-ink/20 disabled:hover:bg-transparent disabled:hover:text-ink/20`}
            >
              ask
            </button>
          </div>
          <p className="mt-2.5 font-mono text-[0.5625rem] leading-relaxed tracking-[0.06em] text-ink/35">
            Answers describe the document. They are not legal advice.
          </p>
        </footer>
      </aside>
    </div>
  );
}
