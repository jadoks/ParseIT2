import {
    AnalyticsCourse,
    StudentAnalyticsSummary,
    SubjectAnalyticsSummary,
} from './types';

import {
    getAssignmentAverage,
    getAssignmentScoreSeries,
    getGradedCount,
    getPendingCount,
    getPredictedGrade,
    getSubmittedCount,
    getTrendDirection,
    getTrendSymbol,
    getTrendValue,
} from './metrics';

import {
    getOverallRiskLevel,
    getRiskLevel,
} from './riskEngine';

/**
 * Converts your AssignmentCourse[] (from StudentApp)
 * into AnalyticsCourse[]
 */
export const mapToAnalyticsCourses = (courses: any[]): AnalyticsCourse[] => {
  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    instructor: course.instructor,
    assignments: (course.assignments || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      points: a.points,
      maxPoints: a.maxPoints,
      dueDate: a.dueDate,
      topic: a.topic,
    })),
  }));
};

/**
 * Builds per-subject analytics
 */
export const buildSubjectSummaries = (
  courses: AnalyticsCourse[]
): SubjectAnalyticsSummary[] => {
  return courses.map((course) => {
    const average = getAssignmentAverage(course.assignments);
    const gradedCount = getGradedCount(course.assignments);
    const submittedCount = getSubmittedCount(course.assignments);
    const pendingCount = getPendingCount(course.assignments);

    const predictedGrade = getPredictedGrade(
      average,
      pendingCount,
      submittedCount
    );

    // 🔥 NEW: TREND CALCULATION
    const scoreSeries = getAssignmentScoreSeries(course.assignments);
    const trend = getTrendValue(scoreSeries);
    const trendDirection = getTrendDirection(trend);
    const trendSymbol = getTrendSymbol(trend);

    const riskLevel = getRiskLevel(
      average,
      pendingCount,
      submittedCount,
      trend // 🔥 NEW
    );

    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      instructor: course.instructor,

      totalAssignments: course.assignments.length,
      gradedCount,
      submittedCount,
      pendingCount,

      average,
      predictedGrade,
      riskLevel,

      // 🔥 NEW FIELDS
      trend,
      trendDirection,
      trendSymbol,
    };
  });
};

/**
 * Builds full student analytics summary
 */
export const buildStudentAnalytics = (
  rawCourses: any[]
): StudentAnalyticsSummary => {
  const courses = mapToAnalyticsCourses(rawCourses);

  const subjectSummaries = buildSubjectSummaries(courses);

  const validAverages = subjectSummaries
    .map((s) => s.average)
    .filter((v) => v > 0);

  const overallAverage =
    validAverages.length > 0
      ? Math.round(
          validAverages.reduce((sum, v) => sum + v, 0) /
            validAverages.length
        )
      : 0;

  const totalPendingAssignments = subjectSummaries.reduce(
    (sum, s) => sum + s.pendingCount,
    0
  );

  const totalSubmittedAssignments = subjectSummaries.reduce(
    (sum, s) => sum + s.submittedCount,
    0
  );

  const predictedFinalGrade = getPredictedGrade(
    overallAverage,
    totalPendingAssignments,
    totalSubmittedAssignments
  );

  // 🔥 NEW: OVERALL TREND
  const trendValues = subjectSummaries.map((s) => s.trend);
  const overallTrend =
    trendValues.length > 0
      ? Math.round(
          trendValues.reduce((sum, v) => sum + v, 0) / trendValues.length
        )
      : 0;

  const sorted = [...subjectSummaries].sort((a, b) => a.average - b.average);

  const weakestSubject =
    sorted.find((s) => s.average > 0)?.courseName ?? 'N/A';

  const strongestSubject =
    [...sorted].reverse().find((s) => s.average > 0)?.courseName ?? 'N/A';

  const highRiskCount = subjectSummaries.filter(
    (s) => s.riskLevel === 'High'
  ).length;

  const moderateRiskCount = subjectSummaries.filter(
    (s) => s.riskLevel === 'Moderate'
  ).length;

  const overallRisk = getOverallRiskLevel(
    overallAverage,
    highRiskCount,
    moderateRiskCount,
    totalPendingAssignments,
    overallTrend // 🔥 NEW
  );

  const recommendations: string[] = [];

  if (weakestSubject !== 'N/A') {
    recommendations.push(
      `Focus more on ${weakestSubject} as it has your lowest performance.`
    );
  }

  if (totalPendingAssignments > 0) {
    recommendations.push(
      `You have ${totalPendingAssignments} pending assignment(s). Completing them will improve your results.`
    );
  }

  // 🔥 NEW TREND-BASED RECOMMENDATIONS
  if (overallTrend < -2) {
    recommendations.push(
      'Your performance is declining. Review recent lessons and assignments.'
    );
  } else if (overallTrend > 2) {
    recommendations.push(
      'Your performance is improving. Keep up the good work!'
    );
  }

  if (overallAverage > 0 && overallAverage < 75) {
    recommendations.push(
      'Your performance is below expectations. Review lessons and seek help if needed.'
    );
  } else if (overallAverage >= 75 && overallAverage < 85) {
    recommendations.push(
      'You are doing okay, but consistent practice can improve your results.'
    );
  } else if (overallAverage >= 85) {
    recommendations.push(
      'Great job! Maintain your performance and aim for mastery.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'No recommendations yet. Complete more graded assignments.'
    );
  }

  return {
    overallAverage,
    predictedFinalGrade,
    totalPendingAssignments,
    totalSubmittedAssignments,
    weakestSubject,
    strongestSubject,
    overallRisk,
    recommendations,
    subjectSummaries,

    // 🔥 NEW
    overallTrend,
  };
};