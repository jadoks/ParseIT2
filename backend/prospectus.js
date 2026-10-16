// prospectus.js
// Admin-managed program prospectus + logic that merges it with a student's
// AI-parsed grades. There is NO built-in curriculum: everything comes from the
// PDF an admin uploads (stored in Firestore appConfig/prospectus).
//
// Routes
//   GET    /admin/prospectus        admin only - view (details, curriculum, PDF link)
//   POST   /admin/prospectus        admin only - upload / replace (PDF)
//   DELETE /admin/prospectus        admin only - delete
//   GET    /prospectus/:studentId   student progress against the uploaded prospectus

// Philippine 1.0 - 5.0 scale: 3.0 is the lowest passing grade, anything
// above it (4.0, 5.0) is a failure. Change here if your registrar differs.
export const PASSING_GRADE_MAX = 3.0;

const SEM1 = "1st Semester";
const SEM2 = "2nd Semester";
const YEAR_WORDS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
const yearLabel = (n) => `${YEAR_WORDS[n - 1] || `Year ${n}`} Year`;
const SEMESTER_ORDER = [SEM1, SEM2, "Summer"];

/* ------------------------------------------------------------------ */
/* Matching: parsed grade titles  ->  curriculum entries               */
/* ------------------------------------------------------------------ */
// The grade parser stores the MIS code (e.g. "CS10") and the DESCRIPTION
// column, not the curriculum code, so subjects are matched by title.

const STOP_WORDS = new Set(["the", "of", "and", "in", "to", "for", "a", "an", "with"]);
const ROMAN = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6" };

// -> { tokens: Set<string>, variant: "lec" | "lab" | null }
export function parseTitle(raw) {
  let text = String(raw || "").toLowerCase().replace(/&/g, " and ");
  let variant = null;
  text = text.replace(/\b(lec|lecture|lab|laboratory)\b/g, (_, v) => {
    variant = v.startsWith("lec") ? "lec" : "lab";
    return " ";
  });
  const tokens = new Set();
  for (const part of text.replace(/[^a-z0-9]+/g, " ").split(" ")) {
    if (!part || STOP_WORDS.has(part)) continue;
    tokens.add(ROMAN[part] || part);
  }
  return { tokens, variant };
}

const isNumeric = (t) => /^\d+$/.test(t);

function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  const numsA = [...a].filter(isNumeric).sort().join(",");
  const numsB = [...b].filter(isNumeric).sort().join(",");
  if (numsA !== numsB) return 0; // "Programming 1" must never match "Programming 2"
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return (2 * shared) / (a.size + b.size);
}

const MATCH_THRESHOLD = 0.8;

function buildIndex(curriculum) {
  return curriculum.map((entry) => {
    const own = parseTitle(entry.title);
    const forms = [own.tokens];
    for (const alias of [entry.code, ...entry.aliases]) forms.push(parseTitle(alias).tokens);
    return { entry, variant: own.variant, forms };
  });
}

const termOrder = (schoolYear, semester) => {
  const start = parseInt(String(schoolYear || "").match(/\d{4}/)?.[0] || "0", 10);
  const sem = /second|2nd/i.test(String(semester || "")) ? 2 : /first|1st/i.test(String(semester || "")) ? 1 : 0;
  return start * 10 + sem;
};

function matchOne(index, parsedTitle) {
  const { tokens, variant } = parseTitle(parsedTitle);
  let best = 0;
  const scored = [];
  for (const item of index) {
    const score = Math.max(...item.forms.map((f) => similarity(tokens, f)));
    scored.push({ item, score });
    if (score > best) best = score;
  }
  if (best < MATCH_THRESHOLD) return [];

  let hits = scored.filter((s) => s.score >= best - 1e-9).map((s) => s.item);
  // A grade titled "... (Lab)" only ever belongs to the lab entry; a title
  // with no lec/lab marker may legitimately cover both halves of a pair.
  if (variant) hits = hits.filter((h) => h.variant === variant || h.variant === null);
  if (!hits.length) return [];
  // Ties are only accepted between lec/lab siblings of one course.
  const baseKey = [...hits[0].forms[0]].sort().join(" ");
  return hits.filter((h) => [...h.forms[0]].sort().join(" ") === baseKey).map((h) => h.entry);
}

