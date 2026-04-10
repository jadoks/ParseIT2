import { RiskLevel } from './types';

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
}

export const getRiskLevel = (
  average: number,
  pendingAssignments: number,
  submittedAssignments: number,
  trend: number = 0
): RiskLevel => {
  if (average < 75 || pendingAssignments >= 2 || trend < -10) {
    return 'High';
  }

  if (
    average < 85 ||
    submittedAssignments > 0 ||
    pendingAssignments > 0 ||
    trend < 0
  ) {
    return 'Moderate';
  }

  return 'Low';
};

export const assessRisk = (
  average: number,
  pendingAssignments: number,
  submittedAssignments: number,
  trend: number = 0
): RiskAssessment => {
  const reasons: string[] = [];

  if (average > 0 && average < 75) {
    reasons.push('Low graded performance');
  } else if (average >= 75 && average < 85) {
    reasons.push('Average performance needs improvement');
  }

  if (pendingAssignments >= 2) {
    reasons.push('Multiple pending assignments');
  } else if (pendingAssignments === 1) {
    reasons.push('Has a pending assignment');
  }

  if (submittedAssignments > 0) {
    reasons.push('Has submitted work awaiting grading');
  }

  if (trend < -10) {
    reasons.push('Performance declining significantly');
  } else if (trend < 0) {
    reasons.push('Performance slightly declining');
  } else if (trend > 10) {
    reasons.push('Strong improvement trend');
  }

  const level = getRiskLevel(
    average,
    pendingAssignments,
    submittedAssignments,
    trend
  );

  return {
    level,
    reasons,
  };
};

export const getOverallRiskLevel = (
  overallAverage: number,
  highRiskCount: number,
  moderateRiskCount: number,
  totalPendingAssignments: number,
  overallTrend: number = 0
): RiskLevel => {
  if (
    overallAverage < 75 ||
    highRiskCount > 0 ||
    totalPendingAssignments >= 3 ||
    overallTrend < -10
  ) {
    return 'High';
  }

  if (
    overallAverage < 85 ||
    moderateRiskCount >= 2 ||
    totalPendingAssignments > 0 ||
    overallTrend < 0
  ) {
    return 'Moderate';
  }

  return 'Low';
};