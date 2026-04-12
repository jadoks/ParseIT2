export type TeacherItem = {
  id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
};

export const INITIAL_TEACHERS: TeacherItem[] = [
  {
    id: "teacher-1",
    teacherId: "T-1001",
    firstName: "Maria",
    lastName: "Santos",
    birthday: "02/10/1988",
    email: "maria.santos@parseit.edu",
  },
  {
    id: "teacher-2",
    teacherId: "T-1002",
    firstName: "Jose",
    lastName: "Reyes",
    birthday: "11/22/1985",
    email: "jose.reyes@parseit.edu",
  },
];

let teacherRecords: TeacherItem[] = [...INITIAL_TEACHERS];

export function getTeacherRecords() {
  return teacherRecords;
}

export function addTeacherRecord(
  payload: Omit<TeacherItem, "id"> & { id?: string }
): TeacherItem {
  const newRecord: TeacherItem = {
    id: payload.id || `teacher-${Date.now()}`,
    teacherId: payload.teacherId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    birthday: payload.birthday,
    email: payload.email,
  };

  teacherRecords = [newRecord, ...teacherRecords];
  return newRecord;
}

export function updateTeacherRecord(updatedItem: TeacherItem) {
  teacherRecords = teacherRecords.map((item) =>
    item.id === updatedItem.id ? updatedItem : item
  );
}

export function deleteTeacherRecord(id: string) {
  teacherRecords = teacherRecords.filter((item) => item.id !== id);
}

export function getTeacherCount() {
  return teacherRecords.length;
}