const attemptStatus = (grade) => (grade <= PASSING_GRADE_MAX ? "passed" : "failed");

/**
 * @param terms  studentParsedGrades documents: { schoolYear, semester, subjects[], incSubjects[] }
 * @returns { years, summary, unmatched, hasGrades }
 */
export function buildProspectus(terms, curriculum) {
  const index = buildIndex(curriculum);
  const attemptsByCode = new Map();
  const unmatched = [];

  const ordered = [...terms].sort(
    (a, b) => termOrder(a.schoolYear, a.semester) - termOrder(b.schoolYear, b.semester)
  );

  const addAttempt = (rawSubject, term, status, grade) => {
    const entries = matchOne(index, rawSubject.subjectTitle);
    const attempt = {
      status,
      grade,
      schoolYear: term.schoolYear || null,
      semester: term.semester || null,
      order: termOrder(term.schoolYear, term.semester),
    };
    if (!entries.length) {
      unmatched.push({
        subjectCode: rawSubject.subjectCode || null,
        subjectTitle: rawSubject.subjectTitle || "Unknown Subject",
        units: Number(rawSubject.units) || 0,
        grade,
        status,
        schoolYear: term.schoolYear || null,
        semester: term.semester || null,
      });
      return;
    }
    for (const entry of entries) {
      if (!attemptsByCode.has(entry.code)) attemptsByCode.set(entry.code, []);
      attemptsByCode.get(entry.code).push(attempt);
    }
  };

  for (const term of ordered) {
    for (const s of term.subjects || []) {
      const grade = Number(s.grade);
      if (!Number.isFinite(grade) || grade <= 0) continue;
      addAttempt(s, term, attemptStatus(grade), grade);
    }
    for (const s of term.incSubjects || []) addAttempt(s, term, "incomplete", null);
  }

  // Final state per subject: a passing attempt wins; otherwise the latest one.
  const resolved = new Map();
  for (const entry of curriculum) {
    const attempts = attemptsByCode.get(entry.code) || [];
    const passed = [...attempts].reverse().find((a) => a.status === "passed");
    const chosen = passed || attempts[attempts.length - 1] || null;
    resolved.set(entry.code, { chosen, attempts: attempts.length });
  }

  const passedCodes = new Set(
    curriculum.filter((e) => resolved.get(e.code).chosen?.status === "passed").map((e) => e.code)
  );

  const years = [];
  let totalUnits = 0, earnedUnits = 0;
  const counts = { passed: 0, failed: 0, incomplete: 0, not_taken: 0 };

  const yearNumbers = [...new Set(curriculum.map((e) => e.year))].sort((a, b) => a - b);
  for (const year of yearNumbers) {
    const semesters = [];
    for (const semester of SEMESTER_ORDER) {
      const subjects = curriculum
        .filter((e) => e.year === year && e.semester === semester)
        .map((e) => {
          const { chosen, attempts } = resolved.get(e.code);
          const status = chosen ? chosen.status : "not_taken";
          totalUnits += e.units;
          counts[status]++;
          if (status === "passed") earnedUnits += e.units;
          return {
            code: e.code,
            codeLabel: e.codeLabel,
            title: e.title,
            prerequisites: e.prerequisiteText,
            units: e.units,
            lec: e.lec,
            lab: e.lab,
            status,
            grade: chosen?.grade ?? null,
            takenSchoolYear: chosen?.schoolYear || null,
            takenSemester: chosen?.semester || null,
            attempts,
            // Prerequisite codes the student hasn't passed yet (advisory).
            blockedBy: status === "passed" ? [] : e.requires.filter((r) => !passedCodes.has(r)),
          };
        });
      if (subjects.length) {
        semesters.push({
          semester,
          totalUnits: subjects.reduce((n, s) => n + s.units, 0),
          subjects,
        });
      }
    }
    years.push({ year, label: yearLabel(year), semesters });
  }

  const totalSubjects = curriculum.length;
  return {
    hasGrades: terms.some((t) => (t.subjects || []).length || (t.incSubjects || []).length),
    summary: {
      totalSubjects,
      totalUnits,
      earnedUnits,
      remainingUnits: totalUnits - earnedUnits,
      percent: totalUnits ? Math.round((earnedUnits / totalUnits) * 1000) / 10 : 0,
      passed: counts.passed,
      failed: counts.failed,
      incomplete: counts.incomplete,
      notTaken: counts.not_taken,
    },
    years,
    unmatched,
  };
}

