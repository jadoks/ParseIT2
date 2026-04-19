import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

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

function generateFirstLoginPin(length = 4) {
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

function generateForgotPasswordPin(length = 4) {
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

function buildPinExpiryDate(minutes = 15) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
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

function normalizeAvatarValue(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "object" && typeof value.uri === "string") {
    const trimmed = value.uri.trim();
    return trimmed ? trimmed : null;
  }

  return null;
}

function formatFirestoreDateTime(value) {
  if (!value) return "";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
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
    case "application/pdf":
      return "pdf";
    case "text/plain":
      return "txt";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.ms-powerpoint":
      return "ppt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    case "application/vnd.ms-excel":
      return "xls";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/zip":
      return "zip";
    case "application/x-zip-compressed":
      return "zip";
    default:
      return "bin";
  }
}

function sanitizeFileName(fileName = "file") {
  return String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
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

function resolveDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
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

async function uploadGenericFileToStorage({
  fileBase64,
  fileMimeType,
  fileName,
  folder = "class-files",
  classId,
}) {
  if (!fileBase64) {
    throw new Error("File data is required.");
  }

  if (!classId) {
    throw new Error("Class ID is required.");
  }

  const cleanedBase64 = fileBase64.includes(",")
    ? fileBase64.split(",")[1]
    : fileBase64;

  const safeMimeType =
    normalizeOptionalText(fileMimeType) || "application/octet-stream";

  const fallbackExtension = getFileExtensionFromMimeType(safeMimeType);
  const safeFileName = sanitizeFileName(
    normalizeOptionalText(fileName) || `file.${fallbackExtension}`
  );
  const uniqueFileName = `${Date.now()}-${safeFileName}`;
  const storagePath = `${folder}/${classId}/${uniqueFileName}`;

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
    fileUrl: file.publicUrl(),
    storagePath,
    fileName: safeFileName,
    fileType: safeMimeType,
    bucketPath: `gs://parseit2-4b26d.firebasestorage.app/${storagePath}`,
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

function getCollectionNameByRole(role) {
  if (role === "student") return "students";
  if (role === "teacher") return "teachers";
  if (role === "admin") return "admins";
  return null;
}

async function findUsersByIdAcrossAllRoles(id) {
  const normalizedId = normalizeOptionalText(id);
  if (!normalizedId) return [];

  const roles = [
    { role: "student", collection: "students" },
    { role: "teacher", collection: "teachers" },
    { role: "admin", collection: "admins" },
  ];

  const matches = [];

  for (const item of roles) {
    const doc = await db.collection(item.collection).doc(normalizedId).get();

    if (doc.exists) {
      matches.push({
        role: item.role,
        collection: item.collection,
        ref: doc.ref,
        data: doc.data(),
        id: doc.id,
      });
    }
  }

  return matches;
}

async function findUserByEmailAcrossRoles(email) {
  const normalizedEmail = normalizeOptionalText(email);
  if (!normalizedEmail) return null;

  const roles = [
    { role: "student", collection: "students" },
    { role: "teacher", collection: "teachers" },
    { role: "admin", collection: "admins" },
  ];

  for (const item of roles) {
    const snapshot = await db
      .collection(item.collection)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        role: item.role,
        collection: item.collection,
        ref: doc.ref,
        data: doc.data(),
        id: doc.id,
      };
    }
  }

  return null;
}

