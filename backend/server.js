
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import mammoth from "mammoth";
import { createRequire } from "module";
import multer from "multer";
import nodemailer from "nodemailer";
import officeparser from "officeparser";
import serviceAccount from "./serviceAccountKey.json" with { type: "json" };
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:8081",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "parseit2-4b26d.firebasestorage.app",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const FieldValue = admin.firestore.FieldValue;

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";
const SESSION_EXPIRES_IN_MS = Number(
  process.env.SESSION_EXPIRES_IN_MS || 60 * 60 * 1000
);
const SIGNED_URL_EXPIRES_IN_MS = Number(
  process.env.SIGNED_URL_EXPIRES_IN_MS || 60 * 60 * 1000
);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAMESITE || "strict",
};

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || req.ip || "";
}

function getAuthBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

async function requireAuth(req, res, next) {
  try {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME] || "";
    const bearerToken = getAuthBearerToken(req);
    let decoded = null;

    if (sessionCookie) {
      decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    } else if (bearerToken) {
      decoded = await admin.auth().verifyIdToken(bearerToken, true);
    }

    if (!decoded?.uid) {
      return res.status(401).json({ error: "Authentication required." });
    }

    req.user = decoded;
    req.clientIp = getClientIp(req);
    return next();
  } catch (error) {
    console.warn("Authentication failed:", error?.message || error);
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

async function findUserProfileByAuthUid(authUid) {
  if (!authUid) return null;

  const roles = [
    { role: "student", collection: "students" },
    { role: "teacher", collection: "teachers" },
    { role: "admin", collection: "admins" },
  ];

  for (const item of roles) {
    const snapshot = await db
      .collection(item.collection)
      .where("authUid", "==", authUid)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        role: item.role,
        collection: item.collection,
        ref: doc.ref,
        data: doc.data() || {},
      };
    }
  }

  return null;
}

async function requireClassAccess({ authUid, classId, allowedRoles = [] }) {
  const profile = await findUserProfileByAuthUid(authUid);

  if (!profile) {
    const error = new Error("User profile not found.");
    error.statusCode = 403;
    throw error;
  }

  if (profile.role === "admin") {
    return profile;
  }

  if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
    const error = new Error("User role is not allowed for this action.");
    error.statusCode = 403;
    throw error;
  }

  const userId =
    profile.data.studentId ||
    profile.data.teacherId ||
    profile.data.adminId ||
    profile.id;

  if (!classId) {
    return profile;
  }

  const membership = await db
    .collection("classMembers")
    .where("classId", "==", classId)
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!membership.empty) {
    return profile;
  }

  const classSnap = await db.collection("classes").doc(classId).get();
  const classData = classSnap.exists ? classSnap.data() || {} : null;

  const isTeacherOwner =
    profile.role === "teacher" &&
    classData &&
    (classData.assignedTeacherId === userId ||
      classData.assignedTeacherUid === authUid ||
      classData.createdByUid === authUid);

  if (isTeacherOwner) {
    return profile;
  }

  const error = new Error("You do not have access to this class.");
  error.statusCode = 403;
  throw error;
}

function isStoragePathAllowedForClass(storagePath, classId) {
  if (!storagePath || !classId) return false;

  const allowedPrefixes = [
    `class-files/${classId}/`,
    `class-materials/${classId}/`,
    `class-assignments/${classId}/`,
    `class-submissions/${classId}/`,
    `class-banners/`,
  ];

  return allowedPrefixes.some((prefix) => storagePath.startsWith(prefix));
}

async function createReadSignedUrl(storagePath) {
  const [url] = await bucket.file(storagePath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_EXPIRES_IN_MS,
  });

  return url;
}


async function createReadSignedUrlIfExists(storagePath) {
  const normalizedPath = normalizeOptionalText(storagePath);

  if (!normalizedPath) {
    return null;
  }

  try {
    const file = bucket.file(normalizedPath);
    const [exists] = await file.exists();

    if (!exists) {
      return null;
    }

    return await createReadSignedUrl(normalizedPath);
  } catch (error) {
    console.warn("Signed URL refresh skipped:", error?.message || error);
    return null;
  }
}

async function hydrateClassBannerUrl(classData = {}) {
  const refreshedBannerUrl = await createReadSignedUrlIfExists(
    classData.bannerStoragePath
  );

  return {
    ...classData,
    bannerUrl: refreshedBannerUrl || null,
  };
}


async function hydrateUserImageUrls(userData = {}) {
  const refreshedProfileImage = await createReadSignedUrlIfExists(
    userData.profileImageStoragePath
  );

  const refreshedBannerImage = await createReadSignedUrlIfExists(
    userData.bannerImageStoragePath
  );

  return {
    ...userData,
    profileImage:
      refreshedProfileImage ||
      (!userData.profileImageStoragePath ? userData.profileImage || null : null),
    bannerImage:
      refreshedBannerImage ||
      (!userData.bannerImageStoragePath ? userData.bannerImage || null : null),
  };
}



const GEMINI_GAME_MODEL = process.env.GEMINI_GAME_MODEL || "gemini-2.5-flash";
const OPENAI_GAME_MODEL =
  process.env.OPENAI_GAME_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const geminiGameAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const gameUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.GAME_UPLOAD_MAX_BYTES || 15 * 1024 * 1024),
  },
});


const TEACHER_ALLOWED_NOTIFICATION_TYPES = new Set([
  "submitted-assignment",
  "community-answer",
  "student-at-risk",
  "class-assigned",
]);

const DEFAULT_PROFILE_IMAGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/parseit2-4b26d.firebasestorage.app/o/defaults%2Fdefault_profile.png?alt=media&token=4cb70146-a95f-4528-ae7e-52bb9eff7b86";

const DEFAULT_BANNER_IMAGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/parseit2-4b26d.firebasestorage.app/o/defaults%2Fdefault_banner.png?alt=media&token=0fb348ad-ff47-49cc-b986-6a9c94d576bc";

const DEFAULT_PROFILE_IMAGE_STORAGE_PATH = "defaults/default_profile.png";
const DEFAULT_BANNER_IMAGE_STORAGE_PATH = "defaults/default_banner.png";

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

function sanitizeYouTubeSearchQuery(value = "") {
  return String(value || "")
    .replace(/[^a-zA-Z0-9\s+#.()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildYouTubeLearningQuery(rawQuery = "") {
  const cleaned = sanitizeYouTubeSearchQuery(rawQuery);

  if (cleaned) {
    return cleaned;
  }

  return (
    sanitizeYouTubeSearchQuery(process.env.YOUTUBE_DEFAULT_TOPIC || "") ||
    "educational video lesson explanation"
  );
}

function mapYouTubePublishedLabel(value) {
  if (!value) return "Recently uploaded";

  const publishedDate = new Date(value);
  if (Number.isNaN(publishedDate.getTime())) return "Recently uploaded";

  const diffMs = Date.now() - publishedDate.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} minutes ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} hours ago`;
  if (diffMs < week) return `${Math.max(1, Math.floor(diffMs / day))} days ago`;
  if (diffMs < month) return `${Math.max(1, Math.floor(diffMs / week))} weeks ago`;
  if (diffMs < year) return `${Math.max(1, Math.floor(diffMs / month))} months ago`;
  return `${Math.max(1, Math.floor(diffMs / year))} years ago`;
}

function formatYouTubeViewCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return "0 views";

  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(count >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, "")}B views`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K views`;
  return `${count} views`;
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


function getPercentFromScore(score, maxPoints) {
  const numericScore = Number(score);
  const numericMax = Number(maxPoints || 100);

  if (!Number.isFinite(numericScore) || !Number.isFinite(numericMax) || numericMax <= 0) {
    return null;
  }

  return Math.round((numericScore / numericMax) * 100);
}

function normalizeAnalyticsDateLabel(value, fallbackLabel = "No Date") {
  const date = resolveDate(value);

  if (!date) return fallbackLabel;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAdminRiskLevel({ average, gradedCount, missingCount, pendingCount }) {
  if (gradedCount === 0 && missingCount === 0) return "No Data";
  if (average < 75 || missingCount >= 3) return "High";
  if (average < 85 || missingCount >= 1 || pendingCount >= 3) return "Moderate";
  return "Low";
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
      cacheControl: "private,max-age=0,no-transform",
    },
    resumable: false,
  });


  const bannerUrl = await createReadSignedUrl(storagePath);

  return {
    bannerUrl,
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
      cacheControl: "private,max-age=0,no-transform",
    },
    resumable: false,
  });


  return {
    fileUrl: null,
    storagePath,
    fileName: safeFileName,
    fileType: safeMimeType,
    bucketPath: `gs://parseit2-4b26d.firebasestorage.app/${storagePath}`,
  };
}

async function uploadChatbotTrainingFileToStorage({
  fileBase64,
  fileMimeType,
  fileName,
}) {
  if (!fileBase64) {
    throw new Error("File data is required.");
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

  const storagePath = `chatbot-training/${Date.now()}-${safeFileName}`;
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(cleanedBase64, "base64"), {
    metadata: {
      contentType: safeMimeType,
      cacheControl: "private,max-age=0,no-transform",
    },
    resumable: false,
  });


  return {
    fileUrl: null,
    storagePath,
    fileName: safeFileName,
    fileType: safeMimeType,
    bucketPath: `gs://parseit2-4b26d.firebasestorage.app/${storagePath}`,
  };
}

async function uploadAssistantFileToStorage({
  fileBase64,
  fileMimeType,
  fileName,
}) {
  if (!fileBase64) {
    throw new Error("File data is required.");
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

  const storagePath = `assistant-uploads/${Date.now()}-${safeFileName}`;
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(cleanedBase64, "base64"), {
    metadata: {
      contentType: safeMimeType,
      cacheControl: "private,max-age=0,no-transform",
    },
    resumable: false,
  });


  return {
    fileUrl: null,
    storagePath,
    fileName: safeFileName,
    fileType: safeMimeType,
    bucketPath: `gs://parseit2-4b26d.firebasestorage.app/${storagePath}`,
  };
}

function limitText(text, maxChars = 12000) {
  if (!text) return "";
  return text.length > maxChars
    ? `${text.slice(0, maxChars)}\n...[truncated]`
    : text;
}

async function extractTextFromFile(buffer, mimeType = "", fileName = "") {
  const lowerName = String(fileName || "").toLowerCase();
  const normalizedMimeType = String(mimeType || "").toLowerCase();
  
  // Plain text-like files
  if (
    normalizedMimeType.includes("text") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".csv")
  ) {
    return buffer.toString("utf-8");
  }
  
  // PDF
  if (
    normalizedMimeType === "application/pdf" ||
    lowerName.endsWith(".pdf")
  ) {
    try {
      const parsed = await pdf(buffer);
      return parsed.text || "";
    } catch (error) {
      console.warn("PDF extraction failed:", error?.message || error);
      return "";
    }
  }
  
  // DOCX (modern Word document)
  if (
    normalizedMimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch (error) {
      console.warn("DOCX extraction failed:", error?.message || error);
      return "";
    }
  }
  
  // DOC (legacy Word document) - use word-extractor
  if (
    normalizedMimeType === "application/msword" ||
    lowerName.endsWith(".doc")
  ) {
    try {
      const WordExtractor = require("word-extractor");
      const extractor = new WordExtractor();

      const extracted = await extractor.extract(buffer);
      return extracted.getBody() || "";
    } catch (error) {
      console.warn("DOC extraction failed:", error?.message || error);
      return "";
    }
  }
  
  // PPTX (modern PowerPoint) - use officeparser
  if (
    normalizedMimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lowerName.endsWith(".pptx")
  ) {
    try {
      const text = await officeparser.parseOffice(buffer);
      return text || "";
    } catch (error) {
      console.warn("PPTX extraction failed:", error?.message || error);
      return "";
    }
  }
  
  // PPT (legacy PowerPoint) - use officeparser
  if (
    normalizedMimeType === "application/vnd.ms-powerpoint" ||
    lowerName.endsWith(".ppt")
  ) {
    try {
      const text = await officeparser.parseOffice(buffer);
      return text || "";
    } catch (error) {
      console.warn("PPT extraction failed:", error?.message || error);
      return "";
    }
  }
  
  // XLSX (modern Excel) - use officeparser
  if (
    normalizedMimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lowerName.endsWith(".xlsx")
  ) {
    try {
      const text = await officeparser.parseOffice(buffer);
      return text || "";
    } catch (error) {
      console.warn("XLSX extraction failed:", error?.message || error);
      return "";
    }
  }
  
  // XLS (legacy Excel) - use officeparser
  if (
    normalizedMimeType === "application/vnd.ms-excel" ||
    lowerName.endsWith(".xls")
  ) {
    try {
      const text = await officeparser.parseOffice(buffer);
      return text || "";
    } catch (error) {
      console.warn("XLS extraction failed:", error?.message || error);
      return "";
    }
  }
  
  console.warn(`Unsupported file type: ${normalizedMimeType || lowerName}`);
  return "";
}

function parseQuizMastersJsonResponse(rawText = "", providerLabel = "AI") {
  const cleaned = String(rawText || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!cleaned) {
    throw new Error(`${providerLabel} returned an empty response.`);
  }

  try {
    return JSON.parse(cleaned);
  } catch (jsonError) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);

      try {
        return JSON.parse(jsonSlice);
      } catch {
        // Fall through to the clearer error below.
      }
    }

    throw new Error(
      `${providerLabel} returned invalid or incomplete JSON: ${jsonError.message}`
    );
  }
}

function normalizeQuizMastersQuestions(value) {
  const sourceQuestions = Array.isArray(value?.questions) ? value.questions : [];

  const normalized = sourceQuestions
    .map((item) => {
      const question = normalizeOptionalText(item?.question);
      const options = Array.isArray(item?.options)
        ? item.options
            .map((option) => normalizeOptionalText(option))
            .filter(Boolean)
        : [];
      const answer = normalizeOptionalText(item?.answer);

      if (!question || options.length !== 4 || !answer) return null;

      const matchingAnswer = options.find(
        (option) => option.toLowerCase() === answer.toLowerCase()
      );

      if (!matchingAnswer) return null;

      return {
        question,
        options,
        answer: matchingAnswer,
      };
    })
    .filter(Boolean);

  return normalized.slice(0, 10);
}

function buildQuizMastersPrompt({ extractedText, fileName, gameType }) {
  let gameStyleInstruction = "";
  
  switch (gameType) {
    case "memory_match":
      gameStyleInstruction = "Style: Memory Match. Focus on matching terms to their exact definitions. The options should be closely related terms to make matching challenging.";
      break;
    case "fill_in_blanks":
      gameStyleInstruction = "Style: Fill-in-the-Blanks. Format the question as a sentence with a missing keyword (e.g., 'The process of ___ is defined as...'). The correct answer must be the exact missing word/phrase.";
      break;
    case "flashcard":
      gameStyleInstruction = "Style: Flashcard Challenge. Generate concise, direct questions with clear, short answers. Focus on key facts and core definitions.";
      break;
    case "quiz_master":
    default:
      gameStyleInstruction = "Style: Quiz Master. Generate standard, well-balanced timed multiple-choice questions testing overall comprehension of the material.";
      break;
  }

  return `
You are generating an educational game quiz from an uploaded learning file.
Create exactly 10 multiple-choice quiz questions.

GAME TYPE INSTRUCTIONS:
${gameStyleInstruction}

CRITICAL FORMATTING RULES:
- Return ONLY valid JSON. No markdown, no explanations, no code fences.
- All questions MUST have exactly 4 options.
- The answer MUST exactly match one of the 4 options.

Uploaded file name:
${fileName || "uploaded-file"}

Learning content:
${limitText(extractedText, 12000)}
`;
}

async function generateQuizMastersWithGemini({ extractedText, fileName, gameType }) {
  if (!geminiGameAI) {
    throw new Error("GEMINI_API_KEY is missing in your backend .env file.");
  }
  const model = geminiGameAI.getGenerativeModel({
    model: GEMINI_GAME_MODEL,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          questions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                question: {
                  type: SchemaType.STRING,
                },
                options: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.STRING,
                  },
                },
                answer: {
                  type: SchemaType.STRING,
                },
              },
              required: ["question", "options", "answer"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });
  const prompt = `
${buildQuizMastersPrompt({ extractedText, fileName, gameType })}
Return ONLY valid JSON in this exact format, with exactly 10 questions:
{
"questions": [
{
"question": "Question text",
"options": ["Option A", "Option B", "Option C", "Option D"],
"answer": "Option A"
}
]
}
`;
  let rawText = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      rawText = result.response.text();
      const parsed = parseQuizMastersJsonResponse(
        rawText,
        "Gemini"
      );
      const questions =
        normalizeQuizMastersQuestions(parsed);
      if (questions.length >= 10) {
        return questions;
      }
    } catch (error) {
      console.log(
        `Gemini attempt ${attempt} failed`,
        error.message
      );
    }
  }
  throw new Error(
    "Gemini failed after 3 attempts."
  );
}



