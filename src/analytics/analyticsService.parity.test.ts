/**
 * analyticsService.parity.test.ts
 *
 * WHAT THIS CHECKS
 * Student and Teacher analytics are computed here on the client, by
 * buildTeacherAnalyticsSummary() in analyticsService.ts (which itself calls
 * normalizeAssignments/getRiskLevel from metrics.ts / riskEngine.ts).
 * Admin analytics is computed separately, server-side, in server.js's
 * /admin-analytics route — a second implementation of the same rules,
 * now centralized in analyticsShared.cjs (see that file's header comment
 * for the full history: on 2026-09-24 these two disagreed, because the
 * server counted a "late" submission as missing).
 *
 * This test builds a handful of scenarios ONCE, converts each into the two
 * shapes each implementation expects, runs both, and asserts they produce
 * the same overallAverage / totalPending / totalMissing / totalSubmitted /
 * totalGraded / riskLevel for every student. If a future change to either
 * implementation makes them disagree, this test fails — instead of someone
 * noticing months later by tracing a specific student's numbers by hand.
 *
 * HOW TO RUN
 * This project doesn't currently have a shared test runner wired up for
 * these two codebases (client TS app + server.js), so run it directly:
 *   npx tsc --target es2019 --module commonjs --outDir <tmp> \
 *       analyticsService.ts metrics.ts riskEngine.ts types.ts \
 *       analyticsService.parity.test.ts
 *   node <tmp>/analyticsService.parity.test.js
 * (or wire it into ts-node / Jest / your existing suite — it only uses
 * Node's built-in `assert`, so it has no test-framework dependency.)
 *
 * IMPORTANT — FIX THIS PATH FOR YOUR REPO LAYOUT
 * analyticsShared.cjs lives with the backend (server.js), while this file
 * lives with the client's analytics folder. Adjust SHARED_MODULE_PATH below
 * to wherever analyticsShared.cjs actually ends up relative to this file.
 */

