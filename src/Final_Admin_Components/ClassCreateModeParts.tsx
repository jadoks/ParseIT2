import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type CreateMode = "program" | "manual";

// ─────────────────────────────────────────────────────────────────────────
// Segmented toggle: "From Program" | "Manual"
// ─────────────────────────────────────────────────────────────────────────
export function CreateModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: CreateMode;
  onChange: (mode: CreateMode) => void;
  disabled?: boolean;
}) {
  const items: { id: CreateMode; label: string; icon: any }[] = [
    { id: "program", label: "From Program", icon: "document-text-outline" },
    { id: "manual", label: "Manual", icon: "create-outline" },
  ];
  return (
    <View style={styles.toggleWrap}>
      {items.map((item) => {
        const active = mode === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.toggleItem, active && styles.toggleItemActive]}
            activeOpacity={0.85}
            disabled={disabled}
            onPress={() => !active && onChange(item.id)}
          >
            <Ionicons name={item.icon} size={16} color={active ? "#FFFFFF" : "#7A4A4A"} />
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Summary of what the picked subject filled in + the "Edit class details"
// button that reveals the full form.
// ─────────────────────────────────────────────────────────────────────────
const to12h = (t: string) => {
  const [h, m] = String(t || "").split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export type SummaryScheduleBlock = { days: string[]; startTime: string; endTime: string; room?: string | null };

export function formatScheduleLine(block: SummaryScheduleBlock) {
  return `${block.days.join(", ")} · ${to12h(block.startTime)} - ${to12h(block.endTime)}${block.room ? ` · ${block.room}` : ""}`;
}

export function SelectionSummary({
  title,
  details,
  schedule,
  expanded,
  onToggleEdit,
}: {
  title: string;
  details: string[]; // e.g. ["4B Laravel", "1st Semester · S.Y. 2026-2027", "Teacher ID 73142"]
  schedule: SummaryScheduleBlock[];
  expanded: boolean;
  onToggleEdit: () => void;
}) {
  const filledSchedule = schedule.filter((b) => b.days.length > 0 && b.startTime && b.endTime);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryIcon}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>SELECTED SUBJECT</Text>
          <Text style={styles.summaryTitle}>{title || "Untitled class"}</Text>
        </View>
      </View>

      <View style={styles.pillWrap}>
        {details.filter(Boolean).map((d, i) => (
          <View key={`d-${i}`} style={styles.pill}>
            <Text style={styles.pillText}>{d}</Text>
          </View>
        ))}
        {filledSchedule.map((b, i) => (
          <View key={`s-${i}`} style={styles.pill}>
            <Ionicons name="time-outline" size={13} color="#8B0000" />
            <Text style={styles.pillText}>{formatScheduleLine(b)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.editBtn} activeOpacity={0.85} onPress={onToggleEdit}>
        <Ionicons name={expanded ? "chevron-up" : "create-outline"} size={16} color="#8B0000" />
        <Text style={styles.editBtnText}>{expanded ? "Hide class details" : "Edit class details"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleWrap: {
    flexDirection: "row",
    backgroundColor: "#F3E9E9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    alignSelf: "stretch",
  },
  toggleItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 11,
  },
  toggleItemActive: { backgroundColor: "#8B0000" },
  toggleText: { fontSize: 14, fontWeight: "700", color: "#7A4A4A" },
  toggleTextActive: { color: "#FFFFFF" },

  summaryCard: {
    borderWidth: 1,
    borderColor: "#8B0000",
    borderRadius: 16,
    backgroundColor: "#FAF5F5",
    padding: 14,
    marginBottom: 18,
  },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: { fontSize: 11, fontWeight: "800", color: "#9A7A7A", letterSpacing: 0.6 },
  summaryTitle: { fontSize: 16, fontWeight: "800", color: "#2B1111", marginTop: 2 },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBD4D4",
  },
  pillText: { fontSize: 12, fontWeight: "700", color: "#6B0000" },
  editBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8B0000",
    backgroundColor: "#FFFFFF",
  },
  editBtnText: { fontSize: 13, fontWeight: "800", color: "#8B0000" },
});