async function generateQuizMastersWithOpenAI({ extractedText, fileName , gameType}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in your backend .env file.");
  }

  const prompt = `
${buildQuizMastersPrompt({ extractedText, fileName , gameType})}

Return ONLY valid JSON in this exact format, with exactly 10 questions:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A"
    }
  ]
}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_GAME_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You generate student-friendly multiple-choice quizzes from provided learning content. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed.");
  }

  const rawText = data?.choices?.[0]?.message?.content || "";
  const parsed = parseQuizMastersJsonResponse(rawText, "OpenAI");
  const questions = normalizeQuizMastersQuestions(parsed);

  if (questions.length < 5) {
    throw new Error("OpenAI did not generate enough valid quiz questions.");
  }

  return questions;
}

function getGeminiFallbackReason(error) {
  const message = String(error?.message || "Gemini generation failed.");

  if (isGeminiQuotaError(error)) {
    return "Gemini quota exceeded or credits depleted.";
  }

  if (
    message.toLowerCase().includes("invalid") ||
    message.toLowerCase().includes("incomplete json") ||
    message.toLowerCase().includes("empty response") ||
    message.toLowerCase().includes("not generate enough") ||
    message.toLowerCase().includes("unexpected end of json")
  ) {
    return "Gemini returned invalid, incomplete, or insufficient JSON.";
  }

  return `Gemini failed: ${message}`;
}

function cleanQuizMastersSentence(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[•●▪︎◦]/g, "")
    .trim();
}

function splitQuizMastersSentences(text = "") {
  const cleaned = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(/(?<=[.!?])\s+|\s+-\s+|;\s+/)
    .map(cleanQuizMastersSentence)
    .map((sentence) => sentence.replace(/^[\d.)\-\s]+/, "").trim())
    .filter((sentence) => {
      if (sentence.length < 35 || sentence.length > 180) return false;
      if (!/[a-zA-Z]/.test(sentence)) return false;
      const words = sentence.split(/\s+/).filter(Boolean);
      return words.length >= 7;
    });
}

function uniqueQuizMastersSentences(sentences = []) {
  const seen = new Set();
  const unique = [];

  for (const sentence of sentences) {
    const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(sentence);
  }

  return unique;
}

function rotateQuizMastersOptions(options, offset) {
  const copy = options.slice(0, 4);
  const shift = offset % copy.length;
  return copy.slice(shift).concat(copy.slice(0, shift));
}

function generateQuizMastersLocally({ extractedText, fileName }) {
  const sentences = uniqueQuizMastersSentences(
    splitQuizMastersSentences(limitText(extractedText, 16000))
  );

  if (sentences.length < 4) {
    throw new Error(
      "Local quiz fallback could not find enough readable statements in the uploaded file."
    );
  }

  const questions = [];
  const questionTemplates = [
    "Which statement is supported by the uploaded learning file?",
    "According to the uploaded file, which statement is correct?",
    "Which option best matches the uploaded learning content?",
    "What does the uploaded file say?",
    "Which statement comes from the uploaded material?",
  ];

  const maxQuestions = Math.min(10, sentences.length);

  for (let i = 0; i < maxQuestions; i++) {
    const answer = sentences[i];
    const distractors = [];

    for (let step = 1; distractors.length < 3 && step < sentences.length + 4; step++) {
      const candidate = sentences[(i + step * 2 + 1) % sentences.length];
      if (candidate && candidate !== answer && !distractors.includes(candidate)) {
        distractors.push(candidate);
      }
    }

    if (distractors.length < 3) continue;

    const options = rotateQuizMastersOptions([answer, ...distractors], i + 1);

    questions.push({
      question: `${questionTemplates[i % questionTemplates.length]} (${fileName || "uploaded file"})`,
      options,
      answer,
    });
  }

  if (questions.length < 5) {
    throw new Error(
      "Local quiz fallback did not generate enough valid quiz questions."
    );
  }

  return normalizeQuizMastersQuestions({ questions });
}
async function generateQuizMastersWithFallback({ extractedText, fileName, gameType }) {
  try {
    const questions = await generateQuizMastersWithGemini({
      extractedText,
      fileName,
      gameType,
    });
    return {
      questions,
      provider: "gemini",
      model: GEMINI_GAME_MODEL,
      fallbackUsed: false,
    };
  } catch (geminiError) {
    const fallbackReason = getGeminiFallbackReason(geminiError);
    console.warn(
      "Gemini failed for Quiz Masters. Falling back to OpenAI:",
      geminiError?.message || geminiError
    );
    try {
      const questions = await generateQuizMastersWithOpenAI({
        extractedText,
        fileName,
        gameType,
      });
      return {
        questions,
        provider: "openai",
        model: OPENAI_GAME_MODEL,
        fallbackUsed: true,
        fallbackReason,
      };
    } catch (openAIError) {
      console.warn(
        "OpenAI fallback failed for Quiz Masters. Using local fallback:",
        openAIError?.message || openAIError
      );
      const questions = generateQuizMastersLocally({
        extractedText,
        fileName,
      });
      return {
        questions,
        provider: "local",
        model: "extractive-local-fallback",
        fallbackUsed: true,
        fallbackReason: `${fallbackReason} OpenAI fallback also failed: ${
          openAIError?.message || openAIError
        }. Used local non-AI fallback.`,
      };
    }
  }
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
 * NOTIFICATION HELPERS
 */

function buildNotificationResponse(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    userId: data.userId || "",
    role: data.role || "",
    type: data.type || "support-activity",
    title: data.title || "Notification",
    message: data.message || "",
    time: formatFirestoreDateTime(data.createdAt),
    read: !!data.read,
    relatedId: data.relatedId || null,
    relatedType: data.relatedType || null,
    classId: data.classId || null,
    actorId: data.actorId || null,
    actorRole: data.actorRole || null,
    actorName: data.actorName || null,
    provider: data.provider || null,
    providerLabel: data.providerLabel || null,
    model: data.model || null,
    errorMessage: data.errorMessage || null,
    aiProvider: data.aiProvider || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    readAt: data.readAt || null,
  };
}

async function createNotification({
  userId,
  role,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
  classId = null,
  actorId = null,
  actorRole = null,
  actorName = null,
  provider = null,
  providerLabel = null,
  model = null,
  errorMessage = null,
  aiProvider = null,
}) {
  const normalizedUserId = normalizeOptionalText(userId);
  const normalizedRole = normalizeOptionalText(role);

  if (!normalizedUserId || !normalizedRole) return null;

  const ref = await db.collection("notifications").add({
    userId: normalizedUserId,
    role: normalizedRole,
    type: normalizeOptionalText(type) || "support-activity",
    title: normalizeOptionalText(title) || "Notification",
    message: normalizeOptionalText(message) || "",
    relatedId: normalizeOptionalText(relatedId),
    relatedType: normalizeOptionalText(relatedType),
    classId: normalizeOptionalText(classId),
    actorId: normalizeOptionalText(actorId),
    actorRole: normalizeOptionalText(actorRole),
    actorName: normalizeOptionalText(actorName),
    provider: normalizeOptionalText(provider),
    providerLabel: normalizeOptionalText(providerLabel),
    model: normalizeOptionalText(model),
    errorMessage: normalizeOptionalText(errorMessage),
    aiProvider: normalizeOptionalText(aiProvider),
    read: false,
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}


async function createSubmittedAssignmentNotificationForTeacher({
  classId,
  assignmentId,
  submissionId,
  studentId,
  studentName,
}) {
  if (!classId || !assignmentId || !submissionId || !studentId) return null;

  const [classSnap, assignmentSnap] = await Promise.all([
    db.collection("classes").doc(classId).get(),
    db.collection("classAssignments").doc(assignmentId).get(),
  ]);

  if (!classSnap.exists) return null;

  const classData = classSnap.data() || {};
  const assignmentData = assignmentSnap.exists ? assignmentSnap.data() || {} : {};

  const teacherId = normalizeOptionalText(classData.assignedTeacherId);
  if (!teacherId) return null;

  const existing = await db
    .collection("notifications")
    .where("userId", "==", teacherId)
    .where("role", "==", "teacher")
    .where("type", "==", "submitted-assignment")
    .where("relatedId", "==", submissionId)
    .limit(1)
    .get();

  if (!existing.empty) return existing.docs[0].id;

  return createNotification({
    userId: teacherId,
    role: "teacher",
    type: "submitted-assignment",
    title: "Assignment Submitted",
    message: `${studentName || "A student"} submitted ${
      assignmentData.header || "an assignment"
    } in ${classData.name || "your class"}.`,
    relatedId: submissionId,
    relatedType: "class-submission",
    classId,
    actorId: studentId,
    actorRole: "student",
    actorName: studentName || studentId,
  });
}

async function createStudentAtRiskNotificationForTeacher({
  classId,
  studentId,
  studentName,
  reason,
}) {
  if (!classId || !studentId) return null;

  const classSnap = await db.collection("classes").doc(classId).get();
  if (!classSnap.exists) return null;

  const classData = classSnap.data() || {};
  const teacherId = normalizeOptionalText(classData.assignedTeacherId);
  if (!teacherId) return null;

  const existing = await db
    .collection("notifications")
    .where("userId", "==", teacherId)
    .where("role", "==", "teacher")
    .where("type", "==", "student-at-risk")
    .where("actorId", "==", studentId)
    .where("classId", "==", classId)
    .limit(1)
    .get();

  if (!existing.empty) return existing.docs[0].id;

  return createNotification({
    userId: teacherId,
    role: "teacher",
    type: "student-at-risk",
    title: "Student At Risk",
    message: `${studentName || "A student"} may need support in ${
      classData.name || "your class"
    }. ${reason || ""}`.trim(),
    relatedId: studentId,
    relatedType: "student-risk",
    classId,
    actorId: studentId,
    actorRole: "student",
    actorName: studentName || studentId,
  });
}

async function createClassAssignedNotificationForTeacher({
  classId,
  classCode,
  className,
  teacherId,
  assignedById = null,
  assignedByName = null,
}) {
  const normalizedTeacherId = normalizeOptionalText(teacherId);
  const normalizedClassId = normalizeOptionalText(classId);

  if (!normalizedTeacherId || !normalizedClassId) return null;

  const existing = await db
    .collection("notifications")
    .where("userId", "==", normalizedTeacherId)
    .where("role", "==", "teacher")
    .where("type", "==", "class-assigned")
    .where("relatedId", "==", normalizedClassId)
    .limit(1)
    .get();

  if (!existing.empty) return existing.docs[0].id;

  return createNotification({
    userId: normalizedTeacherId,
    role: "teacher",
    type: "class-assigned",
    title: "Class Assigned",
    message: `You have been assigned to ${className || "a class"}${
      classCode ? ` (${classCode})` : ""
    }.`,
    relatedId: normalizedClassId,
    relatedType: "class",
    classId: normalizedClassId,
    actorId: assignedById,
    actorRole: "admin",
    actorName: assignedByName || "Admin",
  });
}


async function createNotificationsForClassStudents({
  classId,
  type,
  title,
  messageBuilder,
  relatedId = null,
  relatedType = null,
  actorId = null,
  actorRole = null,
  actorName = null,
}) {
  if (!classId) return;

  const membersSnapshot = await db
    .collection("classMembers")
    .where("classId", "==", classId)
    .where("role", "==", "student")
    .get();

  for (const memberDoc of membersSnapshot.docs) {
    const member = memberDoc.data() || {};
    const studentId = normalizeOptionalText(member.userId);

    if (!studentId) continue;

    await createNotification({
      userId: studentId,
      role: "student",
      type,
      title,
      message: typeof messageBuilder === "function" ? messageBuilder(member) : String(messageBuilder || ""),
      relatedId,
      relatedType,
      classId,
      actorId,
      actorRole,
      actorName,
    });
  }
}


app.post("/admin/repair-ai-quota-notifications", async (req, res) => {
  try {
    const snapshot = await db
      .collection("notifications")
      .where("role", "==", "admin")
      .where("type", "==", "ai-quota-limit")
      .get();

    let repairedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      const existingProvider = normalizeOptionalText(data.provider);
      const inferredProvider =
        existingProvider ||
        inferProviderFromQuotaMessage(`${data.title || ""} ${data.message || ""} ${data.errorMessage || ""}`);

      if (!inferredProvider) continue;

      const providerLabel = normalizeProviderName(inferredProvider);
      const model = getProviderModelName(inferredProvider);

      await doc.ref.set(
        {
          provider: inferredProvider,
          providerLabel,
          model,
          aiProvider: providerLabel,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      repairedCount += 1;
    }

    return res.json({
      success: true,
      repairedCount,
    });
  } catch (error) {
    console.error("Repair AI quota notifications error:", error);
    return res.status(500).json({
      error: error.message || "Failed to repair AI quota notifications.",
    });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const {
      role,
      id,
      email,
      password,
      firstName,
      lastName,
      birthday,
    } = req.body;

    if (
      !role ||
      !id ||
      !email ||
      !password ||
      !firstName ||
      !lastName||
      !birthday
    ) {
      return res.status(400).json({
        error:
          "role, id, email, password, firstName, lastName, and birthday are required.",
      });
    }

    const normalizedRole = String(role).trim().toLowerCase();
    const normalizedId = String(id).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!["student", "teacher"].includes(normalizedRole)) {
      return res.status(400).json({
        error: "Role must be student or teacher.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters.",
      });
    }

    // Check duplicate ID across all roles
    const existingId = await findUsersByIdAcrossAllRoles(normalizedId);

    if (existingId.length > 0) {
      return res.status(409).json({
        error: "ID already exists.",
      });
    }

    // Check duplicate email
    const existingEmail = await findUserByEmailAcrossRoles(
      normalizedEmail
    );

    if (existingEmail) {
      return res.status(409).json({
        error: "Email already exists.",
      });
    }

    // Check Firebase Auth email
    try {
      await admin.auth().getUserByEmail(normalizedEmail);

      return res.status(409).json({
        error: "Email already exists.",
      });
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // Create Firebase Auth account
    const authUser = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    

    const userData = {
      authUid: authUser.uid,

      email: normalizedEmail,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      birthday: birthday
      ? admin.firestore.Timestamp.fromDate(
          parseDateValue(birthday)
        )
      : null,

      profileImage: DEFAULT_PROFILE_IMAGE_URL,
      bannerImage: DEFAULT_BANNER_IMAGE_URL,

      profileImageStoragePath:
        DEFAULT_PROFILE_IMAGE_STORAGE_PATH,
      bannerImageStoragePath:
        DEFAULT_BANNER_IMAGE_STORAGE_PATH,

      accountCreated: true,
      mustChangePassword: false,
      codeVerified: true,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    };

    if (normalizedRole === "student") {
      await db
        .collection("students")
        .doc(normalizedId)
        .set({
          studentId: normalizedId,
          ...userData,
        });
    }

    if (normalizedRole === "teacher") {
      await db
        .collection("teachers")
        .doc(normalizedId)
        .set({
          teacherId: normalizedId,
          ...userData,
        });
    }

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      uid: authUser.uid,
      role: normalizedRole,
      id: normalizedId,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      error: error.message || "Failed to register user.",
    });
  }
});


/**
 * AUTH ROUTES
 */

/**
 * SESSION COOKIE ROUTES
 *
 * Frontend flow:
 * 1. Sign in with Firebase client SDK.
 * 2. Send the Firebase ID token once to /auth/session-login.
 * 3. Backend sets an HttpOnly cookie.
 * 4. Future requests use credentials: "include".
 */
app.post("/auth/session-login", async (req, res) => {
  try {
    const { idToken, deviceId } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken is required." });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    res.cookie(SESSION_COOKIE_NAME, sessionCookie, {
      ...COOKIE_OPTIONS,
      maxAge: SESSION_EXPIRES_IN_MS,
    });

    const profile = await findUserProfileByAuthUid(decodedToken.uid);
    if (profile?.ref) {
      await profile.ref.set(
        {
          lastLoginAt: FieldValue.serverTimestamp(),
          lastSessionIp: getClientIp(req),
          lastSessionUserAgent: normalizeOptionalText(req.headers["user-agent"]),
          lastSessionDeviceId: normalizeOptionalText(deviceId),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return res.json({
      success: true,
      uid: decodedToken.uid,
      role: profile?.role || null,
      id: profile?.id || null,
      expiresIn: SESSION_EXPIRES_IN_MS,
    });
  } catch (error) {
    console.error("Session login error:", error);
    return res.status(401).json({
      error: error.message || "Failed to create login session.",
    });
  }
});

app.post("/auth/session-logout", async (req, res) => {
  try {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

    if (sessionCookie) {
      try {
        const decoded = await admin.auth().verifySessionCookie(sessionCookie);
        await admin.auth().revokeRefreshTokens(decoded.sub || decoded.uid);
      } catch (error) {
        console.warn("Session revoke skipped:", error?.message || error);
      }
    }

    res.clearCookie(SESSION_COOKIE_NAME, COOKIE_OPTIONS);
    return res.json({ success: true });
  } catch (error) {
    console.error("Session logout error:", error);
    return res.status(500).json({
      error: error.message || "Failed to clear login session.",
    });
  }
});

app.get("/auth/session-me", requireAuth, async (req, res) => {
  try {
    const profile = await findUserProfileByAuthUid(req.user.uid);
    const hydratedUserData = profile
      ? await hydrateUserImageUrls(profile.data || {})
      : null;

    return res.json({
      success: true,
      uid: req.user.uid,
      email: req.user.email || null,
      role: profile?.role || null,
      id: profile?.id || null,
      profile: profile
        ? {
            id: profile.id,
            role: profile.role,
            email: hydratedUserData.email || null,
            firstName: hydratedUserData.firstName || "",
            lastName: hydratedUserData.lastName || "",
            profileImage: hydratedUserData.profileImage || null,
            bannerImage: hydratedUserData.bannerImage || null,
            profileImageStoragePath: hydratedUserData.profileImageStoragePath || null,
            bannerImageStoragePath: hydratedUserData.bannerImageStoragePath || null,
          }
        : null,
    });
  } catch (error) {
    console.error("Session me error:", error);
    return res.status(500).json({
      error: error.message || "Failed to read login session.",
    });
  }
});

/**
 * PRIVATE STORAGE ROUTES
 */
app.post("/storage/user-image-signed-url", requireAuth, async (req, res) => {
  try {
    const { storagePath } = req.body;

    if (!storagePath || typeof storagePath !== "string") {
      return res.status(400).json({ error: "storagePath is required." });
    }

    if (storagePath.includes("..") || storagePath.startsWith("/")) {
      return res.status(400).json({ error: "Invalid storagePath." });
    }

    const allowedPrefixes = ["user-profiles/", "user-banners/", "defaults/"];

    if (!allowedPrefixes.some((prefix) => storagePath.startsWith(prefix))) {
      return res.status(403).json({
        error: "This user image path is not allowed.",
      });
    }

    const [exists] = await bucket.file(storagePath).exists();
    if (!exists) {
      return res.status(404).json({ error: "File not found." });
    }

    const url = await createReadSignedUrl(storagePath);

    return res.json({
      success: true,
      url,
      expiresIn: SIGNED_URL_EXPIRES_IN_MS,
    });
  } catch (error) {
    console.error("User image signed URL error:", error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to generate user image signed URL.",
    });
  }
});

app.post("/storage/signed-url", requireAuth, async (req, res) => {
  try {
    const { storagePath, classId } = req.body;

    if (!storagePath || typeof storagePath !== "string") {
      return res.status(400).json({ error: "storagePath is required." });
    }

    if (storagePath.includes("..") || storagePath.startsWith("/")) {
      return res.status(400).json({ error: "Invalid storagePath." });
    }

    if (classId) {
      await requireClassAccess({
        authUid: req.user.uid,
        classId,
        allowedRoles: ["student", "teacher"],
      });

      if (!isStoragePathAllowedForClass(storagePath, classId)) {
        return res.status(403).json({
          error: "This file path is not allowed for the requested class.",
        });
      }
    } else if (!storagePath.startsWith("defaults/")) {
      const profile = await findUserProfileByAuthUid(req.user.uid);
      if (profile?.role !== "admin") {
        return res.status(403).json({
          error: "classId is required for private class files.",
        });
      }
    }

    const [exists] = await bucket.file(storagePath).exists();
    if (!exists) {
      return res.status(404).json({ error: "File not found." });
    }

    const url = await createReadSignedUrl(storagePath);

    return res.json({
      success: true,
      url,
      expiresIn: SIGNED_URL_EXPIRES_IN_MS,
    });
  } catch (error) {
    console.error("Signed URL error:", error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to generate signed URL.",
    });
  }
});


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

app.post("/auth/user-profile", requireAuth, async (req, res) => {
  try {
    const { id, role } = req.body;
    const profile = await findUserProfileByAuthUid(req.user.uid);

    if (!profile) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const requestedId = normalizeOptionalText(id);
    const requestedRole = normalizeOptionalText(role);

    if (requestedRole && requestedRole !== profile.role && profile.role !== "admin") {
      return res.status(403).json({ error: "You cannot access this user profile." });
    }

    const profileDocId =
      profile.data.studentId ||
      profile.data.teacherId ||
      profile.data.adminId ||
      profile.id;

    if (
      requestedId &&
      requestedId !== profileDocId &&
      requestedId !== profile.id &&
      requestedId !== profile.data.email &&
      requestedId !== profile.data.authUid &&
      profile.role !== "admin"
    ) {
      return res.status(403).json({ error: "You cannot access this user profile." });
    }

    const hydratedUserData = await hydrateUserImageUrls(profile.data || {});

    return res.json({
      success: true,
      data: {
        role: profile.role,
        id: profileDocId,
        email: hydratedUserData.email || null,
        authUid: hydratedUserData.authUid || null,
        studentId: hydratedUserData.studentId || undefined,
        teacherId: hydratedUserData.teacherId || undefined,
        adminId: hydratedUserData.adminId || undefined,
        firstName: hydratedUserData.firstName || "",
        lastName: hydratedUserData.lastName || "",
        profileImage: hydratedUserData.profileImage || null,
        bannerImage: hydratedUserData.bannerImage || null,
        profileImageStoragePath: hydratedUserData.profileImageStoragePath || null,
        bannerImageStoragePath: hydratedUserData.bannerImageStoragePath || null,
      },
    });
  } catch (error) {
    console.error("User profile fetch error:", error?.message || error);
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
 * QUIZ MASTERS GAME GENERATION ROUTE
 * Separate Gemini-powered API for uploaded-file game creation.
 *
 * Required npm packages:
 *   npm install multer @google/generative-ai
 *
 * Required .env values:
 *   GEMINI_API_KEY=your_gemini_api_key_here
 *   GEMINI_GAME_MODEL=gemini-2.5-flash
 */
// === NEW: Automatically grade game-based assignment submission ===
// === UPDATED: Automatically grade game-based assignment submission ===
app.post("/game-ai/submit-game-assignment", requireAuth, async (req, res) => {
  try {
    const { assignmentId, score, totalQuestions, answers } = req.body;
    const profile = await findUserProfileByAuthUid(req.user.uid);
    
    if (!profile || profile.role !== "student") {
      return res.status(403).json({ error: "Only students can submit game scores." });
    }
    const studentId = profile.data.studentId || profile.id;

    if (!assignmentId || score === undefined || !totalQuestions) {
      return res.status(400).json({ error: "assignmentId, score, and totalQuestions are required." });
    }

    // Get assignment to get classId and maxPoints
    const assignmentSnap = await db.collection("classAssignments").doc(assignmentId).get();
    if (!assignmentSnap.exists) {
      return res.status(404).json({ error: "Assignment not found." });
    }
    const assignmentData = assignmentSnap.data();
    const classId = assignmentData.classId;
    const maxPoints = Number(assignmentData.totalScore || 100);

    // Scale the game score to the assignment's maxPoints
    const percent = totalQuestions > 0 ? (score / totalQuestions) : 0;
    const scaledScore = Math.round(percent * maxPoints);

    // Find existing submission or create a new one
    const existingSubmissions = await db.collection("classSubmissions")
      .where("classId", "==", classId)
      .where("assignmentId", "==", assignmentId)
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    if (!existingSubmissions.empty) {
  const subRef = existingSubmissions.docs[0].ref;
  const existingData = existingSubmissions.docs[0].data();
  
  // 🌟 Keep the highest score if the student plays multiple attempts
  const currentScore = existingData.score || 0;
  const finalScore = scaledScore > currentScore ? scaledScore : currentScore;
  const nextAttemptNumber = (existingData.attemptNumber || 0) + 1;

  await subRef.update({
    status: "graded",
    score: finalScore,
    gradedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    gameScore: score, // Always update raw game score to latest
    gameTotalQuestions: totalQuestions,
    gameAnswers: answers || null,
    attemptNumber: nextAttemptNumber,
  });
  
  return res.json({ success: true, score: finalScore, maxPoints, attemptNumber: nextAttemptNumber });
} else {
  await db.collection("classSubmissions").add({
    classId,
    assignmentId,
    studentId,
    studentUid: profile.data.authUid || null,
    studentName: `${profile.data.firstName || ''} ${profile.data.lastName || ''}`.trim(),
    status: "graded",
    score: scaledScore,
    gradedAt: FieldValue.serverTimestamp(),
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    gameScore: score,
    gameTotalQuestions: totalQuestions,
    gameAnswers: answers || null,
    attemptNumber: 1,
  });
  
  return res.json({ success: true, score: scaledScore, maxPoints, attemptNumber: 1 });
}
  } catch (error) {
    console.error("Submit game assignment error:", error);
    return res.status(500).json({ error: error.message || "Failed to submit game score." });
  }
});

// POST /game-ai/save-game-submission
app.post("/game-ai/save-game-submission", requireAuth, async (req, res) => {
  try {
    const { 
      classId, 
      assignmentId, 
      score, 
      totalQuestions, 
      attemptNumber = 1,
      answers 
    } = req.body;

    const profile = await findUserProfileByAuthUid(req.user.uid);
    if (!profile || profile.role !== "student") {
      return res.status(403).json({ error: "Only students can save game submissions." });
    }

    const studentId = profile.data.studentId || profile.id;
    const percent = Math.round((score / totalQuestions) * 100);

    // Check if submission already exists
    const existingSnapshot = await db
      .collection("classSubmissions")
      .where("classId", "==", classId)
      .where("assignmentId", "==", assignmentId)
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    const submissionData = {
      classId,
      assignmentId,
      studentId,
      studentUid: profile.data.authUid || null,
      studentName: `${profile.data.firstName || ""} ${profile.data.lastName || ""}`.trim(),
      status: "submitted",
      score: percent,
      submittedAt: FieldValue.serverTimestamp(),
      fileType: "game_submission",
      fileName: `Game Attempt ${attemptNumber}`,
      attemptNumber,
      answers: answers || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let submissionId;

    if (!existingSnapshot.empty) {
      // Update existing submission (for multiple attempts)
      const existingDoc = existingSnapshot.docs[0];
      await existingDoc.ref.update({
        ...submissionData,
        submittedAt: FieldValue.serverTimestamp(),
      });
      submissionId = existingDoc.id;
    } else {
      // Create new submission
      const newRef = await db.collection("classSubmissions").add(submissionData);
      submissionId = newRef.id;
    }

    // Create notification for teacher
    const assignmentSnap = await db.collection("classAssignments").doc(assignmentId).get();
    const assignmentData = assignmentSnap.exists ? assignmentSnap.data() || {} : {};
    
    await createNotification({
      userId: assignmentData.assignedTeacherId || assignmentData.postedByUid,
      role: "teacher",
      type: "submitted-assignment",
      title: "Game Assignment Submitted",
      message: `${submissionData.studentName} completed ${assignmentData.header || "a game assignment"} with score ${percent}%.`,
      relatedId: submissionId,
      relatedType: "class-submission",
      classId,
      actorId: studentId,
      actorRole: "student",
      actorName: submissionData.studentName,
    });

    return res.json({ 
      success: true, 
      submissionId,
      percent,
      message: attemptNumber > 1 ? "Submission updated" : "Game submission saved"
    });
  } catch (error) {
    console.error("Save game submission error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to save game submission." 
    });
  }
});

app.post("/game-ai/generate-quiz-masters", requireAuth, gameUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "File is required.",
      });
    }

    const extractedText = await extractTextFromFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    if (!normalizeOptionalText(extractedText)) {
      return res.status(400).json({
        error: "No readable text found. Please upload a PDF, DOCX, TXT, MD, JSON, or CSV file.",
      });
    }

    const generated = await generateQuizMastersWithFallback({
      extractedText,
      fileName: req.file.originalname,
    });

    return res.json({
      success: true,
      game: "quizmasters",
      provider: generated.provider,
      model: generated.model,
      fallbackUsed: generated.fallbackUsed,
      fallbackReason: generated.fallbackReason || null,
      fileName: req.file.originalname,
      questions: generated.questions,
    });
  } catch (error) {
    console.error("Quiz Masters AI generation error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate Quiz Masters game.",
    });
  }
});

// === NEW: Generate quiz from selected class materials ===
app.post("/game-ai/generate-quiz-materials", requireAuth, async (req, res) => {
  try {
    const { classId, materialIds, gameType, authUid  } = req.body;
    if (!classId || !Array.isArray(materialIds) || materialIds.length === 0) {
      return res.status(400).json({ error: "classId and at least one materialId are required." });
    }
    // Use req.user.uid if cookie auth worked, otherwise fallback to authUid sent from frontend
    const userAuthUid = req.user.uid;
    if (!userAuthUid) {
      return res.status(401).json({ error: "Authentication required. Please log in again." });
    }
    // Check user belongs to the class (updated to allow teachers too)
    await requireClassAccess({ authUid: userAuthUid, classId, allowedRoles: ["student", "teacher"] });
    // Fetch materials and extract file content from Firebase Storage
    const materials = [];
    const extractionSummary = [];
    for (const materialId of materialIds) {
      const materialSnap = await db.collection("classMaterials").doc(materialId).get();
      if (!materialSnap.exists) continue;
      const material = materialSnap.data() || {};
      console.log(`
[QUIZ GEN] 📄 Processing material: "${material.title || materialId}"`);
      console.log(`[QUIZ GEN] 📁 Storage path: ${material.storagePath || 'none'}`);
      console.log(`[QUIZ GEN] 📋 File type: ${material.fileType || 'unknown'}`);
      console.log(`[QUIZ GEN] 📝 Description: ${(material.content || '').substring(0, 100)}...`);
      // This downloads the actual file from Firebase Storage and extracts text
      const extracted = await extractReadableTextFromMaterial(material);
      console.log(`[QUIZ GEN] ✅ Extraction status: ${extracted.extractionStatus}`);
      console.log(`[QUIZ GEN] 📊 Extracted text length: ${extracted.readableText.length} characters`);
      if (extracted.readableText.length > 0) {
        console.log(`[QUIZ GEN] 📖 First 200 chars of extracted content: "${extracted.readableText.substring(0, 200)}..."`);
      }
      extractionSummary.push({
        title: material.title || "Untitled",
        fileType: material.fileType || "unknown",
        status: extracted.extractionStatus,
        charsExtracted: extracted.readableText.length,
      });
      materials.push({
        id: materialSnap.id,
        title: material.title || "Untitled",
        extractedText: extracted.readableText,
      });
    }
    console.log(`
[QUIZ GEN] 📊 EXTRACTION SUMMARY:`, extractionSummary);
    if (materials.length === 0 || materials.every(m => m.extractedText.length === 0)) {
      return res.status(400).json({
        error: "No readable material content found. Please upload PDF, DOCX, TXT, MD, JSON, or CSV files.",
        extractionSummary
      });
    }
    // Combine all extracted text
    const combinedText = materials.map(m => `File: ${m.title}