/* ------------------------------------------------------------------ */
/* Admin-uploaded prospectus: AI parse result -> validated curriculum   */
/* ------------------------------------------------------------------ */

const normalizeSemester = (value) => {
  const t = String(value || "").toLowerCase();
  if (/summer|mid\s*-?year/.test(t)) return "Summer";
  if (/second|2nd|\b2\b/.test(t)) return SEM2;
  if (/first|1st|\b1\b/.test(t)) return SEM1;
  return null;
};

const cleanCode = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const codeKey = (value) => cleanCode(value).toLowerCase();
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/**
 * Validates and cleans the JSON the AI returned for an uploaded prospectus.
 * Throws a readable Error when the file doesn't look like a prospectus.
 * @returns { curriculum, program, printedTotalUnits, warnings }
 */
export function normalizeParsedCurriculum(raw) {
  const warnings = [];
  const list = Array.isArray(raw?.subjects) ? raw.subjects : Array.isArray(raw) ? raw : null;
  if (!list) throw new Error("No subject list found in the file.");

  const seen = new Set();
  const curriculum = [];
  for (const item of list) {
    const code = cleanCode(item?.code);
    const title = cleanCode(item?.title);
    const year = parseInt(item?.year, 10);
    const semester = normalizeSemester(item?.semester);
    if (!code || !title || !Number.isInteger(year) || year < 1 || year > 6 || !semester) {
      warnings.push(`Skipped an unreadable row (${code || title || "no code"}).`);
      continue;
    }
    if (seen.has(codeKey(code))) {
      warnings.push(`Duplicate course code "${code}" was ignored.`);
      continue;
    }
    seen.add(codeKey(code));
    curriculum.push({
      year,
      semester,
      code,
      codeLabel: cleanCode(item?.codeLabel) || code,
      title,
      requires: Array.isArray(item?.requires) ? item.requires.map(cleanCode).filter(Boolean) : [],
      prerequisiteText: cleanCode(item?.prerequisiteText) || "None",
      units: toNumber(item?.units),
      lec: toNumber(item?.lec),
      lab: toNumber(item?.lab),
      aliases: Array.isArray(item?.aliases) ? item.aliases.map(cleanCode).filter(Boolean) : [],
    });
  }

  if (curriculum.length < 10) {
    throw new Error(
      `Only ${curriculum.length} subject(s) could be read. Please upload the full program prospectus (all years and semesters).`
    );
  }

  // Prerequisites must point at real course codes; keep the printed text either way.
  const byKey = new Map(curriculum.map((e) => [codeKey(e.code), e.code]));
  for (const entry of curriculum) {
    const resolved = [];
    for (const r of entry.requires) {
      const hit = byKey.get(codeKey(r));
      if (hit && hit !== entry.code) resolved.push(hit);
      else if (!hit) warnings.push(`${entry.code}: prerequisite "${r}" is not a course in this prospectus.`);
    }
    entry.requires = [...new Set(resolved)];
  }

  const totalUnits = curriculum.reduce((n, e) => n + e.units, 0);
  if (totalUnits <= 0) throw new Error("The subjects in this file have no units, so it doesn't look like a prospectus.");

  const printedTotalUnits = toNumber(raw?.printedTotalUnits, null) || null;
  if (printedTotalUnits && printedTotalUnits !== totalUnits) {
    warnings.push(
      `The file prints ${printedTotalUnits} total units but the listed subjects add up to ${totalUnits}. Progress uses the listed subjects.`
    );
  }

  curriculum.sort(
    (a, b) => a.year - b.year || SEMESTER_ORDER.indexOf(a.semester) - SEMESTER_ORDER.indexOf(b.semester)
  );

  const program = {
    code: cleanCode(raw?.program?.code) || "Program",
    name: cleanCode(raw?.program?.name) || "",
    school: cleanCode(raw?.program?.school) || "",
    cmo: cleanCode(raw?.program?.cmo) || "",
    effectiveAY: cleanCode(raw?.program?.effectiveAY) || "",
    printedTotalUnits,
  };
  return { curriculum, program, printedTotalUnits, totalUnits, warnings };
}

