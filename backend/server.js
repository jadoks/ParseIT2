import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "parseit2-4b26d.firebasestorage.app",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const FieldValue = admin.firestore.FieldValue;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP Ready");
  }
});

function generateTempPassword(length = 8) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateClassCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

async function generateUniqueClassCode() {
  let code = "";
  let exists = true;

  while (exists) {
    code = generateClassCode(8);

    const snapshot = await db
      .collection("classes")
      .where("classCode", "==", code)
      .limit(1)
      .get();

    exists = !snapshot.empty;
  }

  return code;
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getFileExtensionFromMimeType(mimeType) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

async function uploadBannerToStorage({
  bannerBase64,
  bannerMimeType,
  bannerFileName,
  classCode,
}) {
  if (!bannerBase64) {
    return {
      bannerUrl: null,
      bannerStoragePath: null,
      bannerFileName: normalizeOptionalText(bannerFileName),
      bannerMimeType: normalizeOptionalText(bannerMimeType),
    };
  }

  const cleanedBase64 = bannerBase64.includes(",")
    ? bannerBase64.split(",")[1]
    : bannerBase64;

  const safeMimeType = normalizeOptionalText(bannerMimeType) || "image/jpeg";
  const extension = getFileExtensionFromMimeType(safeMimeType);
  const safeFileName =
    normalizeOptionalText(bannerFileName) || `banner.${extension}`;

  const storagePath = `class-banners/${classCode}-${Date.now()}-${safeFileName}`;
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(cleanedBase64, "base64"), {
    metadata: {
      contentType: safeMimeType,
      cacheControl: "public,max-age=31536000",
    },
    resumable: false,
  });

  await file.makePublic();

  return {
    bannerUrl: file.publicUrl(),
    bannerStoragePath: storagePath,
    bannerFileName: safeFileName,
    bannerMimeType: safeMimeType,
  };
}

async function deleteStorageFileIfExists(storagePath) {
  if (!storagePath) return;

  try {
    await bucket.file(storagePath).delete();
  } catch (error) {
    console.warn("Storage delete skipped:", error?.message || error);
  }
}

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

    if (
      !studentId ||
      !firstName ||
      !lastName ||
      !email ||
      !birthday ||
      !studentType
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const studentRef = db.collection("students").doc(studentId);
    const existingStudent = await studentRef.get();

    if (existingStudent.exists) {
      return res.status(409).json({ error: "Student ID already exists." });
    }

    const tempPassword = generateTempPassword(8);

    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

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

app.post("/create-teacher", async (req, res) => {
  try {
    const { teacherId, firstName, lastName, email, birthday } = req.body;

    if (!teacherId || !firstName || !lastName || !email || !birthday) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const teacherRef = db.collection("teachers").doc(teacherId);
    const existingTeacher = await teacherRef.get();

    if (existingTeacher.exists) {
      return res.status(409).json({ error: "Teacher ID already exists." });
    }

    const tempPassword = generateTempPassword(8);

    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

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
    const { adminId, firstName, lastName, email, birthday } = req.body;

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

app.get("/students", async (req, res) => {
  try {
    const snapshot = await db.collection("students").get();

    const students = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Failed to fetch students",
    });
  }
});

app.post("/create-class", async (req, res) => {
  try {
    const {
      name,
      courseCode,
      section,
      semester,
      schoolYear,
      description,
      bannerBase64,
      bannerFileName,
      bannerMimeType,
      instructorName,
      instructorEmail,
      createdByUid,
      createdByRole,
    } = req.body;

    if (
      !name ||
      !courseCode ||
      !section ||
      !semester ||
      !instructorName ||
      !instructorEmail ||
      !createdByUid ||
      !createdByRole
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (!["teacher", "admin"].includes(createdByRole)) {
      return res.status(400).json({ error: "Invalid createdByRole." });
    }

    const classCode = await generateUniqueClassCode();

    const uploadedBanner = await uploadBannerToStorage({
      bannerBase64,
      bannerMimeType,
      bannerFileName,
      classCode,
    });

    const classRef = await db.collection("classes").add({
      name,
      courseCode,
      classCode,
      section,
      semester,
      schoolYear: normalizeOptionalText(schoolYear),
      description: normalizeOptionalText(description),
      bannerUrl: uploadedBanner.bannerUrl,
      bannerStoragePath: uploadedBanner.bannerStoragePath,
      bannerFileName: uploadedBanner.bannerFileName,
      bannerMimeType: uploadedBanner.bannerMimeType,
      instructorName,
      instructorEmail,
      createdByUid,
      createdByRole,
      status: "active",
      memberCount: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection("classMembers").add({
      classId: classRef.id,
      userUid: createdByUid,
      role: createdByRole,
      joinedAt: FieldValue.serverTimestamp(),
      status: "active",
    });

    res.json({
      success: true,
      message: "Class created successfully.",
      data: {
        id: classRef.id,
        classCode,
        bannerUrl: uploadedBanner.bannerUrl,
      },
    });
  } catch (error) {
    console.error("Create class error:", error);
    res.status(500).json({
      error: error.message || "Failed to create class.",
    });
  }
});

app.put("/update-class/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      courseCode,
      section,
      semester,
      schoolYear,
      description,
      bannerBase64,
      bannerFileName,
      bannerMimeType,
      instructorName,
      memberCount,
    } = req.body;

    const classRef = db.collection("classes").doc(id);
    const classSnap = await classRef.get();

    if (!classSnap.exists) {
      return res.status(404).json({ error: "Class not found." });
    }

    const existingClass = classSnap.data();
    let nextBannerFields = {};

    if (typeof bannerBase64 === "string" && bannerBase64.trim()) {
      await deleteStorageFileIfExists(existingClass?.bannerStoragePath);

      const uploadedBanner = await uploadBannerToStorage({
        bannerBase64,
        bannerMimeType,
        bannerFileName,
        classCode: existingClass?.classCode || "CLASS",
      });

      nextBannerFields = {
        bannerUrl: uploadedBanner.bannerUrl,
        bannerStoragePath: uploadedBanner.bannerStoragePath,
        bannerFileName: uploadedBanner.bannerFileName,
        bannerMimeType: uploadedBanner.bannerMimeType,
      };
    } else if (bannerBase64 === null) {
      await deleteStorageFileIfExists(existingClass?.bannerStoragePath);

      nextBannerFields = {
        bannerUrl: null,
        bannerStoragePath: null,
        bannerFileName: null,
        bannerMimeType: null,
      };
    }

    await classRef.update({
      ...(name ? { name } : {}),
      ...(courseCode ? { courseCode } : {}),
      ...(section ? { section } : {}),
      ...(semester ? { semester } : {}),
      ...(typeof schoolYear === "string" || schoolYear === null
        ? { schoolYear }
        : {}),
      ...(typeof description === "string" || description === null
        ? { description }
        : {}),
      ...(instructorName ? { instructorName } : {}),
      ...(typeof memberCount === "number" ? { memberCount } : {}),
      ...nextBannerFields,
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Class updated successfully.",
    });
  } catch (error) {
    console.error("Update class error:", error);
    res.status(500).json({
      error: error.message || "Failed to update class.",
    });
  }
});

app.delete("/delete-class/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const classRef = db.collection("classes").doc(id);
    const classSnap = await classRef.get();

    if (classSnap.exists) {
      const classData = classSnap.data();
      await deleteStorageFileIfExists(classData?.bannerStoragePath);
    }

    await classRef.delete();

    const membersSnapshot = await db
      .collection("classMembers")
      .where("classId", "==", id)
      .get();

    const batch = db.batch();
    membersSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({
      success: true,
      message: "Class deleted successfully.",
    });
  } catch (error) {
    console.error("Delete class error:", error);
    res.status(500).json({
      error: error.message || "Failed to delete class.",
    });
  }
});