${m.extractedText}`).join("---");
    const fileName = `class-${classId}-materials`;
    const generated = await generateQuizMastersWithFallback({
      extractedText: combinedText,
      fileName,
      gameType, // 👈 PASS gameType HERE
    });
    return res.json({
      success: true,
      questions: generated.questions,
      provider: generated.provider,
      model: generated.model,
      classId,
      materialIds,
    });
  } catch (error) {
    console.error("Generate quiz from materials error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate quiz from materials." });
  }
});

// === NEW: Save quiz score for a class activity ===
app.post("/game-ai/save-quiz-score", requireAuth, async (req, res) => {
  try {
    const { classId, materialIds, score, totalQuestions, answers } = req.body;
    if (!classId || !materialIds || score === undefined || !totalQuestions) {
      return res.status(400).json({ error: "classId, materialIds, score, and totalQuestions are required." });
    }

    const profile = await findUserProfileByAuthUid(req.user.uid);
    if (!profile || profile.role !== "student") {
      return res.status(403).json({ error: "Only students can save quiz scores." });
    }

    const studentId = profile.data.studentId || profile.id;
    const percent = Math.round((score / totalQuestions) * 100);

    // Store in studentActivities with class context
    const activityData = {
      studentId,
      classId,
      materialIds,
      type: "quiz-masters",
      score,
      totalQuestions,
      percent,
      answers: answers || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("studentActivities").add(activityData);

    // Also update lesson progress for the class materials
    for (const materialId of materialIds) {
      await upsertLessonProgress({
        studentId,
        courseId: classId,
        topic: `Material-${materialId}`,
        score: percent,
        status: percent >= 75 ? "improving" : "needs_review",
        source: "quiz-masters",
        notes: `Quiz score ${percent}% from materials`,
      });
    }

    return res.json({ success: true, percent });
  } catch (error) {
    console.error("Save quiz score error:", error);
    return res.status(500).json({ error: error.message || "Failed to save quiz score." });
  }
});

// === NEW: Securely fetch game questions for students ===
app.get("/game-ai/get-game-questions/:assignmentId", requireAuth, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const profile = await findUserProfileByAuthUid(req.user.uid);
    
    if (!profile || profile.role !== "student") {
      return res.status(403).json({ error: "Only students can fetch game questions." });
    }
    
    const studentId = profile.data.studentId || profile.id;
    const assignmentSnap = await db.collection("classAssignments").doc(assignmentId).get();
    
    if (!assignmentSnap.exists) {
      return res.status(404).json({ error: "Assignment not found." });
    }
    
    const assignment = assignmentSnap.data() || {};
    
    if (assignment.assignmentType !== "game_based") {
      return res.status(400).json({ error: "This is not a game-based assignment." });
    }

    // Verify student is enrolled in the class
    const classId = assignment.classId;
    const membership = await db.collection("classMembers")
      .where("classId", "==", classId)
      .where("userId", "==", studentId)
      .where("status", "==", "active")
      .limit(1).get();
    
    if (membership.empty) {
      return res.status(403).json({ error: "You are not enrolled in this class." });
    }

    // Return the questions and game settings securely
    return res.json({
      success: true,
      questions: assignment.questions || [],
      gameType: assignment.gameType,
      timeLimit: assignment.timeLimit || null,
      customTimeLimit: assignment.customTimeLimit || null, 
      numberOfAttempts: assignment.numberOfAttempts || '1',
    });
  } catch (error) {
    console.error("Get game questions error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch game questions." });
  }
});
/**
 * FILE UPLOAD ROUTE
 */

app.post("/upload-class-file", requireAuth, async (req, res) => {
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

    await requireClassAccess({
      authUid: req.user.uid,
      classId,
      allowedRoles:
        kind === "submission" ? ["student", "teacher"] : ["teacher"],
    });

    const folder =
      kind === "assignment"
        ? "class-assignments"
        : kind === "submission"
        ? "class-submissions"
        : "class-materials";

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
     
    } = req.body;

    if (
      !studentId ||
      !firstName ||
      !lastName ||
      !email ||
      !birthday 
      
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
      authUid: userRecord.uid,

      profileImage: DEFAULT_PROFILE_IMAGE_URL,
      bannerImage: DEFAULT_BANNER_IMAGE_URL,
      profileImageStoragePath: DEFAULT_PROFILE_IMAGE_STORAGE_PATH,
      bannerImageStoragePath: DEFAULT_BANNER_IMAGE_STORAGE_PATH,

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

      profileImage: DEFAULT_PROFILE_IMAGE_URL,
      bannerImage: DEFAULT_BANNER_IMAGE_URL,
      profileImageStoragePath: DEFAULT_PROFILE_IMAGE_STORAGE_PATH,
      bannerImageStoragePath: DEFAULT_BANNER_IMAGE_STORAGE_PATH,

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
    const { studentId, firstName, lastName, birthday, email } =
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
      const teacherLookupValue = normalizeOptionalText(instructorIdentifier);

      if (!teacherLookupValue) {
        return res.status(400).json({
          error: "Teacher ID is required.",
        });
      }

      assignedTeacher = await findTeacherByIdentifier(teacherLookupValue);

      if (!assignedTeacher) {
        return res.status(400).json({
          error: "Assigned teacher not found. Use a valid teacher ID.",
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

      bannerUrl: null,
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

    if (createdByRole === "admin") {
      await createClassAssignedNotificationForTeacher({
        classId: classRef.id,
        classCode,
        className: name,
        teacherId: resolvedAssignedTeacherId,
        assignedById: createdByUid,
        assignedByName: normalizeOptionalText(createdByName) || "Admin",
      });
    }

    res.json({
      success: true,
      message: "Class created successfully.",
      data: {
        id: classRef.id,
        classCode,
        bannerUrl: null,
        bannerStoragePath: uploadedBanner.bannerStoragePath,
        bannerFileName: uploadedBanner.bannerFileName,
        bannerMimeType: uploadedBanner.bannerMimeType,
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
        bannerUrl: null,
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

    const updatedClassSnap = await classRef.get();
    const updatedClassData = updatedClassSnap.exists ? updatedClassSnap.data() || {} : {};

    let signedBannerUrl = updatedClassData.bannerUrl || null;
    if (updatedClassData.bannerStoragePath) {
      try {
        signedBannerUrl = await createReadSignedUrl(updatedClassData.bannerStoragePath);
      } catch (signedUrlError) {
        console.warn("Update class signed banner URL skipped:", signedUrlError?.message || signedUrlError);
      }
    }

    res.json({
      success: true,
      message: "Class updated successfully.",
      data: {
        id,
        bannerUrl: signedBannerUrl,
        bannerStoragePath: updatedClassData.bannerStoragePath || null,
        bannerFileName: updatedClassData.bannerFileName || null,
        bannerMimeType: updatedClassData.bannerMimeType || null,
      },
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
      "notifications",
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

app.get("/teacher-analytics/:teacherId", async (req, res) => {
  try {
    const teacherId = normalizeOptionalText(req.params.teacherId);

    if (!teacherId) {
      return res.status(400).json({ error: "teacherId is required." });
    }

    const classQueries = await Promise.all([
      db.collection("classes").where("assignedTeacherId", "==", teacherId).get(),
      db.collection("classes").where("assignedTeacherUid", "==", teacherId).get(),
      db.collection("classes").where("instructorEmail", "==", teacherId).get(),
    ]);

    const classMap = new Map();

    classQueries.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        classMap.set(doc.id, {
          id: doc.id,
          ...(doc.data() || {}),
        });
      });
    });

    const studentsMap = new Map();

    for (const classData of classMap.values()) {
      const classId = classData.id;

      const [membersSnapshot, assignmentsSnapshot, submissionsSnapshot] =
        await Promise.all([
          db
            .collection("classMembers")
            .where("classId", "==", classId)
            .where("role", "==", "student")
            .where("status", "==", "active")
            .get(),
          db
            .collection("classAssignments")
            .where("classId", "==", classId)
            .get(),
          db
            .collection("classSubmissions")
            .where("classId", "==", classId)
            .get(),
        ]);

      const submissionsByStudentAssignment = new Map();

      submissionsSnapshot.docs.forEach((doc) => {
        const submission = {
          id: doc.id,
          ...(doc.data() || {}),
        };

        if (submission.studentId && submission.assignmentId) {
          submissionsByStudentAssignment.set(
            `${submission.studentId}_${submission.assignmentId}`,
            submission
          );
        }
      });

      membersSnapshot.docs.forEach((memberDoc) => {
        const member = memberDoc.data() || {};
        const studentId = normalizeOptionalText(member.userId);

        if (!studentId) return;

        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            studentId,
            studentName: normalizeOptionalText(member.name) || studentId,
            courses: [],
          });
        }

        const assignments = assignmentsSnapshot.docs.map((assignmentDoc, index) => {
          const assignment = assignmentDoc.data() || {};
          const submission = submissionsByStudentAssignment.get(
            `${studentId}_${assignmentDoc.id}`
          );

          const maxPoints = Number(assignment.totalScore || 100) || 100;
          const rawScore = Number(submission?.score);
          const isGraded =
            submission?.status === "graded" && Number.isFinite(rawScore);

          return {
            id: assignmentDoc.id,
            title: assignment.header || `Assignment ${index + 1}`,
            status: isGraded ? "graded" : submission?.status || "pending",
            // Send raw score here. The frontend will calculate percentage using points / maxPoints * 100.
            points: isGraded ? rawScore : undefined,
            rawPoints: isGraded ? rawScore : null,
            maxPoints,
            topic: assignment.header || classData.name || "General",
            dueDate: assignment.dueDate || null,
            submittedAt: submission?.submittedAt || null,
            gradedAt: submission?.gradedAt || null,
            feedback: submission?.feedback || null,
          };
        });

        studentsMap.get(studentId).courses.push({
          id: classId,
          name: classData.name || "Untitled Class",
          code: classData.courseCode || "",
          courseCode: classData.courseCode || "",
          classCode: classData.classCode || "",
          instructor: classData.instructorName || "",
          section: classData.section || "",
          yearLevel: classData.year || "",
          semester: classData.semester || "",
          schoolYear: classData.schoolYear || "",
          assignments,
        });
      });
    }

    return res.json({
      success: true,
      data: Array.from(studentsMap.values()),
    });
  } catch (error) {
    console.error("Teacher analytics error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load teacher analytics.",
    });
  }
});


app.post("/teacher-risk-notifications/:teacherId", async (req, res) => {
  try {
    const teacherId = normalizeOptionalText(req.params.teacherId);

    if (!teacherId) {
      return res.status(400).json({ error: "teacherId is required." });
    }

    // Reuse the existing teacher analytics endpoint logic through direct local calculation is complex,
    // so this route uses the same source collections and creates notifications only for students
    // with clear risk signals: missing assignments >= 1 or graded average below 75.
    const classQueries = await Promise.all([
      db.collection("classes").where("assignedTeacherId", "==", teacherId).get(),
      db.collection("classes").where("assignedTeacherUid", "==", teacherId).get(),
      db.collection("classes").where("instructorEmail", "==", teacherId).get(),
      db.collection("classes").where("createdByUid", "==", teacherId).get(),
    ]);

    const classMap = new Map();
    classQueries.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = doc.data() || {};
        if (data.status === "archived") return;
        classMap.set(doc.id, { id: doc.id, ...data });
      });
    });

    let createdCount = 0;

    for (const classData of classMap.values()) {
      const classId = classData.id;

      const [membersSnapshot, assignmentsSnapshot, submissionsSnapshot] =
        await Promise.all([
          db.collection("classMembers")
            .where("classId", "==", classId)
            .where("role", "==", "student")
            .get(),
          db.collection("classAssignments")
            .where("classId", "==", classId)
            .get(),
          db.collection("classSubmissions")
            .where("classId", "==", classId)
            .get(),
        ]);

      const submissionsByStudentAssignment = new Map();
      submissionsSnapshot.docs.forEach((doc) => {
        const submission = { id: doc.id, ...(doc.data() || {}) };
        if (submission.studentId && submission.assignmentId) {
          submissionsByStudentAssignment.set(
            `${submission.studentId}_${submission.assignmentId}`,
            submission
          );
        }
      });

      for (const memberDoc of membersSnapshot.docs) {
        const member = memberDoc.data() || {};
        const studentId = normalizeOptionalText(member.userId);
        if (!studentId) continue;

        let gradedTotal = 0;
        let gradedCount = 0;
        let missingCount = 0;

        assignmentsSnapshot.docs.forEach((assignmentDoc) => {
          const assignment = assignmentDoc.data() || {};
          const submission = submissionsByStudentAssignment.get(
            `${studentId}_${assignmentDoc.id}`
          );

          const maxPoints = Number(assignment.totalScore || 100) || 100;
          const score = Number(submission?.score);

          if (submission?.status === "graded" && Number.isFinite(score)) {
            gradedTotal += Math.round((score / maxPoints) * 100);
            gradedCount += 1;
            return;
          }

          const dueDate = resolveDate(assignment.dueDate);
          if (!submission && dueDate && dueDate.getTime() < Date.now()) {
            missingCount += 1;
          }
        });

        const average = gradedCount > 0 ? Math.round(gradedTotal / gradedCount) : 0;
        const isAtRisk = missingCount > 0 || (gradedCount > 0 && average < 75);

        if (!isAtRisk) continue;

        const notificationId = await createStudentAtRiskNotificationForTeacher({
          classId,
          studentId,
          studentName: member.name || studentId,
          reason: `Average: ${gradedCount > 0 ? `${average}%` : "No graded data"}, Missing: ${missingCount}.`,
        });

        if (notificationId) createdCount += 1;
      }
    }

    return res.json({
      success: true,
      createdCount,
    });
  } catch (error) {
    console.error("Create teacher risk notifications error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create risk notifications.",
    });
  }
});


app.get("/admin-analytics", async (req, res) => {
  try {
    const [
      studentsSnapshot,
      teachersSnapshot,
      classesSnapshot,
      membersSnapshot,
      assignmentsSnapshot,
      submissionsSnapshot,
    ] = await Promise.all([
      db.collection("students").get(),
      db.collection("teachers").get(),
      db.collection("classes").get(),
      db.collection("classMembers").get(),
      db.collection("classAssignments").get(),
      db.collection("classSubmissions").get(),
    ]);

    const classes = classesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((item) => item.status !== "archived");

    const members = membersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() || {}),
    }));

    const assignments = assignmentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() || {}),
    }));

    const submissions = submissionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() || {}),
    }));

    const activeStudentIdsFromStudentCollection = new Set(
      studentsSnapshot.docs
        .map((doc) => normalizeOptionalText(doc.id))
        .filter(Boolean)
    );

    const uniqueEnrolledStudentIds = new Set();

    const membersByClass = new Map();
    const assignmentsByClass = new Map();
    const submissionsByStudentAssignment = new Map();

    members.forEach((member) => {
      if (!member.classId) return;
      if (!membersByClass.has(member.classId)) {
        membersByClass.set(member.classId, []);
      }
      membersByClass.get(member.classId).push(member);
    });

    assignments.forEach((assignment) => {
      if (!assignment.classId) return;
      if (!assignmentsByClass.has(assignment.classId)) {
        assignmentsByClass.set(assignment.classId, []);
      }
      assignmentsByClass.get(assignment.classId).push(assignment);
    });

    submissions.forEach((submission) => {
      if (submission.studentId && submission.assignmentId) {
        submissionsByStudentAssignment.set(
          `${submission.studentId}_${submission.assignmentId}`,
          submission
        );
      }
    });

    const studentRiskMap = new Map();

    // Enrollment-aware comparison maps.
    // These are based on class membership records, because 1 student can be enrolled in many classes.
    const sectionMap = new Map();
    const yearMap = new Map();
    const classRows = [];
    const subjectMap = new Map();
    const trendMap = new Map();

    let totalGradedScores = 0;
    let totalGradedCount = 0;
    let totalPendingAssignments = 0;
    let totalSubmittedAssignments = 0;
    let totalMissingAssignments = 0;
    let totalEnrollmentRecords = 0;

    for (const classData of classes) {
      const classId = classData.id;
      const classMembers = (membersByClass.get(classId) || []).filter(
        (member) =>
          member.role === "student" &&
          !["inactive", "removed", "deleted"].includes(
            String(member.status || "").toLowerCase()
          )
      );

      const classAssignments = assignmentsByClass.get(classId) || [];
      const sectionKey = normalizeOptionalText(classData.section) || "Unassigned";
      const yearKey = normalizeOptionalText(classData.year) || "Unspecified Year";

      let classScoreTotal = 0;
      let classGradedCount = 0;
      let classPendingCount = 0;
      let classSubmittedCount = 0;
      let classMissingCount = 0;
      let classEvaluatedStudents = 0;
      let classScoreByStudentTotal = 0;

      totalEnrollmentRecords += classMembers.length;

      for (const member of classMembers) {
        const studentId = normalizeOptionalText(member.userId);
        if (!studentId) continue;

        uniqueEnrolledStudentIds.add(studentId);

        let studentScoreTotal = 0;
        let studentGradedCount = 0;
        let studentPendingCount = 0;
        let studentSubmittedCount = 0;
        let studentMissingCount = 0;

        for (const assignment of classAssignments) {
          const assignmentId = assignment.id;
          const submission = submissionsByStudentAssignment.get(
            `${studentId}_${assignmentId}`
          );

          const maxPoints = Number(assignment.totalScore || 100) || 100;

          if (submission?.status === "graded") {
            const percent = getPercentFromScore(submission.score, maxPoints);

            if (percent !== null) {
              studentScoreTotal += percent;
              studentGradedCount += 1;

              classScoreTotal += percent;
              classGradedCount += 1;

              totalGradedScores += percent;
              totalGradedCount += 1;

              const subjectKey =
                normalizeOptionalText(assignment.header) ||
                normalizeOptionalText(classData.name) ||
                "Uncategorized";

              const subjectCurrent = subjectMap.get(subjectKey) || {
                subject: subjectKey,
                total: 0,
                count: 0,
                pending: 0,
                missing: 0,
                enrolledStudents: new Set(),
              };
              subjectCurrent.total += percent;
              subjectCurrent.count += 1;
              subjectCurrent.enrolledStudents.add(studentId);
              subjectMap.set(subjectKey, subjectCurrent);

              const trendSourceDate =
                submission.gradedAt ||
                submission.submittedAt ||
                assignment.dueDate ||
                assignment.createdAt;

              const trendLabel = normalizeAnalyticsDateLabel(
                trendSourceDate,
                `Activity ${trendMap.size + 1}`
              );

              const currentTrend = trendMap.get(trendLabel) || {
                label: trendLabel,
                total: 0,
                count: 0,
                order:
                  resolveDate(trendSourceDate)?.getTime() ||
                  Date.now() + trendMap.size,
              };

              currentTrend.total += percent;
              currentTrend.count += 1;
              trendMap.set(trendLabel, currentTrend);
            }

            continue;
          }

          if (submission?.status === "submitted") {
            studentSubmittedCount += 1;
            classSubmittedCount += 1;
            totalSubmittedAssignments += 1;
            continue;
          }

          const dueDate = resolveDate(assignment.dueDate);

          if (dueDate && dueDate.getTime() < Date.now()) {
            studentMissingCount += 1;
            classMissingCount += 1;
            totalMissingAssignments += 1;

            const subjectKey =
              normalizeOptionalText(assignment.header) ||
              normalizeOptionalText(classData.name) ||
              "Uncategorized";

            const subjectCurrent = subjectMap.get(subjectKey) || {
              subject: subjectKey,
              total: 0,
              count: 0,
              pending: 0,
              missing: 0,
              enrolledStudents: new Set(),
            };
            subjectCurrent.missing += 1;
            subjectCurrent.enrolledStudents.add(studentId);
            subjectMap.set(subjectKey, subjectCurrent);
          } else {
            studentPendingCount += 1;
            classPendingCount += 1;
            totalPendingAssignments += 1;

            const subjectKey =
              normalizeOptionalText(assignment.header) ||
              normalizeOptionalText(classData.name) ||
              "Uncategorized";

            const subjectCurrent = subjectMap.get(subjectKey) || {
              subject: subjectKey,
              total: 0,
              count: 0,
              pending: 0,
              missing: 0,
              enrolledStudents: new Set(),
            };
            subjectCurrent.pending += 1;
            subjectCurrent.enrolledStudents.add(studentId);
            subjectMap.set(subjectKey, subjectCurrent);
          }
        }

        const studentClassAverage =
          studentGradedCount > 0
            ? Math.round(studentScoreTotal / studentGradedCount)
            : 0;

        if (studentGradedCount > 0) {
          classEvaluatedStudents += 1;
          classScoreByStudentTotal += studentClassAverage;
        }

        if (!studentRiskMap.has(studentId)) {
          studentRiskMap.set(studentId, {
            studentId,
            studentName: normalizeOptionalText(member.name) || studentId,
            sections: new Set(),
            classes: new Set(),
            averageTotal: 0,
            averageCount: 0,
            pending: 0,
            submitted: 0,
            missing: 0,
            graded: 0,
            enrollmentCount: 0,
          });
        }

        const riskRecord = studentRiskMap.get(studentId);
        riskRecord.sections.add(sectionKey);
        riskRecord.classes.add(normalizeOptionalText(classData.name) || "Untitled Class");
        riskRecord.enrollmentCount += 1;
        riskRecord.pending += studentPendingCount;
        riskRecord.submitted += studentSubmittedCount;
        riskRecord.missing += studentMissingCount;
        riskRecord.graded += studentGradedCount;

        if (studentGradedCount > 0) {
          riskRecord.averageTotal += studentClassAverage;
          riskRecord.averageCount += 1;
        }
      }

      // Class average is student-weighted:
      // each enrolled student in this class contributes once, not each assignment point.
      const classAverage =
        classEvaluatedStudents > 0
          ? Math.round(classScoreByStudentTotal / classEvaluatedStudents)
          : 0;

      classRows.push({
        classId,
        className: normalizeOptionalText(classData.name) || "Untitled Class",
        courseCode: normalizeOptionalText(classData.courseCode) || "",
        section: sectionKey,
        year: yearKey,
        instructor: normalizeOptionalText(classData.instructorName) || "Unassigned",
        average: classAverage,
        gradedCount: classGradedCount,
        evaluatedStudents: classEvaluatedStudents,
        studentCount: classMembers.length,
        pendingCount: classPendingCount,
        submittedCount: classSubmittedCount,
        missingCount: classMissingCount,
      });

      const sectionCurrent = sectionMap.get(sectionKey) || {
        label: sectionKey,
        weightedTotal: 0,
        evaluatedStudents: 0,
        enrollmentCount: 0,
        uniqueStudents: new Set(),
        missing: 0,
        pending: 0,
      };

      if (classEvaluatedStudents > 0) {
        sectionCurrent.weightedTotal += classAverage * classEvaluatedStudents;
        sectionCurrent.evaluatedStudents += classEvaluatedStudents;
      }

      sectionCurrent.enrollmentCount += classMembers.length;
      sectionCurrent.missing += classMissingCount;
      sectionCurrent.pending += classPendingCount;
      classMembers.forEach((member) => {
        const studentId = normalizeOptionalText(member.userId);
        if (studentId) sectionCurrent.uniqueStudents.add(studentId);
      });
      sectionMap.set(sectionKey, sectionCurrent);

      const yearCurrent = yearMap.get(yearKey) || {
        label: yearKey,
        weightedTotal: 0,
        evaluatedStudents: 0,
        enrollmentCount: 0,
        uniqueStudents: new Set(),
        missing: 0,
        pending: 0,
      };

      if (classEvaluatedStudents > 0) {
        yearCurrent.weightedTotal += classAverage * classEvaluatedStudents;
        yearCurrent.evaluatedStudents += classEvaluatedStudents;
      }

      yearCurrent.enrollmentCount += classMembers.length;
      yearCurrent.missing += classMissingCount;
      yearCurrent.pending += classPendingCount;
      classMembers.forEach((member) => {
        const studentId = normalizeOptionalText(member.userId);
        if (studentId) yearCurrent.uniqueStudents.add(studentId);
      });
      yearMap.set(yearKey, yearCurrent);
    }

    const studentRows = Array.from(studentRiskMap.values()).map((student) => {
      const average =
        student.averageCount > 0
          ? Math.round(student.averageTotal / student.averageCount)
          : 0;

      const riskLevel = getAdminRiskLevel({
        average,
        gradedCount: student.graded,
        missingCount: student.missing,
        pendingCount: student.pending,
      });

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        section: Array.from(student.sections).join(", ") || "Unassigned",
        className: Array.from(student.classes).slice(0, 3).join(", ") || "No Class",
        enrollmentCount: student.enrollmentCount,
        average,
        pendingCount: student.pending,
        submittedCount: student.submitted,
        missingCount: student.missing,
        gradedCount: student.graded,
        riskLevel,
      };
    });

    const evaluatedStudents = studentRows.filter((student) => student.gradedCount > 0);
    const passingStudents = evaluatedStudents.filter((student) => student.average >= 75);
    const failedStudents = evaluatedStudents.filter((student) => student.average < 75);

    const noDataCount = studentRows.filter((student) => student.riskLevel === "No Data").length;
    const highRiskCount = studentRows.filter((student) => student.riskLevel === "High").length;
    const moderateRiskCount = studentRows.filter((student) => student.riskLevel === "Moderate").length;
    const lowRiskCount = studentRows.filter((student) => student.riskLevel === "Low").length;

    // Department average is unique-student weighted:
    // each student contributes once using their average across classes.
    const departmentAverage =
      evaluatedStudents.length > 0
        ? Math.round(
            evaluatedStudents.reduce((sum, student) => sum + student.average, 0) /
              evaluatedStudents.length
          )
        : 0;

    const passRate =
      evaluatedStudents.length > 0
        ? Math.round((passingStudents.length / evaluatedStudents.length) * 100)
        : 0;

    const failRate =
      evaluatedStudents.length > 0
        ? Math.round((failedStudents.length / evaluatedStudents.length) * 100)
        : 0;

    const activeWorkload =
      totalPendingAssignments +
      totalSubmittedAssignments +
      totalMissingAssignments +
      totalGradedCount;

    const completionRate =
      activeWorkload > 0
        ? Math.round(
            ((totalSubmittedAssignments + totalGradedCount) / activeWorkload) * 100
          )
        : 0;

    const assignmentCompletionRate =
      activeWorkload > 0
        ? Math.round((totalGradedCount / activeWorkload) * 100)
        : 0;

    const onTimeSubmissionRate =
      totalSubmittedAssignments + totalGradedCount > 0
        ? Math.round(
            (totalGradedCount / (totalSubmittedAssignments + totalGradedCount)) *
              100
          )
        : 0;

    const sectionComparison = Array.from(sectionMap.values())
      .map((section) => ({
        label: section.label,
        value:
          section.evaluatedStudents > 0
            ? Math.round(section.weightedTotal / section.evaluatedStudents)
            : 0,
        students: section.uniqueStudents.size,
        enrollmentCount: section.enrollmentCount,
        evaluatedStudents: section.evaluatedStudents,
        missing: section.missing,
        pending: section.pending,
      }))
      .sort((a, b) => {
        if (a.value === 0 && b.value > 0) return 1;
        if (b.value === 0 && a.value > 0) return -1;
        return a.value - b.value;
      });

    const yearLevelComparison = Array.from(yearMap.values())
      .map((year) => ({
        label: year.label,
        value:
          year.evaluatedStudents > 0
            ? Math.round(year.weightedTotal / year.evaluatedStudents)
            : 0,
        students: year.uniqueStudents.size,
        enrollmentCount: year.enrollmentCount,
        evaluatedStudents: year.evaluatedStudents,
        missing: year.missing,
        pending: year.pending,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const subjectDifficulty = Array.from(subjectMap.values())
      .map((subject) => {
        const average =
          subject.count > 0 ? Math.round(subject.total / subject.count) : 0;

        return {
          subject: subject.subject,
          average,
          gradedCount: subject.count,
          pendingCount: subject.pending,
          missingCount: subject.missing,
          students: subject.enrolledStudents.size,
          difficulty:
            subject.count > 0 && average < 75
              ? "High Difficulty"
              : subject.missing > 0 || subject.pending >= 3
              ? "Moderate Difficulty"
              : subject.count === 0
              ? "No Data"
              : "Stable",
        };
      })
      .sort((a, b) => {
        const priority = {
          "High Difficulty": 4,
          "Moderate Difficulty": 3,
          "No Data": 2,
          Stable: 1,
        };

        const difficultyDifference =
          (priority[b.difficulty] || 0) - (priority[a.difficulty] || 0);

        if (difficultyDifference !== 0) return difficultyDifference;

        if (a.average === 0 && b.average > 0) return 1;
        if (b.average === 0 && a.average > 0) return -1;

        return a.average - b.average;
      })
      .slice(0, 8);

    const trend = Array.from(trendMap.values())
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        label: item.label,
        average: item.count > 0 ? Math.round(item.total / item.count) : 0,
        count: item.count,
      }))
      .slice(-8);

    const atRiskStudents = studentRows
      .filter(
        (student) =>
          student.riskLevel === "High" || student.riskLevel === "Moderate"
      )
      .sort((a, b) => {
        const priority = { High: 2, Moderate: 1 };
        const riskDiff =
          (priority[b.riskLevel] || 0) - (priority[a.riskLevel] || 0);

        if (riskDiff !== 0) return riskDiff;
        if (b.missingCount !== a.missingCount) {
          return b.missingCount - a.missingCount;
        }

        return a.average - b.average;
      })
      .slice(0, 8)
      .map((student) => ({
        ...student,
        reason:
          student.missingCount > 0
            ? `${student.missingCount} missing assignment(s) across ${student.enrollmentCount} enrolled class(es).`
            : student.average < 75
            ? `Average below passing threshold across enrolled classes.`
            : `${student.pendingCount} pending assignment(s) across ${student.enrollmentCount} enrolled class(es).`,
      }));

    const weakestSection = sectionComparison[0] || null;
    const hardestSubject = subjectDifficulty[0] || null;

    const suggestions = [];

    if (weakestSection) {
      suggestions.push({
        title: "Priority Section",
        text: `Focus intervention on ${weakestSection.label}. It has ${weakestSection.students} unique student(s), ${weakestSection.enrollmentCount} class enrollment(s), ${weakestSection.value}% average, and ${weakestSection.missing} missing work item(s).`,
      });
    }

    if (hardestSubject) {
      suggestions.push({
        title: "Faculty Recommendation",
        text: `${hardestSubject.subject} is currently marked as ${hardestSubject.difficulty}. It involves ${hardestSubject.students} unique student(s). Consider reinforcement sessions and targeted review materials.`,
      });
    }

    if (highRiskCount + moderateRiskCount > 0) {
      suggestions.push({
        title: "System Recommendation",
        text: `There are ${highRiskCount + moderateRiskCount} unique learner(s) requiring monitoring. Coordinate with advisers and teachers for intervention.`,
      });
    }

    if (!suggestions.length) {
      suggestions.push({
        title: "System Recommendation",
        text: "No urgent academic risk detected. Continue monitoring completion and graded performance.",
      });
    }

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        totals: {
          totalStudents: activeStudentIdsFromStudentCollection.size,
          totalTeachers: teachersSnapshot.size,
          totalClasses: classes.length,
          monitoredStudents: uniqueEnrolledStudentIds.size,
          evaluatedStudents: evaluatedStudents.length,
          totalClassEnrollments: totalEnrollmentRecords,
        },
        summary: {
          departmentAverage,
          atRiskCount: highRiskCount + moderateRiskCount,
          highRiskCount,
          moderateRiskCount,
          lowRiskCount,
          noDataCount,
          passRate,
          failRate,
          backlogCount: totalPendingAssignments + totalMissingAssignments,
          completionRate,
          assignmentCompletionRate,
          onTimeSubmissionRate,
          totalPendingAssignments,
          totalSubmittedAssignments,
          totalMissingAssignments,
          totalGradedAssignments: totalGradedCount,
        },
        classRows,
        sectionComparison,
        yearLevelComparison,
        subjectDifficulty,
        atRiskStudents,
        trend,
        suggestions,
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load admin analytics.",
    });
  }
});


app.get("/classes", async (req, res) => {
  try {
    const snapshot = await db
      .collection("classes")
      .orderBy("createdAt", "desc")
      .get();

    const classes = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const classData = doc.data() || {};
        const hydratedClassData = await hydrateClassBannerUrl(classData);

        return {
          id: doc.id,
          ...hydratedClassData,
        };
      })
    );

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
    const classData = classDoc.data() || {};

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

app.get("/final-grades/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ error: "classId is required." });
    }

    const snapshot = await db
      .collection("finalGrades")
      .where("classId", "==", classId)
      .get();

    const grades = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(grades);
  } catch (error) {
    console.error("Fetch final grades error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch final grades.",
    });
  }
});

app.post("/submit-final-grades", async (req, res) => {
  try {
    const {
      classId,
      conversationId,
      submittedById,
      submittedByName,
      grades,
    } = req.body;

    if (!classId) {
      return res.status(400).json({ error: "classId is required." });
    }

    if (!Array.isArray(grades) || !grades.length) {
      return res.status(400).json({ error: "grades are required." });
    }

    const classSnap = await db.collection("classes").doc(classId).get();
    if (!classSnap.exists) {
      return res.status(404).json({ error: "Class not found." });
    }

    const classData = classSnap.data() || {};
    const batch = db.batch();

    grades.forEach((item) => {
      const studentId = normalizeOptionalText(item?.studentId);
      const studentName = normalizeOptionalText(item?.studentName);
      const status = normalizeOptionalText(item?.status);
      const finalGrade = normalizeOptionalText(
        item?.finalGrade !== undefined ? String(item.finalGrade) : ""
      );

      if (!studentId || !status || !finalGrade) {
        return;
      }

      const docRef = db.collection("finalGrades").doc(`${classId}_${studentId}`);
      batch.set(
        docRef,
        {
          classId,
          conversationId: normalizeOptionalText(conversationId),
          studentId,
          studentName,
          status,
          finalGrade,
          submittedById: normalizeOptionalText(submittedById),
          submittedByName: normalizeOptionalText(submittedByName),
          className: normalizeOptionalText(classData.name),
          courseCode: normalizeOptionalText(classData.courseCode),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    for (const item of grades) {
      const studentId = normalizeOptionalText(item?.studentId);
      const studentName = normalizeOptionalText(item?.studentName);
      const status = normalizeOptionalText(item?.status);
      const finalGrade = normalizeOptionalText(
        item?.finalGrade !== undefined ? String(item.finalGrade) : ""
      );

      if (!studentId || !status || !finalGrade) continue;

      await createNotification({
        userId: studentId,
        role: "student",
        type: "grade",
        title: "Final Grade Submitted",
        message: `Your final grade in ${classData.name || "your class"} is ${finalGrade} (${status}).`,
        relatedId: classId,
        relatedType: "final-grade",
        classId,
        actorId: normalizeOptionalText(submittedById),
        actorRole: "teacher",
        actorName: normalizeOptionalText(submittedByName) || studentName || "Teacher",
      });
    }

    return res.json({
      success: true,
      message: "Final grades submitted successfully.",
    });
  } catch (error) {
    console.error("Submit final grades error:", error);
    return res.status(500).json({
      error: error.message || "Failed to submit final grades.",
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
          maxPoints: typeof assignment.totalScore === "number" ? assignment.totalScore : Number(assignment.totalScore) || 0,
          topic: assignment.header || "",
          materialIds: Array.isArray(assignment.materialIds) ? assignment.materialIds : [],
          
          // 👇 ADD THESE TWO LINES SO THE FRONTEND KNOWS IT'S A GAME
          assignmentType: assignment.assignmentType || "regular",
          gameType: assignment.gameType || null,
          
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

// Messenger conversations return lastMessageAt/createdAt/updatedAt.
 // Frontend formats these into relative labels like "5m ago" instead of always "Now".
// Messenger conversations include lastMessageAt, createdAt, and updatedAt.
 // Student and teacher messenger screens use these timestamps for relative time labels.
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

    const classData = classSnap.data() || {};

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


    await createNotificationsForClassStudents({
      classId,
      type: "material",
      title: "New Material",
      messageBuilder: () => `${classData.name || "Your class"}: ${title} was added to your learning materials.`,
      relatedId: ref.id,
      relatedType: "class-material",
      actorId: postedByUid,
      actorRole: normalizeOptionalText(postedByUid) === normalizeOptionalText(classData.assignedTeacherUid) ? "teacher" : "admin",
      actorName: postedByName || classData.instructorName || "Teacher",
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
      materialIds,
      fileName,
      fileUrl,
      fileType,
      storagePath,
      bucketPath,
      postedByUid,
      postedByName,
      questions,
      assignmentType,
      gameType,
      numberOfAttempts,
      customAttempts,
      timeLimit,
      customTimeLimit,
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

    const classData = classSnap.data() || {};

    const ref = await db.collection("classAssignments").add({
      classId,
      header,
      instruction,
      dueDate,
      totalScore: Number(totalScore),
      pointsOnTime: Number(pointsOnTime),
      repositoryDisabledAfterDue: !!repositoryDisabledAfterDue,
      materialIds: Array.isArray(materialIds) ? materialIds.filter(Boolean) : [],
      fileName: normalizeOptionalText(fileName),
      fileUrl: normalizeOptionalText(fileUrl),
      fileType: normalizeOptionalText(fileType),
      storagePath: normalizeOptionalText(storagePath),
      bucketPath: normalizeOptionalText(bucketPath),
      postedByUid: normalizeOptionalText(postedByUid),
      postedByName: normalizeOptionalText(postedByName),
      questions: Array.isArray(questions) ? questions : [],
      assignmentType: assignmentType || 'regular',
      gameType: gameType || null,
      numberOfAttempts: numberOfAttempts || null,
      customAttempts: customAttempts || null,
      timeLimit: timeLimit || null,
      customTimeLimit: customTimeLimit || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });


    await createNotificationsForClassStudents({
      classId,
      type: "assignment",
      title: "New Assignment",
      messageBuilder: () => `${classData.name || "Your class"}: ${header} is available. Due on ${dueDate}.`,
      relatedId: ref.id,
      relatedType: "class-assignment",
      actorId: postedByUid,
      actorRole: normalizeOptionalText(postedByUid) === normalizeOptionalText(classData.assignedTeacherUid) ? "teacher" : "admin",
      actorName: postedByName || classData.instructorName || "Teacher",
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
      materialIds,
      fileName,
      fileUrl,
      fileType,
       questions,
       assignmentType,
      gameType,
      numberOfAttempts,
      customAttempts,
      timeLimit,
      customTimeLimit,
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
      ...(materialIds !== undefined
        ? { materialIds: Array.isArray(materialIds) ? materialIds.filter(Boolean) : [] }
        : {}),
      ...(typeof fileName === "string" || fileName === null ? { fileName } : {}),
      ...(typeof fileUrl === "string" || fileUrl === null ? { fileUrl } : {}),
      ...(typeof fileType === "string" || fileType === null ? { fileType } : {}),
        ...(questions !== undefined ? { questions: Array.isArray(questions) ? questions : [] } : {}),
        ...(assignmentType !== undefined ? { assignmentType: assignmentType || 'regular' } : {}),
      ...(gameType !== undefined ? { gameType: gameType || null } : {}),
      ...(numberOfAttempts !== undefined ? { numberOfAttempts: numberOfAttempts || null } : {}),
      ...(customAttempts !== undefined ? { customAttempts: customAttempts || null } : {}),
      ...(timeLimit !== undefined ? { timeLimit: timeLimit || null } : {}),
      ...(customTimeLimit !== undefined ? { customTimeLimit: customTimeLimit || null } : {}),
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

app.get("/student-submissions/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required." });
    }

    const snapshot = await db
      .collection("classSubmissions")
      .where("studentId", "==", String(studentId).trim())
      .get();

    const submissions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const submission = doc.data() || {};
        let assignmentData = {};

        if (submission.assignmentId) {
          const assignmentSnap = await db
            .collection("classAssignments")
            .doc(submission.assignmentId)
            .get();

          assignmentData = assignmentSnap.exists ? assignmentSnap.data() || {} : {};
        }

        const totalScore =
          typeof assignmentData.totalScore === "number"
            ? assignmentData.totalScore
            : Number(assignmentData.totalScore) || null;

        return {
          id: doc.id,
          submissionId: doc.id,
          ...submission,
          totalScore,
          maxPoints: totalScore,
          assignmentTitle: assignmentData.header || "Assignment",
          assignmentInstruction: assignmentData.instruction || "",
        };
      })
    );

    submissions.sort((a, b) => {
      const aTime = resolveDate(a.submittedAt)?.getTime() || 0;
      const bTime = resolveDate(b.submittedAt)?.getTime() || 0;
      return bTime - aTime;
    });

    res.json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    console.error("Fetch student submissions error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch student submissions.",
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
      storagePath,
      bucketPath,
    } = req.body;

    if (!classId || !assignmentId || !studentId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const existingSnapshot = await db
      .collection("classSubmissions")
      .where("classId", "==", classId)
      .where("assignmentId", "==", assignmentId)
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    const submissionPayload = {
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
      storagePath: normalizeOptionalText(storagePath),
      bucketPath: normalizeOptionalText(bucketPath),
      feedback: normalizeOptionalText(feedback),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let ref;
    let createdNew = false;

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0];
      const existingData = existingDoc.data() || {};

      if (existingData.status === "graded") {
        return res.status(409).json({
          error: "This assignment has already been graded and can no longer be changed.",
        });
      }

      ref = existingDoc.ref;

      await ref.update({
        ...submissionPayload,
        submittedAt: existingData.submittedAt || FieldValue.serverTimestamp(),
        gradedAt: null,
      });
    } else {
      ref = await db.collection("classSubmissions").add({
        ...submissionPayload,
        submittedAt: FieldValue.serverTimestamp(),
        gradedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
      createdNew = true;
    }

    const classSnap = await db.collection("classes").doc(classId).get();
    const classData = classSnap.exists ? classSnap.data() || {} : {};

    const assignmentSnap = await db.collection("classAssignments").doc(assignmentId).get();
    const assignmentData = assignmentSnap.exists ? assignmentSnap.data() || {} : {};

    if ((normalizeOptionalText(status) || "submitted") === "submitted") {
      await createSubmittedAssignmentNotificationForTeacher({
        classId,
        assignmentId,
        submissionId: ref.id,
        studentId,
        studentName: normalizeOptionalText(studentName) || studentId,
      });
    }

    res.json({
      success: true,
      message: createdNew
        ? "Submission created successfully."
        : "Submission updated successfully.",
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

    const submissionRef = db.collection("classSubmissions").doc(id);
    const submissionSnap = await submissionRef.get();

    if (!submissionSnap.exists) {
      return res.status(404).json({ error: "Submission not found." });
    }

    const submissionData = submissionSnap.data() || {};
    const normalizedScore = score !== undefined ? Number(score) : undefined;

    await submissionRef.update({
      status: normalizeOptionalText(status) || "graded",
      ...(normalizedScore !== undefined ? { score: normalizedScore } : {}),
      ...(typeof feedback === "string" || feedback === null ? { feedback } : {}),
      gradedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const assignmentSnap = await db.collection("classAssignments").doc(submissionData.assignmentId).get();
    const assignmentData = assignmentSnap.exists ? assignmentSnap.data() || {} : {};
    const classSnap = await db.collection("classes").doc(submissionData.classId).get();
    const classData = classSnap.exists ? classSnap.data() || {} : {};

    if (submissionData.studentId) {
      await createNotification({
        userId: submissionData.studentId,
        role: "student",
        type: "assignment",
        title: "Assignment Graded",
        message: `${assignmentData.header || "Your assignment"} in ${classData.name || "your class"} has been graded${normalizedScore !== undefined ? ` with a score of ${normalizedScore}.` : "."}`,
        relatedId: submissionData.assignmentId || id,
        relatedType: "class-assignment",
        classId: submissionData.classId || null,
        actorId: classData.assignedTeacherId || null,
        actorRole: "teacher",
        actorName: classData.instructorName || "Teacher",
      });

      const totalScore = Number(assignmentData.totalScore || 0);
      const percent = normalizedScore !== undefined && totalScore > 0
        ? Math.round((normalizedScore / totalScore) * 100)
        : null;

      if (percent !== null && percent < 75) {
        await createNotification({
          userId: submissionData.studentId,
          role: "student",
          type: "support-activity",
          title: "Support Activity Recommended",
          message: `You may need extra support for ${assignmentData.header || "this assignment"} in ${classData.name || "your class"}.`,
          relatedId: submissionData.assignmentId || id,
          relatedType: "class-assignment",
          classId: submissionData.classId || null,
          actorId: classData.assignedTeacherId || null,
          actorRole: "teacher",
          actorName: classData.instructorName || "Teacher",
        });

        await createStudentAtRiskNotificationForTeacher({
          classId: submissionData.classId,
          studentId: submissionData.studentId,
          studentName: submissionData.studentName || submissionData.studentId,
          reason: `Low score detected: ${percent}% in ${assignmentData.header || "an assignment"}.`,
        });
      }
    }

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

/**
 * CLASS ANNOUNCEMENTS
 */
app.get("/class-announcements/:classId", async (req, res) => {
  try {
    const { classId } = req.params;

    const snapshot = await db
      .collection("announcements")
      .where("classIds", "array-contains", classId)
      .orderBy("createdAt", "desc")
      .get();
    const now = Date.now();

    const announcements = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...data };
      })
      .filter((item) => {
        if (!item.expiresAt) return true;

        const expiry =
          typeof item.expiresAt.toDate === "function"
            ? item.expiresAt.toDate()
            : new Date(item.expiresAt);

        return expiry.getTime() > now;
      });

    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.post("/create-class-announcement", async (req, res) => {
  try {
    const {
      classIds,
      title,
      message,
      bannerKey,
      expiresAt,
      postedByUid,
      postedByName,
    } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "Title and message required" });
    }

    if (!Array.isArray(classIds) || !classIds.length) {
      return res.status(400).json({ error: "classIds required" });
    }

    const classChecks = await Promise.all(
      classIds.map(id => db.collection("classes").doc(id).get())
    );

    if (classChecks.some(doc => !doc.exists)) {
      return res.status(400).json({ error: "Invalid classId found" });
    }

    const expiryDate = new Date(expiresAt);
    if (Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({ error: "Invalid expiry date" });
    }

    const ref = await db.collection("announcements").add({
      title: String(title).trim(),
      message: String(message).trim(),
      bannerKey: bannerKey !== undefined ? Number(bannerKey) : 4,
      expiresAt: admin.firestore.Timestamp.fromDate(expiryDate),
      classIds,
      postedByUid: postedByUid || null,
      postedByName: postedByName || "Teacher",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      id: ref.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

app.put("/update-class-announcement/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      message,
      bannerKey,
      expiresAt,
    } = req.body;

    const announcementRef = db.collection("announcements").doc(id);
    const announcementSnap = await announcementRef.get();

    if (!announcementSnap.exists) {
      return res.status(404).json({ error: "Announcement not found." });
    }

    const updates = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof title === "string" && title.trim()) {
      updates.title = title.trim();
    }

    if (typeof message === "string" && message.trim()) {
      updates.message = message.trim();
    }

    if (typeof bannerKey !== "undefined") {
      updates.bannerKey = Number(bannerKey) || 4;
    }

    if (typeof expiresAt !== "undefined") {
      const expiryDate = new Date(expiresAt);

      if (Number.isNaN(expiryDate.getTime())) {
        return res.status(400).json({ error: "Invalid expiry date/time." });
      }

      updates.expiresAt = admin.firestore.Timestamp.fromDate(expiryDate);
    }

    await announcementRef.update(updates);

    res.json({
      success: true,
      message: "Announcement updated successfully.",
    });
  } catch (error) {
    console.error("Update class announcement error:", error);
    res.status(500).json({
      error: error.message || "Failed to update class announcement.",
    });
  }
});

app.delete("/delete-class-announcement/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("announcements").doc(id).delete();

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
/**
 * NOTIFICATION ROUTES
 */


app.post("/unsubmit-assignment", async (req, res) => {
  try {
    const { classId, assignmentId, studentId, studentUid } = req.body;

    if (!classId || !assignmentId || !studentId) {
      return res.status(400).json({
        error: "classId, assignmentId, and studentId are required.",
      });
    }

    let query = db
      .collection("classSubmissions")
      .where("classId", "==", classId)
      .where("assignmentId", "==", assignmentId)
      .where("studentId", "==", studentId)
      .limit(1);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Submission not found." });
    }

    const submissionDoc = snapshot.docs[0];
    const submissionData = submissionDoc.data() || {};

    if (submissionData.status === "graded") {
      return res.status(409).json({
        error: "This assignment has already been graded and cannot be unsubmitted.",
      });
    }

    await submissionDoc.ref.update({
      status: "pending",
      studentUid: normalizeOptionalText(studentUid) || submissionData.studentUid || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Assignment unsubmitted successfully.",
      data: { id: submissionDoc.id },
    });
  } catch (error) {
    console.error("Unsubmit assignment error:", error);
    return res.status(500).json({
      error: error.message || "Failed to unsubmit assignment.",
    });
  }
});

app.get("/notifications", async (req, res) => {
  try {
    const userId = normalizeOptionalText(req.query.userId);
    const role = normalizeOptionalText(req.query.role);

    if (!userId || !role) {
      return res.status(400).json({
        error: "userId and role are required.",
      });
    }

    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .where("role", "==", role)
      .orderBy("createdAt", "desc")
      .get();

    let notifications = snapshot.docs.map(buildNotificationResponse);

    // Teachers receive only:
    // 1. submitted-assignment
    // 2. community-answer
    // 3. student-at-risk
    // 4. class-assigned
    if (role === "teacher") {
      notifications = notifications.filter((item) =>
        TEACHER_ALLOWED_NOTIFICATION_TYPES.has(item.type)
      );
    }

    return res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch notifications.",
    });
  }
});

app.patch("/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    const ref = db.collection("notifications").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Notification not found." });
    }

    await ref.update({
      read: true,
      readAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedSnap = await ref.get();

    return res.json({
      success: true,
      message: "Notification marked as read.",
      data: buildNotificationResponse(updatedSnap),
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return res.status(500).json({
      error: error.message || "Failed to mark notification as read.",
    });
  }
});

app.patch("/notifications/read-all", async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        error: "userId and role are required.",
      });
    }

    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", String(userId).trim())
      .where("role", "==", String(role).trim())
      .where("read", "==", false)
      .get();

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() || {};

      if (
        String(role).trim() === "teacher" &&
        !TEACHER_ALLOWED_NOTIFICATION_TYPES.has(data.type)
      ) {
        return;
      }

      batch.update(doc.ref, {
        read: true,
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      updatedCount += 1;
    });

    await batch.commit();

    return res.json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return res.status(500).json({
      error: error.message || "Failed to mark all notifications as read.",
    });
  }
});



/**
 * AI TUTOR + REMEDIATION HELPERS
 * These helpers make AI Tutor different from a normal chatbot by connecting
 * tutoring behavior to student performance, weak lessons, assignment scores,
 * related materials, generated activities, and progress tracking.
 */
const PASSING_PERCENT = 75;
const GENERATED_ACTIVITY_SCHEMA_VERSION = 3;

function clampNumber(value, min, max, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function normalizeLessonKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'general-topic';
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function extractJsonObjectFromText(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = safeJsonParse(fenced[1].trim(), null);
    if (parsed) return parsed;
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return safeJsonParse(raw.slice(firstBrace, lastBrace + 1), null);
  }

  return null;
}

function normalizeQuiz(value, fallbackTopic = 'the lesson') {
  const fallbackQuiz = {
    question: `Which statement best describes ${fallbackTopic}?`,
    options: [
      `It is an important concept related to ${fallbackTopic}.`,
      'It is unrelated to the lesson.',
      'It is only used for decoration.',
      'It has no practical use.',
    ],
    correctIndex: 0,
    explanation: `This question checks if you understand the main idea of ${fallbackTopic}.`,
  };

  if (!value || typeof value !== 'object') return fallbackQuiz;

  const question = normalizeOptionalText(value.question) || fallbackQuiz.question;
  const rawOptions = Array.isArray(value.options) ? value.options : [];
  const options = rawOptions
    .map((item) => normalizeOptionalText(String(item || '')))
    .filter(Boolean)
    .slice(0, 4);

  while (options.length < 4) {
    options.push(fallbackQuiz.options[options.length]);
  }

  const correctIndex = clampNumber(value.correctIndex, 0, options.length - 1, 0);
  const explanation = normalizeOptionalText(value.explanation) || fallbackQuiz.explanation;

  return { question, options, correctIndex, explanation };
}


function normalizeMaterialQuiz(value) {
  if (!value || typeof value !== "object") return null;

  const question = normalizeOptionalText(value.question);
  const options = Array.isArray(value.options)
    ? value.options.map((item) => normalizeOptionalText(String(item || ""))).filter(Boolean).slice(0, 4)
    : [];
  const correctIndex = Number(value.correctIndex);
  const explanation = normalizeOptionalText(value.explanation);

  if (!question || options.length !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3 || !explanation) {
    return null;
  }

  const genericPattern = /main purpose of studying|best describes the main purpose|important concept related|memorize random information|avoid reading the related lesson|replace all assignment instructions/i;
  const joined = [question, ...options, explanation].join(" ");
  if (genericPattern.test(joined)) return null;

  return { question, options, correctIndex, explanation };
}

const ACTIVITY_ITEM_TYPES = new Set([
  "multiple_choice",
  "true_false",
  "identification",
  "short_answer",
]);

function normalizeActivityItem(value, index = 0) {
  if (!value || typeof value !== "object") return null;

  const type = normalizeOptionalText(value.type);
  const question = normalizeOptionalText(value.question);
  const explanation = normalizeOptionalText(value.explanation) || "Review the related material for the supporting idea.";

  if (!ACTIVITY_ITEM_TYPES.has(type) || !question) return null;

  const base = {
    id: normalizeOptionalText(value.id) || `item-${index + 1}`,
    type,
    question,
    explanation,
    points: clampNumber(value.points, 1, 10, 1),
  };

  if (type === "multiple_choice") {
    const options = Array.isArray(value.options)
      ? value.options.map((item) => normalizeOptionalText(String(item || ""))).filter(Boolean).slice(0, 4)
      : [];
    const correctIndex = Number(value.correctIndex);

    if (options.length !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      return null;
    }

    return {
      ...base,
      options,
      correctIndex,
    };
  }

  if (type === "true_false") {
    let correctAnswer = value.correctAnswer ?? value.answer;

    if (typeof correctAnswer === "string") {
      const lowered = correctAnswer.trim().toLowerCase();
      if (lowered === "true") correctAnswer = true;
      if (lowered === "false") correctAnswer = false;
    }

    if (typeof correctAnswer !== "boolean") return null;

    return {
      ...base,
      correctAnswer,
      answer: correctAnswer,
    };
  }

  if (type === "identification") {
    const acceptableAnswers = Array.isArray(value.acceptableAnswers)
      ? value.acceptableAnswers.map((item) => normalizeOptionalText(String(item || ""))).filter(Boolean).slice(0, 8)
      : [];

    if (!acceptableAnswers.length) return null;

    return {
      ...base,
      acceptableAnswers,
      answer: acceptableAnswers[0],
    };
  }

  if (type === "short_answer") {
    const expectedAnswer = normalizeOptionalText(value.expectedAnswer);
    const rubric = normalizeOptionalText(value.rubric) || expectedAnswer || "Answer should clearly explain the idea using details from the related material.";

    if (!rubric) return null;

    return {
      ...base,
      expectedAnswer: expectedAnswer || null,
      answer: expectedAnswer || null,
      rubric,
    };
  }

  return null;
}

function normalizeAssessmentItems(value, fallbackQuiz = null) {
  const rawItems = Array.isArray(value) ? value : [];
  const normalizedItems = rawItems
    .map((item, index) => normalizeActivityItem(item, index))
    .filter(Boolean);

  const multipleChoice = normalizedItems
    .filter((item) => item.type === "multiple_choice")
    .slice(0, 15)
    .map((item, index) => ({
      ...item,
      id: normalizeOptionalText(item.id) || `mc-${index + 1}`,
    }));

  const trueFalse = normalizedItems
    .filter((item) => item.type === "true_false")
    .slice(0, 15)
    .map((item, index) => ({
      ...item,
      id: normalizeOptionalText(item.id) || `tf-${index + 1}`,
    }));

  const identification = normalizedItems
    .filter((item) => item.type === "identification")
    .slice(0, 15)
    .map((item, index) => ({
      ...item,
      id: normalizeOptionalText(item.id) || `id-${index + 1}`,
    }));

  if (multipleChoice.length < 10 || trueFalse.length < 10 || identification.length < 10) {
    return null;
  }

  return [
    ...multipleChoice,
    ...trueFalse,
    ...identification,
  ].map((item, index) => ({
    ...item,
    id: normalizeOptionalText(item.id) || `item-${index + 1}`,
    points: clampNumber(item.points, 1, 10, 1),
  }));
}

function getFirstMultipleChoiceQuiz(assessmentItems = []) {
  const item = assessmentItems.find((entry) => entry.type === "multiple_choice");
  if (!item) return null;

  return {
    question: item.question,
    options: item.options,
    correctIndex: item.correctIndex,
    explanation: item.explanation,
  };
}

function getMaterialKeywordEvidence(materialText = "") {
  const text = String(materialText || "");
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 40 && item.length <= 280)
    .slice(0, 30);

  return sentences.join("\n");
}

function normalizeGeneratedActivityFromAI({
  generated,
  readableMaterials,
  materialTitles,
  resolvedScore,
  courseId,
  courseName,
  courseCode,
  assignmentId,
  assignmentTitle,
  topic,
  context,
}) {
  if (!generated || typeof generated !== "object") return null;

  const assessmentItems = normalizeAssessmentItems(generated.assessmentItems, generated.quiz);
  if (!assessmentItems) return null;

  const quiz = getFirstMultipleChoiceQuiz(assessmentItems);
  if (!quiz) return null;

  const recommendationType = ["review", "practice", "advanced"].includes(generated.recommendationType)
    ? generated.recommendationType
    : resolvedScore !== null && resolvedScore < 60
    ? "review"
    : "practice";

  const difficulty = ["easy", "medium", "hard"].includes(generated.difficulty)
    ? generated.difficulty
    : recommendationType === "review"
    ? "easy"
    : "medium";

  return {
    schemaVersion: GENERATED_ACTIVITY_SCHEMA_VERSION,
    courseId: normalizeOptionalText(courseId || context.classInfo.id),
    courseName: normalizeOptionalText(courseName || context.classInfo.name) || "Class",
    courseCode: normalizeOptionalText(courseCode || context.classInfo.courseCode) || "",
    assignmentId: String(assignmentId).trim(),
    assignmentTitle: normalizeOptionalText(assignmentTitle || context.assignment.title) || "Assignment",
    topic: normalizeOptionalText(generated.topic || readableMaterials[0]?.title || topic || context.assignment.title) || "Related Material Review",
    score: resolvedScore,
    recommendationType,
    difficulty,
    estimatedMinutes: clampNumber(generated.estimatedMinutes, 5, 60, 20),
    basedOnMaterials: materialTitles,
    materialExtractionStatus: context.materials.map((material) => ({
      id: material.id,
      title: material.title,
      fileName: material.fileName,
      fileType: material.fileType,
      status: material.extractionStatus || "unknown",
    })),
    learningObjectives: Array.isArray(generated.learningObjectives)
      ? generated.learningObjectives.map(String).filter(Boolean).slice(0, 5)
      : [`Review key ideas from ${readableMaterials[0]?.title || "the related material"}.`],
    instructions:
      normalizeOptionalText(generated.instructions) ||
      "Review the related material carefully, answer each activity item, and explain the concept in your own words.",
    steps: Array.isArray(generated.steps)
      ? generated.steps.map(String).filter(Boolean).slice(0, 8)
      : [
          "Review the related material content.",
          "Answer the multiple choice item.",
          "Answer the true or false and identification items.",
          "Write a short explanation using your own words.",
        ],
    assessmentItems,
    activityItems: assessmentItems,
    quiz,
    shortAnswerPrompt:
      normalizeOptionalText(generated.shortAnswerPrompt) ||
      "Explain the key idea from the related material in your own words and give one example.",
    tutorTip:
      normalizeOptionalText(generated.tutorTip) ||
      "Use the related material as your guide and explain the idea step by step.",
  };
}


function hasSimpleAnswerMatch(studentAnswer = "", correctAnswers = []) {
  const normalizedStudentAnswer = String(studentAnswer || "")
    .trim()
    .toLowerCase();

  if (!normalizedStudentAnswer) return false;

  return correctAnswers.some((answer) => {
    const normalizedAnswer = String(answer || "")
      .trim()
      .toLowerCase();

    if (!normalizedAnswer) return false;

    return (
      normalizedStudentAnswer === normalizedAnswer ||
      normalizedStudentAnswer.includes(normalizedAnswer) ||
      normalizedAnswer.includes(normalizedStudentAnswer)
    );
  });
}

function normalizeSemanticEvaluation(value = {}) {
  return {
    isCorrect: !!value.isCorrect,
    confidence: clampNumber(value.confidence, 0, 1, value.isCorrect ? 0.75 : 0.25),
    feedback:
      normalizeOptionalText(value.feedback) ||
      (value.isCorrect
        ? "Accepted because the answer is conceptually similar."
        : "Review the expected concept from the related material."),
  };
}

async function evaluateIdentificationAnswerWithAI({
  studentAnswer,
  correctAnswers,
  question,
  explanation,
  topic,
  basedOnMaterials,
}) {
  const cleanStudentAnswer = normalizeOptionalText(studentAnswer);
  const cleanCorrectAnswers = Array.isArray(correctAnswers)
    ? correctAnswers.map((item) => normalizeOptionalText(String(item || ""))).filter(Boolean)
    : [];

  if (!cleanStudentAnswer) {
    return {
      isCorrect: false,
      confidence: 0,
      feedback: "No answer was provided.",
    };
  }

  if (hasSimpleAnswerMatch(cleanStudentAnswer, cleanCorrectAnswers)) {
    return {
      isCorrect: true,
      confidence: 1,
      feedback: "Accepted because the answer directly matches the expected concept.",
    };
  }

  const assistantInstruction = `
