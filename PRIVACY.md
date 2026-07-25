# Privacy

Redline is built to hold as little of your data as possible, for as short a
time as possible. This document explains, in plain terms, what happens to what
you put in — written to line up with UK GDPR / EU GDPR expectations.

## The short version

- Your contract PDF is sent to Google to be read, held in memory for one
  request, and never stored, written to disk, or logged by Redline.
- Everything else — your profile, your past reports — lives only in your own
  browser. There is no account, no database, no server-side copy.
- One button erases all of it, and it actually does.

## What data is involved, and why

| Data | Where it goes | Why | Kept for |
|---|---|---|---|
| The contract PDF | Sent to Google's Gemini API to be read; held in server memory for the duration of one request | It's the document being analysed | Not stored — discarded when the request ends |
| Your profile (role, skills, achievements, salary targets, notes) | Stored in your browser's `localStorage`; sent to Gemini as part of an analysis so asks can cite your experience | To ground the negotiation advice in your own record | Until you edit or erase it; never leaves your browser except within a request you trigger |
| Past reports | Stored in your browser's `localStorage` | So you can reopen and compare them | Until you delete them |
| Consent flag, theme choice | Stored in your browser's `localStorage` | To remember you've read the notice and your light/dark preference | Until you erase everything |

Redline keeps **no server-side record** of any of this. There is no database,
no analytics, no tracking, no cookies.

## Data minimisation

Before your profile is sent for an analysis, Redline strips the things the
analysis never needs: email addresses, phone numbers, postcodes, National
Insurance numbers, long account/card numbers and URLs. It does **not** claim to
remove names, because that can't be done reliably — see the redaction note in
the code. The contract itself is sent as-is, because it is the thing being read.

## The third-party processor, and international transfer

Redline uses **Google's Gemini API** as its sole processor — it is what reads
the contract and drafts the report. Your contract, and your (redacted) profile,
are sent to Google for that purpose. Google may process this data on servers
outside the UK/EEA. This is disclosed in the app **before your first upload**,
not buried afterwards, so the choice to proceed is an informed one. Google's
handling of API data is governed by their own terms; Redline sends only what a
single analysis needs and retains nothing.

## Lawful basis

Processing happens only on your explicit action — you choose to upload a
document and are shown what that entails first. The basis is your **consent**,
which you give by acknowledging the pre-upload notice and can withdraw at any
time by choosing "erase everything" (which also clears the consent record) and
not uploading again.

## Your rights

Because everything Redline holds about you lives in your own browser:

- **Access / portability** — it's all in front of you; any report exports to CSV
  or PDF.
- **Rectification** — every profile field is editable by hand.
- **Erasure** — "erase everything" wipes your profile, history and consent from
  the browser immediately. There is nothing held elsewhere to request deletion
  of.

For data sent to Google to be processed, Google is the relevant party for any
rights relating to their retention; Redline itself keeps no copy to act on.

## Not legal advice

Redline is an information tool, not a solicitor, and its reports are not legal
advice. This privacy note describes how the software handles data; it is not a
substitute for professional advice on your contract or your data-protection
obligations if you deploy it.