async function sendFirstLoginCodeEmail({ firstName, email, pin }) {
  await transporter.sendMail({
    from: `ParseIT <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your First Login Verification Code",
    html: `
      <h2>Hello ${firstName || "User"},</h2>
      <p>You requested a first-login verification code.</p>
      <p><b>Your 4-digit PIN:</b> ${pin}</p>
      <p>This PIN will expire in 15 minutes.</p>
    `,
  });
}

async function sendForgotPasswordCodeEmail({ firstName, email, pin }) {
  await transporter.sendMail({
    from: `ParseIT <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Password Reset Verification Code",
    html: `
      <h2>Hello ${firstName || "User"},</h2>
      <p>You requested to reset your password.</p>
      <p><b>Your 4-digit PIN:</b> ${pin}</p>
      <p>This PIN will expire in 15 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

async function ensureTeacherMemberForClass({
  classId,
  teacherUid,
  teacherId,
  teacherName,
  teacherEmail,
}) {
  if (!classId || !teacherId) return;

  const existingMembership = await db
    .collection("classMembers")
    .where("classId", "==", classId)
    .where("userId", "==", teacherId)
    .limit(1)
    .get();

  if (!existingMembership.empty) {
    return;
  }

  await db.collection("classMembers").add({
    classId,
    userUid: normalizeOptionalText(teacherUid),
    userId: teacherId,
    name: normalizeOptionalText(teacherName),
    email: normalizeOptionalText(teacherEmail),
    role: "teacher",
    joinedAt: FieldValue.serverTimestamp(),
    status: "active",
  });
}

async function createClassMessengerConversation({
  classId,
  classCode,
  className,
  semester,
  schoolYear,
  section,
  teacherUid,
  teacherId,
  teacherName,
  teacherEmail,
}) {
  if (!classId || !teacherId) return null;

  const existingConversation = await db
    .collection("messengerConversations")
    .where("classId", "==", classId)
    .limit(1)
    .get();

  if (!existingConversation.empty) {
    return existingConversation.docs[0].id;
  }

  const conversationRef = await db.collection("messengerConversations").add({
    classId,
    classCode: normalizeOptionalText(classCode),
    className: normalizeOptionalText(className),
    semester: normalizeOptionalText(semester),
    schoolYear: normalizeOptionalText(schoolYear),
    section: normalizeOptionalText(section),

    type: "class",
    ownerRole: "teacher",
    ownerUid: normalizeOptionalText(teacherUid),
    ownerId: normalizeOptionalText(teacherId),
    ownerName: normalizeOptionalText(teacherName),
    ownerEmail: normalizeOptionalText(teacherEmail),

    instructorName: normalizeOptionalText(teacherName),
    instructorEmail: normalizeOptionalText(teacherEmail),

    participants: [
      {
        userUid: normalizeOptionalText(teacherUid),
        userId: normalizeOptionalText(teacherId),
        name: normalizeOptionalText(teacherName),
        email: normalizeOptionalText(teacherEmail),
        role: "teacher",
      },
    ],

    lastMessage: "Class conversation created.",
    lastMessageSender: "system",
    lastMessageAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await conversationRef.collection("messages").add({
    type: "system",
    text: `Conversation created for class ${className}.`,
    classId,
    createdAt: FieldValue.serverTimestamp(),
    createdByRole: "system",
  });

  return conversationRef.id;
}

/**
 * AUTH ROUTES
 */

app.post("/auth/lookup-user", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID is required." });
    }

    const normalizedId = id.trim();

    if (!normalizedId) {
      return res.status(400).json({ error: "ID is required." });
    }

    const matches = await findUsersByIdAcrossAllRoles(normalizedId);

    if (!matches.length) {
      return res.status(404).json({ error: "User not found." });
    }

    if (matches.length > 1) {
      return res.status(409).json({
        error: "Duplicate ID found across multiple roles. Please contact admin.",
      });
    }

    const matchedUser = matches[0];
    const userData = matchedUser.data || {};

    return res.json({
      success: true,
      role: matchedUser.role,
      id:
        userData.studentId ||
        userData.teacherId ||
        userData.adminId ||
        matchedUser.id,
      email: userData.email || null,
      mustChangePassword: !!userData.mustChangePassword,
      codeVerified: !!userData.codeVerified,
      accountCreated: !!userData.accountCreated,
    });
  } catch (error) {
    console.error("Lookup user error:", error);
    return res.status(500).json({
      error: error.message || "Failed to look up user.",
    });
  }
});

app.post("/auth/user-profile", async (req, res) => {
  try {
    const { id, role } = req.body;

    if (!id || !role) {
      return res.status(400).json({
        error: "ID and role are required.",
      });
    }

    const collectionName = getCollectionNameByRole(role);

    if (!collectionName) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const userSnap = await db.collection(collectionName).doc(String(id).trim()).get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userSnap.data() || {};

    return res.json({
      success: true,
      data: {
        role,
        id:
          userData.studentId ||
          userData.teacherId ||
          userData.adminId ||
          userSnap.id,
        email: userData.email || null,
        authUid: userData.authUid || null,
        studentId: userData.studentId || undefined,
        teacherId: userData.teacherId || undefined,
        adminId: userData.adminId || undefined,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        profileImage: userData.profileImage || null,
        bannerImage: userData.bannerImage || null,
      },
    });
  } catch (error) {
    console.error("User profile fetch error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch user profile.",
    });
  }
});

app.post("/auth/send-first-login-pin", async (req, res) => {
  try {
    const { id, role } = req.body;

    if (!id || !role) {
      return res.status(400).json({
        error: "ID and role are required.",
      });
    }

    const collectionName = getCollectionNameByRole(role);

    if (!collectionName) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const userRef = db.collection(collectionName).doc(id);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userSnap.data();

    if (!userData?.mustChangePassword) {
      return res.status(400).json({
        error: "This account does not require first login setup.",
      });
    }

    if (!userData?.email) {
      return res.status(400).json({
        error: "User email is missing.",
      });
    }

    const firstLoginPin = generateFirstLoginPin(4);
    const firstLoginPinExpiresAt = buildPinExpiryDate(15);

    await userRef.update({
      firstLoginPin,
      firstLoginPinExpiresAt,
      firstLoginPinSentAt: FieldValue.serverTimestamp(),
      codeVerified: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await sendFirstLoginCodeEmail({
      firstName: userData.firstName,
      email: userData.email,
      pin: firstLoginPin,
    });

    return res.json({
      success: true,
      message: "First login PIN sent successfully.",
    });
  } catch (error) {
    console.error("Send first login PIN error:", error);
    return res.status(500).json({
      error: error.message || "Failed to send first login PIN.",
    });
  }
});

app.post("/auth/verify-first-login-pin", async (req, res) => {
  try {
    const { id, role, pin } = req.body;

    if (!id || !role || !pin) {
      return res.status(400).json({
        error: "ID, role, and PIN are required.",
      });
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({
        error: "PIN must be exactly 4 digits.",
      });
    }

    const collectionName = getCollectionNameByRole(role);

    if (!collectionName) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const userRef = db.collection(collectionName).doc(id);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userSnap.data();

    if (!userData?.mustChangePassword) {
      return res.status(400).json({
        error: "This account does not require first login setup.",
      });
    }

    if (!userData?.firstLoginPin) {
      return res.status(400).json({
        error: "No first login PIN found for this account.",
      });
    }

    const expiresAt = resolveDate(userData.firstLoginPinExpiresAt);

    if (!expiresAt) {
      return res.status(400).json({
        error: "PIN expiry is invalid. Please request a new PIN.",
      });
    }

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        error: "PIN has expired. Please sign in again to receive a new PIN.",
      });
    }

    if (String(userData.firstLoginPin) !== String(pin)) {
      return res.status(401).json({
        error: "Invalid PIN.",
      });
    }

    await userRef.update({
      codeVerified: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "PIN verified successfully.",
    });
  } catch (error) {
    console.error("Verify first login PIN error:", error);
    return res.status(500).json({
      error: error.message || "Failed to verify first login PIN.",
    });
  }
});

app.post("/auth/complete-first-login", async (req, res) => {
  try {
    const { id, role, newPassword } = req.body;

    if (!id || !role || !newPassword) {
      return res.status(400).json({
        error: "ID, role, and newPassword are required.",
      });
    }

    if (String(newPassword).trim().length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters long.",
      });
    }

    const collectionName = getCollectionNameByRole(role);

    if (!collectionName) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const userRef = db.collection(collectionName).doc(id);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userSnap.data();

    if (!userData?.authUid) {
      return res.status(400).json({
        error: "User auth UID is missing.",
      });
    }

    if (!userData?.mustChangePassword) {
      return res.status(400).json({
        error: "This account does not require first login setup.",
      });
    }

    if (!userData?.codeVerified) {
      return res.status(400).json({
        error: "PIN must be verified before setting a new password.",
      });
    }

    await admin.auth().updateUser(userData.authUid, {
      password: String(newPassword).trim(),
    });

    await userRef.update({
      mustChangePassword: false,
      codeVerified: true,
      firstLoginPin: null,
      firstLoginPinExpiresAt: null,
      firstLoginPinSentAt: null,
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "First login completed successfully.",
    });
  } catch (error) {
    console.error("Complete first login error:", error);
    return res.status(500).json({
      error: error.message || "Failed to complete first login.",
    });
  }
});

/**
 * FORGOT PASSWORD ROUTES
 */

app.post("/auth/send-forgot-password-pin", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required." });
    }

    const foundUser = await findUserByEmailAcrossRoles(email);

    if (!foundUser) {
      return res.status(404).json({ error: "No account found for this email." });
    }

    const userData = foundUser.data || {};
    const forgotPasswordPin = generateForgotPasswordPin(4);
    const forgotPasswordPinExpiresAt = buildPinExpiryDate(15);

    await foundUser.ref.update({
      forgotPasswordPin,
      forgotPasswordPinExpiresAt,
      forgotPasswordPinSentAt: FieldValue.serverTimestamp(),
      forgotPasswordCodeVerified: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await sendForgotPasswordCodeEmail({
      firstName: userData.firstName,
      email: userData.email,
      pin: forgotPasswordPin,
    });

    return res.json({
      success: true,
      role: foundUser.role,
      id:
        userData.studentId ||
        userData.teacherId ||
        userData.adminId ||
        foundUser.id,
      email: userData.email,
      message: "Forgot password PIN sent successfully.",
    });
  } catch (error) {
    console.error("Send forgot password PIN error:", error);
    return res.status(500).json({
      error: error.message || "Failed to send forgot password PIN.",
    });
  }
});

app.post("/auth/verify-forgot-password-pin", async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({
        error: "Email and PIN are required.",
      });
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({
        error: "PIN must be exactly 4 digits.",
      });
    }

    const foundUser = await findUserByEmailAcrossRoles(email);

    if (!foundUser) {
      return res.status(404).json({ error: "No account found for this email." });
    }

    const userData = foundUser.data || {};

    if (!userData?.forgotPasswordPin) {
      return res.status(400).json({
        error: "No forgot password PIN found for this account.",
      });
    }

    const expiresAt = resolveDate(userData.forgotPasswordPinExpiresAt);

    if (!expiresAt) {
      return res.status(400).json({
        error: "PIN expiry is invalid. Please request a new PIN.",
      });
    }

    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        error: "PIN has expired. Please request a new PIN.",
      });
    }

    if (String(userData.forgotPasswordPin) !== String(pin)) {
      return res.status(401).json({
        error: "Invalid PIN.",
      });
    }

    await foundUser.ref.update({
      forgotPasswordCodeVerified: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Forgot password PIN verified successfully.",
    });
  } catch (error) {
    console.error("Verify forgot password PIN error:", error);
    return res.status(500).json({
      error: error.message || "Failed to verify forgot password PIN.",
    });
  }
});

app.post("/auth/reset-forgot-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        error: "Email and newPassword are required.",
      });
    }

    if (String(newPassword).trim().length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters long.",
      });
    }

    const foundUser = await findUserByEmailAcrossRoles(email);

    if (!foundUser) {
      return res.status(404).json({ error: "No account found for this email." });
    }

    const userData = foundUser.data || {};

    if (!userData?.authUid) {
      return res.status(400).json({
        error: "User auth UID is missing.",
      });
    }

    if (!userData?.forgotPasswordCodeVerified) {
      return res.status(400).json({
        error: "PIN must be verified before resetting password.",
      });
    }

    await admin.auth().updateUser(userData.authUid, {
      password: String(newPassword).trim(),
    });

    await foundUser.ref.update({
      forgotPasswordPin: null,
      forgotPasswordPinExpiresAt: null,
      forgotPasswordPinSentAt: null,
      forgotPasswordCodeVerified: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset forgot password error:", error);
    return res.status(500).json({
      error: error.message || "Failed to reset password.",
    });
  }
});

/**
 * FILE UPLOAD ROUTE
 */

app.post("/upload-class-file", async (req, res) => {
  try {
    const {
      classId,
      fileBase64,
      fileName,
      fileType,
      kind,
    } = req.body;

    if (!classId) {
      return res.status(400).json({ error: "classId is required." });
    }

    if (!fileBase64) {
      return res.status(400).json({ error: "fileBase64 is required." });
    }

    const classSnap = await db.collection("classes").doc(classId).get();
    if (!classSnap.exists) {
      return res.status(404).json({ error: "Class not found." });
    }

    const folder =
      kind === "assignment" ? "class-assignments" : "class-materials";

    const uploadedFile = await uploadGenericFileToStorage({
      fileBase64,
      fileMimeType: fileType,
      fileName,
      folder,
      classId,
    });

    return res.json({
      success: true,
      message: "File uploaded successfully.",
      data: uploadedFile,
    });
  } catch (error) {
    console.error("Upload class file error:", error);
    return res.status(500).json({
      error: error.message || "Failed to upload file.",
    });
  }
});

/**
 * ACCOUNT CREATION ROUTES
 */

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

    const normalizedStudentId = String(studentId).trim();

    const existingIdMatches = await findUsersByIdAcrossAllRoles(normalizedStudentId);
    if (existingIdMatches.length > 0) {
      return res.status(409).json({
        error: `ID already exists in ${existingIdMatches[0].role} account.`,
      });
    }

    const studentRef = db.collection("students").doc(normalizedStudentId);

    const tempPassword = generateTempPassword(8);
    const firstLoginPin = generateFirstLoginPin(4);
    const firstLoginPinExpiresAt = buildPinExpiryDate(15);

    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

    await studentRef.set({
      studentId: normalizedStudentId,
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
      firstLoginPin,
      firstLoginPinExpiresAt,
      firstLoginPinSentAt: FieldValue.serverTimestamp(),
      forgotPasswordPin: null,
      forgotPasswordPinExpiresAt: null,
      forgotPasswordPinSentAt: null,
      forgotPasswordCodeVerified: false,
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
          <p><b>Student ID:</b> ${normalizedStudentId}</p>
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

    const normalizedTeacherId = String(teacherId).trim();

    const existingIdMatches = await findUsersByIdAcrossAllRoles(normalizedTeacherId);
    if (existingIdMatches.length > 0) {
      return res.status(409).json({
        error: `ID already exists in ${existingIdMatches[0].role} account.`,
      });
    }

    const teacherRef = db.collection("teachers").doc(normalizedTeacherId);

    const tempPassword = generateTempPassword(8);
    const firstLoginPin = generateFirstLoginPin(4);
    const firstLoginPinExpiresAt = buildPinExpiryDate(15);

    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

    await teacherRef.set({
      teacherId: normalizedTeacherId,
      firstName,
      lastName,
      email,
      birthday: parseDateValue(birthday),
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      firstLoginPin,
      firstLoginPinExpiresAt,
      firstLoginPinSentAt: FieldValue.serverTimestamp(),
      forgotPasswordPin: null,
      forgotPasswordPinExpiresAt: null,
      forgotPasswordPinSentAt: null,
      forgotPasswordCodeVerified: false,
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
          <p><b>Teacher ID:</b> ${normalizedTeacherId}</p>
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

    const normalizedAdminId = String(adminId).trim();

    const existingIdMatches = await findUsersByIdAcrossAllRoles(normalizedAdminId);
    if (existingIdMatches.length > 0) {
      return res.status(409).json({
        error: `ID already exists in ${existingIdMatches[0].role} account.`,
      });
    }

    const adminRef = db.collection("admins").doc(normalizedAdminId);

    const tempPassword = generateTempPassword(8);
    const firstLoginPin = generateFirstLoginPin(4);
    const firstLoginPinExpiresAt = buildPinExpiryDate(15);

    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
    });

    await adminRef.set({
      adminId: normalizedAdminId,
      firstName,
      lastName,
      email,
      birthday: parseDateValue(birthday),
      authUid: userRecord.uid,
      accountCreated: true,
      tempPasswordSent: false,
      mustChangePassword: true,
      codeVerified: false,
      firstLoginPin,
      firstLoginPinExpiresAt,
      firstLoginPinSentAt: FieldValue.serverTimestamp(),
      forgotPasswordPin: null,
      forgotPasswordPinExpiresAt: null,
      forgotPasswordPinSentAt: null,
      forgotPasswordCodeVerified: false,
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
          <p><b>Admin ID:</b> ${normalizedAdminId}</p>
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

/**
 * EXISTING ROUTES
 */

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

    if (adminId && adminId !== id) {
      const matches = await findUsersByIdAcrossAllRoles(adminId);
      const conflict = matches.find((item) => item.id !== id);

      if (conflict) {
        return res.status(409).json({
          error: `ID already exists in ${conflict.role} account.`,
        });
      }
    }

    const adminRef = db.collection("admins").doc(id);
    const adminSnap = await adminRef.get();

    if (!adminSnap.exists) {
      return res.status(404).json({ error: "Admin not found." });
    }

    const existingData = adminSnap.data();

    if (adminId && adminId !== id) {
      const updatedData = {
        ...existingData,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
        ...(email ? { email } : {}),
        adminId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db.collection("admins").doc(adminId).set(updatedData);
      await adminRef.delete();
    } else {
      await adminRef.update({
        ...(adminId ? { adminId } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
        ...(email ? { email } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

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

    if (teacherId && teacherId !== id) {
      const matches = await findUsersByIdAcrossAllRoles(teacherId);
      const conflict = matches.find((item) => item.id !== id);

      if (conflict) {
        return res.status(409).json({
          error: `ID already exists in ${conflict.role} account.`,
        });
      }
    }

    const teacherRef = db.collection("teachers").doc(id);
    const teacherSnap = await teacherRef.get();

    if (!teacherSnap.exists) {
      return res.status(404).json({ error: "Teacher not found." });
    }

    const existingData = teacherSnap.data();

    if (teacherId && teacherId !== id) {
      const updatedData = {
        ...existingData,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
        ...(email ? { email } : {}),
        teacherId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db.collection("teachers").doc(teacherId).set(updatedData);
      await teacherRef.delete();
    } else {
      await teacherRef.update({
        ...(teacherId ? { teacherId } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
        ...(email ? { email } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

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

    if (studentId && studentId !== id) {
      const matches = await findUsersByIdAcrossAllRoles(studentId);
      const conflict = matches.find((item) => item.id !== id);

      if (conflict) {
        return res.status(409).json({
          error: `ID already exists in ${conflict.role} account.`,
        });
      }
    }

    const studentRef = db.collection("students").doc(id);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      return res.status(404).json({ error: "Student not found." });
    }

    const existingData = studentSnap.data();

    if (studentId && studentId !== id) {
      const updatedData = {
        ...existingData,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
        ...(email ? { email } : {}),
        ...(studentType ? { status: studentType } : {}),
        studentId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db.collection("students").doc(studentId).set(updatedData);
      await studentRef.delete();
    } else {
      await studentRef.update({
        ...(studentId ? { studentId } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(birthday ? { birthday: parseDateValue(birthday) } : {}),
        ...(email ? { email } : {}),
        ...(studentType ? { status: studentType } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

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
      memberCount: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await ensureTeacherMemberForClass({
      classId: classRef.id,
      teacherUid: resolvedAssignedTeacherUid,
      teacherId: resolvedAssignedTeacherId,
      teacherName: resolvedInstructorName,
      teacherEmail: resolvedInstructorEmail,
    });

    const conversationId = await createClassMessengerConversation({
      classId: classRef.id,
      classCode,
      className: name,
      semester,
      schoolYear,
      section,
      teacherUid: resolvedAssignedTeacherUid,
      teacherId: resolvedAssignedTeacherId,
      teacherName: resolvedInstructorName,
      teacherEmail: resolvedInstructorEmail,
    });

    res.json({
      success: true,
      message: "Class created successfully.",
      data: {
        id: classRef.id,
        classCode,
        bannerUrl: uploadedBanner.bannerUrl,
        conversationId,
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

    const mergedClassData = {
      ...existingClass,
      ...(name ? { name } : {}),
      ...(courseCode ? { courseCode } : {}),
      ...(section ? { section } : {}),
      ...(semester ? { semester } : {}),
      ...(typeof schoolYear === "string" || schoolYear === null
        ? { schoolYear }
        : {}),
      ...nextTeacherFields,
    };

    if (
      mergedClassData.assignedTeacherId ||
      mergedClassData.assignedTeacherUid ||
      mergedClassData.instructorName
    ) {
      await ensureTeacherMemberForClass({
        classId: id,
        teacherUid: mergedClassData.assignedTeacherUid,
        teacherId: mergedClassData.assignedTeacherId,
        teacherName: mergedClassData.instructorName,
        teacherEmail: mergedClassData.instructorEmail,
      });

      const conversationSnapshot = await db
        .collection("messengerConversations")
        .where("classId", "==", id)
        .limit(1)
        .get();

      if (!conversationSnapshot.empty) {
        await conversationSnapshot.docs[0].ref.update({
          className: normalizeOptionalText(mergedClassData.name),
          classCode: normalizeOptionalText(mergedClassData.courseCode),
          semester: normalizeOptionalText(mergedClassData.semester),
          schoolYear: normalizeOptionalText(mergedClassData.schoolYear),
          section: normalizeOptionalText(mergedClassData.section),
          ownerUid: normalizeOptionalText(mergedClassData.assignedTeacherUid),
          ownerId: normalizeOptionalText(mergedClassData.assignedTeacherId),
          ownerName: normalizeOptionalText(mergedClassData.instructorName),
          ownerEmail: normalizeOptionalText(mergedClassData.instructorEmail),
          instructorName: normalizeOptionalText(mergedClassData.instructorName),
          instructorEmail: normalizeOptionalText(mergedClassData.instructorEmail),
          participants: [
            {
              userUid: normalizeOptionalText(mergedClassData.assignedTeacherUid),
              userId: normalizeOptionalText(mergedClassData.assignedTeacherId),
              name: normalizeOptionalText(mergedClassData.instructorName),
              email: normalizeOptionalText(mergedClassData.instructorEmail),
              role: "teacher",
            },
          ],
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

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

    const conversationSnapshot = await db
      .collection("messengerConversations")
      .where("classId", "==", id)
      .get();

    for (const conversationDoc of conversationSnapshot.docs) {
      const messagesSnapshot = await conversationDoc.ref.collection("messages").get();
      const batch = db.batch();

      messagesSnapshot.forEach((doc) => batch.delete(doc.ref));
      batch.delete(conversationDoc.ref);

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
    const { classCode, studentId } = req.body;

    if (!classCode || !studentId) {
      return res.status(400).json({
        error: "classCode and studentId are required.",
      });
    }

    const normalizedClassCode = String(classCode).trim().toUpperCase();
    const normalizedStudentId = String(studentId).trim();

    const classQuery = await db
      .collection("classes")
      .where("classCode", "==", normalizedClassCode)
      .limit(1)
      .get();

    if (classQuery.empty) {
      return res.status(404).json({ error: "Class code not found." });
    }

    const classDoc = classQuery.docs[0];
    const classId = classDoc.id;
    const classRef = db.collection("classes").doc(classId);

    const student = await findStudentById(normalizedStudentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    const existingMembership = await db
      .collection("classMembers")
      .where("classId", "==", classId)
      .where("userId", "==", normalizedStudentId)
      .limit(1)
      .get();

    if (!existingMembership.empty) {
      return res.status(409).json({
        error: "Student is already a class member.",
      });
    }

    const studentFullName =
      `${student.firstName || ""} ${student.lastName || ""}`.trim();

    await db.collection("classMembers").add({
      classId,
      userUid: student.authUid || null,
      userId: student.studentId || normalizedStudentId,
      name: studentFullName,
      email: student.email || null,
      role: "student",
      joinedAt: FieldValue.serverTimestamp(),
      status: "active",
    });

    await classRef.update({
      memberCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const conversationSnapshot = await db
      .collection("messengerConversations")
      .where("classId", "==", classId)
      .limit(1)
      .get();

    if (!conversationSnapshot.empty) {
      const conversationRef = conversationSnapshot.docs[0].ref;
      const conversationData = conversationSnapshot.docs[0].data();

      const existingParticipants = Array.isArray(conversationData.participants)
        ? conversationData.participants
        : [];

      const alreadyParticipant = existingParticipants.some(
        (participant) =>
          participant?.userId === (student.studentId || normalizedStudentId)
      );

      if (!alreadyParticipant) {
        await conversationRef.update({
          participants: [
            ...existingParticipants,
            {
              userUid: student.authUid || null,
              userId: student.studentId || normalizedStudentId,
              name: studentFullName,
              email: student.email || null,
              role: "student",
            },
          ],
          updatedAt: FieldValue.serverTimestamp(),
        });

        await conversationRef.collection("messages").add({
          type: "system",
          text: `${studentFullName} joined the class conversation.`,
          classId,
          createdAt: FieldValue.serverTimestamp(),
          createdByRole: "system",
        });
      }
    }

    return res.json({
      success: true,
      message: "Student joined class successfully.",
      data: {
        classId,
        classCode: normalizedClassCode,
      },
    });
  } catch (error) {
    console.error("Join class error:", error);
    return res.status(500).json({
      error: error.message || "Failed to join class.",
    });
  }
});

app.get("/student-joined-classes/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required." });
    }

    const normalizedStudentId = String(studentId).trim();

    const membershipSnapshot = await db
      .collection("classMembers")
      .where("userId", "==", normalizedStudentId)
      .where("role", "==", "student")
      .where("status", "==", "active")
      .get();

    if (membershipSnapshot.empty) {
      return res.json([]);
    }

    const memberships = membershipSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const classIds = memberships
      .map((item) => item.classId)
      .filter(Boolean);

    const uniqueClassIds = [...new Set(classIds)];

    const joinedClasses = await Promise.all(
      uniqueClassIds.map(async (classId) => {
        const classSnap = await db.collection("classes").doc(classId).get();

        if (!classSnap.exists) {
          return null;
        }

        const classData = classSnap.data() || {};

        const materialsSnapshot = await db
          .collection("classMaterials")
          .where("classId", "==", classId)
          .orderBy("createdAt", "desc")
          .get();

        const assignmentsSnapshot = await db
          .collection("classAssignments")
          .where("classId", "==", classId)
          .orderBy("createdAt", "desc")
          .get();

        const materials = materialsSnapshot.docs.map((doc) => {
          const material = doc.data() || {};

          let materialType = "document";
          const rawType = String(material.fileType || "").toLowerCase();
          const fileUrl = material.fileUrl || material.fileUri || null;

          if (rawType.includes("pdf")) {
            materialType = "pdf";
          } else if (rawType.includes("video")) {
            materialType = "video";
          } else if (!fileUrl) {
            materialType = "link";
          }

          return {
            id: doc.id,
            title: material.title || "Untitled Material",
            type: materialType,
            uploadedDate: formatFirestoreDateTime(material.createdAt) || "Unknown date",
            content: material.content || "",
            fileName: material.fileName || null,
            fileUrl,
            fileUri: fileUrl,
            fileType: material.fileType || null,
            storagePath: material.storagePath || null,
            bucketPath: material.bucketPath || null,
            week: material.week || null,
            postedByName: material.postedByName || null,
            createdAt: material.createdAt || null,
            updatedAt: material.updatedAt || null,
          };
        });

        const assignments = assignmentsSnapshot.docs.map((doc) => {
          const assignment = doc.data() || {};

          return {
            id: doc.id,
            title: assignment.header || "Untitled Assignment",
            dueDate: assignment.dueDate || "",
            status: "pending",
            points: 0,
            maxPoints:
              typeof assignment.totalScore === "number"
                ? assignment.totalScore
                : Number(assignment.totalScore) || 0,
            topic: assignment.header || "",
            materialIds: Array.isArray(assignment.materialIds)
              ? assignment.materialIds
              : [],
            files:
              assignment.fileName || assignment.fileUrl
                ? [
                    {
                      id: `file-${doc.id}`,
                      name: assignment.fileName || "attachment",
                      uploadedAt: formatFirestoreDateTime(assignment.createdAt) || "Unknown date",
                      uri: assignment.fileUrl || null,
                    },
                  ]
                : [],
            comments: [],
            instruction: assignment.instruction || "",
            pointsOnTime:
              typeof assignment.pointsOnTime === "number"
                ? assignment.pointsOnTime
                : Number(assignment.pointsOnTime) || 0,
            repositoryDisabledAfterDue: !!assignment.repositoryDisabledAfterDue,
            fileName: assignment.fileName || null,
            fileUrl: assignment.fileUrl || null,
            fileType: assignment.fileType || null,
            storagePath: assignment.storagePath || null,
            bucketPath: assignment.bucketPath || null,
            postedByName: assignment.postedByName || null,
            createdAt: assignment.createdAt || null,
            updatedAt: assignment.updatedAt || null,
          };
        });

        return {
          id: classSnap.id,
          name: classData.name || "Untitled Class",
          classCode: classData.classCode || "",
          courseCode: classData.courseCode || classData.classCode || "",
          instructorName:
            classData.instructorName || classData.teacherName || "Unknown Instructor",
          description: classData.description || "No description available.",
          semester: classData.semester || "",
          schoolYear: classData.schoolYear || "",
          section: classData.section || "",
          year: classData.year || "",
          units:
            typeof classData.units === "number"
              ? classData.units
              : Number(classData.units) || 0,
          bannerUrl: classData.bannerUrl || null,
          bannerStoragePath: classData.bannerStoragePath || null,
          bannerFileName: classData.bannerFileName || null,
          bannerMimeType: classData.bannerMimeType || null,
          memberCount: classData.memberCount || 0,
          materials,
          assignments,
          createdAt: classData.createdAt || null,
          updatedAt: classData.updatedAt || null,
        };
      })
    );

    return res.json(joinedClasses.filter(Boolean));
  } catch (error) {
    console.error("Fetch student joined classes error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch student joined classes.",
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

      const conversationSnapshot = await db
        .collection("messengerConversations")
        .where("classId", "==", memberData.classId)
        .limit(1)
        .get();

      if (!conversationSnapshot.empty && memberData?.userId) {
        const conversationRef = conversationSnapshot.docs[0].ref;
        const conversationData = conversationSnapshot.docs[0].data();
        const existingParticipants = Array.isArray(conversationData.participants)
          ? conversationData.participants
          : [];

        await conversationRef.update({
          participants: existingParticipants.filter(
            (participant) => participant?.userId !== memberData.userId
          ),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
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

app.get("/messenger-conversations", async (req, res) => {
  try {
    const {
      userId,
      userUid,
      role,
      classId,
    } = req.query;

    let snapshot;

    if (classId) {
      snapshot = await db
        .collection("messengerConversations")
        .where("classId", "==", classId)
        .orderBy("updatedAt", "desc")
        .get();
    } else {
      snapshot = await db
        .collection("messengerConversations")
        .orderBy("updatedAt", "desc")
        .get();
    }

    let conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (role === "teacher") {
      conversations = conversations.filter((conversation) => {
        return (
          conversation.ownerId === userId ||
          conversation.ownerUid === userUid ||
          (Array.isArray(conversation.participants) &&
            conversation.participants.some(
              (participant) =>
                participant?.userId === userId || participant?.userUid === userUid
            ))
        );
      });
    }

    if (role === "student") {
      conversations = conversations.filter((conversation) => {
        return (
          Array.isArray(conversation.participants) &&
          conversation.participants.some(
            (participant) =>
              participant?.userId === userId || participant?.userUid === userUid
          )
        );
      });
    }

    if (role === "admin") {
      conversations = conversations.filter(
        (conversation) => conversation.type === "class"
      );
    }

    res.json(conversations);
  } catch (error) {
    console.error("Fetch messenger conversations error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch messenger conversations.",
    });
  }
});

app.get("/messenger-messages/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const snapshot = await db
      .collection("messengerConversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(messages);
  } catch (error) {
    console.error("Fetch messenger messages error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch messenger messages.",
    });
  }
});

app.post("/messenger-send-message", async (req, res) => {
  try {
    const {
      conversationId,
      text,
      senderName,
      senderId,
      senderUid,
      senderRole,
    } = req.body;

    if (!conversationId || !text || !senderName) {
      return res.status(400).json({
        error: "conversationId, text, and senderName are required.",
      });
    }

    const conversationRef = db
      .collection("messengerConversations")
      .doc(conversationId);

    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    const trimmedText = String(text).trim();

    if (!trimmedText) {
      return res.status(400).json({ error: "Message text cannot be empty." });
    }

    const messageRef = await conversationRef.collection("messages").add({
      type: "text",
      text: trimmedText,
      senderName: normalizeOptionalText(senderName),
      senderId: normalizeOptionalText(senderId),
      senderUid: normalizeOptionalText(senderUid),
      senderRole: normalizeOptionalText(senderRole),
      createdAt: FieldValue.serverTimestamp(),
    });

    await conversationRef.update({
      lastMessage: trimmedText,
      lastMessageSender: normalizeOptionalText(senderName),
      lastMessageAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Message sent successfully.",
      data: {
        id: messageRef.id,
      },
    });
  } catch (error) {
    console.error("Send messenger message error:", error);
    res.status(500).json({
      error: error.message || "Failed to send messenger message.",
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
      storagePath,
      bucketPath,
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
      storagePath: normalizeOptionalText(storagePath),
      bucketPath: normalizeOptionalText(bucketPath),
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

    const materialRef = db.collection("classMaterials").doc(id);
    const materialSnap = await materialRef.get();

    if (!materialSnap.exists) {
      return res.status(404).json({ error: "Class material not found." });
    }

    const materialData = materialSnap.data();
    await deleteStorageFileIfExists(materialData?.storagePath);
    await materialRef.delete();

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
      storagePath,
      bucketPath,
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
      storagePath: normalizeOptionalText(storagePath),
      bucketPath: normalizeOptionalText(bucketPath),
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

    const assignmentRef = db.collection("classAssignments").doc(id);
    const assignmentSnap = await assignmentRef.get();

    if (!assignmentSnap.exists) {
      return res.status(404).json({ error: "Class assignment not found." });
    }

    const assignmentData = assignmentSnap.data();
    await deleteStorageFileIfExists(assignmentData?.storagePath);
    await assignmentRef.delete();

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

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "ParseIT backend is running",
    time: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    routes: [
  "POST /auth/lookup-user",
  "POST /auth/send-first-login-pin",
  "POST /auth/verify-first-login-pin",
  "POST /auth/complete-first-login",
  "POST /auth/send-forgot-password-pin",
  "POST /auth/verify-forgot-password-pin",
  "POST /auth/reset-forgot-password",
  "POST /upload-class-file",
  "POST /create-student",
  "POST /create-teacher",
  "POST /create-admin",
  "POST /create-class",

  "GET /community-posts",
  "POST /community-posts",
  "PUT /community-posts/:postId",
  "DELETE /community-posts/:postId",
  "POST /community-posts/:postId/answers",
  "PUT /community-posts/:postId/answers/:answerId",
  "DELETE /community-posts/:postId/answers/:answerId",

  "GET /messenger-conversations",
  "GET /messenger-messages/:conversationId",
  "POST /messenger-send-message",
],
  });
});

app.put("/community-posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "content is required." });
    }

    const postRef = db.collection("communityPosts").doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return res.status(404).json({ error: "Post not found." });
    }

    await postRef.update({
      content: String(content).trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Post updated successfully.",
    });
  } catch (error) {
    console.error("Update community post error:", error);
    return res.status(500).json({
      error: error.message || "Failed to update post.",
    });
  }
});

app.post("/ai/gemini", async (req, res) => {
  try {
    const { message, mode = "assistant", history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const systemInstruction =
      mode === "tutor"
        ? "You are ParseIT AI Tutor. Help students understand lessons step by step. Be clear, encouraging, and concise. Use simple examples."
        : "You are ParseIT Assistant. Help users navigate the ParseIT system, answer platform questions, and explain features clearly and briefly.";

    const contents = [
      ...history.map((item) => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini request failed.",
        raw: data,
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      "No response returned.";

    return res.json({ reply: text });
  } catch (error) {
    console.error("Gemini error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error.",
    });
  }
});


app.get("/community-posts", async (req, res) => {
  try {
    const postsSnapshot = await db
      .collection("communityPosts")
      .orderBy("createdAt", "desc")
      .get();

    const posts = await Promise.all(
      postsSnapshot.docs.map(async (doc) => {
        const postData = doc.data();

        const answersSnapshot = await db
          .collection("communityPosts")
          .doc(doc.id)
          .collection("answers")
          .orderBy("createdAt", "asc")
          .get();

        const answers = answersSnapshot.docs.map((answerDoc) => {
          const answerData = answerDoc.data();
          return {
            id: answerDoc.id,
            userName: answerData.userName || "Unknown User",
            avatar: answerData.avatar || null,
            answeredAt: formatFirestoreDateTime(answerData.createdAt),
            message: answerData.message || "",
          };
        });

        return {
          id: doc.id,
          userName: postData.userName || "Unknown User",
          userEmail: postData.userEmail || "",
          avatar: postData.avatar || null,
          dateTime: formatFirestoreDateTime(postData.createdAt),
          content: postData.content || "",
          answers,
        };
      })
    );

    return res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Fetch community posts error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch community posts.",
    });
  }
});


app.post("/community-posts", async (req, res) => {
  try {
    const {
      content,
      authorId,
      authorUid,
      authorRole,
      userName,
      userEmail,
      avatar,
    } = req.body;

    if (!content || !authorId || !authorRole || !userName) {
      return res.status(400).json({
        error: "content, authorId, authorRole, and userName are required.",
      });
    }

    if (!["student", "teacher"].includes(authorRole)) {
      return res.status(400).json({ error: "Invalid authorRole." });
    }

    const postRef = await db.collection("communityPosts").add({
      content: String(content).trim(),
      authorId: String(authorId).trim(),
      authorUid: normalizeOptionalText(authorUid),
      authorRole,
      userName: String(userName).trim(),
      userEmail: normalizeOptionalText(userEmail),
      avatar: normalizeAvatarValue(avatar),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const createdDoc = await postRef.get();
    const createdData = createdDoc.data() || {};

    return res.json({
      success: true,
      message: "Community post created successfully.",
      data: {
        id: postRef.id,
        userName: createdData.userName || userName,
        userEmail: createdData.userEmail || userEmail || "",
        avatar: createdData.avatar || avatar || null,
        dateTime: new Date().toLocaleString(),
        content: createdData.content || content,
        answers: [],
      },
    });
  } catch (error) {
    console.error("Create community post error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create community post.",
    });
  }
});

app.post("/community-posts/:postId/answers", async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      message,
      authorId,
      authorUid,
      authorRole,
      userName,
      avatar,
    } = req.body;

    if (!postId || !message || !authorId || !authorRole || !userName) {
      return res.status(400).json({
        error: "postId, message, authorId, authorRole, and userName are required.",
      });
    }

    if (!["student", "teacher"].includes(authorRole)) {
      return res.status(400).json({ error: "Invalid authorRole." });
    }

    const postRef = db.collection("communityPosts").doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return res.status(404).json({ error: "Post not found." });
    }

    const answerRef = await postRef.collection("answers").add({
      message: String(message).trim(),
      authorId: String(authorId).trim(),
      authorUid: normalizeOptionalText(authorUid),
      authorRole,
      userName: String(userName).trim(),
      avatar: normalizeAvatarValue(avatar),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await postRef.update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Answer posted successfully.",
      data: {
        id: answerRef.id,
        userName,
        avatar: normalizeAvatarValue(avatar),
        answeredAt: new Date().toLocaleString(),
        message: String(message).trim(),
      },
    });
  } catch (error) {
    console.error("Create community answer error:", error);
    return res.status(500).json({
      error: error.message || "Failed to post answer.",
    });
  }
});

app.delete("/community-posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const postRef = db.collection("communityPosts").doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return res.status(404).json({ error: "Post not found." });
    }

    const answersSnapshot = await postRef.collection("answers").get();

    const batch = db.batch();

    answersSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    batch.delete(postRef);

    await batch.commit();

    return res.json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    console.error("Delete community post error:", error);
    return res.status(500).json({
      error: error.message || "Failed to delete post.",
    });
  }
});

app.put("/community-posts/:postId/answers/:answerId", async (req, res) => {
  try {
    const { postId, answerId } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message is required." });
    }

    const postRef = db.collection("communityPosts").doc(postId);
    const answerRef = postRef.collection("answers").doc(answerId);

    const answerSnap = await answerRef.get();

    if (!answerSnap.exists) {
      return res.status(404).json({ error: "Answer not found." });
    }

    await answerRef.update({
      message: String(message).trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await postRef.update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Answer updated successfully.",
    });
  } catch (error) {
    console.error("Update answer error:", error);
    return res.status(500).json({
      error: error.message || "Failed to update answer.",
    });
  }
});

app.delete("/community-posts/:postId/answers/:answerId", async (req, res) => {
  try {
    const { postId, answerId } = req.params;

    const postRef = db.collection("communityPosts").doc(postId);
    const answerRef = postRef.collection("answers").doc(answerId);

    const answerSnap = await answerRef.get();

    if (!answerSnap.exists) {
      return res.status(404).json({ error: "Answer not found." });
    }

    await answerRef.delete();

    await postRef.update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Answer deleted successfully.",
    });
  } catch (error) {
    console.error("Delete answer error:", error);
    return res.status(500).json({
      error: error.message || "Failed to delete answer.",
    });
  }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});