const PROSPECTUS_PROMPT = `
You are reading a college PROSPECTUS (curriculum checklist) PDF. It contains one table per
semester, grouped under headings FIRST YEAR, SECOND YEAR, THIRD YEAR, FOURTH YEAR.
Columns: Course Code | Descriptive Title | Co-/Prerequisite | Units | Hours (Lec, Lab, Total) | Remarks.

Return ONLY valid JSON in exactly this shape:
{
  "program": { "code": "<program code>", "name": "<full program name>",
               "school": "<school name>", "cmo": "<CMO / policy reference>",
               "effectiveAY": "<effectivity, e.g. A.Y. 2023-2024>" },
  "printedTotalUnits": 173,
  "subjects": [
    { "year": 1, "semester": "1st Semester", "code": "CC 112",
      "title": "Computer Programming 1 (Lec)",
      "prerequisiteText": "None", "requires": [],
      "units": 2, "lec": 2, "lab": 0, "aliases": [] }
  ]
}

RULES
1. Include EVERY course row of EVERY semester table. Never include "Total" rows.
2. year = 1 for FIRST YEAR, 2 for SECOND YEAR, etc. semester = "1st Semester", "2nd Semester" or "Summer".
3. code = the Course Code exactly as printed (e.g. "CC 112 L", "PATHFit 1", "P Elec 2").
   If a cell shows two codes such as "PC 121 / Math-E2", use the first as "code" and add
   "codeLabel": "PC 121 / Math-E2". If the printed code is doubled by a layout glitch
   (e.g. "CC 316CC 316"), return it once.
4. title = Descriptive Title, joined into one line if it wraps (keep "(Lec)" / "(Lab)").
5. prerequisiteText = the Co-/Prerequisite cell exactly as printed ("None" when none).
6. requires = ONLY the course codes named in that cell, as an array. "CC 112, CC 112 L" ->
   ["CC 112","CC 112 L"]. "PATHFit 1 and 2" -> ["PATHFit 1","PATHFit 2"]. "CC 225/CC 225 L" ->
   ["CC 225","CC 225 L"]. Standings such as "2nd Year Standing" are NOT codes: leave them out of "requires".
7. units, lec, lab are numbers. Use 0 where the cell shows "-" or is blank.
8. aliases: [] unless the title has alternative names printed in it.
9. printedTotalUnits = the grand "Total" of the curriculum summary table if one exists, else null.
10. Read the "program" fields from the document heading; use "" for anything not printed.
11. Do not invent courses. Do not skip rows. Output JSON only, no commentary.
`;

