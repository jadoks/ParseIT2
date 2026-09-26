// analyticsShared.js
//
// Canonical, framework-free implementation of the numbers that must agree
// across Student, Teacher and Admin analytics: an assignment's percent
// score, the "missing" default max points, whether an assignment counts as
// missing, and the risk-level thresholds.
//
// WHY THIS FILE EXISTS
// Student and Teacher analytics are computed on the client from raw
// Firestore data by analyticsService.ts / metrics.ts / riskEngine.ts.
// Admin analytics is computed separately, server-side, in server.js — a
// second, independently-written implementation of the same rules. On
// 2026-09-24 those two implementations disagreed: server.js counted a
// "late" (submitted-but-tardy) assignment as missing, while the client
// correctly counted it as submitted. Two screens showed two different
// numbers for the same student.
//
// This file is the fix for that *class* of bug, not just that one bug:
// server.js's /admin-analytics route calls classifySubmission() below for
// every assignment instead of hand-rolling the same if/else chain inline.
// analyticsService.parity.test.ts imports this same file and asserts its
// output matches buildTeacherAnalyticsSummary() (the client path) across a
// range of scenarios. Because the live route and the test both call this
// exact function, a future edit that changes behavior here is either
// (a) applied everywhere at once, or (b) caught by the parity test the
// moment it makes the two disagree again — it can no longer drift apart
// silently for weeks before someone notices while tracing numbers by hand.
//
// If you change a threshold or a definition here, also check whether
// metrics.ts / riskEngine.ts (the client copy, used by Student and Teacher
// analytics) needs the same change. This file intentionally has zero
// dependency on Firebase Admin SDK or Express, so it can be required from
// server.js and from a plain Node/ts-node test with no setup.

/**
 * A missing / zero / invalid totalScore counts as 100 everywhere (Student,
 * Teacher and Admin). Keep in sync with metrics.ts on the client — there is
 * no client equivalent of this exact function, but getScorePercent() there
 * has the same "not set -> not gradeable" behavior for maxPoints.
 */
function getAssignmentMaxPoints(assignment) {
  const value = Number(assignment?.totalScore);
  return Number.isFinite(value) && value > 0 ? value : 100;
}

/**
 * Round a raw score to a whole-number percent. Returns null (not 0) when
 * the score or max points can't be trusted, so callers can distinguish
 * "0%" from "don't count this toward any average."
 */
function getPercentFromScore(score, maxPoints) {
  const numericScore = Number(score);
  const numericMax = Number(maxPoints);

  if (
    !Number.isFinite(numericScore) ||
    !Number.isFinite(numericMax) ||
    numericMax <= 0
  ) {
    return null;
  }

  return Math.round((numericScore / numericMax) * 100);
}

/**
 * Due dates are stored as "YYYY-MM-DD" (date-only -> due at 23:59 local) or
 * "YYYY-MM-DD HH:MM" / "YYYY-MM-DDTHH:MM", or as a Firestore Timestamp /
 * { _seconds } object. This mirrors parseDueDateTime + resolveDate in
 * server.js and parseDateValue in metrics.ts on the client. It is a
 * deliberate, small, self-contained copy (like the client's own copy) —
 * NOT a require of server.js's parseDueDateTime, since that function lives
 * inside server.js's app-setup closure alongside hundreds of unrelated
 * routes and isn't safely importable on its own. Because this piece of
 * logic is tiny and rarely changes, the duplication risk is low compared
 * to the classification/threshold logic below, which is why THAT logic
 * (not this) is the part centralized in this file.
 */
