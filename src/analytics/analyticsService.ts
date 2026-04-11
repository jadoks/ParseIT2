import {
  average,
  getAssignmentAverage,
  getAssignmentScoreSeries,
  getGradedCount,
  getMissingAssignments,
  getMissingCount,
  getPendingCount,
  getPredictedGrade,
  getSubmittedCount,
  getTrendDirection,
  getTrendSymbol,
  getTrendValue,
  normalizeAssignments,
} from './metrics';
import {
  evaluateAssignmentRisk,
  getRecommendations,
  getRiskLevel,
} from './riskEngine';
import {
  AdminAnalyticsSummary,
  AdminCourseRow,
  AnalyticsAssignment,
  AnalyticsCourse,
  StudentAnalyticsSummary,
  SubjectAnalyticsSummary,
  TeacherAnalyticsSummary,
  TeacherStudentRow,
} from './types';

const getStrongestSubject = (
  subjectSummaries: SubjectAnalyticsSummary[]
): string => {
  if (!subjectSummaries.length) return 'N/A';

  return [...subjectSummaries].sort((a, b) => b.average - a.average)[0]
    .courseName;
};

const getWeakestSubject = (
  subjectSummaries: SubjectAnalyticsSummary[]
): string => {
  if (!subjectSummaries.length) return 'N/A';

  return [...subjectSummaries].sort((a, b) => a.average - b.average)[0]
    .courseName;
};

export const buildSubjectAnalyticsSummary = (
  course: AnalyticsCourse,
  currentDate: Date = new Date()
): SubjectAnalyticsSummary => {
  const normalizedAssignments = normalizeAssignments(
    course.assignments,
    currentDate
  );

  const averageScore = getAssignmentAverage(normalizedAssignments);
  const gradedCount = getGradedCount(normalizedAssignments);
  const submittedCount = getSubmittedCount(normalizedAssignments);
  const pendingCount = getPendingCount(normalizedAssignments);
  const missingCount = getMissingCount(normalizedAssignments);

  const predictedGrade = getPredictedGrade(
    averageScore,
    pendingCount,
    submittedCount,
    missingCount
  );

  const scoreSeries = getAssignmentScoreSeries(normalizedAssignments);
  const trend = getTrendValue(scoreSeries);
  const trendDirection = getTrendDirection(trend);
  const trendSymbol = getTrendSymbol(trend);

  const riskLevel = getRiskLevel(averageScore, pendingCount, missingCount);

  return {
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code,
    instructor: course.instructor,
    totalAssignments: normalizedAssignments.length,
    gradedCount,
    submittedCount,
    pendingCount,
    missingCount,
    average: averageScore,
    predictedGrade,
    riskLevel,
    trend,
    trendDirection,
    trendSymbol,
  };
};

export const buildStudentAnalytics = (
  courses: AnalyticsCourse[],
  currentDate: Date = new Date()
): StudentAnalyticsSummary => {
  const subjectSummaries = courses.map((course) =>
    buildSubjectAnalyticsSummary(course, currentDate)
  );

  const allAssignments: AnalyticsAssignment[] = courses.flatMap((course) =>
    normalizeAssignments(course.assignments, currentDate)
  );

  const overallAverage = average(
    subjectSummaries
      .map((summary) => summary.average)
      .filter((value) => value > 0)
  );

  const totalPendingAssignments = subjectSummaries.reduce(
    (sum, summary) => sum + summary.pendingCount,
    0
  );

  const totalMissingAssignments = subjectSummaries.reduce(
    (sum, summary) => sum + summary.missingCount,
    0
  );

  const totalSubmittedAssignments = subjectSummaries.reduce(
    (sum, summary) => sum + summary.submittedCount,
    0
  );

  const predictedFinalGrade = getPredictedGrade(
    overallAverage,
    totalPendingAssignments,
    totalSubmittedAssignments,
    totalMissingAssignments
  );

  const scoreSeries = subjectSummaries
    .map((summary) => summary.average)
    .filter((value) => value > 0);

  const overallTrend = getTrendValue(scoreSeries);

  const weakestSubject = getWeakestSubject(subjectSummaries);
  const strongestSubject = getStrongestSubject(subjectSummaries);

  const overallRisk = getRiskLevel(
    overallAverage,
    totalPendingAssignments,
    totalMissingAssignments
  );

  const recommendations = getRecommendations(
    overallAverage,
    totalPendingAssignments,
    totalMissingAssignments,
    weakestSubject !== 'N/A' ? weakestSubject : undefined
  );

  const missingAssignments = getMissingAssignments(allAssignments);

  return {
    overallAverage,
    predictedFinalGrade,
    totalPendingAssignments,
    totalMissingAssignments,
    totalSubmittedAssignments,
    weakestSubject,
    strongestSubject,
    overallRisk,
    recommendations,
    subjectSummaries,
    overallTrend,
    missingAssignments,
  };
};