const PROSPECTUS_DOC_ID = "prospectus";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */
export function registerProspectusRoutes(
  app,
  {
    db,
    bucket,
    FieldValue,
    requireAuth,
    findUserProfileByAuthUid,
    generateGradeAIText,
    createReadSignedUrl,
    invalidateSignedUrlCache,
    sanitizeFileName,
  }
) {
  const docRef = () => db.collection("appConfig").doc(PROSPECTUS_DOC_ID);

  async function requireAdminProfile(req, res) {
    const profile = await findUserProfileByAuthUid(req.user.uid);
    if (!profile || profile.role !== "admin") {
      res.status(403).json({ error: "Only admins can manage the prospectus." });
      return null;
    }
    return profile;
  }

  async function loadStored() {
    const snap = await docRef().get();
    return snap.exists ? snap.data() : null;
  }

  const metaOf = (stored) => ({
    fileName: stored.fileName || null,
    hasFile: Boolean(stored.storagePath),
    uploadedAt: stored.uploadedAt?.toDate ? stored.uploadedAt.toDate().toISOString() : null,
    uploadedBy: stored.uploadedByName || null,
    totalUnits: stored.totalUnits || 0,
    totalSubjects: (stored.curriculum || []).length,
    warnings: stored.warnings || [],
  });

  async function saveCurriculum({ parsed, fileName, storagePath, profile }) {
    await docRef().set({
      program: parsed.program,
      curriculum: parsed.curriculum,
      totalUnits: parsed.totalUnits,
      warnings: parsed.warnings,
      fileName: fileName || null,
      storagePath: storagePath || null,
      uploadedAt: FieldValue.serverTimestamp(),
      uploadedBy: profile.id || null,
      uploadedByName:
        `${profile.data?.firstName || ""} ${profile.data?.lastName || ""}`.trim() || profile.data?.email || "Admin",
    });
  }

  async function deleteStoredFile(storagePath) {
    if (!storagePath) return;
    try {
      await bucket.file(storagePath).delete({ ignoreNotFound: true });
    } catch (e) {
      console.warn("[Prospectus] Could not delete stored file:", e.message);
    }
    invalidateSignedUrlCache?.(storagePath);
  }

  // ---- Admin: view (metadata + parsed curriculum + signed PDF link) ----
  app.get("/admin/prospectus", requireAuth, async (req, res) => {
    try {
      if (!(await requireAdminProfile(req, res))) return;
      const stored = await loadStored();
      if (!stored) return res.json({ success: true, exists: false });

      let fileUrl = null;
      if (stored.storagePath) {
        try {
          fileUrl = await createReadSignedUrl(stored.storagePath);
        } catch (e) {
          console.warn("[Prospectus] Could not sign file URL:", e.message);
        }
      }
      return res.json({
        success: true,
        exists: true,
        program: stored.program,
        meta: metaOf(stored),
        fileUrl,
        curriculum: stored.curriculum || [],
      });
    } catch (error) {
      console.error("Prospectus view error:", error);
      return res.status(500).json({ error: error.message || "Failed to load prospectus." });
    }
  });

  // ---- Admin: upload / replace ----
  app.post("/admin/prospectus", requireAuth, async (req, res) => {
    try {
      const profile = await requireAdminProfile(req, res);
      if (!profile) return;

      const { fileBase64, fileName, fileType } = req.body || {};
      if (!fileBase64 || !fileName) {
        return res.status(400).json({ error: "fileBase64 and fileName are required." });
      }
      const mime = String(fileType || "").toLowerCase();
      if (mime !== "application/pdf" && !/\.pdf$/i.test(String(fileName))) {
        return res.status(400).json({ error: "The prospectus must be a PDF file." });
      }

      const cleaned = String(fileBase64).includes(",") ? String(fileBase64).split(",")[1] : String(fileBase64);
      const buffer = Buffer.from(cleaned, "base64");
      if (buffer.length < 1000) return res.status(400).json({ error: "The file is empty or too small." });
      if (buffer.length > MAX_FILE_BYTES) return res.status(400).json({ error: "File must be under 10MB." });
      if (buffer.slice(0, 5).toString("latin1") !== "%PDF-") {
        return res.status(400).json({ error: "That file is not a valid PDF." });
      }

      // 1. Parse FIRST. If this fails the current prospectus is left untouched.
      let parsed;
      try {
        const { value } = await generateGradeAIText(
          [{ text: PROSPECTUS_PROMPT }, { inlineData: { mimeType: "application/pdf", data: cleaned } }],
          {
            label: "Prospectus Parse",
            parse: (text) => {
              const t = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
              const match = t.match(/\{[\s\S]*\}/);
              if (!match) throw new Error("No JSON object in AI response.");
              return normalizeParsedCurriculum(JSON.parse(match[0]));
            },
          }
        );
        parsed = value;
      } catch (parseError) {
        console.error("[Prospectus] parse failed:", parseError.message);
        const readable = /subject|prospectus|units/i.test(parseError.message || "");
        return res.status(422).json({
          error: readable
            ? parseError.message.replace(/^AI response format error:\s*/, "")
            : "Could not read this prospectus right now. Please try again, or use a clearer PDF.",
        });
      }

      // 2. Store the PDF, write the new record, then remove the old file.
      const previous = await loadStored();
      const safeName = sanitizeFileName(fileName);
      const storagePath = `prospectus/${Date.now()}-${safeName}`;
      await bucket.file(storagePath).save(buffer, {
        metadata: { contentType: "application/pdf", cacheControl: "private,max-age=0,no-transform" },
        resumable: false,
      });
      try {
        await saveCurriculum({ parsed, fileName: safeName, storagePath, profile });
      } catch (saveError) {
        await deleteStoredFile(storagePath);
        throw saveError;
      }
      if (previous?.storagePath && previous.storagePath !== storagePath) {
        await deleteStoredFile(previous.storagePath);
      }

      const stored = await loadStored();
      return res.json({
        success: true,
        replaced: Boolean(previous),
        program: stored.program,
        meta: metaOf(stored),
        curriculum: stored.curriculum,
        fileUrl: await createReadSignedUrl(storagePath).catch(() => null),
      });
    } catch (error) {
      console.error("Prospectus upload error:", error);
      return res.status(500).json({ error: error.message || "Failed to upload prospectus." });
    }
  });

  // ---- Admin: delete ----
  app.delete("/admin/prospectus", requireAuth, async (req, res) => {
    try {
      if (!(await requireAdminProfile(req, res))) return;
      const stored = await loadStored();
      if (!stored) return res.json({ success: true, deleted: false });
      await docRef().delete();
      await deleteStoredFile(stored.storagePath);
      return res.json({ success: true, deleted: true });
    } catch (error) {
      console.error("Prospectus delete error:", error);
      return res.status(500).json({ error: error.message || "Failed to delete prospectus." });
    }
  });

  // ---- Student progress (uses whatever prospectus the admin uploaded) ----
  app.get("/prospectus/:studentId", requireAuth, async (req, res) => {
    try {
      const { studentId } = req.params;
      const profile = await findUserProfileByAuthUid(req.user.uid);
      if (!profile) return res.status(403).json({ error: "Unauthorized." });

      // Same rule as /student-grade/parse: students only see their own record.
      if (
        profile.role === "student" &&
        profile.data.studentId !== studentId &&
        profile.id !== studentId
      ) {
        return res.status(403).json({ error: "Unauthorized to view this prospectus." });
      }

      const stored = await loadStored();
      if (!stored?.curriculum?.length) {
        return res.json({ success: true, hasProspectus: false });
      }

      const snapshot = await db
        .collection("studentParsedGrades")
        .where("studentId", "==", studentId)
        .get();
      const terms = snapshot.docs.map((d) => d.data());

      return res.json({
        success: true,
        hasProspectus: true,
        program: stored.program,
        passingGrade: PASSING_GRADE_MAX,
        ...buildProspectus(terms, stored.curriculum),
      });
    } catch (error) {
      console.error("Prospectus error:", error);
      return res.status(500).json({ error: error.message || "Failed to build prospectus." });
    }
  });
}