// No import of Node's `assert` module and no `@types/node` dependency —
// ParseIT2 is a React Native/Expo app, so its tsconfig doesn't include
// Node's ambient types by default, and this file shouldn't require adding
// them project-wide just to run one test. `assertEqual`/`assertOk` below
// are a 6-line stand-in for the two `assert` functions this file actually
// uses; the file is otherwise unchanged.
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}\n  expected: ${expected}\n  actual:   ${actual}`);
}
function assertOk(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
import { buildTeacherAnalyticsSummary } from './analyticsService';
import { RiskLevel } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SHARED_MODULE_PATH = '../../server/analyticsShared.cjs'; // <-- fix me for your repo layout
// eslint-disable-next-line @typescript-eslint/no-var-requires
const adminShared: {
  computeStudentRows: (
    input: { classes: any[]; members: any[]; assignments: any[]; submissions: any[] },
    now: number
  ) => AdminRow[];
// @ts-ignore — `require` is a real global at runtime under Node (this file
// is meant to be compiled and run with `node`, not bundled into the RN app);
// it's only unrecognized here because this project's tsconfig has no
// @types/node. Suppressed per-line instead of declaring `require` globally,
// so this doesn't silently change type-checking anywhere else in the app.
} = require(SHARED_MODULE_PATH);

interface AdminRow {
  studentId: string;
  studentName: string;
  overallAverage: number;
  totalPendingAssignments: number;
  totalMissingAssignments: number;
  totalSubmittedAssignments: number;
  totalGradedAssignments: number;
  riskLevel: RiskLevel;
}

// ---------------------------------------------------------------------------
// Canonical scenario shape: one definition, converted two ways below, so the
// test can't accidentally describe two different situations to the two
// implementations and get a false "pass".
// ---------------------------------------------------------------------------

interface ScenarioAssignment {
  id: string;
  dueDate: string; // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  totalScore?: number;
  // Omit `submission` for "never submitted". status: pending | submitted | late | graded
  submission?: { status: 'submitted' | 'late' | 'graded'; score?: number };
}

interface ScenarioClass {
  classId: string;
  className: string;
  assignments: ScenarioAssignment[];
}

interface ScenarioStudent {
  studentId: string;
  studentName: string;
  classes: ScenarioClass[];
}

interface Scenario {
  name: string;
  now: Date;
  students: ScenarioStudent[];
  // Only check these students/fields (lets a scenario focus on one thing).
  expect: Record<string, Partial<Omit<AdminRow, 'studentId' | 'studentName'>>>;
}

function toTeacherStudentInput(students: ScenarioStudent[]) {
  return students.map((student) => ({
    studentId: student.studentId,
    studentName: student.studentName,
    courses: student.classes.map((cls) => ({
      id: cls.classId,
      name: cls.className,
      code: cls.classId,
      instructor: 'T',
      assignments: cls.assignments.map((a) => ({
        id: a.id,
        title: a.id,
        status: a.submission?.status ?? 'pending',
        points: a.submission?.status === 'graded' ? a.submission.score : undefined,
        maxPoints: a.totalScore ?? 100,
        dueDate: a.dueDate,
      })),
    })),
  })) as any;
}

function toAdminFlatShape(students: ScenarioStudent[]) {
  const classes: any[] = [];
  const members: any[] = [];
  const assignments: any[] = [];
  const submissions: any[] = [];
  const seenClasses = new Map<string, string>(); // classId -> sorted assignment ids, to catch a scenario reusing one classId for what were meant to be two different classes

  for (const student of students) {
    for (const cls of student.classes) {
      const signature = [...cls.assignments].map((a) => a.id).sort().join(',');
      if (!seenClasses.has(cls.classId)) {
        seenClasses.set(cls.classId, signature);
        classes.push({ id: cls.classId });
        for (const a of cls.assignments) {
          assignments.push({ id: a.id, classId: cls.classId, dueDate: a.dueDate, totalScore: a.totalScore });
        }
      } else if (seenClasses.get(cls.classId) !== signature) {
        throw new Error(
          `Scenario error: classId "${cls.classId}" is reused across students with different assignment sets. ` +
          `Give each independent "class" its own classId, or this adapter will silently keep only the first student's assignment list.`
        );
      }
      members.push({ classId: cls.classId, userId: student.studentId, name: student.studentName, role: 'student' });
      for (const a of cls.assignments) {
        if (a.submission) {
          submissions.push({
            studentId: student.studentId,
            assignmentId: a.id,
            status: a.submission.status,
            score: a.submission.score,
          });
        }
      }
    }
  }
  return { classes, members, assignments, submissions };
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const NOW = new Date(2026, 8, 24, 10, 0); // Sep 24 2026, 10:00 local

