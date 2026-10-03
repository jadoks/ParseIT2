import { useCallback, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────
export type ScheduleEntry = {
  days: string[];
  startTime: string; // 24h HH:MM
  endTime: string;
  room?: string | null;
};

export type SectionOption = { id: string; label: string };
export type SectionConfig = Record<string, SectionOption[]>; // "1st" | "2nd" | ...

export type ProgramSection = {
  id: string; // "1B"
  label: string; // "BSIT 1B" (as printed on the program)
  year: string | null; // "1st" (null when the program shows no section)
  students?: number | null;
  schedule: ScheduleEntry[];
};

export type ProgramSubject = {
  key: string; // courseCode if the program has one, else the title
  courseCode: string; // may be "" (custom schedules have no codes)
  title: string;
  units: number;
  sections: ProgramSection[];
};

export type TeacherProgram = {
  teacherId: string;
  fileName: string;
  semester: string | null; // "1st Semester"
  schoolYear: string | null; // "2026-2027"
  subjects: ProgramSubject[];
  updatedAt?: string | null;
};

// Minimal shape of an already-created class (works for teacher + admin lists).
export type ExistingClassLite = {
  id?: string;
  name?: string | null;
  courseCode?: string | null;
  section?: string | null;
  semester?: string | null;
  schoolYear?: string | null;
  status?: string | null;
};

export type SectionState = "available" | "created" | "notConfigured";

export type SubjectView = Omit<ProgramSubject, "sections"> & {
  sections: (ProgramSection & { state: SectionState })[];
};

// What gets pushed into the existing Create Class form fields.
export type ProgramAutofill = {
  courseCode: string;
  courseName: string;
  units: number;
  semester: string | null;
  startYear: string | null;
  yearId: string | null;
  sectionId: string | null; // null = program didn't say; user picks it
  schedule: ScheduleEntry[];
};

export type Fetcher = (path: string, init?: any) => Promise<Response>;

// ── Default sections (used until/unless admin saves a custom list) ─────────
export const DEFAULT_SECTION_CONFIG: SectionConfig = {
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

// Pseudo-section for schedule cells that have no section printed on them.
export const UNKNOWN_SECTION_ID = "?";

export const YEAR_IDS = ["1st", "2nd", "3rd", "4th"];

// ── Matching helpers ─────────────────────────────────────────────────────
const normCode = (v?: string | null) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normName = (v?: string | null) => String(v || "").toUpperCase().replace(/\s+/g, " ").trim();

// "1B Google" -> "1B". Prefers an exact match in the live config, then falls
// back to the leading "<digit><letters>" token.
export function sectionIdFromLabel(label: string | null | undefined, config: SectionConfig): string | null {
  const text = String(label || "").trim();
  if (!text) return null;
  const hit = Object.values(config).flat().find((s) => s.label === text);
  if (hit) return hit.id;
  const m = text.toUpperCase().match(/(\d)\s*[- ]?\s*([A-Z]{1,2})\b/);
  return m ? `${m[1]}${m[2]}` : null;
}

function isCreated(
  subject: ProgramSubject,
  section: ProgramSection,
  program: TeacherProgram,
  existing: ExistingClassLite[],
  config: SectionConfig
): boolean {
  const subjectCode = normCode(subject.courseCode);
  const subjectName = normName(subject.title);

  return existing.some((klass) => {
    if (klass.status === "archived") return false;

    // The form is filled with the program's title, so a created class has the
    // same name. A matching course code (admin flow) also counts.
    const klassCode = normCode(klass.courseCode);
    const sameCode = !!klassCode && !!subjectCode && klassCode === subjectCode;
    const sameSubject = sameCode || (!!subjectName && normName(klass.name) === subjectName);
    if (!sameSubject) return false;

    if (program.semester && klass.semester && klass.semester !== program.semester) return false;
    if (program.schoolYear && klass.schoolYear && klass.schoolYear !== program.schoolYear) return false;
    // No section on the program: any class for this subject counts as created.
    if (section.id === UNKNOWN_SECTION_ID) return true;
    return sectionIdFromLabel(klass.section, config) === section.id;
  });
}

// Subjects the picker should list. A subject disappears once EVERY one of its
// sections has been created; otherwise created sections stay visible but
// un-clickable.
export function buildSubjectViews(
  program: TeacherProgram | null,
  existing: ExistingClassLite[],
  config: SectionConfig
): SubjectView[] {
  if (!program) return [];
  const views: SubjectView[] = [];

  for (const subject of program.subjects) {
    const sections = subject.sections.map((section) => {
      let state: SectionState = "available";
      if (isCreated(subject, section, program, existing, config)) state = "created";
      else if (
        section.id !== UNKNOWN_SECTION_ID &&
        !(config[section.year || ""] || []).some((s) => s.id === section.id)
      )
        state = "notConfigured";
      return { ...section, state };
    });
    if (sections.every((s) => s.state === "created")) continue;
    views.push({ ...subject, sections });
  }
  return views;
}

// Default checked section = the first AVAILABLE one (the "A" section unless
// it was already created).
export function defaultSectionFor(subject: SubjectView) {
  return subject.sections.find((s) => s.state === "available") || null;
}

export function buildAutofill(program: TeacherProgram, subject: SubjectView, section: ProgramSection): ProgramAutofill {
  const startYear = program.schoolYear?.split("-")[0];
  return {
    courseCode: subject.courseCode,
    courseName: subject.title,
    units: subject.units,
    semester: program.semester,
    startYear: startYear && /^\d{4}$/.test(startYear) ? startYear : null,
    yearId: section.year,
    sectionId: section.id === UNKNOWN_SECTION_ID ? null : section.id,
    schedule: section.schedule,
  };
}

// Converts autofill schedule -> the form-block shape both modals use.
// Fresh ids make React remount TimeInputField, which only reads its `value`
// prop once on mount.
export function toFormBlocks(schedule: ScheduleEntry[]) {
  return schedule.map((entry) => ({
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    days: [...entry.days],
    startTime: entry.startTime,
    endTime: entry.endTime,
    room: entry.room || "",
  }));
}

// ── Section config hook ───────────────────────────────────────────────────
export function useSectionConfig(fetcher: Fetcher) {
  const [config, setConfig] = useState<SectionConfig>(DEFAULT_SECTION_CONFIG);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const response = await fetcher("/section-config");
      const body = await response.json();
      if (response.ok && body?.data?.years) setConfig({ ...DEFAULT_SECTION_CONFIG, ...body.data.years });
    } catch (error) {
      console.warn("Using default sections:", error);
    } finally {
      setLoaded(true);
    }
  }, [fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { config, setConfig, reload, loaded };
}