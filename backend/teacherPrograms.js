// teacherPrograms.js
// ---------------------------------------------------------------------------
// Adds two features to server.js (see WIRING at the bottom of this file):
//
//  1. TEACHER PROGRAM  (INS Form 5A "Program by Teacher")
//       POST   /teacher-program/upload      teacher uploads image / PDF / DOCX
//       GET    /teacher-program/:teacherId  teacher (own) or admin reads it
//       DELETE /teacher-program/:teacherId  teacher (own) or admin removes it
//     Uploading NEVER creates classes. It only stores the parsed program so the
//     Create Class modal can offer its subjects/sections for auto-fill.
//
//  2. CONFIGURABLE SECTIONS  (replaces the hard-coded SECTION_OPTIONS)
//       GET /section-config                 any signed-in user
//       PUT /section-config                 admin only – add / delete / rename
//
// Nothing here touches existing routes.
// ---------------------------------------------------------------------------

import mammoth from "mammoth";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_ALIASES = {
  mon: "Mon", monday: "Mon", m: "Mon",
  tue: "Tue", tues: "Tue", tuesday: "Tue", t: "Tue",
  wed: "Wed", wednesday: "Wed", w: "Wed",
  thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu", th: "Thu",
  fri: "Fri", friday: "Fri", f: "Fri",
  sat: "Sat", saturday: "Sat",
  sun: "Sun", sunday: "Sun",
};
const YEAR_ID_BY_DIGIT = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const TIME_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const DEFAULT_SECTION_CONFIG = {
  "1st": [
    { id: "1A", label: "1A Microsoft" },
    { id: "1B", label: "1B Google" },
    { id: "1C", label: "1C Amazon" },
  ],
  "2nd": [
    { id: "2A", label: "2A Algorithm" },
    { id: "2B", label: "2B Pseudocode" },
    { id: "2C", label: "2C Binary" },
  ],
  "3rd": [
    { id: "3A", label: "3A Python" },
    { id: "3B", label: "3B Java" },
    { id: "3C", label: "3C C++" },
  ],
  "4th": [
    { id: "4A", label: "4A Xamarin" },
    { id: "4B", label: "4B Laravel" },
    { id: "4C", label: "4C Flutter" },
  ],
};

// ------------------------- pure helpers (no I/O) ----------------------------

const normCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// "BSIT 1B", "BSIT-1B", "1B", "BSIT 3rd Yr B" -> { id: "1B", year: "1st" }
export function parseSectionLabel(raw) {
  const text = String(raw || "").toUpperCase();
  const m = text.match(/(\d)\s*[- ]?\s*([A-Z]{1,2})\b/);
  if (!m) return null;
  const digit = Number(m[1]);
  if (!YEAR_ID_BY_DIGIT[digit]) return null;
  return { id: `${digit}${m[2]}`, year: YEAR_ID_BY_DIGIT[digit] };
}

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Gemini sometimes returns "7:00", "07:00 AM" or "1:00 PM". Normalise to HH:MM.
// A class-hours safety net: bare hours 1–6 with no AM/PM are afternoon (13–18).
function normalizeTime(raw) {
  const text = String(raw || "").trim().toUpperCase();
  const m = text.match(/^(\d{1,2})(?::?(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const mer = m[3];
  if (min > 59 || h > 24) return null;
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  if (!mer && h >= 1 && h <= 6) h += 12;
  if (h === 24) h = 0;
  const out = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  return TIME_24H.test(out) ? out : null;
}

function normalizeDay(raw) {
  return DAY_ALIASES[String(raw || "").trim().toLowerCase()] || null;
}

// Turns Gemini's flat output into
//   subjects[] -> sections[] -> schedule[] (same ClassScheduleEntry shape the
//   Create Class forms already use: { days, startTime, endTime, room }).
//
// Handles two layouts:
//   A) INS Form 5A  - has a "Summary of Subjects" table (codes, titles, units)
//   B) Custom class-schedule graphics - only grid cells like
//      "Intro. to Computing - BSIT 1A - CL1" (no codes, no units, and some
//      cells may have NO section at all, e.g. "Capstone Proj. & Res. 2 CL 2").
// A subject is therefore keyed by its code when it has one, else by its title.
// Blocks with no readable section are kept under a pseudo-section "?" so the
// teacher can still pick the subject and choose the section herself.
export const UNKNOWN_SECTION_ID = "?";

export function buildProgramFromExtraction(extracted) {
  const subjectMap = new Map(); // key -> subject
  const keyByTitle = new Map(); // normCode(title) -> key (lets title-only blocks find a coded subject)

  const clean = (v) => String(v ?? "").trim();
  const isBlank = (v) => !clean(v) || /^(null|n\/a|none|-)$/i.test(clean(v));

  const ensureSubject = (code, title, units) => {
    const c = isBlank(code) ? "" : clean(code);
    const t = isBlank(title) ? "" : clean(title);
    let key = normCode(c);
    if (!key && t) key = keyByTitle.get(normCode(t)) || normCode(t);
    if (!key) return null;
    if (!subjectMap.has(key)) {
      subjectMap.set(key, {
        key,
        courseCode: c,
        title: t,
        units: Number(units) || 0,
        sections: new Map(),
        unknownBlocks: [],
      });
    }
    const subject = subjectMap.get(key);
    if (!subject.courseCode && c) subject.courseCode = c;
    if (!subject.title && t) subject.title = t;
    if (!subject.units && units) subject.units = Number(units) || 0;
    if (t) keyByTitle.set(normCode(t), key);
    return subject;
  };

  const ensureSection = (subject, sectionRaw, students) => {
    const parsed = parseSectionLabel(sectionRaw);
    if (!parsed) return null;
    if (!subject.sections.has(parsed.id)) {
      subject.sections.set(parsed.id, {
        id: parsed.id,
        label: clean(sectionRaw) || parsed.id,
        year: parsed.year,
        students: Number(students) || null,
        blocks: [],
      });
    }
    const section = subject.sections.get(parsed.id);
    if (!section.students && students) section.students = Number(students) || null;
    return section;
  };

  // 1) Summary of Subjects table (layout A only)
  for (const row of extracted?.summary || []) {
    const subject = ensureSubject(row.courseCode, row.title, row.units);
    if (subject) ensureSection(subject, row.section, row.students);
  }

  // 2) Weekly grid -> per-day time blocks (both layouts)
  for (const b of extracted?.blocks || []) {
    const day = normalizeDay(b.day);
    const start = normalizeTime(b.startTime);
    const end = normalizeTime(b.endTime);
    if (!day || !start || !end || start >= end) continue;
    const subject = ensureSubject(b.courseCode, b.title, 0);
    if (!subject) continue;
    const room = isBlank(b.room) || /^(tba|async|asynchronous)$/i.test(clean(b.room)) ? null : clean(b.room);
    const block = { day, startTime: start, endTime: end, room };
    const section = isBlank(b.section) ? null : ensureSection(subject, b.section, null);
    if (section) section.blocks.push(block);
    else subject.unknownBlocks.push(block);
  }

  const mergeBlocks = (blocks) => {
    // merge back-to-back hourly cells of the same day/room (8-9 + 9-10 -> 8-10)
    const sorted = [...blocks].sort(
      (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || toMinutes(a.startTime) - toMinutes(b.startTime)
    );
    const merged = [];
    for (const blk of sorted) {
      const prev = merged[merged.length - 1];
      if (prev && prev.day === blk.day && prev.room === blk.room && prev.endTime === blk.startTime) {
        prev.endTime = blk.endTime;
      } else if (prev && prev.day === blk.day && prev.startTime === blk.startTime && prev.endTime === blk.endTime) {
        continue; // exact duplicate
      } else {
        merged.push({ ...blk });
      }
    }
    // same time + room on several days -> one entry with days: [...]
    const groups = new Map();
    for (const blk of merged) {
      const key = `${blk.startTime}|${blk.endTime}|${blk.room || ""}`;
      if (!groups.has(key)) groups.set(key, { days: [], startTime: blk.startTime, endTime: blk.endTime, room: blk.room });
      groups.get(key).days.push(blk.day);
    }
    return [...groups.values()].map((g) => ({ ...g, days: DAYS.filter((d) => g.days.includes(d)) }));
  };

  const subjects = [];
  for (const subject of subjectMap.values()) {
    const sections = [];
    for (const section of subject.sections.values()) {
      sections.push({
        id: section.id,
        label: section.label,
        year: section.year,
        students: section.students,
        schedule: mergeBlocks(section.blocks),
      });
    }
    sections.sort((a, b) => a.id.localeCompare(b.id));

    // Section-less cells only matter when the subject has no real section at all.
    if (sections.length === 0 && subject.unknownBlocks.length > 0) {
      sections.push({
        id: UNKNOWN_SECTION_ID,
        label: "Section not specified",
        year: null,
        students: null,
        schedule: mergeBlocks(subject.unknownBlocks),
      });
    }
    if (sections.length === 0) continue;

    subjects.push({
      key: subject.key,
      courseCode: subject.courseCode,
      title: subject.title || subject.courseCode,
      units: subject.units,
      sections,
    });
  }
  subjects.sort((a, b) => (a.courseCode || a.title).localeCompare(b.courseCode || b.title));
  return subjects;
}

function normalizeSemester(raw) {
  const t = String(raw || "").toLowerCase();
  if (/1st|first|\b1\b/.test(t)) return "1st Semester";
  if (/2nd|second|\b2\b/.test(t)) return "2nd Semester";
  return null;
}

// "2026-2027", "2026 - 2027", "S.Y. 2026 – 2027"  ->  "2026-2027"
function normalizeSchoolYear(raw) {
  const m = String(raw || "").match(/(\d{4})\D{1,5}(\d{4})/);
  return m && Number(m[2]) === Number(m[1]) + 1 ? `${m[1]}-${m[2]}` : null;
}

// ----------------------- tolerant JSON parsing ------------------------------
// Gemini occasionally returns almost-JSON (trailing commas, a cut-off tail,
// stray control characters). Try progressively more forgiving repairs before
// giving up, so one stray comma doesn't fail the whole upload.
function closeOpenJson(text) {
  const stack = [];
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if ((ch === "}" || ch === "]") && stack.length) stack.pop();
  }
  let out = text;
  if (inString) out += '"';
  out = out.replace(/[,:\s]+$/, ""); // dangling comma / colon from a cut-off tail
  return out + stack.reverse().join("");
}

export function parseLooseJson(raw) {
  let text = String(raw || "").replace(/```json|```/gi, "").trim();
  const first = text.indexOf("{");
  if (first === -1) throw new Error("The model did not return JSON.");
  text = text.slice(first);
  const last = text.lastIndexOf("}");
  const body = last >= 0 ? text.slice(0, last + 1) : text;

  const stripNoise = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/,\s*([}\]])/g, "$1");
  const quoteKeys = (s) => s.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');

  const candidates = [
    body,
    stripNoise(body),
    quoteKeys(stripNoise(body)),
    closeOpenJson(stripNoise(body)), // cut-off tail: close at the last complete object
    closeOpenJson(stripNoise(text)),
    closeOpenJson(quoteKeys(stripNoise(text))),
  ];
  let firstError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      firstError = firstError || e;
    }
  }
  throw firstError;
}

