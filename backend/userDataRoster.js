// userDataRoster.js
//
// "User Data Management": the admin uploads the official list of students
// and teachers (First Name, Last Name, User ID, Birthday). Registration is
// only allowed for people who appear on that list.
//
// Storage (Firestore):
//   studentRoster/{userId}   teacherRoster/{userId}
//   -> { userId, firstName, lastName, birthday: "YYYY-MM-DD", role,
//        registered, registeredAt?, sourceFileName, createdAt, updatedAt, ... }
//
// Wiring (see server.js):
//   const userDataRoster = createUserDataRoster({ db, FieldValue, requireAuth,
//     findUserProfileByAuthUid, pdfParse: pdf, mammoth });
//   userDataRoster.registerRoutes(app);
//   ...and call verifyRegistration() / markRegistered() from /auth/register.

import { createRequire } from "module";
import multer from "multer";

const require = createRequire(import.meta.url);

// ─── Limits & accepted formats (single source of truth) ─────────────────────
// The admin screen reads these from GET /admin/user-data/config so the client
// and server can never disagree.
export const USER_DATA_MAX_FILE_BYTES = Number(
  process.env.USER_DATA_UPLOAD_MAX_BYTES || 5 * 1024 * 1024 // 5 MB
);
export const USER_DATA_ALLOWED_EXTENSIONS = [
  ".doc",
  ".docx",
  ".pdf",
  ".xls",
  ".xlsx",
  ".csv",
];
const MAX_ROWS_PER_FILE = 5000;
const MAX_ERRORS_RETURNED = 50;
const LIST_LIMIT = 10000;

export const ROSTER_REJECTION_MESSAGE =
  "We couldn't find a matching record for you. Make sure your User ID, first name, last name, and birthday exactly match what the school has on file, or contact your administrator.";

const ROSTERS = {
  students: { role: "student", collection: "studentRoster", accounts: "students", label: "Student" },
  teachers: { role: "teacher", collection: "teacherRoster", accounts: "teachers", label: "Teacher" },
};
const ROSTER_BY_ROLE = {
  student: ROSTERS.students,
  teacher: ROSTERS.teachers,
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function getExtension(fileName) {
  const match = /\.[a-z0-9]+$/i.exec(String(fileName || ""));
  return match ? match[0].toLowerCase() : "";
}

function formatMb(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/** Firestore document ids can't contain "/", be "." / "..", or look like "__x__". */
function isSafeDocId(id) {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= 60 &&
    !id.includes("/") &&
    id !== "." &&
    id !== ".." &&
    !/^__.*__$/.test(id)
  );
}

/** Lower-case, accent-free, letters only — so "Peña" == "pena", "Mary  Ann" == "maryann". */
function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value).replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

// ─── Birthday parsing ───────────────────────────────────────────────────────
// Accepts: Excel serial numbers, YYYY-MM-DD, MM/DD/YYYY (the format the app
// uses), DD/MM/YYYY when the day is obviously > 12, "May 5, 2005",
// "5 May 2005", and YYYYMMDD. Returns "YYYY-MM-DD" or null.

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function toIsoDate(y, m, d) {
  if (![y, m, d].every(Number.isInteger)) return null;
  const currentYear = new Date().getFullYear();
  if (y < 1900 || y > currentYear) return null;
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null; // e.g. Feb 30
  }
  if (probe.getTime() >= Date.now()) return null; // future date
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function expandTwoDigitYear(yy) {
  const currentYY = new Date().getFullYear() % 100;
  return yy > currentYY ? 1900 + yy : 2000 + yy;
}

export function parseBirthday(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return toIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  // Excel stores dates as day counts since 1899-12-30.
  if (typeof value === "number") {
    if (/^\d{8}$/.test(String(value))) return parseBirthday(String(value));
    if (value > 60 && value < 2958466) {
      const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
      return toIsoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
    return null;
  }

  const text = String(value).trim().replace(/\s+/g, " ");
  let m;

  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(text))) {
    return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(text))) {
    return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(text))) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    const year = m[3].length === 2 ? expandTwoDigitYear(Number(m[3])) : Number(m[3]);
    if (a > 12 && b <= 12) [a, b] = [b, a]; // DD/MM/YYYY
    return toIsoDate(year, a, b); // otherwise MM/DD/YYYY
  }

  if ((m = /^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})$/.exec(text))) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    return month ? toIsoDate(Number(m[3]), month, Number(m[2])) : null;
  }

  if ((m = /^(\d{1,2}) ([A-Za-z]{3,9})\.?,? (\d{4})$/.exec(text))) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    return month ? toIsoDate(Number(m[3]), month, Number(m[1])) : null;
  }

  return null;
}

