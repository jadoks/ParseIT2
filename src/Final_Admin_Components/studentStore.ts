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
  {
    id: "student-3",
    studentId: "STU-003",
    firstName: "Joshua",
    lastName: "Mendoza",
    birthday: "11/21/2004",
    email: "joshua.mendoza@parseit.edu",
    studentType: "regular",
  },
  {
    id: "student-4",
    studentId: "STU-004",
    firstName: "Camille",
    lastName: "Santos",
    birthday: "01/09/2005",
    email: "camille.santos@parseit.edu",
    studentType: "regular",
  },
  {
    id: "student-5",
    studentId: "STU-005",
    firstName: "Nathan",
    lastName: "Cruz",
    birthday: "05/30/2003",
    email: "nathan.cruz@parseit.edu",
    studentType: "irregular",
  },
  {
    id: "student-6",
    studentId: "STU-006",
    firstName: "Bianca",
    lastName: "Lopez",
    birthday: "09/12/2004",
    email: "bianca.lopez@parseit.edu",
    studentType: "regular",
  },
  {
    id: "student-7",
    studentId: "STU-007",
    firstName: "Franz",
    lastName: "Garcia",
    birthday: "12/03/2004",
    email: "franz.garcia@parseit.edu",
    studentType: "regular",
  },
  {
    id: "student-8",
    studentId: "STU-008",
    firstName: "Patricia",
    lastName: "Reyes",
    birthday: "04/18/2005",
    email: "patricia.reyes@parseit.edu",
    studentType: "irregular",
  },
  {
    id: "student-9",
    studentId: "STU-009",
    firstName: "Kevin",
    lastName: "Navarro",
    birthday: "08/25/2004",
    email: "kevin.navarro@parseit.edu",
    studentType: "regular",
  },
  {
    id: "student-10",
    studentId: "STU-010",
    firstName: "Janelle",
    lastName: "Bautista",
    birthday: "02/14/2003",
    email: "janelle.bautista@parseit.edu",
    studentType: "regular",
  },
  {
    id: "student-11",
    studentId: "STU-011",
    firstName: "Christian",
    lastName: "Flores",
    birthday: "06/11/2004",
    email: "christian.flores@parseit.edu",
    studentType: "irregular",
  },
  {
    id: "student-12",
    studentId: "STU-012",
    firstName: "Alyssa",
    lastName: "Villanueva",
    birthday: "10/27/2005",
    email: "alyssa.villanueva@parseit.edu",
    studentType: "regular",
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