You are ParseIT's fair identification-answer grading assistant.
Grade whether the student's answer is conceptually correct.
Return VALID JSON ONLY. No markdown.
`;

  const contextualPrompt = `
Question:
${question || "N/A"}

Student answer:
${cleanStudentAnswer}

Expected / acceptable answers:
${cleanCorrectAnswers.join(", ") || "N/A"}

Teacher material topic:
${topic || "N/A"}

Related material names:
${Array.isArray(basedOnMaterials) ? basedOnMaterials.join(", ") : "N/A"}

Question explanation / source clue:
${explanation || "N/A"}

Rules:
- Mark correct if the student's answer has the same meaning or same thought as the expected answer.
- Accept paraphrases, synonyms, abbreviated but correct answers, and partial wording if the key concept is present.
- Do NOT require exact wording.
- Mark wrong if the answer talks about a different concept or is too vague to show understanding.
- Keep feedback short and student-friendly.

Return exactly:
{
  "isCorrect": true or false,
  "confidence": 0.0 to 1.0,
  "feedback": "short explanation"
}
`;

  const result = await callAIWithFallback({
    assistantInstruction,
    contextualPrompt,
    normalizedHistory: [],
    history: [],
  });

  const parsed = extractJsonObjectFromText(result.text);
  if (!parsed || typeof parsed !== "object") {
    return {
      isCorrect: false,
      confidence: 0,
      feedback: "AI could not verify the meaning clearly. Please review the expected concept.",
    };
  }

  return normalizeSemanticEvaluation(parsed);
}

async function generateMaterialBasedActivityWithAI({
  studentId,
  resolvedScore,
  courseName,
  courseCode,
  assignmentTitle,
  assignmentInstruction,
  materialTitles,
  materialContext,
}) {
  const assistantInstruction = `