// ─── Turning a file into rows of cells ──────────────────────────────────────
// Every parser produces [{ cells: [...], line, sheet? }]. Word/PDF text
// without real tables goes through linesToRows(), which is best-effort.

const HEADER_ALIASES = {
  firstName: ["firstname", "first", "givenname", "fname"],
  lastName: ["lastname", "last", "surname", "familyname", "lname"],
  userId: ["userid", "id", "idnumber", "idno", "studentid", "teacherid", "employeeid", "facultyid"],
  birthday: ["birthday", "birthdate", "dateofbirth", "dob", "bday", "birth"],
};
const REQUIRED_FIELDS = ["firstName", "lastName", "userId", "birthday"];
// If a file has no header row we assume the documented order.
const DEFAULT_COLUMNS = { firstName: 0, lastName: 1, userId: 2, birthday: 3 };

function detectColumns(cells) {
  const found = {};
  cells.forEach((cell, index) => {
    const key = String(cell ?? "").toLowerCase().replace(/[^a-z]/g, "");
    if (!key) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (!(field in found) && aliases.includes(key)) found[field] = index;
    }
  });
  return REQUIRED_FIELDS.every((f) => f in found) ? found : null;
}

function decodeTextBuffer(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Excel on Windows often saves "CSV" as Windows-1252, not UTF-8.
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.split(/\r?\n/).find((l) => l.trim()) || "";
  const delimiter = [",", ";", "\t"]
    .map((d) => ({ d, n: firstLine.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;

  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell.trim() === "") {
      inQuotes = true;
      cell = "";
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((cells, i) => ({ cells, line: i + 1 }));
}

function readSpreadsheet(buffer) {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new HttpError(500, "Excel support isn't installed on the server. Run: npm install xlsx");
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new HttpError(422, "This Excel file couldn't be opened. It may be corrupted or password-protected.");
  }

  const multiSheet = workbook.SheetNames.length > 1;
  const rows = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // raw:true keeps dates as serial numbers and IDs as-typed (no "1e+5" mangling).
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    data.forEach((cells, i) =>
      rows.push({ cells, line: i + 1, sheet: multiSheet ? sheetName : undefined })
    );
  }
  return rows;
}

function linesToRows(text) {
  const DATE_AT_END =
    /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|[A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{1,2} [A-Za-z]{3,9}\.?,? \d{4})\s*$/;

  const rows = [];
  let ignored = 0;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;

    let cells = null;
    if (line.includes("\t")) cells = line.split("\t");
    else if (line.includes("|")) cells = line.split("|");
    else if (/\s{2,}/.test(line)) cells = line.split(/\s{2,}/);
    else if ((line.match(/,/g) || []).length >= 3) cells = line.split(",");

    if (cells && cells.length >= 4) {
      rows.push({ cells: cells.map((c) => c.trim()), line: index + 1 });
      return;
    }

    // Space-separated row: "<first name(s)> <last name> <id> <birthday>".
    // Names may contain spaces, so we read from the right-hand side.
    const dateMatch = DATE_AT_END.exec(line);
    if (dateMatch) {
      const before = line.slice(0, dateMatch.index).trim().split(/\s+/);
      if (before.length >= 3) {
        const userId = before.pop();
        const lastName = before.pop();
        rows.push({
          cells: [before.join(" "), lastName, userId, dateMatch[1]],
          line: index + 1,
        });
        return;
      }
    }
    ignored++; // titles, page numbers, header text, etc.
  });
  return { rows, ignored };
}

/**
 * Custom pdf-parse page renderer. The default one glues table cells together
 * ("JuanDela Cruz2021-0001..."), so instead we rebuild each visual line from
 * the text items' x/y positions and put a TAB wherever there's a column-sized
 * gap. linesToRows() then splits on those tabs.
 */
