import { MAX_PDF_BYTES } from "../limits.js";

// The file goes up as base64 inside a JSON body — no multipart, no temp files
// on disk, nothing to clean up afterwards.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    // readAsDataURL gives "data:application/pdf;base64,JVBER..." — drop the head.
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
}

// Catch the obvious problems in the browser, so the user hears about them
// immediately instead of after a round trip.
// A 37 KB contract reading "0.0 MB" looks broken. Show the unit that fits.
export function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function checkFile(file) {
  if (!file) return "Pick a contract first.";
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    return "Redline reads PDFs. Export the contract as a PDF and try again.";
  }
  if (file.size > MAX_PDF_BYTES) {
    return `That file is ${formatSize(file.size)} — the limit is ${
      MAX_PDF_BYTES / 1024 / 1024
    } MB.`;
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}
