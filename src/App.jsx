import { useEffect, useState } from "react";
import ReportView from "./ReportView.jsx";
import UploadScreen from "./UploadScreen.jsx";
import Reading from "./Reading.jsx";
import { SAMPLE_REPORT } from "./sampleReport.js";
import { fileToBase64, checkFile } from "./pdf.js";
import { downloadCsv } from "./csv.js";
import { redactProfile } from "./redact.js";
import ProfileSheet from "./ProfileSheet.jsx";
import HistorySheet from "./HistorySheet.jsx";
import CompareView from "./CompareView.jsx";
import ChatPanel from "./ChatPanel.jsx";
import Notice from "./Notice.jsx";
import { hasConsented, recordConsent, withdrawConsent } from "./consent.js";
import {
  loadHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
} from "./history.js";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  profileIsUseful,
} from "./profile.js";
import { LogoMark, Wordmark } from "./Logo.jsx";
import { micro, microLink } from "./ui.jsx";

export default function App() {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(loadProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Comparing takes two clicks: the first picks a baseline, the second the
  // contract to read against it.
  const [compareBase, setCompareBase] = useState(null);
  const [comparePair, setComparePair] = useState(null);
  // Kept only in memory, only for this session: it lets follow-up questions be
  // answered from the document rather than from the report about it.
  const [pdfB64, setPdfB64] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  // Bumped whenever a different report goes on screen. Without it the expanded
  // terms and asks of the last report stay open on the next one, because React
  // keeps the state of components it considers the same.
  const [reportKey, setReportKey] = useState(0);
  // "gate" blocks the first upload until the notice is read; "open" is the
  // same text reopened voluntarily from the footer.
  const [notice, setNotice] = useState(null);

  const hasProfile = profileIsUseful(profile);

  // index.html sets the class before first paint; this just mirrors it.
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  // Ask the server what mode it's in, so the UI can warn about a missing key
  // up front rather than after someone has picked a file.
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private browsing — the choice just won't persist.
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied");
    } catch {
      setToast("Couldn't copy — select it by hand");
    }
    setTimeout(() => setToast(null), 1600);
  }

  function handleFile(picked) {
    if (!picked) return;
    const problem = checkFile(picked);
    if (problem) {
      setError(problem);
      setFile(null);
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function analyse() {
    const problem = checkFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    // Nothing leaves the browser until the notice has been read once.
    if (!hasConsented()) {
      setNotice("gate");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const pdf = await fileToBase64(file);
      setPdfB64(pdf);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf,
          // Contact details are stripped on the way out — the analysis never
          // needed them.
          profile: hasProfile ? redactProfile(profile) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.report) {
        throw new Error(data.error || "Something went wrong. Try again.");
      }
      showReport(data.report);
      setHistory(addToHistory(data.report, file.name));
    } catch (err) {
      setError(err.message || "Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function showReport(next) {
    setReport(next);
    setReportKey((k) => k + 1);
  }

  function handleCompareClick(entry) {
    if (!compareBase) {
      setCompareBase(entry);
    } else if (compareBase.id === entry.id) {
      setCompareBase(null);
    } else {
      setComparePair([compareBase, entry]);
      setCompareBase(null);
      setHistoryOpen(false);
    }
  }

  function handleDelete(id) {
    setHistory(removeFromHistory(id));
    if (compareBase?.id === id) setCompareBase(null);
    if (comparePair?.some((entry) => entry.id === id)) setComparePair(null);
  }

  // The one button that has to do exactly what it says. Everything Redline has
  // ever kept about this person: profile, history, the consent record, the file
  // they were about to send and the PDF still in memory. The theme survives on
  // purpose — it is a display preference, not something we learned about them.
  function eraseEverything() {
    clearProfile();
    setProfile(null);
    setHistory(clearHistory());
    withdrawConsent();
    setPdfB64(null);
    setReport(null);
    setComparePair(null);
    setCompareBase(null);
    setNotice(null);
    setChatOpen(false);
    setFile(null);
    setError(null);
    setToast("Everything erased");
    setTimeout(() => setToast(null), 1600);
  }

  function reset() {
    setPdfB64(null);
    setChatOpen(false);
    setComparePair(null);
    setCompareBase(null);
    setReport(null);
    setFile(null);
    setError(null);
  }

  return (
    <div className="min-h-dvh">
      {/* Brand bar */}
      <header className="no-print sticky top-0 z-20 border-b border-rule bg-stock/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <button
            onClick={reset}
            className="flex items-center gap-2.5"
            title="Start again"
          >
            <LogoMark />
            <Wordmark />
          </button>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setHistoryOpen(true)}
              className={microLink}
            >
              history{history.length ? ` (${history.length})` : ""}
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              className={`flex items-center gap-2 ${micro} text-ink/50 hover:text-redline`}
            >
              <span
                className={`h-1.5 w-1.5 ${hasProfile ? "bg-good" : "bg-rule"}`}
              />
              {hasProfile ? "your profile" : "add your profile"}
            </button>
            {status?.mock && (
              <span className={`${micro} text-watch`}>
                mock mode
              </span>
            )}
            <button
              onClick={toggleTheme}
              className={microLink}
              title="Switch theme"
            >
              {dark ? "light" : "dark"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {loading && <Reading filename={file?.name} />}

        {!loading && comparePair && (
          <CompareView pair={comparePair} onClose={() => setComparePair(null)} />
        )}

        {!loading && !comparePair && !report && (
          <UploadScreen
            file={file}
            error={error}
            status={status}
            hasProfile={hasProfile}
            onPickFile={handleFile}
            onAnalyse={analyse}
            onOpenProfile={() => setProfileOpen(true)}
            onShowExample={() => showReport(SAMPLE_REPORT)}
          />
        )}

        {!loading && !comparePair && report && (
          <>
            <div className="no-print mx-auto mb-8 flex max-w-3xl items-center justify-between">
              <button
                onClick={reset}
                className={microLink}
              >
                ← another contract
              </button>
              <div className="flex gap-5">
                <button
                  onClick={() => setChatOpen(true)}
                  className={`${micro} text-redline underline-offset-4 hover:underline`}
                >
                  ask about it
                </button>
                <button
                  onClick={() => downloadCsv(report)}
                  className={microLink}
                >
                  csv
                </button>
                <button
                  onClick={() => window.print()}
                  className={microLink}
                >
                  print / pdf
                </button>
              </div>
            </div>
            <ReportView key={reportKey} report={report} onCopyText={copyText} />
          </>
        )}
      </main>

      <footer className="no-print mx-auto max-w-5xl px-5 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <p className="text-xs leading-relaxed text-ink/40">
            Redline reads documents. It is not a solicitor and this is not legal
            advice.
          </p>
          <button
            onClick={() => setNotice("open")}
            className={`${micro} text-ink/45 underline-offset-4 hover:text-redline hover:underline`}
          >
            what this is · privacy · erase everything
          </button>
        </div>
      </footer>

      {notice && (
        <Notice
          mode={notice}
          onAccept={() => {
            recordConsent();
            setNotice(null);
            analyse();
          }}
          onClose={() => setNotice(null)}
          onEraseAll={eraseEverything}
        />
      )}

      {chatOpen && report && (
        <ChatPanel
          report={report}
          profile={hasProfile ? redactProfile(profile) : null}
          pdf={pdfB64}
          onClose={() => setChatOpen(false)}
        />
      )}

      {historyOpen && (
        <HistorySheet
          history={history}
          compareBase={compareBase}
          onOpen={(entry) => {
            setComparePair(null);
            setPdfB64(null);
            showReport(entry.report);
            setHistoryOpen(false);
          }}
          onCompareClick={handleCompareClick}
          onDelete={handleDelete}
          onClearAll={() => {
            setHistory(clearHistory());
            setCompareBase(null);
            setComparePair(null);
          }}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {profileOpen && (
        <ProfileSheet
          profile={profile}
          onSave={(next) => {
            setProfile(saveProfile(next));
            setProfileOpen(false);
            setToast("Profile saved");
            setTimeout(() => setToast(null), 1600);
          }}
          onClear={() => {
            clearProfile();
            setProfile(null);
            setProfileOpen(false);
            setToast("Profile forgotten");
            setTimeout(() => setToast(null), 1600);
          }}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {toast && (
        <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 border border-ink bg-stock px-4 py-2 font-mono text-xs uppercase tracking-[0.18em]">
          {toast}
        </div>
      )}
    </div>
  );
}