function renderPdfPage(pageData) {
  return pageData
    .getTextContent({ normalizeWhitespace: true, disableCombineTextItems: true })
    .then((content) => {
      const lines = [];
      for (const item of content.items) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const size = Math.abs(item.transform[3]) || item.height || 10;
        let line = lines.find((l) => Math.abs(l.y - y) <= size * 0.3);
        if (!line) {
          line = { y, items: [] };
          lines.push(line);
        }
        line.items.push({ x, width: item.width || 0, size, str: item.str.trim() });
      }

      lines.sort((a, b) => b.y - a.y); // PDF y-axis points up: top of page first
      return lines
        .map((line) => {
          line.items.sort((a, b) => a.x - b.x);
          let out = "";
          let prevEnd = null;
          for (const it of line.items) {
            if (prevEnd !== null) {
              const gap = it.x - prevEnd;
              out += gap > it.size * 0.4 ? "\t" : gap > it.size * 0.08 ? " " : "";
            }
            out += it.str;
            prevEnd = it.x + it.width;
          }
          return out;
        })
        .join("\n");
    });
}

async function extractRows(ext, buffer, { pdfParse, mammoth }) {
  switch (ext) {
    case ".csv":
      return { rows: parseCsv(decodeTextBuffer(buffer)), ignored: 0 };

    case ".xlsx":
    case ".xls":
      return { rows: readSpreadsheet(buffer), ignored: 0 };

    case ".docx": {
      let html;
      try {
        html = (await mammoth.convertToHtml({ buffer })).value || "";
      } catch {
        throw new HttpError(422, "This Word file couldn't be read. It may be corrupted or password-protected.");
      }
      // Prefer real tables: one <tr> per person.
      const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
      const tableRows = trs
        .map((tr, i) => ({
          cells: (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map((td) =>
            decodeHtmlEntities(td.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
          ),
          line: i + 1,
        }))
        .filter((r) => r.cells.length);
      if (tableRows.length) return { rows: tableRows, ignored: 0 };

      const raw = (await mammoth.extractRawText({ buffer })).value || "";
      return linesToRows(raw);
    }

    case ".doc": {
      let WordExtractor;
      try {
        WordExtractor = require("word-extractor");
      } catch {
        throw new HttpError(500, "Legacy .doc support isn't installed on the server. Run: npm install word-extractor");
      }
      try {
        const extracted = await new WordExtractor().extract(buffer);
        return linesToRows(extracted?.getBody?.() || "");
      } catch {
        throw new HttpError(422, "This Word file couldn't be read. It may be corrupted or password-protected.");
      }
    }

    case ".pdf": {
      let text = "";
      try {
        text = (await pdfParse(buffer, { pagerender: renderPdfPage }))?.text || "";
      } catch {
        throw new HttpError(422, "This PDF couldn't be read. It may be corrupted or password-protected.");
      }
      if (text.trim().length < 20) {
        throw new HttpError(
          422,
          "This PDF has no readable text (it may be a scanned image). Please upload an Excel or CSV file instead."
        );
      }
      return linesToRows(text);
    }

    default:
      throw new HttpError(415, "Unsupported file type.");
  }
}

// ─── Rows → validated records ───────────────────────────────────────────────

function buildRecords(rows) {
  const records = [];
  const errors = [];
  const seenIds = new Map();
  let columns = DEFAULT_COLUMNS;
  let dataRowCount = 0;

  // Anything above a sheet's first header row is a title/preamble, not a person.
  const firstHeaderAt = new Map();
  rows.forEach((row, i) => {
    const key = row.sheet ?? "";
    if (!firstHeaderAt.has(key) && detectColumns(Array.isArray(row.cells) ? row.cells : [])) {
      firstHeaderAt.set(key, i);
    }
  });

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const key = row.sheet ?? "";
    if (firstHeaderAt.has(key) && rowIndex < firstHeaderAt.get(key)) continue;

    const cells = Array.isArray(row.cells) ? row.cells : [];

    // A header row (also handles headers repeated on every PDF page).
    const header = detectColumns(cells);
    if (header) {
      columns = header;
      continue;
    }

    if (cells.every((c) => cellText(c) === "")) continue; // blank row

    dataRowCount++;
    if (dataRowCount > MAX_ROWS_PER_FILE) {
      throw new HttpError(413, `This file has more than ${MAX_ROWS_PER_FILE} rows. Please split it into smaller files.`);
    }

    const label = row.sheet ? `${row.sheet}, row ${row.line}` : `Row ${row.line}`;
    const firstName = cellText(cells[columns.firstName]);
    const lastName = cellText(cells[columns.lastName]);
    const userId = cellText(cells[columns.userId]);
    const rawBirthday = cells[columns.birthday];
    const birthday = parseBirthday(rawBirthday);

    const problems = [];
    if (!firstName) problems.push("First Name is missing");
    if (!lastName) problems.push("Last Name is missing");
    if (!userId) problems.push("User ID is missing");
    else if (!isSafeDocId(userId)) problems.push(`User ID "${userId}" is not valid (no "/" and max 60 characters)`);
    if (cellText(rawBirthday) === "") problems.push("Birthday is missing");
    else if (!birthday) problems.push(`Birthday "${cellText(rawBirthday)}" is not a valid past date`);

    if (!problems.length && seenIds.has(userId)) {
      problems.push(`Duplicate User ID "${userId}" (already on ${seenIds.get(userId)})`);
    }

    if (problems.length) {
      errors.push({ row: label, message: problems.join("; ") });
      continue;
    }

    seenIds.set(userId, label);
    records.push({ userId, firstName, lastName, birthday, label });
  }

  return { records, errors };
}

// ─── File signature check (blocks renamed/spoofed files) ────────────────────

function looksLikeExpectedFile(ext, buffer) {
  const startsWith = (bytes) => bytes.every((b, i) => buffer[i] === b);
  const ZIP = [0x50, 0x4b, 0x03, 0x04];
  const OLE = [0xd0, 0xcf, 0x11, 0xe0];
  switch (ext) {
    case ".pdf":
      return buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");
    case ".docx":
      return startsWith(ZIP);
    case ".xlsx":
      return startsWith(ZIP);
    case ".doc":
      return startsWith(OLE);
    case ".xls":
      return startsWith(OLE) || startsWith(ZIP);
    case ".csv":
      return !buffer.subarray(0, 8192).includes(0); // plain text has no NUL bytes
    default:
      return false;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createUserDataRoster({
  db,
  FieldValue,
  requireAuth,
  findUserProfileByAuthUid,
  pdfParse,
  mammoth,
}) {
  // Kill-switch: set ENFORCE_ROSTER_REGISTRATION=false to let anyone register
  // again (e.g. while the first lists are still being uploaded).
  const isEnforced = () => process.env.ENFORCE_ROSTER_REGISTRATION !== "false";

  async function requireAdmin(req, res, next) {
    try {
      const profile = await findUserProfileByAuthUid(req.user?.uid);
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ error: "Admin access required." });
      }
      req.adminProfile = profile;
      return next();
    } catch (error) {
      console.error("User data admin check failed:", error);
      return res.status(500).json({ error: "Failed to verify admin access." });
    }
  }

  function resolveRoster(req, res, next) {
    const roster = ROSTERS[req.params.type];
    if (!roster) return res.status(404).json({ error: "Unknown data type. Use students or teachers." });
    req.roster = roster;
    return next();
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: USER_DATA_MAX_FILE_BYTES, files: 1 },
    fileFilter(req, file, cb) {
      const ext = getExtension(file.originalname);
      if (!USER_DATA_ALLOWED_EXTENSIONS.includes(ext)) {
        const err = new Error(
          `Unsupported file type${ext ? ` (${ext})` : ""}. Allowed: ${USER_DATA_ALLOWED_EXTENSIONS.join(", ")}.`
        );
        err.code = "UNSUPPORTED_FILE_TYPE";
        return cb(err);
      }
      return cb(null, true);
    },
  });

  function handleUpload(req, res, next) {
    upload.single("file")(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: `File is too large. The maximum size is ${formatMb(USER_DATA_MAX_FILE_BYTES)}.` });
      }
      if (err.code === "UNSUPPORTED_FILE_TYPE") {
        return res.status(415).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message || "Upload failed." });
    });
  }

  async function saveRecords(roster, records, { adminId, fileName }) {
    const other = roster === ROSTERS.students ? ROSTERS.teachers : ROSTERS.students;
    const conflicts = [];
    let added = 0;
    let updated = 0;

    const CHUNK = 150; // 3 reads per record, so stay well under Firestore's limits
    for (let start = 0; start < records.length; start += CHUNK) {
      const chunk = records.slice(start, start + CHUNK);
      const refs = chunk.map((r) => db.collection(roster.collection).doc(r.userId));
      const otherRefs = chunk.map((r) => db.collection(other.collection).doc(r.userId));
      const accountRefs = chunk.map((r) => db.collection(roster.accounts).doc(r.userId));

      const [existing, otherSnaps, accountSnaps] = await Promise.all([
        db.getAll(...refs),
        db.getAll(...otherRefs),
        db.getAll(...accountRefs),
      ]);

      const batch = db.batch();
      chunk.forEach((record, i) => {
        // An ID belongs to exactly one role in this system.
        if (otherSnaps[i].exists) {
          conflicts.push({
            row: record.label,
            message: `User ID "${record.userId}" is already in the ${other.label.toLowerCase()} list.`,
          });
          return;
        }

        const isNew = !existing[i].exists;
        const payload = {
          userId: record.userId,
          firstName: record.firstName,
          lastName: record.lastName,
          birthday: record.birthday,
          role: roster.role,
          sourceFileName: fileName,
          updatedBy: adminId,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (isNew) {
          payload.createdBy = adminId;
          payload.createdAt = FieldValue.serverTimestamp();
          // Accounts an admin created by hand already exist — don't show them as "pending".
          payload.registered = accountSnaps[i].exists;
        }
        batch.set(refs[i], payload, { merge: true }); // never clobbers `registered` on re-upload
        if (isNew) added++;
        else updated++;
      });
      await batch.commit();
    }

    return { added, updated, conflicts };
  }

  function registerRoutes(app) {
    const adminOnly = [requireAuth, requireAdmin];

    app.get("/admin/user-data/config", ...adminOnly, (req, res) => {
      res.json({
        maxFileSizeBytes: USER_DATA_MAX_FILE_BYTES,
        allowedExtensions: USER_DATA_ALLOWED_EXTENSIONS,
        maxRowsPerFile: MAX_ROWS_PER_FILE,
      });
    });

    // Cheap "did anything change?" probe for the admin page's live polling.
    // Firestore count aggregations bill roughly 1 read per 1,000 index entries,
    // so this is far cheaper than re-downloading both lists every few seconds.
    // MUST be registered before "/admin/user-data/:type" or ":type" swallows it.
    app.get("/admin/user-data/summary", ...adminOnly, async (req, res) => {
      try {
        const entries = await Promise.all(
          Object.entries(ROSTERS).map(async ([type, roster]) => {
            const col = db.collection(roster.collection);
            let total;
            let registered;
            if (typeof col.count === "function") {
              const [all, done] = await Promise.all([
                col.count().get(),
                col.where("registered", "==", true).count().get(),
              ]);
              total = all.data().count;
              registered = done.data().count;
            } else {
              // Older firebase-admin without count(): fall back to reading the list.
              const snap = await col.limit(LIST_LIMIT).get();
              total = snap.size;
              registered = snap.docs.filter((d) => d.data()?.registered === true).length;
            }
            return [type, { total, registered }];
          })
        );
        res.set("Cache-Control", "no-store");
        return res.json({ success: true, ...Object.fromEntries(entries) });
      } catch (error) {
        console.error("User data summary error:", error);
        return res.status(500).json({ error: error.message || "Failed to load summary." });
      }
    });

    app.get("/admin/user-data/:type", ...adminOnly, resolveRoster, async (req, res) => {
      try {
        const snapshot = await db.collection(req.roster.collection).limit(LIST_LIMIT).get();
        const records = snapshot.docs
          .map((doc) => {
            const d = doc.data() || {};
            return {
              userId: doc.id,
              firstName: d.firstName || "",
              lastName: d.lastName || "",
              birthday: d.birthday || "",
              registered: !!d.registered,
            };
          })
          .sort(
            (a, b) =>
              a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" }) ||
              a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" })
          );
        res.set("Cache-Control", "no-store"); // polled often; never serve a cached copy
        return res.json({ success: true, count: records.length, records });
      } catch (error) {
        console.error("List user data error:", error);
        return res.status(500).json({ error: error.message || "Failed to load user data." });
      }
    });

    app.post("/admin/user-data/:type/upload", ...adminOnly, resolveRoster, handleUpload, async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "No file received. Choose a file and try again." });
        }

        const ext = getExtension(file.originalname);
        if (!looksLikeExpectedFile(ext, file.buffer)) {
          return res.status(415).json({
            error: `This file doesn't look like a real ${ext} file. Re-save it from Word/Excel and try again.`,
          });
        }

        const { rows, ignored } = await extractRows(ext, file.buffer, { pdfParse, mammoth });
        const { records, errors } = buildRecords(rows);

        if (!records.length) {
          const first = errors[0]?.message;
          return res.status(422).json({
            error: first
              ? `No valid rows were found. First problem: ${errors[0].row} — ${first}.`
              : "No student/teacher rows were found. Make sure the file has these columns: First Name, Last Name, User ID, Birthday.",
            errors: errors.slice(0, MAX_ERRORS_RETURNED),
            errorCount: errors.length,
          });
        }

        const { added, updated, conflicts } = await saveRecords(req.roster, records, {
          adminId: req.adminProfile?.data?.adminId || req.adminProfile?.id || null,
          fileName: file.originalname,
        });

        const allErrors = [...errors, ...conflicts];
        return res.json({
          success: true,
          fileName: file.originalname,
          added,
          updated,
          skipped: allErrors.length,
          errorCount: allErrors.length,
          errors: allErrors.slice(0, MAX_ERRORS_RETURNED),
          ignoredLines: ignored || 0,
        });
      } catch (error) {
        if (error instanceof HttpError) {
          return res.status(error.status).json({ error: error.message });
        }
        console.error("Upload user data error:", error);
        return res.status(500).json({ error: error.message || "Failed to process the file." });
      }
    });

    app.delete("/admin/user-data/:type/:userId", ...adminOnly, resolveRoster, async (req, res) => {
      try {
        const userId = String(req.params.userId || "").trim();
        if (!isSafeDocId(userId)) return res.status(400).json({ error: "Invalid User ID." });

        const ref = db.collection(req.roster.collection).doc(userId);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ error: "Record not found." });

        await ref.delete();
        return res.json({ success: true });
      } catch (error) {
        console.error("Delete user data error:", error);
        return res.status(500).json({ error: error.message || "Failed to delete record." });
      }
    });
  }

  // ─── Used by POST /auth/register ──────────────────────────────────────────

  /**
   * Is this person on the uploaded list for the role they picked? Requires the
   * User ID, name, and birthday to all match. The specific reason is only
   * logged, never returned, so the endpoint can't be used to probe which IDs exist.
   */
  async function verifyRegistration({ role, id, firstName, lastName, birthday }) {
    if (!isEnforced()) return { ok: true, skipped: true };

    const roster = ROSTER_BY_ROLE[String(role || "").toLowerCase()];
    const userId = String(id ?? "").trim();
    if (!roster || !isSafeDocId(userId)) return { ok: false, reason: "invalid_input" };

    const snap = await db.collection(roster.collection).doc(userId).get();
    if (!snap.exists) return { ok: false, reason: "not_listed" };

    const record = snap.data() || {};

    const typedBirthday = parseBirthday(birthday);
    if (!typedBirthday || typedBirthday !== record.birthday) {
      return { ok: false, reason: "birthday_mismatch" };
    }

    // Compared as one string so "Mary Ann | Cruz" still matches "Mary | Ann Cruz".
    const typedName = normalizeName(`${firstName}${lastName}`);
    const listedName = normalizeName(`${record.firstName}${record.lastName}`);
    if (!typedName || typedName !== listedName) {
      return { ok: false, reason: "name_mismatch" };
    }

    return { ok: true };
  }

  /** Flags the roster entry as registered. Never throws — the account already exists by now. */
  async function markRegistered({ role, id }) {
    try {
      const roster = ROSTER_BY_ROLE[String(role || "").toLowerCase()];
      const userId = String(id ?? "").trim();
      if (!roster || !isSafeDocId(userId)) return;
      const ref = db.collection(roster.collection).doc(userId);
      const snap = await ref.get();
      if (!snap.exists) return;
      await ref.set(
        { registered: true, registeredAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      console.warn("Could not mark roster entry as registered:", error?.message || error);
    }
  }

  /**
   * Reverse of markRegistered(): when a student/teacher ACCOUNT is deleted, the
   * person goes back to "Not registered" on the User Data page so they can
   * register again. Safe to call repeatedly, and it refuses to flip the flag if
   * an account with that ID still exists. Never throws.
   */
  async function markUnregistered({ role, id }) {
    try {
      const roster = ROSTER_BY_ROLE[String(role || "").toLowerCase()];
      const userId = String(id ?? "").trim();
      if (!roster || !isSafeDocId(userId)) return;

      const ref = db.collection(roster.collection).doc(userId);
      const [snap, accountSnap] = await Promise.all([
        ref.get(),
        db.collection(roster.accounts).doc(userId).get(),
      ]);
      if (!snap.exists) return; // not on the list (e.g. admin-created account)
      if (accountSnap.exists) return; // account is still there: leave it registered

      await ref.set(
        {
          registered: false,
          registeredAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn("Could not mark roster entry as unregistered:", error?.message || error);
    }
  }

  return { registerRoutes, verifyRegistration, markRegistered, markUnregistered, isEnforced };
}