export const buildTeacherStudentRow = (
  studentId: string,
  studentName: string,
  courses: AnalyticsCourse[],
  currentDate: Date = new Date()
): TeacherStudentRow => {
  const studentSummary = buildStudentAnalytics(courses, currentDate);

  return {
    studentId,
    studentName,
    overallAverage: studentSummary.overallAverage,
    totalPendingAssignments: studentSummary.totalPendingAssignments,
    totalMissingAssignments: studentSummary.totalMissingAssignments,
    totalSubmittedAssignments: studentSummary.totalSubmittedAssignments,
    riskLevel: studentSummary.overallRisk,
    overallTrend: studentSummary.overallTrend,
  };
};

export const buildTeacherAnalyticsSummary = (
  students: {
    studentId: string;
    studentName: string;
    courses: AnalyticsCourse[];
  }[],
  currentDate: Date = new Date()
): TeacherAnalyticsSummary => {
  const studentRows: TeacherStudentRow[] = students.map((student) =>
    buildTeacherStudentRow(
      student.studentId,
      student.studentName,
      student.courses,
      currentDate
    )
  );

  const classAverage = average(
    studentRows
      .map((student) => student.overallAverage)
      .filter((value) => value > 0)
  );

  const totalStudents = studentRows.length;

  const highRiskCount = studentRows.filter(
    (student) => student.riskLevel === 'High'
  ).length;

  const moderateRiskCount = studentRows.filter(
    (student) => student.riskLevel === 'Moderate'
  ).length;

  const lowRiskCount = studentRows.filter(
    (student) => student.riskLevel === 'Low'
  ).length;

  return {
    classAverage,
    totalStudents,
    highRiskCount,
    moderateRiskCount,
    lowRiskCount,
    studentRows,
  };
};

// Backward-compatible export for TeacherAnalytics.tsx
export const buildTeacherAnalytics = buildTeacherAnalyticsSummary;

export const buildAdminCourseRow = (
  course: AnalyticsCourse,
  enrolledStudents: {
    studentId: string;
    studentName: string;
    courses: AnalyticsCourse[];
  }[],
  currentDate: Date = new Date()
): AdminCourseRow => {
  const matchingCourseSummaries = enrolledStudents
    .map((student) =>
      student.courses.find((studentCourse) => studentCourse.id === course.id)
    )
    .filter(
      (studentCourse): studentCourse is AnalyticsCourse =>
        Boolean(studentCourse)
    )
    .map((studentCourse) =>
      buildSubjectAnalyticsSummary(studentCourse, currentDate)
    );

  const averageScore = average(
    matchingCourseSummaries
      .map((summary) => summary.average)
      .filter((value) => value > 0)
  );

  const highRiskCount = matchingCourseSummaries.filter(
    (summary) => summary.riskLevel === 'High'
  ).length;

  const moderateRiskCount = matchingCourseSummaries.filter(
    (summary) => summary.riskLevel === 'Moderate'
  ).length;

  const lowRiskCount = matchingCourseSummaries.filter(
    (summary) => summary.riskLevel === 'Low'
  ).length;

  return {
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code,
    instructor: course.instructor,
    average: averageScore,
    highRiskCount,
    moderateRiskCount,
    lowRiskCount,
  };
};

export const buildAdminAnalyticsSummary = (
  courses: AnalyticsCourse[],
  students: {
    studentId: string;
    studentName: string;
    courses: AnalyticsCourse[];
  }[],
  currentDate: Date = new Date()
): AdminAnalyticsSummary => {
  const courseRows = courses.map((course) =>
    buildAdminCourseRow(course, students, currentDate)
  );

  const teacherSummary = buildTeacherAnalyticsSummary(students, currentDate);

  const departmentAverage = average(
    courseRows.map((course) => course.average).filter((value) => value > 0)
  );

  return {
    departmentAverage,
    totalCourses: courses.length,
    totalStudents: teacherSummary.totalStudents,
    totalHighRisk: teacherSummary.highRiskCount,
    totalModerateRisk: teacherSummary.moderateRiskCount,
    totalLowRisk: teacherSummary.lowRiskCount,
    courseRows,
  };
};

export const buildStudentAnalyticsWithRiskDetails = (
  courses: AnalyticsCourse[],
  currentDate: Date = new Date()
) => {
  const studentSummary = buildStudentAnalytics(courses, currentDate);

  const weakestSubjectSummary = studentSummary.subjectSummaries.find(
    (subject) => subject.courseName === studentSummary.weakestSubject
  );

  const weakestCourse = courses.find(
    (course) => course.id === weakestSubjectSummary?.courseId
  );

  const riskDetails = weakestCourse
    ? evaluateAssignmentRisk(
        weakestCourse.assignments,
        weakestCourse.name,
        currentDate
      )
    : null;

  return {
    studentSummary,
    riskDetails,
  };
};