function resolveDueDateForAnalytics(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value?._seconds === "number") {
    return new Date(value._seconds * 1000);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        23,
        59
      );
    }

    const parsed = new Date(trimmed.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Missing = no turned-in work (not graded / submitted / late) and past due.
 * "late" is a submitted-but-tardy assignment (see the server's
 * create-submission handler) and must NOT be treated as missing — this is
 * exactly the rule that server.js's /admin-analytics route got wrong before
 * this file existed.
 */
function isMissingSubmission(submission, assignment, now = Date.now()) {
  const status = String(submission?.status || "").toLowerCase();
  if (status === "graded" || status === "submitted" || status === "late") {
    return false;
  }
  const due = resolveDueDateForAnalytics(assignment?.dueDate);
  return !!due && due.getTime() < now;
}

/**
 * The single decision point for "what bucket does this assignment fall
 * into, for this student, right now": graded / submitted / missing /
 * pending. Every place that needs this decision (the admin route, the
 * teacher-risk-notification route, the parity test) should call this
 * instead of re-deriving it, so there is exactly one implementation to
 * keep correct.
 *
 * Returns { category, percent }. `percent` is only meaningful when
 * category === "graded", and can be null even then if the score/max
 * points aren't usable (matches the original behavior: an ungradeable
 * "graded" row is not counted toward any average, the same as the client's
 * getScorePercent returning null).
 */
function classifySubmission(submission, assignment, now = Date.now()) {
  const status = String(submission?.status || "").toLowerCase();

  if (status === "graded") {
    const maxPoints = getAssignmentMaxPoints(assignment);
    const percent = getPercentFromScore(submission?.score, maxPoints);
    return { category: "graded", percent };
  }

  if (status === "submitted" || status === "late") {
    return { category: "submitted", percent: null };
  }

  if (isMissingSubmission(submission, assignment, now)) {
    return { category: "missing", percent: null };
  }

  return { category: "pending", percent: null };
}

/**
 * Risk thresholds. Must stay identical to getRiskLevel in riskEngine.ts
 * (the client copy used by Student and Teacher analytics).
 */
function getAdminRiskLevel({ average, gradedCount, missingCount, pendingCount }) {
  if (gradedCount === 0 && missingCount === 0) return "No Data";
  if (average < 75 || missingCount >= 3) return "High";
  if (average < 85 || missingCount >= 1 || pendingCount >= 3) return "Moderate";
  return "Low";
}

/**
 * Pure, side-effect-free rollup of "given every class a set of students is
 * enrolled in, plus that class's assignments and everyone's submissions,
 * what is each student's overall average / pending / submitted / missing /
 * graded / riskLevel". This is the exact per-student math the
 * /admin-analytics route runs, extracted so it can be called from a test
 * without spinning up Firestore or Express.
 *
 * Averaging method (must match buildStudentAnalytics/buildTeacherAnalyticsSummary
 * in analyticsService.ts): a student's per-class average is the mean of
 * that class's graded-assignment percents, rounded; the student's overall
 * average is the mean of their per-class averages (only classes with at
 * least one graded assignment count), rounded again. This is "average of
 * class averages," not a single assignment-weighted average across every
 * class — matching the client exactly, including the double-rounding.
 *
 * @param {Array} classes - [{ id }]
 * @param {Array} members - [{ classId, userId, name, role, status }]
 * @param {Array} assignments - [{ id, classId, dueDate, totalScore }]
 * @param {Array} submissions - [{ studentId, assignmentId, status, score }]
 * @param {number} [now] - epoch ms; defaults to Date.now()
 * @returns {Array<{ studentId, studentName, overallAverage, totalPendingAssignments,
 *   totalMissingAssignments, totalSubmittedAssignments, totalGradedAssignments, riskLevel }>}
 */
function computeStudentRows({ classes, members, assignments, submissions }, now = Date.now()) {
  const membersByClass = new Map();
  const assignmentsByClass = new Map();
  const submissionByKey = new Map();

  members.forEach((member) => {
    if (!member.classId) return;
    if (!membersByClass.has(member.classId)) membersByClass.set(member.classId, []);
    membersByClass.get(member.classId).push(member);
  });

  assignments.forEach((assignment) => {
    if (!assignment.classId) return;
    if (!assignmentsByClass.has(assignment.classId)) assignmentsByClass.set(assignment.classId, []);
    assignmentsByClass.get(assignment.classId).push(assignment);
  });

  submissions.forEach((submission) => {
    if (submission.studentId && submission.assignmentId) {
      submissionByKey.set(`${submission.studentId}_${submission.assignmentId}`, submission);
    }
  });

  const studentMap = new Map();

  for (const classData of classes) {
    const classMembers = (membersByClass.get(classData.id) || []).filter(
      (member) =>
        member.role === "student" &&
        !["inactive", "removed", "deleted"].includes(String(member.status || "").toLowerCase())
    );
    const classAssignments = assignmentsByClass.get(classData.id) || [];

    for (const member of classMembers) {
      const studentId = member.userId;
      if (!studentId) continue;

      let scoreTotal = 0;
      let gradedCount = 0;
      let submittedCount = 0;
      let missingCount = 0;
      let pendingCount = 0;

      for (const assignment of classAssignments) {
        const submission = submissionByKey.get(`${studentId}_${assignment.id}`);
        const result = classifySubmission(submission, assignment, now);

        if (result.category === "graded") {
          if (result.percent !== null) {
            scoreTotal += result.percent;
            gradedCount += 1;
          }
          continue;
        }
        if (result.category === "submitted") { submittedCount += 1; continue; }
        if (result.category === "missing") { missingCount += 1; continue; }
        pendingCount += 1;
      }

      const classAverage = gradedCount > 0 ? Math.round(scoreTotal / gradedCount) : 0;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName: member.name || studentId,
          averageTotal: 0,
          averageCount: 0,
          pending: 0,
          submitted: 0,
          missing: 0,
          graded: 0,
        });
      }

      const row = studentMap.get(studentId);
      row.pending += pendingCount;
      row.submitted += submittedCount;
      row.missing += missingCount;
      row.graded += gradedCount;
      if (gradedCount > 0) {
        row.averageTotal += classAverage;
        row.averageCount += 1;
      }
    }
  }

  return Array.from(studentMap.values()).map((student) => {
    const average = student.averageCount > 0 ? Math.round(student.averageTotal / student.averageCount) : 0;
    const riskLevel = getAdminRiskLevel({
      average,
      gradedCount: student.graded,
      missingCount: student.missing,
      pendingCount: student.pending,
    });

    return {
      studentId: student.studentId,
      studentName: student.studentName,
      overallAverage: average,
      totalPendingAssignments: student.pending,
      totalMissingAssignments: student.missing,
      totalSubmittedAssignments: student.submitted,
      totalGradedAssignments: student.graded,
      riskLevel,
    };
  });
}

module.exports = {
  getAssignmentMaxPoints,
  getPercentFromScore,
  resolveDueDateForAnalytics,
  isMissingSubmission,
  classifySubmission,
  getAdminRiskLevel,
  computeStudentRows,
};
