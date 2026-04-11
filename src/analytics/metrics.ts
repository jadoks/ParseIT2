import { AnalyticsAssignment, TrendDirection } from './types';

export const roundToWhole = (value: number): number => {
  return Math.round(value);
};

export const getScorePercent = (
  assignment: AnalyticsAssignment
): number | null => {
  if (
    assignment.status !== 'graded' ||
    assignment.points === undefined ||
    assignment.maxPoints === undefined ||
    assignment.maxPoints === 0
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
  return assignments.filter((assignment) => assignment.status === 'submitted');
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
  missingCount: number
): number => {
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

export const isAssignmentMissing = (
  assignment: AnalyticsAssignment,
  currentDate: Date = new Date()
): boolean => {
  if (assignment.status !== 'pending' || !assignment.dueDate) return false;

  const dueDate = new Date(assignment.dueDate);
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
  assignments: AnalyticsAssignment[],
  currentDate: Date = new Date()
): AnalyticsAssignment[] => {
  return assignments.map((assignment) =>
    normalizeAssignmentStatus(assignment, currentDate)
  );
};