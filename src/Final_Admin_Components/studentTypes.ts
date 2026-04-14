export type StudentFormPayload = {
  studentId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
  studentType: "regular" | "irregular" | "";
};