// ----------------------- section-config validation --------------------------

export function validateSectionConfig(years) {
  if (!years || typeof years !== "object") return { error: "years is required." };
  const out = {};
  for (const yearId of Object.keys(YEAR_ID_BY_DIGIT).map((d) => YEAR_ID_BY_DIGIT[d])) {
    const list = Array.isArray(years[yearId]) ? years[yearId] : [];
    const seen = new Set();
    out[yearId] = [];
    for (const item of list) {
      const id = String(item?.id || "").trim().toUpperCase();
      const label = String(item?.label || "").trim().replace(/\s+/g, " ");
      if (!/^[1-4][A-Z]{1,2}$/.test(id)) return { error: `Invalid section id "${id}".` };
      if (!id.startsWith(String(Object.values(YEAR_ID_BY_DIGIT).indexOf(yearId) + 1))) {
        return { error: `Section ${id} does not belong to ${yearId} year.` };
      }
      if (seen.has(id)) return { error: `Duplicate section ${id}.` };
      if (!label.toUpperCase().startsWith(id)) return { error: `Section name must start with "${id}".` };
      if (label.length > 40) return { error: `Section name "${label}" is too long (max 40).` };
      seen.add(id);
      out[yearId].push({ id, label });
    }
    out[yearId].sort((a, b) => a.id.localeCompare(b.id));
  }
  return { years: out };
}