app.get("/classes", async (req, res) => {
  try {
    const snapshot = await db
      .collection("classes")
      .orderBy("createdAt", "desc")
      .get();

    const classes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(classes);
  } catch (error) {
    console.error("Fetch classes error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch classes",
    });
  }
});

app.get("/admins", async (req, res) => {
  try {
    const snapshot = await db.collection("admins").orderBy("createdAt", "desc").get();
    const admins = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(admins);
  } catch (error) {
    console.error("Fetch admins error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch admins" });
  }
});

app.put("/update-admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, firstName, lastName, birthday, email } = req.body;

    await db.collection("admins").doc(id).update({
      ...(adminId ? { adminId } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(birthday ? { birthday: new Date(birthday) } : {}),
      ...(email ? { email } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Admin updated successfully." });
  } catch (error) {
    console.error("Update admin error:", error);
    res.status(500).json({ error: error.message || "Failed to update admin." });
  }
});

app.delete("/delete-admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("admins").doc(id).delete();
    res.json({ success: true, message: "Admin deleted successfully." });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({ error: error.message || "Failed to delete admin." });
  }
});

app.get("/teachers", async (req, res) => {
  try {
    const snapshot = await db.collection("teachers").orderBy("createdAt", "desc").get();
    const teachers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(teachers);
  } catch (error) {
    console.error("Fetch teachers error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch teachers" });
  }
});

app.put("/update-teacher/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, firstName, lastName, birthday, email } = req.body;

    await db.collection("teachers").doc(id).update({
      ...(teacherId ? { teacherId } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(birthday ? { birthday: new Date(birthday) } : {}),
      ...(email ? { email } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Teacher updated successfully." });
  } catch (error) {
    console.error("Update teacher error:", error);
    res.status(500).json({ error: error.message || "Failed to update teacher." });
  }
});

app.delete("/delete-teacher/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("teachers").doc(id).delete();
    res.json({ success: true, message: "Teacher deleted successfully." });
  } catch (error) {
    console.error("Delete teacher error:", error);
    res.status(500).json({ error: error.message || "Failed to delete teacher." });
  }
});

app.put("/update-student/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, firstName, lastName, birthday, email, studentType } = req.body;

    await db.collection("students").doc(id).update({
      ...(studentId ? { studentId } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(birthday ? { birthday: new Date(birthday) } : {}),
      ...(email ? { email } : {}),
      ...(studentType ? { status: studentType } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Student updated successfully." });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ error: error.message || "Failed to update student." });
  }
});

app.delete("/delete-student/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("students").doc(id).delete();
    res.json({ success: true, message: "Student deleted successfully." });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ error: error.message || "Failed to delete student." });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});