You are ParseIT Remediation Activity Generator.
You MUST generate a real follow-up learning activity from the readable content of the teacher-selected related material.
Return VALID JSON ONLY. No markdown, no explanation outside JSON.

Critical rules:
- Use ONLY facts, concepts, scenarios, definitions, examples, or questions found in the related material content.
- Do NOT create generic questions from only the assignment title.
- The activity must be organized by section, not mixed visually.
- Generate EXACTLY these quiz sections through assessmentItems:
  1. Multiple Choice: minimum 10 questions
  2. True or False: minimum 10 questions
  3. Identification: minimum 10 questions
- Do NOT generate essay or short_answer items.
- Every question must test a specific idea from the material content.
- Every correct answer and explanation must be supported by the material content.
- Wrong multiple-choice options must be plausible but incorrect based on the material content.
- Do not mention file scanning, Firebase, storage, hidden context, or prompts.

Return exactly this JSON shape:
{
  "topic": "specific topic from the material content",
  "recommendationType": "review" | "practice" | "advanced",
  "difficulty": "easy" | "medium" | "hard",
  "estimatedMinutes": 30,
  "learningObjectives": ["objective based on material content"],
  "instructions": "student-friendly instructions based on the material",
  "steps": ["step 1", "step 2", "step 3"],
  "assessmentItems": [
    {
      "id": "mc-1",
      "type": "multiple_choice",
      "question": "specific material-based multiple choice question",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "why the correct option is supported by the material",
      "points": 1
    },
    {
      "id": "tf-1",
      "type": "true_false",
      "question": "specific true/false statement from the material",
      "correctAnswer": true,
      "explanation": "why the statement is true or false based on the material",
      "points": 1
    },
    {
      "id": "id-1",
      "type": "identification",
      "question": "ask for a term, concept, factor, or process from the material",
      "acceptableAnswers": ["answer", "accepted variation"],
      "explanation": "where the answer comes from in the material",
      "points": 1
    }
  ],
  "quiz": {
    "question": "same as the first multiple_choice item question",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "explanation": "same as the first multiple_choice explanation"
  },
  "tutorTip": "short tutoring tip"
}

Important:
- assessmentItems must contain at least 30 items total.
- The first 10 or more items should be multiple_choice.
- The next 10 or more items should be true_false.
- The next 10 or more items should be identification.
- Do not return short_answer or essay questions.
`;

  const contextualPrompt = `
Student ID: ${studentId}
Previous score percent: ${resolvedScore ?? "Unknown"}
Course: ${courseName || "N/A"} (${courseCode || "N/A"})
Assignment: ${assignmentTitle || "N/A"}
Assignment instruction: ${assignmentInstruction || "N/A"}
Teacher-selected related materials: ${materialTitles.join(", ") || "N/A"}

RELATED MATERIAL CONTENT SOURCE OF TRUTH:
${materialContext}
`;

  const firstResult = await callAIWithFallback({
    assistantInstruction,
    contextualPrompt,
    normalizedHistory: [],
    history: [],
  });

  let generated = extractJsonObjectFromText(firstResult.text);
  if (generated && normalizeAssessmentItems(generated.assessmentItems, generated.quiz)) {
    return generated;
  }

  const repairInstruction = `
You are a strict JSON repair and real quiz generation assistant.
The previous output was invalid, incomplete, or generic.
Generate a NEW activity JSON using ONLY the material content below.
Return JSON only.

Required output:
- At least 10 multiple_choice items.
- At least 10 true_false items.
- At least 10 identification items.
- No short_answer or essay items.
- Every item must be specific to the material content.
`;

  const repairPrompt = `
Previous invalid output:
${limitText(firstResult.text || "", 4000)}

Material evidence sentences:
${getMaterialKeywordEvidence(materialContext)}

Full readable material content:
${limitText(materialContext, 12000)}

Generate the required JSON now with assessmentItems. Do not return generic questions.
`;

  const repairResult = await callAIWithFallback({
    assistantInstruction: repairInstruction,
    contextualPrompt: repairPrompt,
    normalizedHistory: [],
    history: [],
  });

  generated = extractJsonObjectFromText(repairResult.text);
  if (generated && normalizeAssessmentItems(generated.assessmentItems, generated.quiz)) {
    return generated;
  }

  const error = new Error("AI did not return valid material-based sectioned assessment items.");
  error.firstAIText = firstResult.text;
  error.repairAIText = repairResult.text;
  throw error;
}

function buildActivityFallback({
  courseId,
  courseName,
  courseCode,
  assignmentId,
  assignmentTitle,
  topic,
  score,
  materialTitles = [],
}) {
  const safeTopic = normalizeOptionalText(topic) || normalizeOptionalText(assignmentTitle) || 'the lesson';
  const safeCourseName = normalizeOptionalText(courseName) || 'your course';

  return {
    schemaVersion: GENERATED_ACTIVITY_SCHEMA_VERSION,
    courseId: normalizeOptionalText(courseId),
    courseName: safeCourseName,
    courseCode: normalizeOptionalText(courseCode) || '',
    assignmentId: normalizeOptionalText(assignmentId),
    assignmentTitle: normalizeOptionalText(assignmentTitle) || 'Assignment',
    topic: safeTopic,
    score: typeof score === 'number' ? score : null,
    recommendationType: 'review',
    difficulty: 'easy',
    estimatedMinutes: 15,
    basedOnMaterials: materialTitles,
    learningObjectives: [
      `Review the main idea of ${safeTopic}.`,
      'Identify where the mistake or confusion may have happened.',
      'Practice the skill again using a simpler example.',
    ],
    instructions:
      `Review ${safeTopic} from ${safeCourseName}. Start by writing the main idea in your own words, then solve one simple example related to the assignment.`,
    steps: [
      `Read or review the related material for ${safeTopic}.`,
      'Write down the part that is confusing.',
      'Answer the quick check question.',
      'Write a short explanation using your own words.',
    ],
    quiz: normalizeQuiz(null, safeTopic),
    shortAnswerPrompt: `Explain ${safeTopic} in your own words and give one example.`,
    tutorTip: 'Focus on understanding the process, not just getting the final answer.',
  };
}

function resolveStoragePathFromMaterial(material = {}) {
  const directPath = normalizeOptionalText(material.storagePath);
  if (directPath) return directPath;

  const bucketPath = normalizeOptionalText(material.bucketPath);
  if (bucketPath) {
    if (bucketPath.startsWith('gs://')) {
      const withoutScheme = bucketPath.replace(/^gs:\/\//, '');
      const firstSlash = withoutScheme.indexOf('/');
      return firstSlash >= 0 ? withoutScheme.slice(firstSlash + 1) : '';
    }
    return bucketPath;
  }

  const fileUrl = normalizeOptionalText(material.fileUrl || material.fileUri || material.downloadUrl);
  if (!fileUrl) return '';

  try {
    const decodedUrl = decodeURIComponent(fileUrl);
    const marker = '/o/';
    const markerIndex = decodedUrl.indexOf(marker);
    if (markerIndex >= 0) {
      const afterMarker = decodedUrl.slice(markerIndex + marker.length);
      return afterMarker.split('?')[0];
    }
  } catch {
    return '';
  }

  return '';
}

async function fetchFileTextFromUrl(fileUrl, mimeType = '', fileName = 'material') {
  if (!fileUrl) return '';

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) return '';

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extracted = await extractTextFromFile(buffer, mimeType, fileName);
    return limitText(extracted, 12000);
  } catch (error) {
    console.warn('Material URL extraction warning:', error?.message || error);
    return '';
  }
}

async function fetchFileTextFromStoragePath(storagePath, mimeType = '', fileName = 'material') {
  const normalizedStoragePath = normalizeOptionalText(storagePath);
  if (!normalizedStoragePath) return '';

  try {
    const [buffer] = await bucket.file(normalizedStoragePath).download();
    const extracted = await extractTextFromFile(buffer, mimeType, fileName);
    return limitText(extracted, 12000);
  } catch (error) {
    console.warn('Material storage extraction warning:', error?.message || error);
    return '';
  }
}

async function extractReadableTextFromMaterial(material = {}) {
  const contentText = limitText(material.content || material.description || '', 5000);
  const savedExtractedText = limitText(material.extractedText || material.fileText || '', 12000);

  const fileName = material.fileName || material.title || 'material';
  const mimeType = material.fileType || material.mimeType || '';
  const storagePath = resolveStoragePathFromMaterial(material);
  const fileUrl = material.fileUrl || material.fileUri || material.downloadUrl || null;

  let downloadedText = '';

  if (storagePath) {
    downloadedText = await fetchFileTextFromStoragePath(storagePath, mimeType, fileName);
  }

  if (!downloadedText && fileUrl) {
    downloadedText = await fetchFileTextFromUrl(fileUrl, mimeType, fileName);
  }

  const readableText = [contentText, savedExtractedText, downloadedText]
    .filter((item) => typeof item === 'string' && item.trim())
    .join('\n\n')
    .trim();

  return {
    readableText: limitText(readableText, 18000),
    extractionStatus: readableText ? 'readable' : 'unreadable',
    storagePath: storagePath || null,
    fileUrl: fileUrl || null,
  };
}

async function getAssignmentLearningContext({ assignmentId, classId }) {
  const assignmentRef = assignmentId
    ? db.collection('classAssignments').doc(String(assignmentId).trim())
    : null;

  const assignmentSnap = assignmentRef ? await assignmentRef.get() : null;
  const assignmentData = assignmentSnap?.exists ? assignmentSnap.data() || {} : {};

  const resolvedClassId =
    normalizeOptionalText(classId) || normalizeOptionalText(assignmentData.classId);

  const classSnap = resolvedClassId
    ? await db.collection('classes').doc(resolvedClassId).get()
    : null;

  const classData = classSnap?.exists ? classSnap.data() || {} : {};

  const materialIds = Array.isArray(assignmentData.materialIds)
    ? assignmentData.materialIds.filter(Boolean)
    : [];

  const materials = [];

  for (const materialId of materialIds.slice(0, 8)) {
    try {
      const materialSnap = await db.collection('classMaterials').doc(String(materialId)).get();
      if (!materialSnap.exists) continue;

      const material = materialSnap.data() || {};
      const extracted = await extractReadableTextFromMaterial(material);

      materials.push({
        id: materialSnap.id,
        title: material.title || material.fileName || 'Untitled Material',
        week: material.week || material.weekTopic || null,
        content: limitText(material.content || material.description || '', 5000),
        fileName: material.fileName || null,
        fileType: material.fileType || material.mimeType || null,
        fileUrl: extracted.fileUrl,
        storagePath: extracted.storagePath,
        extractedText: extracted.readableText,
        extractionStatus: extracted.extractionStatus,
      });
    } catch (error) {
      console.warn('Load related material warning:', error?.message || error);
    }
  }

  return {
    assignment: {
      id: assignmentSnap?.id || normalizeOptionalText(assignmentId),
      title: assignmentData.header || assignmentData.title || 'Assignment',
      instruction: assignmentData.instruction || '',
      dueDate: assignmentData.dueDate || null,
      totalScore: Number(assignmentData.totalScore || 0) || null,
      materialIds,
      raw: assignmentData,
    },
    classInfo: {
      id: resolvedClassId,
      name: classData.name || 'Class',
      courseCode: classData.courseCode || classData.classCode || '',
      section: classData.section || '',
      semester: classData.semester || '',
      schoolYear: classData.schoolYear || '',
      instructorName: classData.instructorName || 'Teacher',
      raw: classData,
    },
    materials,
  };
}

async function getRecentStudentActivities(studentId, limit = 8) {
  const normalizedStudentId = normalizeOptionalText(studentId);
  if (!normalizedStudentId) return [];

  const snapshot = await db
    .collection('studentActivities')
    .where('studentId', '==', normalizedStudentId)
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
    .sort((a, b) => {
      const aTime = resolveDate(a.updatedAt || a.completedAt || a.createdAt)?.getTime() || 0;
      const bTime = resolveDate(b.updatedAt || b.completedAt || b.createdAt)?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

async function getStudentLessonProgress(studentId, limit = 10) {
  const normalizedStudentId = normalizeOptionalText(studentId);
  if (!normalizedStudentId) return [];

  const snapshot = await db
    .collection('studentLessonProgress')
    .where('studentId', '==', normalizedStudentId)
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
    .sort((a, b) => {
      const priority = { needs_review: 3, improving: 2, mastered: 1 };
      const statusDiff = (priority[b.status] || 0) - (priority[a.status] || 0);
      if (statusDiff !== 0) return statusDiff;
      return (b.struggleCount || 0) - (a.struggleCount || 0);
    })
    .slice(0, limit);
}

async function upsertLessonProgress({
  studentId,
  courseId = null,
  courseName = null,
  courseCode = null,
  assignmentId = null,
  assignmentTitle = null,
  topic = null,
  score = null,
  status = null,
  source = 'system',
  notes = null,
}) {
  const normalizedStudentId = normalizeOptionalText(studentId);
  const normalizedTopic = normalizeOptionalText(topic) || normalizeOptionalText(assignmentTitle) || 'General Lesson';

  if (!normalizedStudentId || !normalizedTopic) return null;

  const lessonKey = normalizeLessonKey(`${courseId || courseName || 'course'}-${normalizedTopic}`);
  const docId = `${normalizedStudentId}_${lessonKey}`.slice(0, 220);
  const ref = db.collection('studentLessonProgress').doc(docId);
  const snap = await ref.get();

  const numericScore = typeof score === 'number' ? score : Number(score);
  const hasScore = Number.isFinite(numericScore);
  const resolvedStatus =
    normalizeOptionalText(status) ||
    (hasScore && numericScore >= PASSING_PERCENT ? 'improving' : 'needs_review');

  const payload = {
    studentId: normalizedStudentId,
    lessonKey,
    topic: normalizedTopic,
    courseId: normalizeOptionalText(courseId),
    courseName: normalizeOptionalText(courseName),
    courseCode: normalizeOptionalText(courseCode),
    assignmentId: normalizeOptionalText(assignmentId),
    assignmentTitle: normalizeOptionalText(assignmentTitle),
    lastScore: hasScore ? numericScore : null,
    status: resolvedStatus,
    source: normalizeOptionalText(source) || 'system',
    notes: normalizeOptionalText(notes),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!snap.exists) {
    await ref.set({
      ...payload,
      struggleCount: resolvedStatus === 'needs_review' ? 1 : 0,
      completedActivities: resolvedStatus === 'improving' ? 1 : 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.set(
      {
        ...payload,
        struggleCount:
          resolvedStatus === 'needs_review'
            ? FieldValue.increment(1)
            : FieldValue.increment(0),
        completedActivities:
          resolvedStatus === 'improving' || resolvedStatus === 'mastered'
            ? FieldValue.increment(1)
            : FieldValue.increment(0),
      },
      { merge: true }
    );
  }

  return ref.id;
}

function buildTutorProfileContext({ progress = [], activities = [], studentId = null }) {
  const weakLessons = progress
    .filter((item) => item.status === 'needs_review' || item.status === 'improving')
    .slice(0, 6)
    .map((item, index) =>
      `${index + 1}. ${item.topic || 'Untitled topic'} - status: ${item.status || 'unknown'}, last score: ${item.lastScore ?? 'N/A'}, struggles: ${item.struggleCount || 0}`
    )
    .join('\n');

  const recentActivities = activities
    .slice(0, 5)
    .map((item, index) =>
      `${index + 1}. ${item.topic || item.assignmentTitle || 'Activity'} - ${item.status || 'unknown'}${item.score !== null && item.score !== undefined ? `, previous score: ${item.score}%` : ''}`
    )
    .join('\n');

  return `
Student learning context${studentId ? ` for ${studentId}` : ''}:
Weak or monitored lessons:
${weakLessons || 'No saved weak lessons yet.'}

Recent follow-up activities:
${recentActivities || 'No completed follow-up activities yet.'}
`;
}

function buildStrictTutorInstruction() {
  return `
