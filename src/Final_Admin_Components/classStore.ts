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
    classCode: "IT101-1A",
    className: "IT101 - Introduction to Computing",
    semester: "1st Semester (2025-2026)",
    section: "1A Microsoft",
    instructor: "T-1001 / Prof. Santos",
    classMembers: 42,
  },
  {
    id: "cls-2",
    classCode: "IT102-1B",
    className: "IT102 - Computer Programming 1",
    semester: "1st Semester (2025-2026)",
    section: "1B Google",
    instructor: "T-1002 / Prof. Reyes",
    classMembers: 39,
  },
  {
    id: "cls-3",
    classCode: "IT101-1B",
    className: "IT101 - Introduction to Computing",
    semester: "2nd Semester (2025-2026)",
    section: "1B Google",
    instructor: "T-1003 / Prof. Cruz",
    classMembers: 37,
  },
  {
    id: "cls-4",
    classCode: "IT201-2A",
    className: "IT201 - Data Structures and Algorithms",
    semester: "1st Semester (2025-2026)",
    section: "2A Algorithm",
    instructor: "T-1004 / Prof. Garcia",
    classMembers: 35,
  },
  {
    id: "cls-5",
    classCode: "IT202-2B",
    className: "IT202 - Object-Oriented Programming",
    semester: "2nd Semester (2025-2026)",
    section: "2B Pseudocode",
    instructor: "T-1005 / Prof. Mendoza",
    classMembers: 33,
  },
  {
    id: "cls-6",
    classCode: "IT201-2B",
    className: "IT201 - Data Structures and Algorithms",
    semester: "1st Semester (2025-2026)",
    section: "2B Pseudocode",
    instructor: "T-1006 / Prof. Navarro",
    classMembers: 36,
  },
  {
    id: "cls-7",
    classCode: "IT301-3A",
    className: "IT301 - Mobile Application Development",
    semester: "1st Semester (2025-2026)",
    section: "3A Python",
    instructor: "T-1007 / Prof. Villanueva",
    classMembers: 31,
  },
  {
    id: "cls-8",
    classCode: "IT302-3B",
    className: "IT302 - Web Systems and Technologies",
    semester: "2nd Semester (2025-2026)",
    section: "3B Java",
    instructor: "T-1008 / Prof. Ramos",
    classMembers: 29,
  },
  {
    id: "cls-9",
    classCode: "IT301-3B",
    className: "IT301 - Mobile Application Development",
    semester: "1st Semester (2025-2026)",
    section: "3B Java",
    instructor: "T-1009 / Prof. Flores",
    classMembers: 30,
  },
  {
    id: "cls-10",
    classCode: "IT401-4A",
    className: "IT401 - Capstone Project 1",
    semester: "1st Semester (2025-2026)",
    section: "4A Xamarin",
    instructor: "T-1010 / Prof. Bautista",
    classMembers: 26,
  },
  {
    id: "cls-11",
    classCode: "IT402-4B",
    className: "IT402 - Systems Integration and Architecture",
    semester: "2nd Semester (2025-2026)",
    section: "4B Laravel",
    instructor: "T-1011 / Prof. Aquino",
    classMembers: 24,
  },
  {
    id: "cls-12",
    classCode: "IT402-4A",
    className: "IT402 - Systems Integration and Architecture",
    semester: "2nd Semester (2025-2026)",
    section: "4A Xamarin",
    instructor: "T-1012 / Prof. Hernandez",
    classMembers: 25,
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