// ------------------------------ route wiring --------------------------------

export function registerTeacherProgramRoutes(app, deps) {
  const {
    db,
    admin,
    bucket,
    multer, // unused (JSON/base64 upload, same as banners) – kept for future
    requireAuth,
    findUserProfileByAuthUid,
    findTeacherByIdentifier,
    geminiAI, // new GoogleGenerativeAI(...) instance (geminiGameAI in server.js)
    SchemaType,
    modelName = process.env.GEMINI_PROGRAM_MODEL || process.env.GEMINI_GAME_MODEL || "gemini-3.5-flash",
  } = deps;
  const FieldValue = admin.firestore.FieldValue;

  const MAX_BYTES = 15 * 1024 * 1024;
  const IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const programSchema = {
    type: SchemaType.OBJECT,
    properties: {
      teacherName: { type: SchemaType.STRING, nullable: true },
      semester: { type: SchemaType.STRING, nullable: true },
      schoolYear: { type: SchemaType.STRING, nullable: true },
      summary: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            courseCode: { type: SchemaType.STRING, nullable: true },
            title: { type: SchemaType.STRING },
            units: { type: SchemaType.NUMBER, nullable: true },
            section: { type: SchemaType.STRING, nullable: true },
            students: { type: SchemaType.NUMBER, nullable: true },
          },
          required: ["title"],
        },
      },
      blocks: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            courseCode: { type: SchemaType.STRING, nullable: true },
            title: { type: SchemaType.STRING, nullable: true },
            section: { type: SchemaType.STRING, nullable: true },
            day: { type: SchemaType.STRING },
            startTime: { type: SchemaType.STRING },
            endTime: { type: SchemaType.STRING },
            room: { type: SchemaType.STRING, nullable: true },
          },
          required: ["day", "startTime", "endTime"],
        },
      },
    },
    required: ["summary", "blocks"],
  };

  const PROMPT = `You are reading a teacher's weekly class program. It may be a photo (possibly skewed/blurry), a PDF, or HTML exported from Word. Two layouts are common:

LAYOUT A - university "PROGRAM BY TEACHER" form (INS Form 5A): a weekly grid plus a "SUMMARY OF SUBJECTS" table. Grid cells show courseCode, then section (e.g. "BSIT 2B"), then room (e.g. "CL2", "LLR1").
LAYOUT B - a custom "MY CLASS SCHEDULE" graphic: only a weekly grid whose cells read like "Intro. to Computing - BSIT 1A - CL1" (title, section, room). There is NO summary table and NO course codes.

Return JSON with:
- teacherName (null if not printed), semester ("1st Semester" or "2nd Semester"), schoolYear (e.g. "2026-2027").
- summary: Layout A only - one item per row of the SUMMARY OF SUBJECTS table: courseCode (e.g. "AP-1", "PC-315L", "P ELEC 4"), title (Descriptive Title), units, section ("BSIT 1A"), students (number before the course). Return an empty array for Layout B.
- blocks: one item per occupied cell group in the weekly grid, with day (Mon/Tue/Wed/Thu/Fri/Sat/Sun), startTime, endTime, room and:
    * Layout A: courseCode and section as printed.
    * Layout B: title (the subject name WITHOUT the section or room), section, room; courseCode null.
  If a cell has no section printed (e.g. "Capstone Proj. & Res. 2 CL 2"), set section to null - never guess one. Keep the room as printed ("CL1", "CTLAB 2"); if the cell says TBA / Async instead of a room, set room to null.
- A cell that visually spans several hourly rows is ONE block (start of its first row to end of its last row); repeating hourly cells of the same class are fine too, they get merged later.
- Skip "LUNCH BREAK" rows and empty cells.
- Times are 24-hour "HH:MM". Class hours run 7:00 to 18:00, so 1:00-2:00 means 13:00-14:00 and 5:00-6:00 means 17:00-18:00.
- The time column can contain typos (for example the 8:00 row labeled "7:00-"). Rows are consecutive hours, so use the row's position, not a mistyped label.
- Do not invent entries. If a value is unreadable, omit that block rather than guessing.`;

  async function resolveTeacherKey(req, requestedId) {
    const profile = await findUserProfileByAuthUid(req.user?.uid);
    if (!profile) return { error: "User profile not found.", status: 403 };

    if (profile.role === "teacher") {
      // A teacher can only ever touch their OWN program, so the id from the
      // client (drawer userId / dashboard teacherId – these can differ in
      // format) is ignored and the key always comes from the signed-in profile.
      return { key: String(profile.data?.teacherId || profile.id), profile };
    }
    if (profile.role === "admin") {
      const teacher = await findTeacherByIdentifier(String(requestedId || "").trim());
      if (!teacher) return { error: "Teacher not found.", status: 404 };
      return { key: String(teacher.teacherId || teacher.id), profile };
    }
    return { error: "You do not have access to this data.", status: 403 };
  }

  // Shape reminder used on retries that run WITHOUT the response schema.
  const JSON_SHAPE = `Respond with ONLY valid JSON (no markdown, no comments, no trailing commas) shaped exactly like:
{"teacherName": string|null, "semester": string|null, "schoolYear": string|null,
 "summary": [{"courseCode": string|null, "title": string, "units": number|null, "section": string|null, "students": number|null}],
 "blocks": [{"courseCode": string|null, "title": string|null, "section": string|null, "day": string, "startTime": string, "endTime": string, "room": string|null}]}`;

  async function extractWithGemini({ buffer, mimeType, fileName }) {
    if (!geminiAI) throw new Error("GEMINI_API_KEY is missing on the server.");

    const lower = (fileName || "").toLowerCase();
    const isDocx = mimeType === DOCX_MIME || lower.endsWith(".docx");
    const content = [];

    if (isDocx) {
      // mammoth keeps tables as <table>, which preserves the time grid layout.
      const { value: html } = await mammoth.convertToHtml({ buffer });
      if (!html || html.length < 20) throw new Error("The Word file appears to be empty.");
      content.push({ text: `DOCUMENT (HTML):\n${html.slice(0, 200000)}` });
    } else {
      content.push({ inlineData: { mimeType, data: buffer.toString("base64") } });
    }

    // Attempt 1 uses the strict schema. If the model still emits broken JSON,
    // later attempts drop the schema (it can trigger malformed output on
    // busy grids), add a little temperature so a retry isn't identical, and
    // spell the shape out in the prompt instead.
    const attempts = [
      { schema: true, temperature: 0.1 },
      { schema: false, temperature: 0.2 },
      { schema: false, temperature: 0.4 },
    ];

    let lastError = null;
    for (let i = 0; i < attempts.length; i++) {
      const { schema, temperature } = attempts[i];
      try {
        const model = geminiAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
            ...(schema ? { responseSchema: programSchema } : {}),
          },
        });
        const parts = [{ text: schema ? PROMPT : `${PROMPT}\n\n${JSON_SHAPE}` }, ...content];
        const result = await model.generateContent(parts);
        const raw = result.response.text();
        const finish = result.response.candidates?.[0]?.finishReason;
        if (finish && finish !== "STOP") console.warn(`Program extraction finishReason: ${finish}`);

        let parsed;
        try {
          parsed = parseLooseJson(raw);
        } catch (parseError) {
          // Log the area around the failure so bad output can be diagnosed.
          console.warn("Unparseable model output (first 600 chars):", String(raw).slice(0, 600));
          throw parseError;
        }
        if (parsed && (Array.isArray(parsed.blocks) || Array.isArray(parsed.summary))) {
          return { ...parsed, summary: parsed.summary || [], blocks: parsed.blocks || [] };
        }
        throw new Error("Model output was missing summary/blocks.");
      } catch (e) {
        lastError = e;
        console.warn(`Program extraction attempt ${i + 1} failed:`, e?.message);
      }
    }
    throw new Error("Couldn't read this program. Try a clearer photo, or upload the PDF/Word version.");
  }

  // ---------------------------- POST upload ---------------------------------
  app.post("/teacher-program/upload", requireAuth, async (req, res) => {
    try {
      const { fileBase64, fileName, mimeType, teacherId } = req.body || {};
      if (!fileBase64 || !fileName) {
        return res.status(400).json({ error: "File is required." });
      }

      const resolved = await resolveTeacherKey(req, teacherId);
      if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

      const cleanBase64 = String(fileBase64).replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      if (buffer.length === 0) return res.status(400).json({ error: "File is empty." });
      if (buffer.length > MAX_BYTES) return res.status(400).json({ error: "File must be under 15MB." });

      const lower = String(fileName).toLowerCase();
      let mime = String(mimeType || "").toLowerCase();
      if (mime === "image/x-png") mime = "image/png";
      if (!mime || mime === "application/octet-stream") {
        if (lower.endsWith(".pdf")) mime = "application/pdf";
        else if (lower.endsWith(".docx")) mime = DOCX_MIME;
        else if (lower.endsWith(".png")) mime = "image/png";
        else if (lower.endsWith(".webp")) mime = "image/webp";
        else if (/\.jpe?g$/.test(lower)) mime = "image/jpeg";
      }
      const allowed = mime === "application/pdf" || mime === DOCX_MIME || IMAGE_MIMES.includes(mime);
      if (!allowed) {
        return res.status(400).json({ error: "Upload an image (JPG/PNG/WEBP), PDF, or Word (.docx) file." });
      }

      const extracted = await extractWithGemini({ buffer, mimeType: mime, fileName });
      const subjects = buildProgramFromExtraction(extracted);
      if (subjects.length === 0) {
        return res.status(422).json({
          error: "No classes could be read from this file. Try a clearer photo or a PDF.",
        });
      }

      // Keep the original for reference (non-fatal if storage fails).
      let storagePath = null;
      try {
        if (bucket) {
          const safe = String(fileName).replace(/[^\w.\-]+/g, "_");
          storagePath = `teacher-programs/${resolved.key}/${Date.now()}-${safe}`;
          await bucket.file(storagePath).save(buffer, { metadata: { contentType: mime }, resumable: false });
        }
      } catch (e) {
        console.warn("Program original upload failed:", e?.message);
        storagePath = null;
      }

      const doc = {
        teacherId: resolved.key,
        fileName: String(fileName),
        mimeType: mime,
        storagePath,
        detectedTeacherName: extracted.teacherName || null,
        semester: normalizeSemester(extracted.semester),
        schoolYear: normalizeSchoolYear(extracted.schoolYear),
        subjects,
        uploadedByUid: req.user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      };
      await db.collection("teacherPrograms").doc(resolved.key).set(doc);

      return res.json({
        success: true,
        data: { ...doc, updatedAt: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Teacher program upload error:", error);
      return res.status(500).json({ error: error?.message || "Failed to read the program." });
    }
  });

  // ------------------------------ GET ---------------------------------------
  app.get("/teacher-program/:teacherId", requireAuth, async (req, res) => {
    try {
      const resolved = await resolveTeacherKey(req, req.params.teacherId);
      if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
      const snap = await db.collection("teacherPrograms").doc(resolved.key).get();
      if (!snap.exists) return res.json({ success: true, data: null });
      const data = snap.data();
      return res.json({
        success: true,
        data: { ...data, updatedAt: data.updatedAt?.toDate?.().toISOString?.() || null },
      });
    } catch (error) {
      console.error("Teacher program fetch error:", error);
      return res.status(500).json({ error: "Failed to load program." });
    }
  });

  // ----------------------------- DELETE -------------------------------------
  app.delete("/teacher-program/:teacherId", requireAuth, async (req, res) => {
    try {
      const resolved = await resolveTeacherKey(req, req.params.teacherId);
      if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
      const ref = db.collection("teacherPrograms").doc(resolved.key);
      const snap = await ref.get();
      if (snap.exists && snap.data()?.storagePath && bucket) {
        await bucket.file(snap.data().storagePath).delete().catch(() => {});
      }
      await ref.delete();
      return res.json({ success: true });
    } catch (error) {
      console.error("Teacher program delete error:", error);
      return res.status(500).json({ error: "Failed to remove program." });
    }
  });

  // ======================= configurable sections ==============================
  const configRef = () => db.collection("appConfig").doc("sections");

  async function loadSectionConfig() {
    const snap = await configRef().get();
    return snap.exists && snap.data()?.years ? snap.data().years : DEFAULT_SECTION_CONFIG;
  }

  app.get("/section-config", requireAuth, async (_req, res) => {
    try {
      return res.json({ success: true, data: { years: await loadSectionConfig() } });
    } catch (error) {
      console.error("Section config fetch error:", error);
      return res.status(500).json({ error: "Failed to load sections." });
    }
  });

  app.put("/section-config", requireAuth, async (req, res) => {
    try {
      const profile = await findUserProfileByAuthUid(req.user?.uid);
      if (profile?.role !== "admin") return res.status(403).json({ error: "Admins only." });

      const { years, error } = validateSectionConfig(req.body?.years);
      if (error) return res.status(400).json({ error });

      const previous = await loadSectionConfig();
      const prevById = new Map();
      Object.values(previous).flat().forEach((s) => prevById.set(s.id, s));
      const nextById = new Map();
      Object.values(years).flat().forEach((s) => nextById.set(s.id, s));

      const renamed = []; // { from, to }
      const removed = []; // old labels
      for (const [id, old] of prevById) {
        const now = nextById.get(id);
        if (!now) removed.push(old);
        else if (now.label !== old.label) renamed.push({ from: old.label, to: now.label });
      }

      // Block deleting a section that active classes still use.
      if (removed.length > 0) {
        const classesSnap = await db.collection("classes").get();
        for (const old of removed) {
          const inUse = classesSnap.docs.filter((d) => {
            const c = d.data();
            return c.section === old.label && c.status !== "archived";
          }).length;
          if (inUse > 0) {
            return res.status(409).json({
              error: `Cannot delete "${old.label}" – ${inUse} active class${inUse > 1 ? "es use" : " uses"} it.`,
            });
          }
        }
      }

      // Cascade renames onto existing classes so they keep matching the config.
      let cascaded = 0;
      if (renamed.length > 0) {
        for (const { from, to } of renamed) {
          const snap = await db.collection("classes").where("section", "==", from).get();
          for (let i = 0; i < snap.docs.length; i += 400) {
            const batch = db.batch();
            snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { section: to }));
            await batch.commit();
          }
          cascaded += snap.size;
        }
      }

      await configRef().set({
        years,
        updatedAt: FieldValue.serverTimestamp(),
        updatedByUid: req.user.uid,
      });

      return res.json({ success: true, data: { years, renamedClasses: cascaded } });
    } catch (error) {
      console.error("Section config save error:", error);
      return res.status(500).json({ error: "Failed to save sections." });
    }
  });
}

// ----------------------------------------------------------------------------
// WIRING (server.js) – add the import near the top:
//
//   import { registerTeacherProgramRoutes } from "./teacherPrograms.js";
//
// ...and this call just BEFORE `app.listen(PORT, ...)` (after geminiGameAI,
// requireAuth, findUserProfileByAuthUid, findTeacherByIdentifier and bucket
// are all defined):
//
//   registerTeacherProgramRoutes(app, {
//     db, admin, bucket,
//     requireAuth,
//     findUserProfileByAuthUid,
//     findTeacherByIdentifier,
//     geminiAI: geminiGameAI,
//     SchemaType,              // already imported at the top of server.js
//   });
// ----------------------------------------------------------------------------