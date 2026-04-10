export type RiskLevel = 'Low' | 'Moderate' | 'High';

// 🔥 NEW
export type TrendDirection = 'up' | 'down' | 'stable';

export interface AnalyticsAssignment {
  id: string;
  title: string;
  status: 'pending' | 'submitted' | 'graded';
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

  average: number;
  predictedGrade: number;

  riskLevel: RiskLevel;

  // 🔥 NEW (FOR UI + AI LOGIC)
  trend: number;
  trendDirection: TrendDirection;
  trendSymbol: string;
}

export interface StudentAnalyticsSummary {
  overallAverage: number;
  predictedFinalGrade: number;

  totalPendingAssignments: number;
  totalSubmittedAssignments: number;

  weakestSubject: string;
  strongestSubject: string;

  overallRisk: RiskLevel;

  recommendations: string[];

  subjectSummaries: SubjectAnalyticsSummary[];

  // 🔥 NEW
  overallTrend: number;
}

export interface TeacherStudentRow {
  studentId: string;
  studentName: string;
  overallAverage: number;
  totalPendingAssignments: number;
  totalSubmittedAssignments: number;
  riskLevel: RiskLevel;

  // 🔥 FUTURE SUPPORT
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