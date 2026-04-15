export type StudentItem = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
  studentType: "regular" | "irregular" | "";
};

let studentRecords: StudentItem[] = [];

function formatBirthday(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const date = new Date((value as { seconds: number }).seconds * 1000);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  return "";
}

function normalizeStudent(raw: any): StudentItem {
  return {
    id: raw.id || raw.studentId,
    studentId: raw.studentId || "",
    firstName: raw.firstName || "",
    lastName: raw.lastName || "",
    birthday: formatBirthday(raw.birthday),
    email: raw.email || "",
    studentType:
      raw.studentType || raw.status || "",
  };
}

export async function fetchStudentRecords(): Promise<StudentItem[]> {
  try {
    const response = await fetch("http://localhost:5000/students");

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch students");
    }

    studentRecords = Array.isArray(data)
      ? data.map(normalizeStudent)
      : [];

    return studentRecords;
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

export function getStudentRecords() {
  return studentRecords;
}

export function setStudentRecords(records: StudentItem[]) {
  studentRecords = records;
}

export function addStudentRecord(
  payload: Omit<StudentItem, "id"> & { id?: string }
): StudentItem {
  const newRecord: StudentItem = {
    id: payload.id || payload.studentId || `student-${Date.now()}`,
    studentId: payload.studentId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    birthday: payload.birthday,
    email: payload.email,
    studentType: payload.studentType,
  };

  studentRecords = [newRecord, ...studentRecords];
  return newRecord;
}

export function updateStudentRecord(updatedItem: StudentItem) {
  studentRecords = studentRecords.map((item) =>
    item.id === updatedItem.id ? updatedItem : item
  );
}

export function deleteStudentRecord(id: string) {
  studentRecords = studentRecords.filter((item) => item.id !== id);
}

export function getStudentCount() {
  return studentRecords.length;
}