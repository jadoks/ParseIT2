import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// 🔹 Input type
export type CreateClassInput = {
  name: string;
  courseCode: string;
  section: string;

  semester: string;           // "1st Semester"
  schoolYear: string | null;  // "2025-2026"

  description: string | null;

  bannerUrl: string | null;

  instructorName: string;
  instructorEmail: string;

  createdByUid: string;
  createdByRole: 'teacher' | 'admin';
};

// 🔹 Generate random class code
const generateClassCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

// 🔹 Create class
export const createClass = async (input: CreateClassInput) => {
  try {
    const classCode = generateClassCode();

    const docRef = await addDoc(collection(db, 'classes'), {
      name: input.name,
      courseCode: input.courseCode,
      classCode,

      section: input.section,
      semester: input.semester,
      schoolYear: input.schoolYear?.trim()
        ? input.schoolYear.trim()
        : null,

      description: input.description?.trim()
        ? input.description.trim()
        : null,

      bannerUrl: input.bannerUrl ?? null,

      instructorName: input.instructorName,
      instructorEmail: input.instructorEmail,

      createdByUid: input.createdByUid,
      createdByRole: input.createdByRole,

      status: 'active',
      memberCount: 1,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      classCode,
    };
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
};