const scenarios: Scenario[] = [
  {
    // The exact bug this whole test exists to catch: a "late" (submitted
    // late, not yet graded) assignment must count as submitted, not missing.
    // Also mixes in a genuinely missing assignment (never submitted, past
    // due) and a not-yet-due pending one, across two classes, to exercise
    // the "average of per-class averages" rollup at the same time.
    name: 'late vs missing vs pending, across two classes',
    now: NOW,
    students: [
      {
        studentId: 'alice', studentName: 'Alice',
        classes: [
          { classId: 'math101', className: 'Math101', assignments: [
            { id: 'a1', dueDate: '2026-09-10', submission: { status: 'graded', score: 90 } },
            { id: 'a2', dueDate: '2026-09-20', submission: { status: 'late' } },
            { id: 'a3', dueDate: '2026-09-30' }, // not due yet, no submission -> pending
          ]},
          { classId: 'sci101', className: 'Science101', assignments: [
            { id: 'b1', dueDate: '2026-09-10', submission: { status: 'graded', score: 70 } },
          ]},
        ],
      },
      {
        studentId: 'bob', studentName: 'Bob',
        classes: [
          { classId: 'math101', className: 'Math101', assignments: [
            { id: 'a1', dueDate: '2026-09-10' }, // never submitted, past due -> missing
            { id: 'a2', dueDate: '2026-09-20', submission: { status: 'graded', score: 60 } },
            { id: 'a3', dueDate: '2026-09-30', submission: { status: 'submitted' } },
          ]},
          { classId: 'sci101', className: 'Science101', assignments: [
            { id: 'b1', dueDate: '2026-09-10', submission: { status: 'graded', score: 100 } },
          ]},
        ],
      },
    ],
    expect: {
      alice: { overallAverage: 80, totalPendingAssignments: 1, totalMissingAssignments: 0, totalSubmittedAssignments: 1, totalGradedAssignments: 2, riskLevel: 'Moderate' },
      bob:   { overallAverage: 80, totalPendingAssignments: 0, totalMissingAssignments: 1, totalSubmittedAssignments: 1, totalGradedAssignments: 2, riskLevel: 'Moderate' },
    },
  },
  {
    name: 'no data at all',
    now: NOW,
    students: [
      { studentId: 'carl', studentName: 'Carl', classes: [
        { classId: 'math101', className: 'Math101', assignments: [
          { id: 'a1', dueDate: '2026-09-30' }, // not due yet -> pending, not missing
        ]},
      ]},
    ],
    expect: {
      carl: { overallAverage: 0, totalGradedAssignments: 0, totalMissingAssignments: 0, riskLevel: 'No Data' },
    },
  },
  {
    // Risk-threshold boundaries: getRiskLevel/getAdminRiskLevel must treat
    // these edges identically. average<75 -> High; average<85 -> Moderate;
    // missingCount>=3 -> High regardless of average; missingCount>=1 ->
    // at least Moderate; pendingCount>=3 -> at least Moderate.
    name: 'risk threshold boundaries',
    now: NOW,
    // Each student here is meant to be an independent, unrelated case — NOT
    // co-enrolled together — so each gets its own classId. (Reusing one
    // classId across students who are supposed to be in different classes
    // previously broke the admin-shape adapter below, which correctly
    // assumes one classId = one shared assignment list; caught by this
    // test itself failing until the scenario was fixed.)
    students: [
      { studentId: 'high_by_avg', studentName: 'HighByAvg', classes: [{ classId: 'c_high_avg', className: 'C', assignments: [
        { id: 'a1', dueDate: '2026-09-01', submission: { status: 'graded', score: 74 } },
      ]}]},
      { studentId: 'moderate_at_75', studentName: 'ModerateAt75', classes: [{ classId: 'c_mod_75', className: 'C', assignments: [
        { id: 'a1', dueDate: '2026-09-01', submission: { status: 'graded', score: 75 } },
      ]}]},
      { studentId: 'low_at_85', studentName: 'LowAt85', classes: [{ classId: 'c_low_85', className: 'C', assignments: [
        { id: 'a1', dueDate: '2026-09-01', submission: { status: 'graded', score: 85 } },
      ]}]},
      { studentId: 'high_by_missing', studentName: 'HighByMissing', classes: [{ classId: 'c_high_missing', className: 'C', assignments: [
        { id: 'a1', dueDate: '2026-09-01', submission: { status: 'graded', score: 95 } },
        { id: 'a2', dueDate: '2026-09-01' }, { id: 'a3', dueDate: '2026-09-01' }, { id: 'a4', dueDate: '2026-09-01' },
      ]}]},
      { studentId: 'moderate_by_pending', studentName: 'ModerateByPending', classes: [{ classId: 'c_mod_pending', className: 'C', assignments: [
        { id: 'a1', dueDate: '2026-09-01', submission: { status: 'graded', score: 95 } },
        { id: 'a2', dueDate: '2026-10-01' }, { id: 'a3', dueDate: '2026-10-01' }, { id: 'a4', dueDate: '2026-10-01' },
      ]}]},
    ],
    expect: {
      high_by_avg: { riskLevel: 'High' },
      moderate_at_75: { riskLevel: 'Moderate' },
      low_at_85: { riskLevel: 'Low' },
      high_by_missing: { riskLevel: 'High', totalMissingAssignments: 3 },
      moderate_by_pending: { riskLevel: 'Moderate', totalPendingAssignments: 3, totalMissingAssignments: 0 },
    },
  },
  {
    // The timezone/date-only bug this whole exercise started from: a
    // date-only due date must mean "due at 23:59 local", not UTC midnight.
    // Checked at 10:00 local on the due date itself -> not yet missing.
    name: 'date-only due date is end-of-day, not UTC midnight',
    now: new Date(2026, 8, 24, 10, 0), // 10:00 local, same day the assignment is due
    students: [
      { studentId: 'dana', studentName: 'Dana', classes: [{ classId: 'c1', className: 'C1', assignments: [
        { id: 'a1', dueDate: '2026-09-24' }, // due today, not submitted, checked at 10am local
      ]}]},
    ],
    expect: {
      dana: { totalMissingAssignments: 0, totalPendingAssignments: 1 },
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let failures = 0;

for (const scenario of scenarios) {
  const clientInput = toTeacherStudentInput(scenario.students);
  const clientSummary = buildTeacherAnalyticsSummary(clientInput, scenario.now);
  const clientByStudent = new Map(clientSummary.studentRows.map((r) => [r.studentId, r]));

  const adminFlat = toAdminFlatShape(scenario.students);
  const adminRows = adminShared.computeStudentRows(adminFlat, scenario.now.getTime());
  const adminByStudent = new Map(adminRows.map((r) => [r.studentId, r]));

  for (const [studentId, expected] of Object.entries(scenario.expect)) {
    const client = clientByStudent.get(studentId);
    const adminRow = adminByStudent.get(studentId);

    try {
      assertOk(client, `[${scenario.name}] ${studentId}: missing from client (Student/Teacher) result`);
      assertOk(adminRow, `[${scenario.name}] ${studentId}: missing from admin result`);

      // 1) Both implementations must match each other exactly.
      assertEqual(client!.overallAverage, adminRow!.overallAverage, `[${scenario.name}] ${studentId}: overallAverage mismatch (client=${client!.overallAverage}, admin=${adminRow!.overallAverage})`);
      assertEqual(client!.totalPendingAssignments, adminRow!.totalPendingAssignments, `[${scenario.name}] ${studentId}: totalPendingAssignments mismatch (client=${client!.totalPendingAssignments}, admin=${adminRow!.totalPendingAssignments})`);
      assertEqual(client!.totalMissingAssignments, adminRow!.totalMissingAssignments, `[${scenario.name}] ${studentId}: totalMissingAssignments mismatch (client=${client!.totalMissingAssignments}, admin=${adminRow!.totalMissingAssignments})`);
      assertEqual(client!.totalSubmittedAssignments, adminRow!.totalSubmittedAssignments, `[${scenario.name}] ${studentId}: totalSubmittedAssignments mismatch (client=${client!.totalSubmittedAssignments}, admin=${adminRow!.totalSubmittedAssignments})`);
      assertEqual(client!.totalGradedAssignments, adminRow!.totalGradedAssignments, `[${scenario.name}] ${studentId}: totalGradedAssignments mismatch (client=${client!.totalGradedAssignments}, admin=${adminRow!.totalGradedAssignments})`);
      assertEqual(client!.riskLevel, adminRow!.riskLevel, `[${scenario.name}] ${studentId}: riskLevel mismatch (client=${client!.riskLevel}, admin=${adminRow!.riskLevel})`);

      // 2) And both must match the scenario's own documented expectation,
      // so a bug that affects both implementations identically (and would
      // otherwise "pass" step 1) still gets caught.
      for (const [field, value] of Object.entries(expected)) {
        assertEqual((client as any)[field], value, `[${scenario.name}] ${studentId}: client.${field} expected ${value}, got ${(client as any)[field]}`);
        assertEqual((adminRow as any)[field], value, `[${scenario.name}] ${studentId}: admin.${field} expected ${value}, got ${(adminRow as any)[field]}`);
      }

      console.log(`PASS  [${scenario.name}] ${studentId}`);
    } catch (err: any) {
      failures += 1;
      console.error(`FAIL  ${err.message}`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} parity check(s) failed.`);
  // @ts-ignore — see the `require` note above; same reason, same fix.
  process.exit(1);
} else {
  console.log(`\nAll parity checks passed (${scenarios.length} scenarios).`);
}