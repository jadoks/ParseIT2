export interface FileUpload {
  id: string;
  fileName: string;
  fileType: string;
  uploadedDate: string;
  fileSize: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInstructor: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  courseName: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  description?: string;
  files?: FileUpload[];
  comments?: Comment[];
}

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: '1',
    title: 'React Fundamentals Quiz',
    courseName: 'Web Development 101',
    dueDate: '2026-02-15',
    status: 'pending',
    points: 0,
    maxPoints: 20,
    description: 'Complete the React fundamentals quiz covering hooks, state management, and component lifecycle.',
    files: [],
    comments: [
      {
        id: 'c1',
        author: 'Prof. John Smith',
        content: 'Please submit your completed quiz by the deadline.',
        timestamp: '2026-02-01 10:00 AM',
        isInstructor: true,
      },
    ],
  },
  {
    id: '2',
    title: 'Data Structures Assignment',
    courseName: 'Computer Science 201',
    dueDate: '2026-02-10',
    status: 'submitted',
    points: 0,
    maxPoints: 30,
    description: 'Implement binary search tree with insert, delete, and search operations.',
    files: [
      {
        id: 'f1',
        fileName: 'BinarySearchTree.java',
        fileType: 'java',
        uploadedDate: '2026-02-09 03:45 PM',
        fileSize: '12.5 KB',
      },
    ],
    comments: [
      {
        id: 'c2',
        author: 'You',
        content: 'Submitted the implementation. Please review when you have time.',
        timestamp: '2026-02-09 03:50 PM',
        isInstructor: false,
      },
    ],
  },
];
