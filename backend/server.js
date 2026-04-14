import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

dotenv.config(); // load .env

const app = express();
app.use(cors());
app.use(express.json());

// Firebase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Check SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP Ready");
  }
});

// Generate temp password
function generateTempPassword(length = 8) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// API route
app.post("/create-student", async (req, res) => {
  try {
    const {
      studentId,
      firstName,
      lastName,
      email,
      birthday,
      studentType,
    } = req.body;

    if (!studentId || !firstName || !lastName || !email || !birthday || !studentType) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const studentRef = db.collection("students").doc(studentId);
    const existingStudent = await studentRef.get();

    if (existingStudent.exists) {
      return res.status(409).json({ error: "Student ID already exists." });
    }

    const tempPassword = generateTempPassword(8);

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

    // Save to Firestore
    await studentRef.set({
      studentId,
      firstName,
      lastName,
      email,
      birthday: birthday ? new Date(birthday) : null,
      status: studentType,
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      lastLoginAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send Email
    try {
      await transporter.sendMail({
        from: `ParseIT <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Student Account - Temporary Password",
        html: `
          <h2>Hello ${firstName},</h2>
          <p>Your student account has been created.</p>
          <p><b>Student ID:</b> ${studentId}</p>
          <p><b>Temporary Password:</b> ${tempPassword}</p>
          <p>Please login and change your password immediately.</p>
        `,
      });

      await studentRef.update({
        tempPasswordSent: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (emailError) {
      console.error("Email failed:", emailError);

      return res.status(500).json({
        error: "Student created but email failed to send.",
      });
    }

    res.json({
      success: true,
      message: "Student created and email sent successfully.",
    });

  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "Email already exists." });
    }

    res.status(500).json({
      error: error.message || "Internal server error.",
    });
  }
});

// 🚀 CREATE TEACHER
app.post("/create-teacher", async (req, res) => {
  try {
    const {
      teacherId,
      firstName,
      lastName,
      email,
      birthday,
    } = req.body;

    if (!teacherId || !firstName || !lastName || !email || !birthday) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const teacherRef = db.collection("teachers").doc(teacherId);
    const existingTeacher = await teacherRef.get();

    if (existingTeacher.exists) {
      return res.status(409).json({ error: "Teacher ID already exists." });
    }

    const tempPassword = generateTempPassword(8);

    // 🔐 Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

    // 💾 Save to Firestore
    await teacherRef.set({
      teacherId,
      firstName,
      lastName,
      email,
      birthday: birthday ? new Date(birthday) : null,
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      lastLoginAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 📧 Send Email
    try {
      await transporter.sendMail({
        from: `ParseIT <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Teacher Account - Temporary Password",
        html: `
          <h2>Hello ${firstName},</h2>
          <p>Your teacher account has been created.</p>
          <p><b>Teacher ID:</b> ${teacherId}</p>
          <p><b>Temporary Password:</b> ${tempPassword}</p>
          <p>Please login and change your password immediately.</p>
        `,
      });

      await teacherRef.update({
        tempPasswordSent: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (emailError) {
      console.error("Email failed:", emailError);

      return res.status(500).json({
        error: "Teacher created but email failed to send.",
      });
    }

    res.json({
      success: true,
      message: "Teacher created and email sent successfully.",
    });

  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "Email already exists." });
    }

    res.status(500).json({
      error: error.message || "Internal server error.",
    });
  }
});


app.post("/create-admin", async (req, res) => {
  try {
    const {
      adminId,
      firstName,
      lastName,
      email,
      birthday,
    } = req.body;

    if (!adminId || !firstName || !lastName || !email || !birthday) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const adminRef = db.collection("admins").doc(adminId);
    const existingAdmin = await adminRef.get();

    if (existingAdmin.exists) {
      return res.status(409).json({ error: "Admin ID already exists." });
    }

    const tempPassword = generateTempPassword(8);

    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

    await adminRef.set({
      adminId,
      firstName,
      lastName,
      email,
      birthday: birthday ? new Date(birthday) : null,
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      lastLoginAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      await transporter.sendMail({
        from: `ParseIT <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Admin Account - Temporary Password",
        html: `
          <h2>Hello ${firstName},</h2>
          <p>Your admin account has been created.</p>
          <p><b>Admin ID:</b> ${adminId}</p>
          <p><b>Temporary Password:</b> ${tempPassword}</p>
          <p>Please login and change your password immediately.</p>
        `,
      });

      await adminRef.update({
        tempPasswordSent: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (emailError) {
      console.error("Email failed:", emailError);

      return res.status(500).json({
        error: "Admin created but email failed to send.",
      });
    }

    res.json({
      success: true,
      message: "Admin created and email sent successfully.",
    });
  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "Email already exists." });
    }

    res.status(500).json({
      error: error.message || "Internal server error.",
    });
  }
});

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});