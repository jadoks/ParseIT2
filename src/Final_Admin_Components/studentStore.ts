export type StudentItem = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
  studentType: "regular" | "irregular" | "";
};

export const INITIAL_STUDENTS: StudentItem[] = [
  {
    id: "student-1",
    studentId: "STU-001",
    firstName: "Mark",
    lastName: "Anderson",
    birthday: "03/15/2004",
    email: "mark.anderson@parseit.edu",
    studentType: "regular",
  },
  {
    id: "student-2",
    studentId: "STU-002",
    firstName: "Angela",
    lastName: "Rivera",
    birthday: "07/08/2003",
    email: "angela.rivera@parseit.edu",
    studentType: "irregular",
  },
];

let studentRecords: StudentItem[] = [...INITIAL_STUDENTS];

export function getStudentRecords() {
  return studentRecords;
}

export function addStudentRecord(
  payload: Omit<StudentItem, "id"> & { id?: string }
): StudentItem {
  const newRecord: StudentItem = {
    id: payload.id || `student-${Date.now()}`,
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