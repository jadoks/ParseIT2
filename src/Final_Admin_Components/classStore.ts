export type ClassItem = {
  id: string;
  classCode: string;
  className: string;
  semester: string;
  section: string;
  instructor: string;
  classMembers: number;
};

export const INITIAL_CLASSES: ClassItem[] = [
  {
    id: "cls-1",
    classCode: "CS101-A",
    className: "Introduction to Programming",
    semester: "1st Semester (2025-2026)",
    section: "1A Microsoft",
    instructor: "T-1001 / Prof. Santos",
    classMembers: 42,
  },
  {
    id: "cls-2",
    classCode: "CS202-B",
    className: "Data Structures",
    semester: "2nd Semester (2025-2026)",
    section: "2B Pseudocode",
    instructor: "T-1002 / Prof. Reyes",
    classMembers: 38,
  },
  {
    id: "cls-3",
    classCode: "CS301-A",
    className: "Mobile Application Development",
    semester: "1st Semester (2025-2026)",
    section: "3A Python",
    instructor: "T-1003 / Prof. Cruz",
    classMembers: 35,
  },
  {
    id: "cls-4",
    classCode: "CS401-B",
    className: "Capstone Project",
    semester: "2nd Semester (2025-2026)",
    section: "4B Laravel",
    instructor: "T-1004 / Prof. Garcia",
    classMembers: 29,
  },
];

let classRecords: ClassItem[] = [...INITIAL_CLASSES];

export function getClassRecords() {
  return classRecords;
}

export function addClassRecord(
  payload: Omit<ClassItem, "id"> & { id?: string }
): ClassItem {
  const newItem: ClassItem = {
    id: payload.id || `class-${Date.now()}`,
    classCode: payload.classCode,
    className: payload.className,
    semester: payload.semester,
    section: payload.section,
    instructor: payload.instructor,
    classMembers: payload.classMembers,
  };

  classRecords = [newItem, ...classRecords];
  return newItem;
}

export function updateClassRecord(updatedItem: ClassItem) {
  classRecords = classRecords.map((item) =>
    item.id === updatedItem.id ? updatedItem : item
  );
}

export function deleteClassRecord(id: string) {
  classRecords = classRecords.filter((item) => item.id !== id);
}

export function getClassCount() {
  return classRecords.length;
}