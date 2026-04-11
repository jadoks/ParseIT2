import {
  getAssignmentAverage,
  getMissingCount,
  getPendingCount,
  normalizeAssignments,
} from './metrics';
import { AnalyticsAssignment, RiskLevel } from './types';

export const getRiskLevel = (
  averageScore: number,
  pendingCount: number,
  missingCount: number
): RiskLevel => {
  if (averageScore < 75 || missingCount >= 3) {
    return 'High';
  }

  if (averageScore < 85 || missingCount >= 1 || pendingCount >= 3) {
    return 'Moderate';
  }

  return 'Low';
};

export const getRiskReason = (
  averageScore: number,
  pendingCount: number,
  missingCount: number
): string => {
  if (averageScore < 75 && missingCount >= 3) {
    return 'Low average and repeated missing assignments.';
  }

  if (averageScore < 75) {
    return 'Current average is below the expected threshold.';
  }

  if (missingCount >= 3) {
    return 'Multiple missing assignments detected.';
  }

  if (missingCount >= 1) {
    return 'There are missing assignments that need immediate attention.';
  }

  if (pendingCount >= 3) {
    return 'Several pending assignments may become missing soon.';
  }

  if (averageScore < 85) {
    return 'Performance is fair but still needs improvement.';
  }

  return 'Performance is stable and on track.';
};

export const getRecommendations = (
  averageScore: number,
  pendingCount: number,
  missingCount: number,
  weakestSubject?: string
): string[] => {
  const recommendations: string[] = [];

  if (missingCount > 0) {
    recommendations.push(
      'Complete missing assignments immediately to avoid further academic risk.'
    );
  }

  if (pendingCount > 0) {
    recommendations.push(
      'Submit pending assignments before their due dates to prevent them from becoming missing.'
    );
  }

  if (averageScore < 85 && weakestSubject) {
    recommendations.push(
      `Review lessons and practice more activities in ${weakestSubject}.`
    );
  }

  if (averageScore < 75) {
    recommendations.push(
      'Set a study schedule and ask your teacher for support in difficult topics.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Keep maintaining your performance and continue submitting your work on time.'
    );
  }

  return recommendations;
};

export const evaluateAssignmentRisk = (
  assignments: AnalyticsAssignment[],
  weakestSubject?: string,
  currentDate: Date = new Date()
) => {
  const normalizedAssignments = normalizeAssignments(assignments, currentDate);

  const averageScore = getAssignmentAverage(normalizedAssignments);
  const pendingCount = getPendingCount(normalizedAssignments);
  const missingCount = getMissingCount(normalizedAssignments);

  const riskLevel = getRiskLevel(averageScore, pendingCount, missingCount);
  const riskReason = getRiskReason(averageScore, pendingCount, missingCount);
  const recommendations = getRecommendations(
    averageScore,
    pendingCount,
    missingCount,
    weakestSubject
  );

  return {
    normalizedAssignments,
    averageScore,
    pendingCount,
    missingCount,
    riskLevel,
    riskReason,
    recommendations,
  };
};