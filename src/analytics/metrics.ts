import { AnalyticsAssignment, TrendDirection } from './types';

export const roundToWhole = (value: number): number => {
  return Math.round(value);
};

export const getScorePercent = (
  assignment: AnalyticsAssignment
): number | null => {
  if (
    assignment.status !== 'graded' ||
    assignment.points == null ||
    assignment.maxPoints == null ||
    assignment.maxPoints <= 0
  ) {
    return null;
  }

  return roundToWhole((assignment.points / assignment.maxPoints) * 100);
};

export const average = (values: number[]): number => {
  if (!values.length) return 0;

  const total = values.reduce((sum, value) => sum + value, 0);
  return roundToWhole(total / values.length);
};

export const getGradedAssignments = (
  assignments: AnalyticsAssignment[]
): AnalyticsAssignment[] => {
  return assignments.filter((assignment) => assignment.status === 'graded');
};

export const getSubmittedAssignments = (
  assignments: AnalyticsAssignment[]
): AnalyticsAssignment[] => {
  // 'late' means submitted-but-tardy (see StudentApp.tsx status derivation) —
  // it's only ever assigned to work that was actually turned in and not yet
  // graded, so it belongs in the submitted bucket, not missing/pending.
  return assignments.filter(
    (assignment) => assignment.status === 'submitted' || assignment.status === 'late'
  );
};

export const getPendingAssignments = (
  assignments: AnalyticsAssignment[]
): AnalyticsAssignment[] => {
  return assignments.filter((assignment) => assignment.status === 'pending');
};

export const getMissingAssignments = (
  assignments: AnalyticsAssignment[]
): AnalyticsAssignment[] => {
  return assignments.filter((assignment) => assignment.status === 'missing');
};

export const getAssignmentAverage = (
  assignments: AnalyticsAssignment[]
): number => {
  const gradedPercents = getGradedAssignments(assignments)
    .map(getScorePercent)
    .filter((value): value is number => value !== null);

  return average(gradedPercents);
};

export const getGradedCount = (assignments: AnalyticsAssignment[]): number => {
  return getGradedAssignments(assignments).length;
};

export const getSubmittedCount = (
  assignments: AnalyticsAssignment[]
): number => {
  return getSubmittedAssignments(assignments).length;
};

export const getPendingCount = (
  assignments: AnalyticsAssignment[]
): number => {
  return getPendingAssignments(assignments).length;
};

export const getMissingCount = (
  assignments: AnalyticsAssignment[]
): number => {
  return getMissingAssignments(assignments).length;
};

export const getPredictedGrade = (
  averageScore: number,
  pendingCount: number,
  submittedCount: number,
  missingCount: number,
  gradedCount: number = 0
): number => {
  if (gradedCount === 0) return 0;
  if (averageScore === 0) return 0;

  const predicted =
    averageScore - pendingCount * 1 - missingCount * 3 + submittedCount * 1;

  if (predicted < 0) return 0;
  if (predicted > 100) return 100;

  return roundToWhole(predicted);
};

export const getAssignmentScoreSeries = (
  assignments: AnalyticsAssignment[]
): number[] => {
  return assignments
    .map(getScorePercent)
    .filter((value): value is number => value !== null);
};

export const getTrendValue = (values: number[]): number => {
  if (values.length < 2) return 0;

  const first = values[0];
  const last = values[values.length - 1];

  return roundToWhole(last - first);
};

export const getTrendDirection = (trend: number): TrendDirection => {
  if (trend > 2) return 'up';
  if (trend < -2) return 'down';
  return 'stable';
};

export const getTrendSymbol = (trend: number): string => {
  if (trend > 2) return '↑';
  if (trend < -2) return '↓';
  return '→';
};

// Due dates are stored as "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM". A date-only value
// means "due at the end of that day" (23:59 local) — the same rule as
// parseDueDateTime in server.js and the client screens. Plain `new Date('YYYY-MM-DD')`
// would read it as midnight UTC, flagging work as missing hours before it is
// actually late in any timezone ahead of UTC.
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseDateValue = (value: any): Date | null => {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value?._seconds === 'number') {
    return new Date(value._seconds * 1000);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dateOnly = trimmed.match(DATE_ONLY_PATTERN);
    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        23,
        59
      );
    }
    // "YYYY-MM-DD HH:MM" -> "YYYY-MM-DDTHH:MM" (same as the server; also parses on Hermes)
    const parsedString = new Date(trimmed.replace(' ', 'T'));
    return Number.isNaN(parsedString.getTime()) ? null : parsedString;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isAssignmentMissing = (
  assignment: AnalyticsAssignment,
  currentDate: Date = new Date()
): boolean => {
  if (assignment.status !== 'pending' || !assignment.dueDate) return false;

  const dueDate = parseDateValue(assignment.dueDate);
  if (!dueDate) return false;

  return dueDate.getTime() < currentDate.getTime();
};

export const normalizeAssignmentStatus = (
  assignment: AnalyticsAssignment,
  currentDate: Date = new Date()
): AnalyticsAssignment => {
  if (isAssignmentMissing(assignment, currentDate)) {
    return {
      ...assignment,
      status: 'missing',
    };
  }

  return assignment;
};

export const normalizeAssignments = (
  assignments: AnalyticsAssignment[] = [],
  currentDate: Date = new Date()
): AnalyticsAssignment[] => {
  return assignments.map((assignment) =>
    normalizeAssignmentStatus(assignment, currentDate)
  );
};