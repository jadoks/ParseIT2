export type RiskLevel = 'Low' | 'Moderate' | 'High';

export type TrendDirection = 'up' | 'down' | 'stable';

export type AssignmentStatusType =
  | 'pending'
  | 'submitted'
  | 'graded'
  | 'missing';

export interface AnalyticsAssignment {
  id: string;
  title: string;
  status: AssignmentStatusType;
  points?: number;
  maxPoints?: number;
  dueDate?: string;
  topic?: string;
}

export interface AnalyticsCourse {
  id: string;
  name: string;
  code: string;
  instructor: string;
  assignments: AnalyticsAssignment[];
}

export interface SubjectAnalyticsSummary {
  courseId: string;
  courseName: string;
  courseCode: string;
  instructor: string;

  totalAssignments: number;
  gradedCount: number;
  submittedCount: number;
  pendingCount: number;
  missingCount: number;

  average: number;
  predictedGrade: number;

  riskLevel: RiskLevel;

  trend: number;
  trendDirection: TrendDirection;
  trendSymbol: string;
}

export interface StudentAnalyticsSummary {
  overallAverage: number;
  predictedFinalGrade: number;

  totalPendingAssignments: number;
  totalMissingAssignments: number;
  totalSubmittedAssignments: number;

  weakestSubject: string;
  strongestSubject: string;

  overallRisk: RiskLevel;

  recommendations: string[];

  subjectSummaries: SubjectAnalyticsSummary[];

  overallTrend: number;

  missingAssignments: AnalyticsAssignment[];
}

export interface TeacherStudentRow {
  studentId: string;
  studentName: string;
  overallAverage: number;
  totalPendingAssignments: number;
  totalMissingAssignments: number;
  totalSubmittedAssignments: number;
  riskLevel: RiskLevel;
  overallTrend?: number;
}

export interface TeacherAnalyticsSummary {
  classAverage: number;
  totalStudents: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  studentRows: TeacherStudentRow[];
}

export interface AdminCourseRow {
  courseId: string;
  courseName: string;
  courseCode: string;
  instructor: string;
  average: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
}

export interface AdminAnalyticsSummary {
  departmentAverage: number;
  totalCourses: number;
  totalStudents: number;
  totalHighRisk: number;
  totalModerateRisk: number;
  totalLowRisk: number;
  courseRows: AdminCourseRow[];
}