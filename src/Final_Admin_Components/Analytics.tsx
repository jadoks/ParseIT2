import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import {
    DimensionValue,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { getClassCount } from "./classStore";
import { getStudentCount } from "./studentStore";
import { getTeacherCount } from "./teacherStore";

type AnalyticsProps = {
  width: number;
};

type SummaryCardProps = {
  label: string;
  value: string;
  trend: string;
  widthValue: DimensionValue;
};

type SectionCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  widthValue?: DimensionValue;
};

type ProgressBarProps = {
  label: string;
  value: number;
  suffix?: string;
};

function SummaryCard({ label, value, trend, widthValue }: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { width: widthValue }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTrend}>{trend}</Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  widthValue = "100%",
}: SectionCardProps) {
  return (
    <View style={[styles.sectionCard, { width: widthValue }]}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionCardHeaderLeft}>
          <View style={styles.iconBox}>{icon}</View>

          <View style={styles.sectionCardHeaderTextWrap}>
            <Text style={styles.sectionCardTitle}>{title}</Text>
            <Text style={styles.sectionCardSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>

      {children}
    </View>
  );
}

function ProgressBar({ label, value, suffix = "%" }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>
          {safeValue}
          {suffix}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${safeValue}%` }]} />
      </View>
    </View>
  );
}

function StatRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text
        style={[
          styles.statRowValue,
          tone === "danger" && styles.statRowValueDanger,
          tone === "success" && styles.statRowValueSuccess,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function StudentRiskItem({
  name,
  section,
  average,
  reason,
}: {
  name: string;
  section: string;
  average: string;
  reason: string;
}) {
  return (
    <View style={styles.riskCard}>
      <View style={styles.riskTopRow}>
        <View style={styles.riskTextWrap}>
          <Text style={styles.riskName}>{name}</Text>
          <Text style={styles.riskSection}>{section}</Text>
        </View>

        <View style={styles.riskBadge}>
          <Text style={styles.riskBadgeText}>{average}</Text>
        </View>
      </View>

      <Text style={styles.riskReason}>{reason}</Text>
    </View>
  );
}

export default function Analytics({ width }: AnalyticsProps) {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const totalStudents = getStudentCount();
  const totalTeachers = getTeacherCount();
  const totalClasses = getClassCount();

  const atRiskCount = 18;
  const passRate = 84;
  const failRate = 16;
  const backlogCount = 27;

  const summaryWidth: DimensionValue = isMobile
    ? "100%"
    : isTablet
    ? "48.5%"
    : "23.5%";

  const halfWidth: DimensionValue = isMobile ? "100%" : "48.7%";

  return (
    <View>
      <View style={styles.heroRow}>
        <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
          <View
            style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
          >
            <Text style={styles.heroEyebrow}>DEPARTMENT ANALYTICS</Text>
            <Text
              style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}
            >
              Administrative Performance Dashboard
            </Text>
            <Text style={styles.heroSubtitle}>
              Monitor student risk, section performance, subject trends, and
              semester-wide academic progress across Parsers Hub 2.0.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard
          label="Students Monitored"
          value={`${totalStudents}`}
          trend="Active student records"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="At-Risk Students"
          value={`${atRiskCount}`}
          trend="Requires faculty attention"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Pass Rate"
          value={`${passRate}%`}
          trend="Current semester estimate"
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Class Backlogs"
          value={`${backlogCount}`}
          trend="Pending and incomplete work"
          widthValue={summaryWidth}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <Text style={styles.sectionSubtitle}>
            Department-level academic monitoring and analytics
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <SectionCard
          widthValue={halfWidth}
          title="Department Overview"
          subtitle="High-level academic status"
          icon={
            <Ionicons name="analytics-outline" size={24} color="#DC2626" />
          }
        >
          <StatRow label="Total Students" value={`${totalStudents}`} />
          <StatRow label="Total Teachers" value={`${totalTeachers}`} />
          <StatRow label="Total Classes" value={`${totalClasses}`} />
          <StatRow
            label="At-Risk Population"
            value={`${atRiskCount}`}
            tone="danger"
          />
          <StatRow label="Pass Rate" value={`${passRate}%`} tone="success" />
          <StatRow label="Fail Rate" value={`${failRate}%`} tone="danger" />
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Semester Performance Trend"
          subtitle="Current academic cycle summary"
          icon={
            <Ionicons name="trending-up-outline" size={24} color="#DC2626" />
          }
        >
          <ProgressBar label="Submission Completion Rate" value={88} />
          <ProgressBar label="Average Class Participation" value={81} />
          <ProgressBar label="Assignment Completion" value={76} />
          <ProgressBar label="On-Time Submission Rate" value={72} />
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Section Comparison"
          subtitle="Relative section performance"
          icon={
            <MaterialCommunityIcons
              name="google-classroom"
              size={24}
              color="#DC2626"
            />
          }
        >
          <ProgressBar label="1A Microsoft" value={86} />
          <ProgressBar label="1B Google" value={82} />
          <ProgressBar label="2A Algorithm" value={79} />
          <ProgressBar label="2B Pseudocode" value={74} />
          <ProgressBar label="3A Python" value={84} />
          <ProgressBar label="3B Java" value={77} />
          <ProgressBar label="4A Xamarin" value={80} />
          <ProgressBar label="4B Laravel" value={73} />
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Year-Level Comparison"
          subtitle="Performance by academic year"
          icon={
            <Ionicons name="school-outline" size={24} color="#DC2626" />
          }
        >
          <ProgressBar label="1st Year" value={83} />
          <ProgressBar label="2nd Year" value={78} />
          <ProgressBar label="3rd Year" value={81} />
          <ProgressBar label="4th Year" value={75} />
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Subject Difficulty Trend"
          subtitle="Subjects showing lower average performance"
          icon={<Ionicons name="book-outline" size={24} color="#DC2626" />}
        >
          <StatRow
            label="IT201 - Data Structures and Algorithms"
            value="High Difficulty"
            tone="danger"
          />
          <StatRow
            label="IT202 - Object-Oriented Programming"
            value="Moderate Difficulty"
          />
          <StatRow
            label="IT301 - Mobile Application Development"
            value="Moderate Difficulty"
          />
          <StatRow
            label="IT402 - Systems Integration and Architecture"
            value="High Difficulty"
            tone="danger"
          />
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Intervention Suggestions"
          subtitle="Recommended admin and faculty actions"
          icon={<Ionicons name="medkit-outline" size={24} color="#DC2626" />}
        >
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionTitle}>Priority Action</Text>
            <Text style={styles.suggestionText}>
              Focus intervention on sections 2B Pseudocode and 4B Laravel due to
              lower completion rate and higher backlog activity.
            </Text>
          </View>

          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionTitle}>Faculty Recommendation</Text>
            <Text style={styles.suggestionText}>
              Provide reinforcement sessions for Data Structures, OOP, and
              Systems Integration topics with higher failure risk.
            </Text>
          </View>

          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionTitle}>System Recommendation</Text>
            <Text style={styles.suggestionText}>
              Use AI tutoring prompts and targeted adaptive review materials for
              students with repeated missing submissions.
            </Text>
          </View>
        </SectionCard>

        <SectionCard
          widthValue="100%"
          title="At-Risk Population"
          subtitle="Students requiring early academic intervention"
          icon={<Ionicons name="warning-outline" size={24} color="#DC2626" />}
        >
          <View style={styles.riskGrid}>
            <StudentRiskItem
              name="Angela Rivera"
              section="2B Pseudocode"
              average="72%"
              reason="Multiple missing assignments and low quiz trend."
            />
            <StudentRiskItem
              name="Nathan Cruz"
              section="4B Laravel"
              average="69%"
              reason="Declining performance in capstone-related outputs."
            />
            <StudentRiskItem
              name="Patricia Reyes"
              section="3B Java"
              average="74%"
              reason="Late submissions and weak performance in OOP."
            />
            <StudentRiskItem
              name="Christian Flores"
              section="2A Algorithm"
              average="71%"
              reason="Low completion rate in programming assessments."
            />
          </View>
        </SectionCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    marginBottom: 20,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroCardMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
  },

  heroTextSection: {
    flex: 1,
    marginRight: 20,
  },

  heroTextMobile: {
    marginRight: 0,
    marginBottom: 0,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#DC2626",
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 8,
  },

  heroTitleMobile: {
    fontSize: 22,
  },

  heroSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
    lineHeight: 22,
  },

  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  summaryCard: {
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 18,
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#A07C7C",
    fontWeight: "600",
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  summaryTrend: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },

  sectionHeader: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 20,
    marginBottom: 18,
  },

  sectionCardHeader: {
    marginBottom: 18,
  },

  sectionCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionCardHeaderTextWrap: {
    flex: 1,
  },

  sectionCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  sectionCardSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
    lineHeight: 20,
  },

  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  statRow: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F8E3E3",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statRowLabel: {
    flex: 1,
    fontSize: 14,
    color: "#5F3B3B",
    fontWeight: "600",
    paddingRight: 12,
  },

  statRowValue: {
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "800",
  },

  statRowValueDanger: {
    color: "#DC2626",
  },

  statRowValueSuccess: {
    color: "#059669",
  },

  progressBlock: {
    marginBottom: 14,
  },

  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5F3B3B",
    flex: 1,
    paddingRight: 10,
  },

  progressValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },

  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#FDE8E8",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },

  suggestionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFF9F9",
    padding: 14,
    marginBottom: 12,
  },

  suggestionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  suggestionText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#7A4A4A",
  },

  riskGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  riskCard: {
    width: "48.7%",
    minWidth: 240,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
  },

  riskTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  riskTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  riskName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  riskSection: {
    fontSize: 13,
    color: "#8A6F6F",
    fontWeight: "600",
  },

  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },

  riskBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },

  riskReason: {
    fontSize: 13,
    lineHeight: 20,
    color: "#7A4A4A",
  },
});