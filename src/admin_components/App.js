import { useState } from "react";
import AdminApp from "./AdminApp";
import SignIn from "./screens/SignIn";
import StudentApp from "./StudentApp";
import TeacherApp from "./TeacherApp";

export default function App() {

  const [role, setRole] = useState<string | null>(null);

  if (!role) {
    return <SignIn setRole={setRole} />;
  }

  if (role === "student") {
    return <StudentApp onLogout={() => setRole(null)} />;
  }

  if (role === "teacher") {
    return <TeacherApp onLogout={() => setRole(null)} />;
  }

  if (role === "admin") {
    return <AdminApp onLogout={() => setRole(null)} />;
  }

  return null;
}