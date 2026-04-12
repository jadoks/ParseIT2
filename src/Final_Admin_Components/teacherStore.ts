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
  {
    id: "teacher-3",
    teacherId: "T-1003",
    firstName: "Angela",
    lastName: "Cruz",
    birthday: "07/14/1990",
    email: "angela.cruz@parseit.edu",
  },
  {
    id: "teacher-4",
    teacherId: "T-1004",
    firstName: "Carlos",
    lastName: "Garcia",
    birthday: "03/05/1982",
    email: "carlos.garcia@parseit.edu",
  },
  {
    id: "teacher-5",
    teacherId: "T-1005",
    firstName: "Elena",
    lastName: "Mendoza",
    birthday: "09/18/1987",
    email: "elena.mendoza@parseit.edu",
  },
  {
    id: "teacher-6",
    teacherId: "T-1006",
    firstName: "Rafael",
    lastName: "Navarro",
    birthday: "01/27/1984",
    email: "rafael.navarro@parseit.edu",
  },
  {
    id: "teacher-7",
    teacherId: "T-1007",
    firstName: "Liza",
    lastName: "Villanueva",
    birthday: "06/30/1991",
    email: "liza.villanueva@parseit.edu",
  },
  {
    id: "teacher-8",
    teacherId: "T-1008",
    firstName: "Allan",
    lastName: "Ramos",
    birthday: "12/12/1983",
    email: "allan.ramos@parseit.edu",
  },
  {
    id: "teacher-9",
    teacherId: "T-1009",
    firstName: "Patricia",
    lastName: "Flores",
    birthday: "04/09/1989",
    email: "patricia.flores@parseit.edu",
  },
  {
    id: "teacher-10",
    teacherId: "T-1010",
    firstName: "Ronald",
    lastName: "Bautista",
    birthday: "08/21/1986",
    email: "ronald.bautista@parseit.edu",
  },
  {
    id: "teacher-11",
    teacherId: "T-1011",
    firstName: "Catherine",
    lastName: "Aquino",
    birthday: "05/17/1992",
    email: "catherine.aquino@parseit.edu",
  },
  {
    id: "teacher-12",
    teacherId: "T-1012",
    firstName: "Daniel",
    lastName: "Hernandez",
    birthday: "10/02/1981",
    email: "daniel.hernandez@parseit.edu",
  },
  {
    id: "teacher-13",
    teacherId: "T-1013",
    firstName: "Monica",
    lastName: "Lopez",
    birthday: "03/25/1990",
    email: "monica.lopez@parseit.edu",
  },
  {
    id: "teacher-14",
    teacherId: "T-1014",
    firstName: "Victor",
    lastName: "Castillo",
    birthday: "11/08/1983",
    email: "victor.castillo@parseit.edu",
  },
  {
    id: "teacher-15",
    teacherId: "T-1015",
    firstName: "Jasmine",
    lastName: "Torres",
    birthday: "07/19/1991",
    email: "jasmine.torres@parseit.edu",
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