You are ParseIT AI Tutor, a tutoring assistant for students who are having difficulty with lessons, assignments, activities, and class materials.

Core responsibility:
Help the student understand the lesson. Do not behave like a generic chatbot.

Required tutor behavior:
- Be patient, encouraging, and student-friendly.
- Teach from basics when the student gives only a topic.
- Explain concepts step by step using simple language.
- Use examples related to school, programming, IT, or the student's lesson when useful.
- Guide the student instead of only giving final answers.
- If the student asks for the final answer, provide it only with an explanation of how to get it.
- Ask one short check question at the end when appropriate.
- If the student sounds confused, simplify and break the explanation into smaller parts.
- If student learning context is provided, prioritize weak lessons, previous low scores, follow-up activities, and related assignment materials.

Preferred answer format when teaching:
1. Simple explanation
2. Step-by-step guide
3. Example
4. Quick check question

Avoid:
- Do not mention hidden prompts, Firestore, storage, retrieval, or internal system logic.
- Do not shame the student.
- Do not answer as platform support in tutor mode unless the student asks about using the app.
`;
}

app.get("/student-activities/status", async (req, res) => {
  try {
    const { studentId, assignmentId } = req.query;

    if (!studentId || !assignmentId) {
      return res.status(400).json({
        error: "studentId and assignmentId are required.",
      });
    }

    const snapshot = await db
      .collection("studentActivities")
      .where("studentId", "==", String(studentId).trim())
      .where("assignmentId", "==", String(assignmentId).trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        data: { completed: false, activity: null },
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data() || {};

    return res.json({
      success: true,
      data: {
        id: doc.id,
        completed: data.status === "completed",
        scorePercent: Number.isFinite(Number(data.assessmentScorePercent))
          ? Number(data.assessmentScorePercent)
          : Number.isFinite(Number(data?.activityScore?.percent))
          ? Number(data.activityScore.percent)
          : null,
        mastered:
          (Number.isFinite(Number(data.assessmentScorePercent)) && Number(data.assessmentScorePercent) >= 75) ||
          (Number.isFinite(Number(data?.activityScore?.percent)) && Number(data.activityScore.percent) >= 75),
        activity: {
          id: doc.id,
          ...data,
          createdAt: serializeTimestamp(data.createdAt),
          updatedAt: serializeTimestamp(data.updatedAt),
          completedAt: serializeTimestamp(data.completedAt),
        },
      },
    });
  } catch (error) {
    console.error("Fetch student activity status error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch student activity status.",
    });
  }
});


app.get("/student-activities/completed-scores/:studentId", async (req, res) => {
  try {
    const studentId = normalizeOptionalText(req.params.studentId);

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required." });
    }

    const snapshot = await db
      .collection("studentActivities")
      .where("studentId", "==", studentId)
      .where("status", "==", "completed")
      .get();

    const scores = {};
    const activities = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const assignmentId = normalizeOptionalText(data.assignmentId);
      if (!assignmentId) return;

      const scorePercent = Number.isFinite(Number(data.assessmentScorePercent))
        ? Number(data.assessmentScorePercent)
        : Number.isFinite(Number(data?.activityScore?.percent))
        ? Number(data.activityScore.percent)
        : null;

      scores[assignmentId] = {
        activityId: doc.id,
        assignmentId,
        courseId: data.courseId || null,
        topic: data.topic || data.assignmentTitle || null,
        scorePercent,
        completed: data.status === "completed",
        mastered: scorePercent !== null && scorePercent >= 75,
        completedAt: serializeTimestamp(data.completedAt),
      };

      activities.push({
        id: doc.id,
        ...scores[assignmentId],
      });
    });

    return res.json({
      success: true,
      data: {
        scores,
        activities,
      },
    });
  } catch (error) {
    console.error("Fetch completed activity scores error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch completed activity scores.",
    });
  }
});

app.get("/student-activities/tutor-suggestions/:studentId", async (req, res) => {
  try {
    const studentId = normalizeOptionalText(req.params.studentId);

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required." });
    }

    const suggestionsMap = new Map();

    const addSuggestion = (suggestion) => {
      if (!suggestion) return;

      const assignmentId = normalizeOptionalText(suggestion.assignmentId);
      const topic = normalizeOptionalText(suggestion.topic);
      const key =
        assignmentId ||
        `${normalizeOptionalText(suggestion.courseId) || "course"}-${normalizeLessonKey(topic || suggestion.assignmentTitle || "lesson")}`;

      if (!key) return;

      const existing = suggestionsMap.get(key);

      if (!existing) {
        suggestionsMap.set(key, suggestion);
        return;
      }

      const existingScore =
        Number.isFinite(Number(existing.lastScore)) ? Number(existing.lastScore) : 999;
      const nextScore =
        Number.isFinite(Number(suggestion.lastScore)) ? Number(suggestion.lastScore) : 999;

      if (nextScore < existingScore) {
        suggestionsMap.set(key, {
          ...existing,
          ...suggestion,
        });
      }
    };

    const completedActivitiesSnapshot = await db
      .collection("studentActivities")
      .where("studentId", "==", studentId)
      .where("status", "==", "completed")
      .get();

    const masteredAssignmentIds = new Set();

    completedActivitiesSnapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const assignmentId = normalizeOptionalText(data.assignmentId);

      const scorePercent = Number.isFinite(Number(data.assessmentScorePercent))
        ? Number(data.assessmentScorePercent)
        : Number.isFinite(Number(data?.activityScore?.percent))
        ? Number(data.activityScore.percent)
        : null;

      if (assignmentId && scorePercent !== null && scorePercent >= PASSING_PERCENT) {
        masteredAssignmentIds.add(assignmentId);
      }
    });

    const progressSnapshot = await db
      .collection("studentLessonProgress")
      .where("studentId", "==", studentId)
      .limit(50)
      .get();

    progressSnapshot.docs.forEach((doc) => {
      const item = doc.data() || {};
      const assignmentId = normalizeOptionalText(item.assignmentId);
      const lastScore = Number.isFinite(Number(item.lastScore))
        ? Number(item.lastScore)
        : null;

      if (assignmentId && masteredAssignmentIds.has(assignmentId)) {
        return;
      }

      if (
        item.status !== "needs_review" &&
        item.status !== "improving" &&
        !(lastScore !== null && lastScore < PASSING_PERCENT)
      ) {
        return;
      }

      const topic =
        normalizeOptionalText(item.materialTitle) ||
        normalizeOptionalText(item.relatedMaterialTitle) ||
        normalizeOptionalText(item.topic) ||
        normalizeOptionalText(item.assignmentTitle) ||
        "this lesson";

      addSuggestion({
        id: doc.id,
        source: "lesson-progress",
        courseId: item.courseId || null,
        assignmentId: assignmentId || null,
        topic,
        materialTitle:
          normalizeOptionalText(item.materialTitle) ||
          normalizeOptionalText(item.relatedMaterialTitle) ||
          topic,
        courseName: item.courseName || null,
        courseCode: item.courseCode || null,
        assignmentTitle: item.assignmentTitle || null,
        lastScore,
        status: item.status || "needs_review",
        text: `Help me understand ${topic} step by step.`,
      });
    });

    const membershipSnapshot = await db
      .collection("classMembers")
      .where("userId", "==", studentId)
      .where("role", "==", "student")
      .where("status", "==", "active")
      .get();

    const submissionsSnapshot = await db
      .collection("classSubmissions")
      .where("studentId", "==", studentId)
      .get();

    const submissionsByAssignmentId = new Map();

    submissionsSnapshot.docs.forEach((doc) => {
      const submission = {
        id: doc.id,
        ...(doc.data() || {}),
      };

      const assignmentId = normalizeOptionalText(submission.assignmentId);
      if (assignmentId) {
        submissionsByAssignmentId.set(assignmentId, submission);
      }
    });

    const classIds = [
      ...new Set(
        membershipSnapshot.docs
          .map((doc) => normalizeOptionalText(doc.data()?.classId))
          .filter(Boolean)
      ),
    ];

    for (const classId of classIds) {
      const [classSnap, materialsSnapshot, assignmentsSnapshot] = await Promise.all([
        db.collection("classes").doc(classId).get(),
        db.collection("classMaterials").where("classId", "==", classId).get(),
        db.collection("classAssignments").where("classId", "==", classId).get(),
      ]);

      const classData = classSnap.exists ? classSnap.data() || {} : {};
      const materialsById = new Map();

      materialsSnapshot.docs.forEach((doc) => {
        const material = doc.data() || {};
        materialsById.set(doc.id, {
          id: doc.id,
          title: normalizeOptionalText(material.title) || "Untitled Material",
          fileName: normalizeOptionalText(material.fileName),
          fileType: normalizeOptionalText(material.fileType),
        });
      });

      assignmentsSnapshot.docs.forEach((doc) => {
        const assignment = doc.data() || {};
        const assignmentId = doc.id;

        if (masteredAssignmentIds.has(assignmentId)) {
          return;
        }

        const submission = submissionsByAssignmentId.get(assignmentId);

        if (!submission || submission.status !== "graded") {
          return;
        }

        const totalScore =
          typeof assignment.totalScore === "number"
            ? assignment.totalScore
            : Number(assignment.totalScore) || 100;

        const scorePercent = getPercentFromScore(submission.score, totalScore);

        if (scorePercent === null || scorePercent >= PASSING_PERCENT) {
          return;
        }

        const materialIds = Array.isArray(assignment.materialIds)
          ? assignment.materialIds
          : [];

        if (materialIds.length === 0) {
          return;
        }

        const relatedMaterials = materialIds
          .map((materialId) => materialsById.get(materialId))
          .filter(Boolean);

        if (relatedMaterials.length === 0) {
          return;
        }

        const materialTitle = relatedMaterials
          .map((material) => material.title)
          .filter(Boolean)
          .join(", ");

        const assignmentTitle =
          normalizeOptionalText(assignment.header) ||
          normalizeOptionalText(assignment.title) ||
          "Assignment";

        const topic = materialTitle || assignmentTitle;

        addSuggestion({
          id: `assignment-${assignmentId}`,
          source: "graded-assignment",
          courseId: classId,
          assignmentId,
          topic,
          materialTitle: topic,
          courseName: classData.name || null,
          courseCode: classData.courseCode || classData.classCode || null,
          assignmentTitle,
          lastScore: scorePercent,
          status: "needs_review",
          relatedMaterials,
          text: `Help me understand ${topic} step by step. I scored ${scorePercent}% on ${assignmentTitle}, so please tutor me using the related material.`,
        });
      });
    }

    const suggestions = Array.from(suggestionsMap.values())
      .filter((item) => item.status === "needs_review" || (item.lastScore !== null && item.lastScore < PASSING_PERCENT))
      .sort((a, b) => (a.lastScore ?? 100) - (b.lastScore ?? 100))
      .slice(0, 8);

    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("Fetch tutor suggestions error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch tutor suggestions.",
    });
  }
});

app.get("/student-activities/weak-lessons/:studentId", async (req, res) => {
  try {
    const studentId = normalizeOptionalText(req.params.studentId);

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required." });
    }

    const progress = await getStudentLessonProgress(studentId, 20);

    return res.json({
      success: true,
      data: progress.map((item) => ({
        ...item,
        createdAt: serializeTimestamp(item.createdAt),
        updatedAt: serializeTimestamp(item.updatedAt),
      })),
    });
  } catch (error) {
    console.error("Fetch weak lessons error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch weak lessons.",
    });
  }
});

app.post("/student-activities/notify-ready", async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      assignmentId,
      courseName,
      assignmentTitle,
      topic,
      recommendationType,
      score,
    } = req.body;

    if (!studentId || !assignmentId) {
      return res.status(400).json({ error: "studentId and assignmentId are required." });
    }

    await upsertLessonProgress({
      studentId,
      courseId,
      courseName,
      assignmentId,
      assignmentTitle,
      topic,
      score,
      status: "needs_review",
      source: "activity-ready",
      notes: "Follow-up activity was recommended.",
    });

    const existingSnapshot = await db
      .collection("notifications")
      .where("userId", "==", String(studentId).trim())
      .where("role", "==", "student")
      .where("relatedId", "==", String(assignmentId).trim())
      .where("relatedType", "==", "generated-activity")
      .limit(1)
      .get();

    if (existingSnapshot.empty) {
      await createNotification({
        userId: String(studentId).trim(),
        role: "student",
        type: "support-activity",
        title: "Support Activity Ready",
        message: `A ${recommendationType || "follow-up"} activity is ready for ${assignmentTitle || topic || "your assignment"}${courseName ? ` in ${courseName}` : ""}.`,
        relatedId: String(assignmentId).trim(),
        relatedType: "generated-activity",
        classId: normalizeOptionalText(courseId),
      });
    }

    return res.json({ success: true, message: "Activity ready notification processed." });
  } catch (error) {
    console.error("Notify ready activity error:", error);
    return res.status(500).json({ error: error.message || "Failed to process activity ready notification." });
  }
});

app.post("/student-activities/generate", async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      classId,
      courseName,
      courseCode,
      assignmentId,
      assignmentTitle,
      topic,
      score,
      submissionId,
    } = req.body || {};

    if (!studentId || !assignmentId) {
      return res.status(400).json({
        error: "studentId and assignmentId are required.",
      });
    }

    const context = await getAssignmentLearningContext({
      assignmentId,
      classId: classId || courseId,
    });

    let resolvedScore = typeof score === "number" ? score : Number(score);
    if (!Number.isFinite(resolvedScore)) resolvedScore = null;

    if (resolvedScore === null && submissionId) {
      const submissionSnap = await db.collection("classSubmissions").doc(String(submissionId)).get();
      const submissionData = submissionSnap.exists ? submissionSnap.data() || {} : {};
      const totalScore = Number(context.assignment.totalScore || 0);
      const rawScore = Number(submissionData.score);
      if (Number.isFinite(rawScore) && totalScore > 0) {
        resolvedScore = Math.round((rawScore / totalScore) * 100);
      }
    }

    const materialTitles = context.materials.map((item) => item.title).filter(Boolean);
    const readableMaterials = context.materials.filter((material) =>
      normalizeOptionalText(material.extractedText || material.content)
    );

    if (!context.materials.length) {
      return res.status(400).json({
        error: "No related materials found. The teacher must select related materials before AI can generate a follow-up activity.",
      });
    }

    if (!readableMaterials.length) {
      return res.status(422).json({
        error: "No readable content found in the selected related material files. Please upload PDF, DOCX, TXT, MD, CSV, JSON, or material text content, then try again.",
        materialExtractionStatus: context.materials.map((material) => ({
          id: material.id,
          title: material.title,
          fileName: material.fileName,
          fileType: material.fileType,
          status: material.extractionStatus || "unreadable",
        })),
      });
    }

    const materialContext = readableMaterials
      .map((material, index) => `
