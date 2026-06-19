export type RiskLevel = 'No Data' | 'Low' | 'Moderate' | 'High';
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
  /**
   * Raw earned score from Firebase / backend.
   * Example: if the student got 40 out of 50, points should be 40.
   * Do not store percentage here.
   */
  points?: number;
  /**
   * Total possible score for the assignment.
   * Example: if the student got 40 out of 50, maxPoints should be 50.
   */
  maxPoints?: number;
  rawPoints?: number | null;
  dueDate?: any;
  submittedAt?: any;
  gradedAt?: any;
  feedback?: string | null;
  topic?: string;
}

export interface AnalyticsCourse {
  id: string;
  name: string;
  code: string;
  courseCode?: string;
  classCode?: string;
  instructor: string;
  section?: string;
  yearLevel?: string;
  semester?: string;
  schoolYear?: string;
  assignments: AnalyticsAssignment[];
}

// --- NEW INTERFACES FOR REDESIGNED DASHBOARD ---
export interface RecentGradedAssignment {
  id: string;
  title: string;
  courseName: string;
  score: number;
  gradedAt: any;
  status: AssignmentStatusType;
}

export interface AssignmentTrendPoint {
  title: string;
  score: number;
  date: any;
}

export interface GradeDistribution {
  excellent: number;
  good: number;
  average: number;
  needsImprovement: number;
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
  // New fields for Per-Subject Details
  highestGrade: number;
  lowestGrade: number;
}

export interface StudentAnalyticsSummary {
  overallAverage: number;
  predictedFinalGrade: number;
  totalPendingAssignments: number;
  totalMissingAssignments: number;
  totalSubmittedAssignments: number;
  totalGradedAssignments: number;
  totalAssignmentsCount: number; // Added for Completion Rate calculation
  weakestSubject: string;
  strongestSubject: string;
  overallRisk: RiskLevel;
  recommendations: string[];
  subjectSummaries: SubjectAnalyticsSummary[];
  overallTrend: number;
  missingAssignments: AnalyticsAssignment[];
  
  // New fields for redesigned dashboard
  highestAssignmentGrade: number;
  recentGradedAssignments: RecentGradedAssignment[];
  assignmentScoreTrend: AssignmentTrendPoint[];
  gradeDistribution: GradeDistribution;
  mostImprovedSubject: string;
}

export interface TeacherStudentRow {
  studentId: string;
  studentName: string;
  overallAverage: number;
  totalPendingAssignments: number;
  totalMissingAssignments: number;
  totalSubmittedAssignments: number;
  totalGradedAssignments: number;
  riskLevel: RiskLevel;
  overallTrend?: number;
}

export interface TeacherAnalyticsSummary {
  classAverage: number;
  totalStudents: number;
  noDataCount: number;
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
  noDataCount: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
}

export interface AdminAnalyticsSummary {
  departmentAverage: number;
  totalCourses: number;
  totalStudents: number;
  totalNoData: number;
  totalHighRisk: number;
  totalModerateRisk: number;
  totalLowRisk: number;
  courseRows: AdminCourseRow[];
}