const path = require("path");
const { bucket } = require("../config/firebase");

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadImageToFirebase({ file, folder = "products" }) {
  // file is from multer memoryStorage -> { buffer, mimetype, originalname }
  const ext = path.extname(file.originalname || "").toLowerCase() || "";
  const base = safeName(path.basename(file.originalname || "image", ext));
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;

  const storagePath = `${folder}/${filename}`;
  const firebaseFile = bucket.file(storagePath);

  await firebaseFile.save(file.buffer, {
    metadata: { contentType: file.mimetype },
    resumable: false,
  });

  // ✅ Best practice: generate a signed URL (no need to make bucket public)
  const [signedUrl] = await firebaseFile.getSignedUrl({
    action: "read",
    expires: "2099-01-01", // long-lived
  });

  return { url: signedUrl, storagePath };
}

async function deleteFirebaseFile(storagePath) {
  if (!storagePath) return;
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}

module.exports = { uploadImageToFirebase, deleteFirebaseFile };