Material ${index + 1}: ${material.title}
Week / Related Material Topic: ${material.week || material.title || "N/A"}
File name: ${material.fileName || "N/A"}
Content extracted from the teacher-selected related material:
${limitText([material.content, material.extractedText].filter(Boolean).join("\n\n"), 12000)}
`)
      .join("\n---\n");

    let generated;

    try {
      generated = await generateMaterialBasedActivityWithAI({
        studentId,
        resolvedScore,
        courseName: courseName || context.classInfo.name,
        courseCode: courseCode || context.classInfo.courseCode,
        assignmentTitle: assignmentTitle || context.assignment.title,
        assignmentInstruction: context.assignment.instruction,
        materialTitles,
        materialContext,
      });
    } catch (aiError) {
      console.error("Material-based AI activity generation failed:", aiError?.message || aiError);
      return res.status(502).json({
        error: "AI failed to generate a valid quiz from the related material content. Please try again.",
        details: aiError?.message || "Invalid AI output",
        materialExtractionStatus: context.materials.map((material) => ({
          id: material.id,
          title: material.title,
          fileName: material.fileName,
          fileType: material.fileType,
          status: material.extractionStatus || "unknown",
        })),
      });
    }

    const activity = normalizeGeneratedActivityFromAI({
      generated,
      readableMaterials,
      materialTitles,
      resolvedScore,
      courseId,
      courseName,
      courseCode,
      assignmentId,
      assignmentTitle,
      topic,
      context,
    });

    if (!activity?.quiz) {
      return res.status(502).json({
        error: "AI did not return a valid material-based quiz. Please try again.",
      });
    }

    const existingSnapshot = await db
      .collection("studentActivities")
      .where("studentId", "==", String(studentId).trim())
      .where("assignmentId", "==", String(assignmentId).trim())
      .limit(1)
      .get();

    let activityRef;
    const payload = {
      ...activity,
      studentId: String(studentId).trim(),
      status: "generated",
      generatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (existingSnapshot.empty) {
      activityRef = await db.collection("studentActivities").add({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      activityRef = existingSnapshot.docs[0].ref;
      await activityRef.set(payload, { merge: true });
    }

    await upsertLessonProgress({
      studentId,
      courseId: activity.courseId,
      courseName: activity.courseName,
      courseCode: activity.courseCode,
      assignmentId: activity.assignmentId,
      assignmentTitle: activity.assignmentTitle,
      topic: activity.topic,
      score: resolvedScore,
      status: "needs_review",
      source: "generated-activity",
      notes: "AI generated a follow-up activity from readable teacher-selected related material content.",
    });

    await createNotification({
      userId: String(studentId).trim(),
      role: "student",
      type: "support-activity",
      title: "Support Activity Ready",
      message: `A follow-up activity is ready for ${activity.assignmentTitle || activity.topic || "your assignment"}.`,
      relatedId: String(assignmentId).trim(),
      relatedType: "generated-activity",
      classId: normalizeOptionalText(activity.courseId),
    });

    return res.json({
      success: true,
      message: "Follow-up activity generated successfully from related material content.",
      data: {
        id: activityRef.id,
        ...activity,
      },
    });
  } catch (error) {
    console.error("Generate student activity error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate student activity.",
    });
  }
});


app.post("/student-activities/check-identification-answer", async (req, res) => {
  try {
    const {
      studentAnswer,
      correctAnswers,
      question,
      explanation,
      topic,
      basedOnMaterials,
    } = req.body || {};

    const cleanCorrectAnswers = Array.isArray(correctAnswers)
      ? correctAnswers.map((item) => normalizeOptionalText(String(item || ""))).filter(Boolean)
      : [];

    if (!normalizeOptionalText(studentAnswer)) {
      return res.status(400).json({
        error: "studentAnswer is required.",
      });
    }

    if (!cleanCorrectAnswers.length) {
      return res.status(400).json({
        error: "correctAnswers are required.",
      });
    }

    const evaluation = await evaluateIdentificationAnswerWithAI({
      studentAnswer,
      correctAnswers: cleanCorrectAnswers,
      question,
      explanation,
      topic,
      basedOnMaterials,
    });

    return res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("Check identification answer error:", error);
    return res.status(500).json({
      error: error.message || "Failed to check identification answer.",
    });
  }
});

app.post("/student-activities/complete", async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      assignmentId,
      courseName,
      courseCode,
      assignmentTitle,
      topic,
      recommendationType,
      difficulty,
      score,
      instructions,
      basedOnMaterials,
      quiz,
      assessmentItems,
      activityItems,
      activityResults,
      activityScore,
      sectionScores,
      assessmentAnswers,
      assessmentScorePercent,
      tutorTip,
    } = req.body;

    if (!studentId || !assignmentId) {
      return res.status(400).json({
        error: "studentId and assignmentId are required.",
      });
    }

    const normalizedStudentId = String(studentId).trim();
    const normalizedAssignmentId = String(assignmentId).trim();
    const normalizedCourseId = normalizeOptionalText(courseId);

    const normalizedItems = Array.isArray(activityItems)
      ? activityItems
      : Array.isArray(assessmentItems)
      ? assessmentItems
      : [];

    const normalizedResults = Array.isArray(activityResults) ? activityResults : [];
    const scoreObject =
      activityScore && typeof activityScore === "object"
        ? activityScore
        : {
            correct: normalizedResults.filter((item) => item?.correct === true).length,
            total: normalizedResults.length,
            percent: Number.isFinite(Number(assessmentScorePercent))
              ? Number(assessmentScorePercent)
              : normalizedResults.length
              ? Math.round(
                  (normalizedResults.filter((item) => item?.correct === true).length /
                    normalizedResults.length) *
                    100
                )
              : null,
          };

    const scorePercent = Number.isFinite(Number(scoreObject?.percent))
      ? Number(scoreObject.percent)
      : Number.isFinite(Number(assessmentScorePercent))
      ? Number(assessmentScorePercent)
      : null;

    const normalizedQuiz = normalizeQuiz(quiz, topic || assignmentTitle || "the lesson");

    const existingSnapshot = await db
      .collection("studentActivities")
      .where("studentId", "==", normalizedStudentId)
      .where("assignmentId", "==", normalizedAssignmentId)
      .limit(1)
      .get();

    const activityPayload = {
      studentId: normalizedStudentId,
      courseId: normalizedCourseId,
      assignmentId: normalizedAssignmentId,
      courseName: normalizeOptionalText(courseName),
      courseCode: normalizeOptionalText(courseCode),
      assignmentTitle: normalizeOptionalText(assignmentTitle),
      topic: normalizeOptionalText(topic),
      recommendationType: normalizeOptionalText(recommendationType),
      difficulty: normalizeOptionalText(difficulty),
      previousAssignmentScore:
        typeof score === "number" ? score : Number.isFinite(Number(score)) ? Number(score) : null,
      instructions: normalizeOptionalText(instructions),
      basedOnMaterials: Array.isArray(basedOnMaterials) ? basedOnMaterials : [],
      quiz: normalizedQuiz,
      assessmentItems: normalizedItems,
      activityItems: normalizedItems,
      activityResults: normalizedResults,
      activityScore: scoreObject,
      sectionScores: sectionScores && typeof sectionScores === "object" ? sectionScores : null,
      assessmentAnswers: assessmentAnswers && typeof assessmentAnswers === "object" ? assessmentAnswers : {},
      assessmentScorePercent: scorePercent,
      tutorTip: normalizeOptionalText(tutorTip),
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let activityRef;

    if (existingSnapshot.empty) {
      activityRef = await db.collection("studentActivities").add({
        ...activityPayload,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      activityRef = existingSnapshot.docs[0].ref;
      await activityRef.set(activityPayload, { merge: true });
    }

    const progressStatus =
      scorePercent === null
        ? "improving"
        : scorePercent < 75
        ? "needs_review"
        : "mastered";

    await upsertLessonProgress({
      studentId: normalizedStudentId,
      courseId: normalizedCourseId,
      courseName,
      courseCode,
      assignmentId: normalizedAssignmentId,
      assignmentTitle,
      topic,
      score: scorePercent,
      status: progressStatus,
      source: "activity-completed",
      notes:
        scorePercent === null
          ? "Student completed the generated follow-up activity."
          : `Student completed the generated follow-up activity with ${scorePercent}%.`,
    });

    await createNotification({
      userId: normalizedStudentId,
      role: "student",
      type: "support-activity",
      title: "Activity Completed",
      message: `${assignmentTitle || topic || "Your activity"} has been marked as done. Score: ${
        scorePercent === null ? "N/A" : `${scorePercent}%`
      }.`,
      relatedId: normalizedAssignmentId,
      relatedType: "student-activity",
      classId: normalizedCourseId,
    });

    if (normalizedCourseId) {
      const classSnap = await db.collection("classes").doc(normalizedCourseId).get();
      const classData = classSnap.exists ? classSnap.data() || {} : {};
      const teacherId = normalizeOptionalText(classData.assignedTeacherId);

      if (teacherId) {
        await createNotification({
          userId: teacherId,
          role: "teacher",
          type: "support-activity",
          title: "Follow-up Activity Completed",
          message: `${normalizedStudentId} completed ${
            assignmentTitle || topic || "a generated follow-up activity"
          } with score ${scorePercent === null ? "N/A" : `${scorePercent}%`}.`,
          relatedId: activityRef.id,
          relatedType: "student-activity",
          classId: normalizedCourseId,
          actorId: normalizedStudentId,
          actorRole: "student",
          actorName: normalizedStudentId,
        });
      }
    }

    return res.json({
      success: true,
      message: "Student activity score saved successfully.",
      data: {
        id: activityRef.id,
        score: scoreObject,
        progressStatus,
      },
    });
  } catch (error) {
    console.error("Complete student activity error:", error);
    return res.status(500).json({
      error: error.message || "Failed to complete student activity.",
    });
  }
});


app.get("/teacher-support-activities/:teacherId", async (req, res) => {
  try {
    const teacherId = normalizeOptionalText(req.params.teacherId);

    if (!teacherId) {
      return res.status(400).json({ error: "teacherId is required." });
    }

    const classQueries = await Promise.all([
      db.collection("classes").where("assignedTeacherId", "==", teacherId).get(),
      db.collection("classes").where("assignedTeacherUid", "==", teacherId).get(),
      db.collection("classes").where("instructorEmail", "==", teacherId).get(),
      db.collection("classes").where("createdByUid", "==", teacherId).get(),
    ]);

    const classIds = Array.from(
      new Set(
        classQueries.flatMap((snapshot) => snapshot.docs.map((doc) => doc.id))
      )
    );

    const activities = [];

    for (const classId of classIds) {
      const snap = await db
        .collection("studentActivities")
        .where("courseId", "==", classId)
        .where("status", "==", "completed")
        .get();

      snap.docs.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...(doc.data() || {}),
        });
      });
    }

    const totalCompleted = activities.length;
    const scoredActivities = activities.filter((item) =>
      Number.isFinite(Number(item.assessmentScorePercent))
    );
    const averageScore = scoredActivities.length
      ? Math.round(
          scoredActivities.reduce(
            (sum, item) => sum + Number(item.assessmentScorePercent || 0),
            0
          ) / scoredActivities.length
        )
      : 0;

    const needsReviewCount = activities.filter(
      (item) => Number(item.assessmentScorePercent) < 75
    ).length;

    return res.json({
      success: true,
      data: {
        totalCompleted,
        averageScore,
        needsReviewCount,
        activities: activities
          .sort((a, b) => {
            const aTime = resolveDate(a.completedAt)?.getTime?.() || 0;
            const bTime = resolveDate(b.completedAt)?.getTime?.() || 0;
            return bTime - aTime;
          })
          .slice(0, 100),
      },
    });
  } catch (error) {
    console.error("Teacher support activity analytics error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load teacher support activity analytics.",
    });
  }
});

app.get("/youtube/videos", async (req, res) => {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({
        error: "YOUTUBE_API_KEY is not configured.",
      });
    }

    const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
    const query = buildYouTubeLearningQuery(rawQuery);
    const pageToken = typeof req.query.pageToken === "string" ? req.query.pageToken : "";
    const maxResults = Math.min(Math.max(Number(req.query.maxResults) || 12, 1), 20);

    const searchParams = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      type: "video",
      maxResults: String(maxResults),
      q: query,
      safeSearch: "moderate",
      videoEmbeddable: "true",
      relevanceLanguage: "en",
      order: rawQuery ? "relevance" : "viewCount",
    });

    if (pageToken) {
      searchParams.set("pageToken", pageToken);
    }

    const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`);
    const searchData = await searchResponse.json().catch(() => ({}));

    if (!searchResponse.ok) {
      return res.status(searchResponse.status).json({
        error: searchData?.error?.message || "Failed to search YouTube videos.",
      });
    }

    const ids = Array.isArray(searchData?.items)
      ? searchData.items
          .map((item) => item?.id?.videoId)
          .filter(Boolean)
      : [];

    let statsById = {};

    if (ids.length) {
      const videoParams = new URLSearchParams({
        key: process.env.YOUTUBE_API_KEY,
        part: "statistics,contentDetails",
        id: ids.join(","),
      });

      const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${videoParams.toString()}`);
      const videoData = await videoResponse.json().catch(() => ({}));

      if (videoResponse.ok && Array.isArray(videoData?.items)) {
        statsById = Object.fromEntries(
          videoData.items.map((item) => [item.id, item])
        );
      }
    }

    const videos = (searchData?.items || []).map((item) => {
      const videoId = item?.id?.videoId;
      const snippet = item?.snippet || {};
      const stats = statsById[videoId] || {};
      const thumbnail =
        snippet?.thumbnails?.high?.url ||
        snippet?.thumbnails?.medium?.url ||
        snippet?.thumbnails?.default?.url ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      return {
        id: videoId,
        title: snippet?.title || "Untitled video",
        description: snippet?.description || "",
        channel: snippet?.channelTitle || "YouTube",
        publishedAt: snippet?.publishedAt || null,
        uploadedAt: mapYouTubePublishedLabel(snippet?.publishedAt),
        thumbnail,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        views: formatYouTubeViewCount(stats?.statistics?.viewCount),
        viewCount: Number(stats?.statistics?.viewCount || 0),
      };
    });

    return res.json({
      success: true,
      data: videos,
      pageInfo: searchData?.pageInfo || null,
      nextPageToken: searchData?.nextPageToken || null,
      prevPageToken: searchData?.prevPageToken || null,
      query,
    });
  } catch (error) {
    console.error("YouTube videos fetch error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load YouTube videos.",
    });
  }
});



/**
 * HONOR ROLL ROUTE
 * Rule:
 * - Teacher inputs startYear only, e.g. 2025.
 * - System builds school year automatically: S.Y 2025 - 2026.
 * - Student must be enrolled in at least 18 units for that school year + semester.
 * - Student must have a submitted final grade for every enrolled class in that term.
 * - Student must NOT have any final grade of 2.6 or above.
 */
app.get("/honor-roll", async (req, res) => {
  try {
    const rawStartYear = normalizeOptionalText(req.query.startYear);
    const rawSemester = normalizeOptionalText(req.query.semester);

    if (!rawStartYear || !rawSemester) {
      return res.status(400).json({
        error: "startYear and semester are required.",
      });
    }

    const startYear = Number(String(rawStartYear).replace(/[^0-9]/g, "").slice(0, 4));

    if (!Number.isInteger(startYear) || String(startYear).length !== 4) {
      return res.status(400).json({
        error: "startYear must be a valid 4-digit year. Example: 2025",
      });
    }

    const endYear = startYear + 1;
    const schoolYear = `S.Y ${startYear} - ${endYear}`;

    const normalizeSchoolYearKey = (value = "") =>
      String(value || "").replace(/[^0-9]/g, "");

    const normalizeSemesterKey = (value = "") => {
      const text = String(value || "").toLowerCase().trim();

      if (text.includes("first") || text.includes("1st")) return "first";
      if (text.includes("second") || text.includes("2nd")) return "second";

      return text;
    };

    const expectedSchoolYearKey = `${startYear}${endYear}`;
    const expectedSemesterKey = normalizeSemesterKey(rawSemester);

    const classesSnapshot = await db.collection("classes").get();

    const matchedClasses = classesSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() || {}),
      }))
      .filter((classData) => {
        return (
          normalizeSchoolYearKey(classData.schoolYear) === expectedSchoolYearKey &&
          normalizeSemesterKey(classData.semester) === expectedSemesterKey &&
          classData.status !== "archived"
        );
      });

    if (!matchedClasses.length) {
      return res.json({
        success: true,
        schoolYear,
        semester: rawSemester,
        data: [],
      });
    }

    const studentsMap = new Map();

    for (const classData of matchedClasses) {
      const classId = classData.id;
      const classUnits =
        typeof classData.units === "number"
          ? classData.units
          : Number(classData.units) || 0;

      const gradesSnapshot = await db
        .collection("finalGrades")
        .where("classId", "==", classId)
        .get();

      for (const gradeDoc of gradesSnapshot.docs) {
        const gradeData = gradeDoc.data() || {};
        const studentId = normalizeOptionalText(gradeData.studentId);

        if (!studentId) continue;

        const finalGrade =
          gradeData?.finalGrade !== undefined && gradeData?.finalGrade !== null
            ? Number(gradeData.finalGrade)
            : null;

        let studentProfile = null;

        try {
          const studentSnap = await db.collection("students").doc(studentId).get();
          if (studentSnap.exists) {
            studentProfile = studentSnap.data() || null;
          }
        } catch (studentLookupError) {
          console.warn(
            "Honor roll student lookup warning:",
            studentLookupError?.message || studentLookupError
          );
        }

        const profileName = studentProfile
          ? `${studentProfile.firstName || ""} ${studentProfile.lastName || ""}`.trim()
          : "";

        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            id: studentId,
            name:
              normalizeOptionalText(gradeData.studentName) ||
              normalizeOptionalText(profileName) ||
              normalizeOptionalText(studentProfile?.name) ||
              studentId,
            section:
              normalizeOptionalText(gradeData.section) ||
              normalizeOptionalText(studentProfile?.section) ||
              normalizeOptionalText(classData.section) ||
              "No Section",
            yearLevel:
              normalizeOptionalText(gradeData.yearLevel) ||
              normalizeOptionalText(studentProfile?.yearLevel) ||
              normalizeOptionalText(studentProfile?.year) ||
              normalizeOptionalText(classData.year) ||
              "No Year Level",
            totalUnits: 0,
            courses: [],
          });
        }

        const student = studentsMap.get(studentId);

        student.totalUnits += classUnits;
        student.courses.push({
          classId,
          courseCode: normalizeOptionalText(classData.courseCode) || "",
          courseName: normalizeOptionalText(classData.name) || "Untitled Class",
          section: normalizeOptionalText(classData.section) || "No Section",
          yearLevel: normalizeOptionalText(classData.year) || "No Year Level",
          units: classUnits,
          grade: finalGrade,
          hasFinalGrade: Number.isFinite(finalGrade),
        });
      }
    }

    const qualifiedStudents = [];

    for (const student of studentsMap.values()) {
      const hasEnoughUnits = student.totalUnits >= 18;
      const hasAtLeastOneCourse = student.courses.length > 0;
      const hasCompleteFinalGrades = student.courses.every((course) => course.hasFinalGrade);
      const hasNoGrade26Above = student.courses.every(
        (course) => Number(course.grade) < 2.6
      );

      if (
        !hasEnoughUnits ||
        !hasAtLeastOneCourse ||
        !hasCompleteFinalGrades ||
        !hasNoGrade26Above
      ) {
        continue;
      }

      const weightedGradeTotal = student.courses.reduce(
        (sum, course) => sum + Number(course.grade) * Number(course.units || 0),
        0
      );

      const gwa =
        student.totalUnits > 0 ? weightedGradeTotal / student.totalUnits : 0;

      qualifiedStudents.push({
        id: student.id,
        name: student.name,
        unit: String(student.totalUnits),
        gpa: gwa.toFixed(3),
        section: student.section,
        yearLevel: student.yearLevel,
        grades: student.courses.map((course) => ({
          classId: course.classId,
          courseCode: course.courseCode,
          courseName: course.courseName,
          units: course.units,
          grade: course.grade,
        })),
      });
    }

    const groupedMap = {};

    qualifiedStudents.forEach((student) => {
      const key = `${student.yearLevel}-${student.section}`;

      if (!groupedMap[key]) {
        groupedMap[key] = {
          yearLevel: student.yearLevel,
          sectionName: student.section,
          students: [],
        };
      }

      groupedMap[key].students.push(student);
    });

    Object.values(groupedMap).forEach((section) => {
      section.students.sort((a, b) => {
        const gwaCompare = Number(a.gpa) - Number(b.gpa);
        if (gwaCompare !== 0) return gwaCompare;
        return String(a.name).localeCompare(String(b.name));
      });
    });

    const orderedYearLevels = [
      "First Year",
      "Second Year",
      "Third Year",
      "Fourth Year",
      "1st Year",
      "2nd Year",
      "3rd Year",
      "4th Year",
    ];

    const data = Object.values(groupedMap).sort((a, b) => {
      const aIndex = orderedYearLevels.indexOf(a.yearLevel);
      const bIndex = orderedYearLevels.indexOf(b.yearLevel);

      const yearCompare =
        (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);

      if (yearCompare !== 0) return yearCompare;

      return String(a.sectionName).localeCompare(String(b.sectionName));
    });

    return res.json({
      success: true,
      schoolYear,
      semester: rawSemester,
      data,
    });
  } catch (error) {
    console.error("Honor roll error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate honor roll.",
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

      "GET /notifications",
      "PATCH /notifications/:id/read",
      "PATCH /notifications/read-all",
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

app.post("/assistant/upload-file", async (req, res) => {
  try {
    const { fileBase64, fileName, fileType } = req.body || {};

    if (!fileBase64) {
      return res.status(400).json({ error: "fileBase64 is required." });
    }

    const uploadedFile = await uploadAssistantFileToStorage({
      fileBase64,
      fileMimeType: fileType,
      fileName,
    });

    const docRef = await db.collection("assistantUploads").add({
      fileName: uploadedFile.fileName,
      storagePath: uploadedFile.storagePath,
      downloadURL: uploadedFile.fileUrl,
      mimeType: uploadedFile.fileType,
      bucketPath: uploadedFile.bucketPath,
      mode: "assistant",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Assistant file uploaded successfully.",
      data: {
        id: docRef.id,
        ...uploadedFile,
      },
    });
  } catch (error) {
    console.error("Assistant upload file error:", error);
    return res.status(500).json({
      error: error.message || "Failed to upload assistant file.",
    });
  }
});
function normalizeChatText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeKeywordOnly(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return false;

  const normalized = normalizeChatText(raw);
  if (!normalized) return false;

  const words = normalized.split(" ").filter(Boolean);

  if (
    /[?.!]/.test(raw) ||
    /^(what|who|when|where|why|how|can|could|is|are|do|does|did|explain|tell|define)\b/i.test(raw)
  ) {
    return false;
  }

  return words.length <= 4;
}

function expandKeywordPrompt(value = "", mode = "assistant") {
  const raw = String(value || "").trim();
  if (!raw) return raw;

  if (
    /[?.!]/.test(raw) ||
    /^(what|who|when|where|why|how|can|could|is|are|do|does|did|explain|tell|define)\b/i.test(raw)
  ) {
    return raw;
  }

  if (looksLikeKeywordOnly(raw)) {
    return mode === "tutor"
      ? `Teach me about ${raw} step by step.`
      : `What is ${raw}?`;
  }

  return raw;
}

function scoreTriggerMatch(message, trigger) {
  const normalizedMessage = normalizeChatText(message);
  const normalizedTrigger = normalizeChatText(trigger);

  if (!normalizedMessage || !normalizedTrigger) return 0;

  if (normalizedMessage === normalizedTrigger) return 100;
  if (normalizedMessage.includes(normalizedTrigger)) return 80;

  const triggerWords = normalizedTrigger.split(" ").filter(Boolean);
  if (!triggerWords.length) return 0;

  const matchedWords = triggerWords.filter((word) =>
    normalizedMessage.includes(word)
  );

  const ratio = matchedWords.length / triggerWords.length;

  if (ratio === 1) return 60;
  if (ratio >= 0.75) return 45;
  if (ratio >= 0.5) return 30;
  if (ratio >= 0.34) return 15;

  return 0;
}

async function findMatchingChatbotTraining(message, limit = 5) {
  const snapshot = await db.collection("chatbotTraining").get();
  const normalizedMessage = normalizeChatText(message);

  if (!normalizedMessage) return [];

  const scoredItems = snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      const triggers = Array.isArray(data.triggers) ? data.triggers : [];

      let bestScore = 0;
      let bestTrigger = null;

      for (const trigger of triggers) {
        const score = scoreTriggerMatch(normalizedMessage, trigger);
        if (score > bestScore) {
          bestScore = score;
          bestTrigger = trigger;
        }
      }

      return {
        id: doc.id,
        response: data.response || "",
        triggers,
        file: data.file || null,
        bestTrigger,
        score: bestScore,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    })
    .filter((item) => item.score > 0 && (item.response || item.file?.url))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredItems;
}

function buildTrainingContextBlock(trainingItems = []) {
  if (!Array.isArray(trainingItems) || !trainingItems.length) {
    return "";
  }

  const lines = trainingItems.map((item, index) => {
    const triggerText = Array.isArray(item.triggers)
      ? item.triggers.join(", ")
      : "";

    return [
      `Training Entry ${index + 1}:`,
      `Matched Trigger: ${item.bestTrigger || "N/A"}`,
      `All Triggers: ${triggerText || "N/A"}`,
      `Suggested Response: ${item.response || "N/A"}`,
      item.file?.name ? `Attached Training File: ${item.file.name}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return lines.join("\n\n");
}

function buildGeminiHistory(history = []) {
  return Array.isArray(history)
    ? history
        .filter(
          (item) =>
            item &&
            typeof item.text === "string" &&
            (item.role === "user" || item.role === "model")
        )
        .map((item) => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.text }],
        }))
    : [];
}

function buildStandardMessages({
  assistantInstruction,
  contextualPrompt,
  history = [],
}) {
  const normalized = Array.isArray(history)
    ? history
        .filter(
          (item) =>
            item &&
            typeof item.text === "string" &&
            (item.role === "user" || item.role === "model")
        )
        .map((item) => ({
          role: item.role === "model" ? "assistant" : "user",
          content: item.text,
        }))
    : [];

  return {
    system: assistantInstruction,
    messages: [
      ...normalized,
      { role: "user", content: contextualPrompt },
    ],
  };
}

