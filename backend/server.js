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

function parseDateValue(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(mmddyyyy);

    if (match) {
      const [, mm, dd, yyyy] = match;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

async function findTeacherByIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") return null;

  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const byId = await db.collection("teachers").doc(trimmed).get();
  if (byId.exists) {
    return { id: byId.id, ...byId.data() };
  }

  const byEmail = await db
    .collection("teachers")
    .where("email", "==", trimmed)
    .limit(1)
    .get();

  if (!byEmail.empty) {
    const doc = byEmail.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const [firstNameMaybe, ...rest] = trimmed.split(" ");
  if (firstNameMaybe && rest.length > 0) {
    const byName = await db
      .collection("teachers")
      .where("firstName", "==", firstNameMaybe)
      .where("lastName", "==", rest.join(" "))
      .limit(1)
      .get();

    if (!byName.empty) {
      const doc = byName.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }

  return null;
}

async function findStudentById(studentId) {
  const doc = await db.collection("students").doc(studentId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
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
      birthday: parseDateValue(birthday),
      status: studentType,
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      lastLoginAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
        updatedAt: FieldValue.serverTimestamp(),
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
      birthday: parseDateValue(birthday),
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      lastLoginAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
        updatedAt: FieldValue.serverTimestamp(),
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
      birthday: parseDateValue(birthday),
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      lastLoginAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
        updatedAt: FieldValue.serverTimestamp(),
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

app.get("/teachers", async (req, res) => {
  try {
    const snapshot = await db
      .collection("teachers")
      .orderBy("createdAt", "desc")
      .get();

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

app.get("/admins", async (req, res) => {
  try {
    const snapshot = await db
      .collection("admins")
      .orderBy("createdAt", "desc")
      .get();

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
      ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
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

app.put("/update-teacher/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, firstName, lastName, birthday, email } = req.body;

    await db.collection("teachers").doc(id).update({
      ...(teacherId ? { teacherId } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
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
    const { studentId, firstName, lastName, birthday, email, studentType } =
      req.body;

    await db.collection("students").doc(id).update({
      ...(studentId ? { studentId } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
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
      instructorIdentifier,
      createdByUid,
      createdByRole,
      createdByName,
      year,
      units,
    } = req.body;

    if (
      !name ||
      !courseCode ||
      !section ||
      !semester ||
      !createdByUid ||
      !createdByRole
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (!["teacher", "admin"].includes(createdByRole)) {
      return res.status(400).json({ error: "Invalid createdByRole." });
    }

    let assignedTeacher = null;

    if (createdByRole === "admin") {
      const teacherLookupValue =
        instructorIdentifier || instructorEmail || instructorName;

      assignedTeacher = await findTeacherByIdentifier(teacherLookupValue);

      if (!assignedTeacher) {
        return res.status(400).json({
          error:
            "Assigned teacher not found. Use a valid teacher ID, email, or exact name.",
        });
      }
    }

    const classCode = await generateUniqueClassCode();

    const uploadedBanner = await uploadBannerToStorage({
      bannerBase64,
      bannerMimeType,
      bannerFileName,
      classCode,
    });

    const resolvedInstructorName =
      createdByRole === "teacher"
        ? normalizeOptionalText(instructorName) ||
          normalizeOptionalText(createdByName)
        : `${assignedTeacher.firstName || ""} ${
            assignedTeacher.lastName || ""
          }`.trim();

    const resolvedInstructorEmail =
      createdByRole === "teacher"
        ? normalizeOptionalText(instructorEmail)
        : normalizeOptionalText(assignedTeacher.email);

    const resolvedAssignedTeacherUid =
      createdByRole === "teacher"
        ? createdByUid
        : normalizeOptionalText(assignedTeacher.authUid);

    const resolvedAssignedTeacherId =
      createdByRole === "teacher"
        ? normalizeOptionalText(instructorIdentifier)
        : assignedTeacher.teacherId || assignedTeacher.id;

    const classRef = await db.collection("classes").add({
      name,
      courseCode,
      classCode,
      section,
      semester,
      schoolYear: normalizeOptionalText(schoolYear),
      description: normalizeOptionalText(description),
      year: normalizeOptionalText(year),
      units: typeof units === "number" ? units : Number(units) || 0,

      bannerUrl: uploadedBanner.bannerUrl,
      bannerStoragePath: uploadedBanner.bannerStoragePath,
      bannerFileName: uploadedBanner.bannerFileName,
      bannerMimeType: uploadedBanner.bannerMimeType,

      instructorName: resolvedInstructorName,
      instructorEmail: resolvedInstructorEmail,
      assignedTeacherUid: resolvedAssignedTeacherUid,
      assignedTeacherId: resolvedAssignedTeacherId,

      createdByUid,
      createdByRole,
      createdByName: normalizeOptionalText(createdByName),
      updatedByUid: createdByUid,
      updatedByRole: createdByRole,

      status: "active",
      memberCount: createdByRole === "teacher" ? 1 : 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (createdByRole === "teacher") {
      await db.collection("classMembers").add({
        classId: classRef.id,
        userUid: createdByUid,
        userId: resolvedAssignedTeacherId,
        name: resolvedInstructorName,
        email: resolvedInstructorEmail,
        role: "teacher",
        joinedAt: FieldValue.serverTimestamp(),
        status: "active",
      });
    }

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
      instructorEmail,
      instructorIdentifier,
      memberCount,
      updatedByUid,
      updatedByRole,
      year,
      units,
    } = req.body;

    const classRef = db.collection("classes").doc(id);
    const classSnap = await classRef.get();

    if (!classSnap.exists) {
      return res.status(404).json({ error: "Class not found." });
    }

    const existingClass = classSnap.data();
    let nextBannerFields = {};
    let nextTeacherFields = {};

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

    if (instructorIdentifier || instructorEmail || instructorName) {
      const teacherLookupValue =
        instructorIdentifier || instructorEmail || instructorName;

      const matchedTeacher = await findTeacherByIdentifier(teacherLookupValue);

      if (matchedTeacher) {
        nextTeacherFields = {
          instructorName: `${matchedTeacher.firstName || ""} ${
            matchedTeacher.lastName || ""
          }`.trim(),
          instructorEmail: normalizeOptionalText(matchedTeacher.email),
          assignedTeacherUid: normalizeOptionalText(matchedTeacher.authUid),
          assignedTeacherId: matchedTeacher.teacherId || matchedTeacher.id,
        };
      } else {
        nextTeacherFields = {
          ...(instructorName ? { instructorName } : {}),
          ...(instructorEmail ? { instructorEmail } : {}),
        };
      }
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
      ...(typeof year === "string" || year === null ? { year } : {}),
      ...(typeof units === "number"
        ? { units }
        : units !== undefined
        ? { units: Number(units) || 0 }
        : {}),
      ...(typeof memberCount === "number" ? { memberCount } : {}),
      ...(updatedByUid ? { updatedByUid } : {}),
      ...(updatedByRole ? { updatedByRole } : {}),
      ...nextTeacherFields,
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

    const collectionsToClean = [
      "classMembers",
      "classMaterials",
      "classAssignments",
      "classAnnouncements",
    ];

    for (const collectionName of collectionsToClean) {
      const snapshot = await db
        .collection(collectionName)
        .where("classId", "==", id)
        .get();

      const batch = db.batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    const assignmentsSnapshot = await db
      .collection("classAssignments")
      .where("classId", "==", id)
      .get();

    for (const assignmentDoc of assignmentsSnapshot.docs) {
      const submissions = await db
        .collection("classSubmissions")
        .where("assignmentId", "==", assignmentDoc.id)
        .get();

      const batch = db.batch();
      submissions.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

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

app.get("/class-members/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    const snapshot = await db
      .collection("classMembers")
      .where("classId", "==", classId)
      .orderBy("joinedAt", "asc")
      .get();

    const members = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(members);
  } catch (error) {
    console.error("Fetch class members error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch class members.",
    });
  }
});

app.post("/join-class", async (req, res) => {
  try {
    const { classId, studentId } = req.body;

    if (!classId || !studentId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const classRef = db.collection("classes").doc(classId);
    const classSnap = await classRef.get();

    if (!classSnap.exists) {
      return res.status(404).json({ error: "Class not found." });
    }

    const student = await findStudentById(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    const existingMembership = await db
      .collection("classMembers")
      .where("classId", "==", classId)
      .where("userId", "==", studentId)
      .limit(1)
      .get();

    if (!existingMembership.empty) {
      return res.status(409).json({ error: "Student is already a class member." });
    }

    await db.collection("classMembers").add({
      classId,
      userUid: student.authUid || null,
      userId: student.studentId,
      name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      email: student.email || null,
      role: "student",
      joinedAt: FieldValue.serverTimestamp(),
      status: "active",
    });

    await classRef.update({
      memberCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Student joined class successfully.",
    });
  } catch (error) {
    console.error("Join class error:", error);
    res.status(500).json({
      error: error.message || "Failed to join class.",
    });
  }
});

app.delete("/remove-class-member/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const memberRef = db.collection("classMembers").doc(id);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return res.status(404).json({ error: "Class member not found." });
    }

    const memberData = memberSnap.data();
    await memberRef.delete();

    if (memberData?.classId) {
      await db.collection("classes").doc(memberData.classId).update({
        memberCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.json({
      success: true,
      message: "Class member removed successfully.",
    });
  } catch (error) {
    console.error("Remove class member error:", error);
    res.status(500).json({
      error: error.message || "Failed to remove class member.",
    });
  }
});

app.get("/class-materials/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    const snapshot = await db
      .collection("classMaterials")
      .where("classId", "==", classId)
      .orderBy("createdAt", "desc")
      .get();

    const materials = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(materials);
  } catch (error) {
    console.error("Fetch class materials error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch class materials.",
    });
  }
});

app.post("/create-class-material", async (req, res) => {
  try {
    const {
      classId,
      title,
      week,
      content,
      fileName,
      fileUrl,
      fileType,
      postedByUid,
      postedByName,
    } = req.body;

    if (!classId || !title || !week) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const classSnap = await db.collection("classes").doc(classId).get();
    if (!classSnap.exists) {
      return res.status(404).json({ error: "Class not found." });
    }

    const ref = await db.collection("classMaterials").add({
      classId,
      title,
      week,
      content: normalizeOptionalText(content),
      fileName: normalizeOptionalText(fileName),
      fileUrl: normalizeOptionalText(fileUrl),
      fileType: normalizeOptionalText(fileType),
      postedByUid: normalizeOptionalText(postedByUid),
      postedByName: normalizeOptionalText(postedByName),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Class material created successfully.",
      data: { id: ref.id },
    });
  } catch (error) {
    console.error("Create class material error:", error);
    res.status(500).json({
      error: error.message || "Failed to create class material.",
    });
  }
});

app.put("/update-class-material/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, week, content, fileName, fileUrl, fileType } = req.body;

    await db.collection("classMaterials").doc(id).update({
      ...(title ? { title } : {}),
      ...(week ? { week } : {}),
      ...(typeof content === "string" || content === null ? { content } : {}),
      ...(typeof fileName === "string" || fileName === null ? { fileName } : {}),
      ...(typeof fileUrl === "string" || fileUrl === null ? { fileUrl } : {}),
      ...(typeof fileType === "string" || fileType === null ? { fileType } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Class material updated successfully.",
    });
  } catch (error) {
    console.error("Update class material error:", error);
    res.status(500).json({
      error: error.message || "Failed to update class material.",
    });
  }
});

app.delete("/delete-class-material/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("classMaterials").doc(id).delete();

    res.json({
      success: true,
      message: "Class material deleted successfully.",
    });
  } catch (error) {
    console.error("Delete class material error:", error);
    res.status(500).json({
      error: error.message || "Failed to delete class material.",
    });
  }
});

app.get("/class-assignments/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    const snapshot = await db
      .collection("classAssignments")
      .where("classId", "==", classId)
      .orderBy("createdAt", "desc")
      .get();

    const assignments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(assignments);
  } catch (error) {
    console.error("Fetch class assignments error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch class assignments.",
    });
  }
});

app.post("/create-class-assignment", async (req, res) => {
  try {
    const {
      classId,
      header,
      instruction,
      dueDate,
      totalScore,
      pointsOnTime,
      repositoryDisabledAfterDue,
      fileName,
      fileUrl,
      fileType,
      postedByUid,
      postedByName,
    } = req.body;

    if (
      !classId ||
      !header ||
      !instruction ||
      !dueDate ||
      totalScore === undefined ||
      pointsOnTime === undefined
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const classSnap = await db.collection("classes").doc(classId).get();
    if (!classSnap.exists) {
      return res.status(404).json({ error: "Class not found." });
    }

    const ref = await db.collection("classAssignments").add({
      classId,
      header,
      instruction,
      dueDate,
      totalScore: Number(totalScore),
      pointsOnTime: Number(pointsOnTime),
      repositoryDisabledAfterDue: !!repositoryDisabledAfterDue,
      fileName: normalizeOptionalText(fileName),
      fileUrl: normalizeOptionalText(fileUrl),
      fileType: normalizeOptionalText(fileType),
      postedByUid: normalizeOptionalText(postedByUid),
      postedByName: normalizeOptionalText(postedByName),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Class assignment created successfully.",
      data: { id: ref.id },
    });
  } catch (error) {
    console.error("Create class assignment error:", error);
    res.status(500).json({
      error: error.message || "Failed to create class assignment.",
    });
  }
});

app.put("/update-class-assignment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      header,
      instruction,
      dueDate,
      totalScore,
      pointsOnTime,
      repositoryDisabledAfterDue,
      fileName,
      fileUrl,
      fileType,
    } = req.body;

    await db.collection("classAssignments").doc(id).update({
      ...(header ? { header } : {}),
      ...(instruction ? { instruction } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(totalScore !== undefined ? { totalScore: Number(totalScore) } : {}),
      ...(pointsOnTime !== undefined
        ? { pointsOnTime: Number(pointsOnTime) }
        : {}),
      ...(repositoryDisabledAfterDue !== undefined
        ? { repositoryDisabledAfterDue: !!repositoryDisabledAfterDue }
        : {}),
      ...(typeof fileName === "string" || fileName === null ? { fileName } : {}),
      ...(typeof fileUrl === "string" || fileUrl === null ? { fileUrl } : {}),
      ...(typeof fileType === "string" || fileType === null ? { fileType } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Class assignment updated successfully.",
    });
  } catch (error) {
    console.error("Update class assignment error:", error);
    res.status(500).json({
      error: error.message || "Failed to update class assignment.",
    });
  }
});

app.delete("/delete-class-assignment/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("classAssignments").doc(id).delete();

    const submissionsSnapshot = await db
      .collection("classSubmissions")
      .where("assignmentId", "==", id)
      .get();

    const batch = db.batch();
    submissionsSnapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({
      success: true,
      message: "Class assignment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete class assignment error:", error);
    res.status(500).json({
      error: error.message || "Failed to delete class assignment.",
    });
  }
});

app.get("/class-submissions/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    const snapshot = await db
      .collection("classSubmissions")
      .where("classId", "==", classId)
      .orderBy("submittedAt", "desc")
      .get();

    const submissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(submissions);
  } catch (error) {
    console.error("Fetch class submissions error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch class submissions.",
    });
  }
});

app.post("/create-submission", async (req, res) => {
  try {
    const {
      classId,
      assignmentId,
      studentUid,
      studentId,
      studentName,
      status,
      score,
      fileName,
      fileUrl,
      fileType,
      feedback,
    } = req.body;

    if (!classId || !assignmentId || !studentId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const ref = await db.collection("classSubmissions").add({
      classId,
      assignmentId,
      studentUid: normalizeOptionalText(studentUid),
      studentId,
      studentName: normalizeOptionalText(studentName),
      status: normalizeOptionalText(status) || "submitted",
      score: typeof score === "number" ? score : null,
      fileName: normalizeOptionalText(fileName),
      fileUrl: normalizeOptionalText(fileUrl),
      fileType: normalizeOptionalText(fileType),
      feedback: normalizeOptionalText(feedback),
      submittedAt: FieldValue.serverTimestamp(),
      gradedAt: null,
    });

    res.json({
      success: true,
      message: "Submission created successfully.",
      data: { id: ref.id },
    });
  } catch (error) {
    console.error("Create submission error:", error);
    res.status(500).json({
      error: error.message || "Failed to create submission.",
    });
  }
});

app.put("/grade-submission/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, score, feedback } = req.body;

    await db.collection("classSubmissions").doc(id).update({
      ...(status ? { status } : {}),
      ...(score !== undefined ? { score: Number(score) } : {}),
      ...(typeof feedback === "string" || feedback === null
        ? { feedback }
        : {}),
      gradedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Submission graded successfully.",
    });
  } catch (error) {
    console.error("Grade submission error:", error);
    res.status(500).json({
      error: error.message || "Failed to grade submission.",
    });
  }
});

app.get("/class-announcements/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    const snapshot = await db
      .collection("classAnnouncements")
      .where("classId", "==", classId)
      .orderBy("createdAt", "desc")
      .get();

    const announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(announcements);
  } catch (error) {
    console.error("Fetch class announcements error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch class announcements.",
    });
  }
});

app.post("/create-class-announcement", async (req, res) => {
  try {
    const { classId, title, message, postedByUid, postedByName } = req.body;

    if (!classId || !title || !message) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const ref = await db.collection("classAnnouncements").add({
      classId,
      title,
      message,
      postedByUid: normalizeOptionalText(postedByUid),
      postedByName: normalizeOptionalText(postedByName),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Announcement created successfully.",
      data: { id: ref.id },
    });
  } catch (error) {
    console.error("Create class announcement error:", error);
    res.status(500).json({
      error: error.message || "Failed to create class announcement.",
    });
  }
});

app.delete("/delete-class-announcement/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("classAnnouncements").doc(id).delete();

    res.json({
      success: true,
      message: "Announcement deleted successfully.",
    });
  } catch (error) {
    console.error("Delete class announcement error:", error);
    res.status(500).json({
      error: error.message || "Failed to delete class announcement.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});