async function withTimeout(promise, ms, label) {
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

function getProviderOrder() {
  return (process.env.AI_PROVIDER_ORDER ||
    "gemini,openai,claude,groq,mistral,cohere")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isQuotaLikeError(message = "") {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("rate-limit") ||
    text.includes("resource exhausted") ||
    text.includes("too many requests")
  );
}

const providerBackoffUntil = {
  gemini: 0,
  openai: 0,
  claude: 0,
  groq: 0,
  mistral: 0,
  cohere: 0,
};

function shouldSkipProvider(provider) {
  return Date.now() < (providerBackoffUntil[provider] || 0);
}

function markProviderBackoff(provider, ms = 60_000) {
  providerBackoffUntil[provider] = Date.now() + ms;
}

async function callGeminiProvider({
  assistantInstruction,
  contextualPrompt,
  normalizedHistory,
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: assistantInstruction }],
        },
        contents: [
          ...normalizedHistory,
          {
            role: "user",
            parts: [{ text: contextualPrompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed.");
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("") || "";

  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return {
    provider: "gemini",
    text,
  };
}

async function callOpenAIProvider({
  assistantInstruction,
  contextualPrompt,
  history,
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const { system, messages } = buildStandardMessages({
    assistantInstruction,
    contextualPrompt,
    history,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.7,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed.");
  }

  const text = data?.choices?.[0]?.message?.content || "";

  if (!text.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return {
    provider: "openai",
    text,
  };
}

async function callClaudeProvider({
  assistantInstruction,
  contextualPrompt,
  history,
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured.");
  }

  const model =
    process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  const { system, messages } = buildStandardMessages({
    assistantInstruction,
    contextualPrompt,
    history,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system,
      messages,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error?.type ||
        "Anthropic request failed."
    );
  }

  const text = Array.isArray(data?.content)
    ? data.content.map((item) => item?.text || "").join("")
    : "";

  if (!text.trim()) {
    throw new Error("Claude returned an empty response.");
  }

  return {
    provider: "claude",
    text,
  };
}

async function callGroqProvider({
  assistantInstruction,
  contextualPrompt,
  history,
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Groq API key is not configured.");
  }

  const model =
    process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const { system, messages } = buildStandardMessages({
    assistantInstruction,
    contextualPrompt,
    history,
  });

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.7,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Groq request failed.");
  }

  const text = data?.choices?.[0]?.message?.content || "";

  if (!text.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  return {
    provider: "groq",
    text,
  };
}

async function callMistralProvider({
  assistantInstruction,
  contextualPrompt,
  history,
}) {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("Mistral API key is not configured.");
  }

  const model =
    process.env.MISTRAL_MODEL || "mistral-small-latest";

  const { system, messages } = buildStandardMessages({
    assistantInstruction,
    contextualPrompt,
    history,
  });

  const response = await fetch(
    "https://api.mistral.ai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.7,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Mistral request failed.");
  }

  const text = data?.choices?.[0]?.message?.content || "";

  if (!text.trim()) {
    throw new Error("Mistral returned an empty response.");
  }

  return {
    provider: "mistral",
    text,
  };
}

async function callCohereProvider({
  assistantInstruction,
  contextualPrompt,
  history,
}) {
  if (!process.env.COHERE_API_KEY) {
    throw new Error("Cohere API key is not configured.");
  }

  const model = process.env.COHERE_MODEL || "command-r-plus";

  const { system, messages } = buildStandardMessages({
    assistantInstruction,
    contextualPrompt,
    history,
  });

  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error?.message ||
        "Cohere request failed."
    );
  }

  const text =
    data?.message?.content?.map((item) => item?.text || "").join("") ||
    data?.text ||
    "";

  if (!text.trim()) {
    throw new Error("Cohere returned an empty response.");
  }

  return {
    provider: "cohere",
    text,
  };
}


function normalizeProviderName(provider = "") {
  const value = String(provider || "").trim().toLowerCase();

  if (value === "openai") return "OpenAI";
  if (value === "gemini") return "Gemini";
  if (value === "claude") return "Claude";
  if (value === "groq") return "Groq";
  if (value === "mistral") return "Mistral";
  if (value === "cohere") return "Cohere";

  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "AI Provider";
}

function getProviderModelName(provider = "") {
  const value = String(provider || "").trim().toLowerCase();

  if (value === "gemini") return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (value === "openai") return process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (value === "claude") return process.env.CLAUDE_MODEL || "claude-3-5-haiku-latest";
  if (value === "groq") return process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (value === "mistral") return process.env.MISTRAL_MODEL || "mistral-small-latest";
  if (value === "cohere") return process.env.COHERE_MODEL || "command-r";

  return "Unknown model";
}

function normalizeQuotaErrorMessage(message = "") {
  const text = normalizeOptionalText(message) || "Quota or rate limit reached.";

  return text.length > 240 ? `${text.slice(0, 240)}...` : text;
}

function inferProviderFromQuotaMessage(message = "") {
  const text = String(message || "").toLowerCase();

  if (text.includes("openai") || text.includes("gpt-") || text.includes("chat/completions")) return "openai";
  if (text.includes("gemini") || text.includes("generativelanguage.googleapis")) return "gemini";
  if (text.includes("claude") || text.includes("anthropic")) return "claude";
  if (text.includes("groq")) return "groq";
  if (text.includes("mistral")) return "mistral";
  if (text.includes("cohere") || text.includes("command-r")) return "cohere";

  return null;
}



async function createAIQuotaLimitAdminNotifications({ provider, message }) {
  try {
    const inferredProvider = inferProviderFromQuotaMessage(message);
    const normalizedProvider =
      normalizeOptionalText(provider) ||
      inferredProvider ||
      "unknown-ai";

    const providerLabel = normalizeProviderName(normalizedProvider);
    const model = getProviderModelName(normalizedProvider);
    const quotaErrorMessage = normalizeQuotaErrorMessage(message);

    console.log("AI QUOTA LIMIT DETECTED =>", {
      provider: normalizedProvider,
      providerLabel,
      model,
      reason: quotaErrorMessage,
    });

    const now = Date.now();
    const cooldownMs = Number(
      process.env.AI_QUOTA_NOTIFICATION_COOLDOWN_MS || 15 * 60 * 1000
    );

    const alertRef = db.collection("systemAlerts").doc(`ai-quota-${normalizedProvider}`);
    const alertSnap = await alertRef.get();
    const alertData = alertSnap.exists ? alertSnap.data() || {} : {};
    const lastNotifiedAt = resolveDate(alertData.lastNotifiedAt);

    if (lastNotifiedAt && now - lastNotifiedAt.getTime() < cooldownMs) {
      return;
    }

    await alertRef.set(
      {
        type: "ai-quota-limit",
        provider: normalizedProvider,
        providerLabel,
        model,
        message: quotaErrorMessage,
        lastNotifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const adminsSnapshot = await db.collection("admins").get();

    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data() || {};
      const adminId = normalizeOptionalText(adminData.adminId) || adminDoc.id;

      await createNotification({
        userId: adminId,
        role: "admin",
        type: "ai-quota-limit",
        title: `${providerLabel} AI quota limit reached`,
        message:
          `AI Provider: ${providerLabel}${model ? ` (${model})` : ""}. ` +
          `${providerLabel} reached its quota or rate limit. ` +
          "The system will try the next available AI provider automatically.",
        relatedId: normalizedProvider,
        relatedType: "ai-provider",
        actorRole: "system",
        actorName: "ParseIT AI Monitor",
        provider: normalizedProvider,
        providerLabel,
        model,
        errorMessage: quotaErrorMessage,
        aiProvider: providerLabel,
      });
    }
  } catch (notifyError) {
    console.error("AI quota admin notification error:", notifyError);
  }
}

async function callProvider(provider, context) {
  if (provider === "gemini") {
    return withTimeout(
      callGeminiProvider(context),
      20_000,
      "Gemini"
    );
  }

  if (provider === "openai") {
    return withTimeout(
      callOpenAIProvider(context),
      20_000,
      "OpenAI"
    );
  }

  if (provider === "claude") {
    return withTimeout(
      callClaudeProvider(context),
      20_000,
      "Claude"
    );
  }

  if (provider === "groq") {
    return withTimeout(
      callGroqProvider(context),
      20_000,
      "Groq"
    );
  }

  if (provider === "mistral") {
    return withTimeout(
      callMistralProvider(context),
      20_000,
      "Mistral"
    );
  }

  if (provider === "cohere") {
    return withTimeout(
      callCohereProvider(context),
      20_000,
      "Cohere"
    );
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

async function callAIWithFallback(context) {
  const providers = getProviderOrder();
  const errors = [];

  for (const provider of providers) {
    if (shouldSkipProvider(provider)) {
      errors.push(`${provider}: temporarily skipped due to backoff`);
      continue;
    }

    try {
      const result = await callProvider(provider, context);
      return result;
    } catch (error) {
      const message = error?.message || "Unknown provider error";
      console.error(`[AI FAILOVER] ${provider} failed:`, message);

      if (isQuotaLikeError(message)) {
        markProviderBackoff(provider, 60_000);
        await createAIQuotaLimitAdminNotifications({ provider, message });
      }

      errors.push(`${provider}: ${message}`);
    }
  }

  const finalError = new Error("All AI providers failed.");
  finalError.providerErrors = errors;
  throw finalError;
}

async function buildAIContextFromTraining(matchedTraining = []) {
  let trainingText = "";
  let fileText = "";

  for (const item of matchedTraining) {
    if (item.response) {
      trainingText += `\nTraining Response:\n${item.response}\n`;
    }

    if (item.file?.url) {
      try {
        const fileResponse = await fetch(item.file.url);

        if (fileResponse.ok) {
          const arrayBuffer = await fileResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = item.file.mimeType || "application/octet-stream";
          const fileName = item.file.name || "training-file";

          const extractedText = await extractTextFromFile(
            buffer,
            mimeType,
            fileName
          );

          const safeText = limitText(extractedText, 12000);

          if (safeText.trim()) {
            fileText += `
[Document: ${fileName}]
Mime-Type: ${mimeType}
Extracted Content:
${safeText}
[/Document]
`;
          } else {
            fileText += `\nAttached reference file: ${fileName} (content could not be extracted)\n`;
          }
        } else {
          fileText += `\nAttached reference file: ${
            item.file.name || "training-file"
          } (download failed)\n`;
        }
      } catch (fileError) {
        console.error("Training file read error:", fileError);
      }
    }
  }

  return { trainingText, fileText };
}

async function handleAIChat(req, res) {
  try {
    const {
      message,
      mode = "assistant",
      history = [],
      studentId = null,
      courseId = null,
      assignmentId = null,
      topic = null,
    } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const normalizedMode = mode === "tutor" ? "tutor" : "assistant";
    const normalizedHistory = buildGeminiHistory(history);
    const matchedTraining = await findMatchingChatbotTraining(message, 5);
    const interpretedMessage = expandKeywordPrompt(message, normalizedMode);
    const bestMatch = matchedTraining[0] || null;

    // Keep existing keyword + strong trigger logic for Assistant only.
    // Tutor mode should still teach, guide, and adapt instead of returning a canned answer directly.
    if (
      normalizedMode === "assistant" &&
      bestMatch &&
      bestMatch.score >= 80 &&
      bestMatch.response
    ) {
      return res.json({
        reply: bestMatch.response,
        matchedTrainingCount: matchedTraining.length,
        matchedTrainingIds: matchedTraining.map((item) => item.id),
        interpretedMessage,
        source: "stored-training-direct",
      });
    }

    const { trainingText, fileText } = await buildAIContextFromTraining(
      matchedTraining
    );

    let tutorProfileContext = "";
    let assignmentContextText = "";

    if (normalizedMode === "tutor") {
      const [progress, activities] = await Promise.all([
        getStudentLessonProgress(studentId, 10),
        getRecentStudentActivities(studentId, 8),
      ]);

      tutorProfileContext = buildTutorProfileContext({
        progress,
        activities,
        studentId,
      });

      if (assignmentId) {
        const assignmentContext = await getAssignmentLearningContext({
          assignmentId,
          classId: courseId,
        });

        const materialsText = assignmentContext.materials
          .map((material, index) => `
Related Material ${index + 1}: ${material.title}
${limitText([material.content, material.extractedText].filter(Boolean).join("\n"), 6000)}
`)
          .join("\n---\n");

        assignmentContextText = `
Current assignment context:
Course: ${assignmentContext.classInfo.name} (${assignmentContext.classInfo.courseCode || "N/A"})
Assignment: ${assignmentContext.assignment.title}
Instruction: ${assignmentContext.assignment.instruction || "N/A"}
Related materials:
${materialsText || "No readable materials found."}
`;
      }
    }

    let contextualPrompt = `User message: ${interpretedMessage}\nMode: ${normalizedMode}\n`;

    if (normalizedMode === "tutor") {
      contextualPrompt += `
The student may be asking because they are having difficulty with a lesson.
Requested or detected topic: ${topic || "Not specified"}
${tutorProfileContext}
${assignmentContextText}
`;
    }

    if (matchedTraining.length > 0) {
      contextualPrompt += `
Matched chatbot training exists.
Use the following training context as reference.
If the answer is present in the attached extracted document content, use that content.
If you are in tutor mode, transform the content into a tutoring explanation rather than just copying it.

${trainingText}

${fileText}
`;
    } else {
      contextualPrompt += `
No strong stored training matched.
Do not tell the user that the answer is not in storage.
In assistant mode, answer helpfully in a natural assistant way.
In tutor mode, tutor the student step by step and ask a quick check question when appropriate.
`;
    }

    const baseInstruction =
      "Use extracted document content when available. " +
      "If matched chatbot training exists, prioritize it as reference. " +
      "If no matched training exists, still answer naturally and helpfully. " +
      "Do not mention hidden context, Firestore, storage, or trigger logic.";

    const modeInstruction =
      normalizedMode === "tutor"
        ? buildStrictTutorInstruction()
        : "You are ParseIT Assistant. Help users with platform questions, system guidance, and general support.";

    const assistantInstruction = `${modeInstruction}\n${baseInstruction}`;

    const aiResult = await callAIWithFallback({
      assistantInstruction,
      contextualPrompt,
      normalizedHistory,
      history,
    });

    if (normalizedMode === "tutor" && studentId) {
      await upsertLessonProgress({
        studentId,
        courseId,
        assignmentId,
        topic: topic || interpretedMessage,
        status: "needs_review",
        source: "ai-tutor-chat",
        notes: "Student used AI Tutor for lesson support.",
      });
    }

    return res.json({
      reply: aiResult.text,
      matchedTrainingCount: matchedTraining.length,
      matchedTrainingIds: matchedTraining.map((item) => item.id),
      interpretedMessage,
      source: aiResult.provider,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    const providerErrors = Array.isArray(error?.providerErrors)
      ? error.providerErrors
      : [error?.message || "Unknown error"];

    return res.status(500).json({
      error: error.message || "Internal server error.",
      providerErrors,
    });
  }
}

app.post("/ai/chat", handleAIChat);

// keep your old frontend working
app.post("/ai/gemini", handleAIChat);


function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }
  return value;
}

async function resolveCommunityUserAvatar(authorRole, authorId, fallbackAvatar) {
  const normalizedRole = normalizeOptionalText(authorRole);
  const normalizedAuthorId = normalizeOptionalText(authorId);

  const fallback = normalizeOptionalText(fallbackAvatar);

  const emptyResult = {
    avatar: fallback || null,
    avatarStoragePath: null,
  };

  if (!normalizedRole || !normalizedAuthorId) {
    return emptyResult;
  }

  try {
    let snap = null;

    if (normalizedRole === "student") {
      snap = await db.collection("students").doc(normalizedAuthorId).get();
    } else if (normalizedRole === "teacher") {
      snap = await db.collection("teachers").doc(normalizedAuthorId).get();
    } else if (normalizedRole === "admin") {
      snap = await db.collection("admins").doc(normalizedAuthorId).get();
    }

    if (!snap?.exists) {
      return emptyResult;
    }

    const data = snap.data() || {};
    const profileImageStoragePath = normalizeOptionalText(
      data.profileImageStoragePath
    );

    if (profileImageStoragePath) {
      const freshAvatar = await createReadSignedUrlIfExists(
        profileImageStoragePath
      );

      return {
        avatar: freshAvatar || null,
        avatarStoragePath: profileImageStoragePath,
      };
    }

    return {
      avatar: data.profileImage || fallback || null,
      avatarStoragePath: null,
    };
  } catch (error) {
    console.warn("Resolve community avatar warning:", error?.message || error);
  }

  return emptyResult;
}

// ====================== REAL SETTINGS AUTH ROUTES ======================
async function getManagedUserRecord(id, role) {
  const collectionName = getCollectionNameByRole(role);
  if (!collectionName) throw new Error("Invalid role.");

  const normalizedId = String(id || "").trim();
  if (!normalizedId) throw new Error("User ID is required.");

  const userRef = db.collection(collectionName).doc(normalizedId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error("User not found.");

  const userData = userSnap.data() || {};
  if (!userData.authUid) throw new Error("User auth UID is missing.");

  return { collectionName, userRef, userData, userId: normalizedId };
}

async function assertEmailNotTakenByAnotherUser(nextEmail, currentAuthUid) {
  try {
    const existingUser = await admin.auth().getUserByEmail(nextEmail);
    if (existingUser?.uid && existingUser.uid !== currentAuthUid) {
      throw new Error("Email is already in use by another account.");
    }
  } catch (error) {
    if (error?.code === "auth/user-not-found") return;
    if (error?.message === "Email is already in use by another account.") throw error;
    throw new Error(error?.message || "Failed to validate email address.");
  }
}

app.post("/auth/change-email", async (req, res) => {
  try {
    const { id, role, newEmail } = req.body;

    if (!id || !role || !newEmail) {
      return res.status(400).json({ error: "id, role, and newEmail are required." });
    }

    const normalizedEmail = String(newEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const { userRef, userData } = await getManagedUserRecord(id, role);

    if ((userData.email || "").toLowerCase() === normalizedEmail) {
      return res.status(400).json({ error: "Your new email must be different from your current email." });
    }

    await assertEmailNotTakenByAnotherUser(normalizedEmail, userData.authUid);

    await admin.auth().updateUser(userData.authUid, { email: normalizedEmail });
    await userRef.update({ email: normalizedEmail, updatedAt: FieldValue.serverTimestamp() });

    return res.json({
      success: true,
      message: "Email updated successfully.",
      data: { email: normalizedEmail },
    });
  } catch (error) {
    console.error("Change email error:", error);
    return res.status(500).json({ error: error?.message || "Failed to update email." });
  }
});

app.post("/auth/change-password", async (req, res) => {
  try {
    const { id, role, newPassword } = req.body;

    if (!id || !role || !newPassword) {
      return res.status(400).json({ error: "id, role, and newPassword are required." });
    }

    const normalizedPassword = String(newPassword).trim();
    if (normalizedPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long." });
    }

    const { userRef, userData } = await getManagedUserRecord(id, role);

    await admin.auth().updateUser(userData.authUid, { password: normalizedPassword });
    await userRef.update({
      updatedAt: FieldValue.serverTimestamp(),
      lastPasswordChangeAt: FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: error?.message || "Failed to update password." });
  }
});
// ====================== END REAL SETTINGS AUTH ROUTES ======================



/**
 * VIDEO FAVORITES ROUTES
 */

function buildVideoFavoriteResponse(doc) {
  const data = doc.data() || {};

  return {
    id: data.videoId || doc.id,
    favoriteId: doc.id,
    userId: data.userId || "",
    role: data.role || "student",
    videoId: data.videoId || "",
    title: data.title || "",
    description: data.description || "",
    embedUrl: data.embedUrl || "",
    watchUrl: data.watchUrl || "",
    channel: data.channel || "",
    views: data.views || "",
    uploadedAt: data.uploadedAt || "",
    publishedAt: data.publishedAt || null,
    thumbnail: data.thumbnail || "",
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

app.get("/video-favorites", async (req, res) => {
  try {
    const userId = normalizeOptionalText(req.query.userId);
    const role = normalizeOptionalText(req.query.role) || "student";

    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    const snapshot = await db
      .collection("videoFavorites")
      .where("userId", "==", userId)
      .where("role", "==", role)
      .orderBy("createdAt", "desc")
      .get();

    return res.json({
      success: true,
      data: snapshot.docs.map((doc) => buildVideoFavoriteResponse(doc)),
    });
  } catch (error) {
    console.error("Fetch video favorites error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch video favorites.",
    });
  }
});

app.post("/video-favorites/toggle", async (req, res) => {
  try {
    const { userId, role = "student", video } = req.body || {};

    const normalizedUserId = normalizeOptionalText(userId);
    const normalizedRole = normalizeOptionalText(role) || "student";

    if (!normalizedUserId) {
      return res.status(400).json({ error: "userId is required." });
    }

    if (!video || typeof video !== "object") {
      return res.status(400).json({ error: "video is required." });
    }

    const videoId = normalizeOptionalText(video.videoId || video.id);

    if (!videoId) {
      return res.status(400).json({ error: "video.id is required." });
    }

    const existingSnapshot = await db
      .collection("videoFavorites")
      .where("userId", "==", normalizedUserId)
      .where("role", "==", normalizedRole)
      .where("videoId", "==", videoId)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0];
      await existingDoc.ref.delete();

      return res.json({
        success: true,
        saved: false,
        videoId,
        message: "Video removed from favorites.",
      });
    }

    const favoritePayload = {
      userId: normalizedUserId,
      role: normalizedRole,
      videoId,
      title: normalizeOptionalText(video.title) || "Untitled video",
      description: typeof video.description === "string" ? video.description : "",
      embedUrl: normalizeOptionalText(video.embedUrl) || "",
      watchUrl: normalizeOptionalText(video.watchUrl) || "",
      channel: normalizeOptionalText(video.channel) || "YouTube",
      views: normalizeOptionalText(video.views) || "0 views",
      uploadedAt: normalizeOptionalText(video.uploadedAt) || "Recently uploaded",
      publishedAt: normalizeOptionalText(video.publishedAt) || null,
      thumbnail: normalizeOptionalText(video.thumbnail) || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("videoFavorites").add(favoritePayload);
    const savedDoc = await docRef.get();

    return res.json({
      success: true,
      saved: true,
      videoId,
      message: "Video saved to favorites.",
      data: buildVideoFavoriteResponse(savedDoc),
    });
  } catch (error) {
    console.error("Toggle video favorite error:", error);
    return res.status(500).json({
      error: error.message || "Failed to update favorite.",
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
        const postData = doc.data() || {};

        const resolvedPostAvatar = await resolveCommunityUserAvatar(
          postData.authorRole,
          postData.authorId,
          postData.avatar || null
        );

        const answersSnapshot = await db
          .collection("communityPosts")
          .doc(doc.id)
          .collection("answers")
          .orderBy("createdAt", "asc")
          .get();

        const answers = await Promise.all(
          answersSnapshot.docs.map(async (answerDoc) => {
            const answerData = answerDoc.data() || {};

            const resolvedAnswerAvatar = await resolveCommunityUserAvatar(
              answerData.authorRole,
              answerData.authorId,
              answerData.avatar || null
            );

            return {
              id: answerDoc.id,
              userName: answerData.userName || "Unknown User",
              avatar: resolvedAnswerAvatar.avatar,
              avatarStoragePath:
                resolvedAnswerAvatar.avatarStoragePath ||
                answerData.avatarStoragePath ||
                null,
              answeredAt: formatFirestoreDateTime(answerData.createdAt),
              message: answerData.message || "",
            };
          })
        );

        return {
          id: doc.id,
          userName: postData.userName || "Unknown User",
          userEmail: postData.userEmail || "",
          avatar: resolvedPostAvatar.avatar,
          avatarStoragePath:
            resolvedPostAvatar.avatarStoragePath ||
            postData.avatarStoragePath ||
            null,
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

    const authorAvatar = await resolveCommunityUserAvatar(
      authorRole,
      authorId,
      avatar || null
    );

    const postRef = await db.collection("communityPosts").add({
      content: String(content).trim(),
      authorId: String(authorId).trim(),
      authorUid: normalizeOptionalText(authorUid),
      authorRole,
      userName: String(userName).trim(),
      userEmail: normalizeOptionalText(userEmail),
      avatar: authorAvatar.avatar || null,
      avatarStoragePath: authorAvatar.avatarStoragePath || null,
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
        avatar: createdData.avatar || null,
        avatarStoragePath: createdData.avatarStoragePath || null,
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

    const postData = postSnap.data() || {};

    const authorAvatar = await resolveCommunityUserAvatar(
      authorRole,
      authorId,
      avatar || null
    );

    const answerRef = await postRef.collection("answers").add({
      message: String(message).trim(),
      authorId: String(authorId).trim(),
      authorUid: normalizeOptionalText(authorUid),
      authorRole,
      userName: String(userName).trim(),
      avatar: authorAvatar.avatar || null,
      avatarStoragePath: authorAvatar.avatarStoragePath || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await postRef.update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (
      normalizeOptionalText(postData.authorId) &&
      String(postData.authorId).trim() !== String(authorId).trim() &&
      ["student", "teacher"].includes(String(postData.authorRole || "").trim())
    ) {
      await createNotification({
        userId: postData.authorId,
        role: String(postData.authorRole).trim(),
        type: "community-answer",
        title: "New Answer on Your Post",
        message: `${String(userName).trim()} answered your post.`,
        relatedId: postId,
        relatedType: "community-post",
        actorId: authorId,
        actorRole: authorRole,
        actorName: userName,
      });
    }

    return res.json({
      success: true,
      message: "Answer posted successfully.",
      data: {
        id: answerRef.id,
        userName,
        avatar: authorAvatar.avatar || null,
        avatarStoragePath: authorAvatar.avatarStoragePath || null,
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

async function uploadUserImageToStorage({
  imageBase64,
  imageMimeType,
  fileName,
  folder,
  userId,
}) {
  if (!imageBase64) {
    throw new Error("Image data is required.");
  }

  if (!userId) {
    throw new Error("User ID is required.");
  }

  const cleanedBase64 = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const safeMimeType = normalizeOptionalText(imageMimeType) || "image/jpeg";
  const extension = getFileExtensionFromMimeType(safeMimeType);
  const safeFileName = sanitizeFileName(
    normalizeOptionalText(fileName) || `image.${extension}`
  );

  const storagePath = `${folder}/${userId}/${Date.now()}-${safeFileName}`;
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(cleanedBase64, "base64"), {
    metadata: {
      contentType: safeMimeType,
      cacheControl: "private,max-age=0,no-transform",
    },
    resumable: false,
  });

  const fileUrl = await createReadSignedUrl(storagePath);

  return {
    fileUrl,
    storagePath,
    fileName: safeFileName,
    fileType: safeMimeType,
  };
}

function isDefaultUserImageStoragePath(storagePath) {
  return (
    storagePath === DEFAULT_PROFILE_IMAGE_STORAGE_PATH ||
    storagePath === DEFAULT_BANNER_IMAGE_STORAGE_PATH ||
    String(storagePath || "").startsWith("defaults/")
  );
}

app.post("/auth/update-user-images", requireAuth, async (req, res) => {
  try {
    const {
      profileImageBase64,
      profileImageMimeType,
      profileImageFileName,
      bannerImageBase64,
      bannerImageMimeType,
      bannerImageFileName,
    } = req.body || {};

    const profile = await findUserProfileByAuthUid(req.user.uid);

    if (!profile?.ref) {
      return res.status(403).json({ error: "User profile not found." });
    }

    const normalizedUserId =
      profile.data.studentId ||
      profile.data.teacherId ||
      profile.data.adminId ||
      profile.id;

    const userSnap = await profile.ref.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userSnap.data() || {};
    const updates = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (profileImageBase64) {
      if (
        userData.profileImageStoragePath &&
        !isDefaultUserImageStoragePath(userData.profileImageStoragePath)
      ) {
        await deleteStorageFileIfExists(userData.profileImageStoragePath);
      }

      const uploadedProfile = await uploadUserImageToStorage({
        imageBase64: profileImageBase64,
        imageMimeType: profileImageMimeType,
        fileName: profileImageFileName || "profile.jpg",
        folder: "user-profiles",
        userId: normalizedUserId,
      });

      updates.profileImage = uploadedProfile.fileUrl;
      updates.profileImageStoragePath = uploadedProfile.storagePath;
    }

    if (bannerImageBase64) {
      if (
        userData.bannerImageStoragePath &&
        !isDefaultUserImageStoragePath(userData.bannerImageStoragePath)
      ) {
        await deleteStorageFileIfExists(userData.bannerImageStoragePath);
      }

      const uploadedBanner = await uploadUserImageToStorage({
        imageBase64: bannerImageBase64,
        imageMimeType: bannerImageMimeType,
        fileName: bannerImageFileName || "banner.jpg",
        folder: "user-banners",
        userId: normalizedUserId,
      });

      updates.bannerImage = uploadedBanner.fileUrl;
      updates.bannerImageStoragePath = uploadedBanner.storagePath;
    }

    await profile.ref.update(updates);

    const updatedSnap = await profile.ref.get();
    const updatedData = updatedSnap.data() || {};

    return res.json({
      success: true,
      data: {
        id: profile.id,
        role: profile.role,
        profileImage: updatedData.profileImage || null,
        profileImageStoragePath: updatedData.profileImageStoragePath || null,
        bannerImage: updatedData.bannerImage || null,
        bannerImageStoragePath: updatedData.bannerImageStoragePath || null,
      },
    });
  } catch (error) {
    console.error("Update user images error:", error?.message || error);
    return res.status(500).json({
      error: error?.message || "Failed to update user images.",
    });
  }
});

/**
 * CHATBOT TRAINING ROUTES
 */
app.get("/chatbot-training", async (req, res) => {
  try {
    const snapshot = await db
      .collection("chatbotTraining")
      .orderBy("createdAt", "desc")
      .get();

    const items = snapshot.docs.map((doc) => {
      const data = doc.data() || {};

      return {
        id: doc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    });

    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Fetch chatbot training error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch chatbot training.",
    });
  }
});

app.post("/chatbot-training", async (req, res) => {
  try {
    const {
      response,
      triggers,
      fileBase64,
      fileName,
      fileType,
      source = "admin-panel",
    } = req.body || {};

    const cleanedResponse = normalizeOptionalText(response);

    if (!cleanedResponse) {
      return res.status(400).json({ error: "response is required." });
    }

    if (!Array.isArray(triggers) || triggers.length === 0) {
      return res.status(400).json({ error: "At least one trigger is required." });
    }

    const cleanedTriggers = triggers
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

    if (!cleanedTriggers.length) {
      return res.status(400).json({ error: "At least one valid trigger is required." });
    }

    let uploadedFile = null;

    if (fileBase64) {
      uploadedFile = await uploadChatbotTrainingFileToStorage({
        fileBase64,
        fileMimeType: fileType,
        fileName,
      });
    }

    const ref = await db.collection("chatbotTraining").add({
      response: cleanedResponse,
      triggers: cleanedTriggers,
      file: uploadedFile
        ? {
            name: uploadedFile.fileName,
            url: uploadedFile.fileUrl,
            storagePath: uploadedFile.storagePath,
            mimeType: uploadedFile.fileType,
            bucketPath: uploadedFile.bucketPath,
          }
        : null,
      source: normalizeOptionalText(source) || "admin-panel",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const createdSnap = await ref.get();
    const createdData = createdSnap.data() || {};

    return res.status(201).json({
      success: true,
      message: "Chatbot training created successfully.",
      data: {
        id: ref.id,
        ...createdData,
        createdAt: serializeTimestamp(createdData.createdAt),
        updatedAt: serializeTimestamp(createdData.updatedAt),
      },
    });
  } catch (error) {
    console.error("Create chatbot training error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create chatbot training.",
    });
  }
});

app.put("/chatbot-training/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { response, triggers, file } = req.body || {};

    const ref = db.collection("chatbotTraining").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Chatbot training not found." });
    }

    const updates = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof response === "string") {
      const cleanedResponse = response.trim();

      if (!cleanedResponse) {
        return res.status(400).json({ error: "response cannot be empty." });
      }

      updates.response = cleanedResponse;
    }

    if (Array.isArray(triggers)) {
      const cleanedTriggers = triggers
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);

      if (!cleanedTriggers.length) {
        return res.status(400).json({ error: "At least one valid trigger is required." });
      }

      updates.triggers = cleanedTriggers;
    }

    if (file !== undefined) {
      updates.file = file || null;
    }

    await ref.update(updates);

    const updatedSnap = await ref.get();
    const updatedData = updatedSnap.data() || {};

    return res.json({
      success: true,
      message: "Chatbot training updated successfully.",
      data: {
        id: updatedSnap.id,
        ...updatedData,
        createdAt: serializeTimestamp(updatedData.createdAt),
        updatedAt: serializeTimestamp(updatedData.updatedAt),
      },
    });
  } catch (error) {
    console.error("Update chatbot training error:", error);
    return res.status(500).json({
      error: error.message || "Failed to update chatbot training.",
    });
  }
});

app.patch("/chatbot-training/:id/file", async (req, res) => {
  try {
    const { id } = req.params;
    const { fileBase64, fileName, fileType } = req.body || {};

    if (!fileBase64) {
      return res.status(400).json({ error: "fileBase64 is required." });
    }

    const ref = db.collection("chatbotTraining").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Chatbot training not found." });
    }

    const existingData = snap.data() || {};
    const existingFile = existingData.file || null;

    const uploadedFile = await uploadChatbotTrainingFileToStorage({
      fileBase64,
      fileMimeType: fileType,
      fileName,
    });

    await ref.update({
      file: {
        name: uploadedFile.fileName,
        url: uploadedFile.fileUrl,
        storagePath: uploadedFile.storagePath,
        mimeType: uploadedFile.fileType,
        bucketPath: uploadedFile.bucketPath,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (existingFile?.storagePath) {
      await deleteStorageFileIfExists(existingFile.storagePath);
    }

    const updatedSnap = await ref.get();
    const updatedData = updatedSnap.data() || {};

    return res.json({
      success: true,
      message: "Chatbot training file replaced successfully.",
      data: {
        id: updatedSnap.id,
        ...updatedData,
        createdAt: serializeTimestamp(updatedData.createdAt),
        updatedAt: serializeTimestamp(updatedData.updatedAt),
      },
    });
  } catch (error) {
    console.error("Replace chatbot training file error:", error);
    return res.status(500).json({
      error: error.message || "Failed to replace chatbot training file.",
    });
  }
});

app.delete("/chatbot-training/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const ref = db.collection("chatbotTraining").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Chatbot training not found." });
    }

    const data = snap.data() || {};

    if (data?.file?.storagePath) {
      await deleteStorageFileIfExists(data.file.storagePath);
    }

    await ref.delete();

    return res.json({
      success: true,
      message: "Chatbot training deleted successfully.",
    });
  } catch (error) {
    console.error("Delete chatbot training error:", error);
    return res.status(500).json({
      error: error.message || "Failed to delete chatbot training.",
    });
  }
});

app.delete("/chatbot-training/:id/file", async (req, res) => {
  try {
    const { id } = req.params;

    const ref = db.collection("chatbotTraining").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Chatbot training not found." });
    }

    const data = snap.data() || {};
    const existingFile = data.file || null;

    if (existingFile?.storagePath) {
      await deleteStorageFileIfExists(existingFile.storagePath);
    }

    await ref.update({
      file: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedSnap = await ref.get();
    const updatedData = updatedSnap.data() || {};

    return res.json({
      success: true,
      message: "Chatbot training file removed successfully.",
      data: {
        id: updatedSnap.id,
        ...updatedData,
        createdAt: serializeTimestamp(updatedData.createdAt),
        updatedAt: serializeTimestamp(updatedData.updatedAt),
      },
    });
  } catch (error) {
    console.error("Remove chatbot training file error:", error);
    return res.status(500).json({
      error: error.message || "Failed to remove chatbot training file.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
 