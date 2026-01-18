const multer = require("multer");
const path = require("path");
const fs = require("fs");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function makeUploader({
  folder = "general",
  allowedMimes = ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB = 5,
} = {}) {
  const uploadRoot = path.join(process.cwd(), "uploads");
  const uploadDir = path.join(uploadRoot, folder);

  ensureDir(uploadDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDir(uploadDir); // ensure exists at runtime too
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = sanitizeFileName(path.basename(file.originalname, ext));
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}-${base}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Only images are allowed."));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
  });
}

function buildPublicFileUrl(req, file, folder) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  // file.filename is what multer saved
  return `${protocol}://${host}/uploads/${folder}/${file.filename}`;
}

module.exports = { makeUploader, buildPublicFileUrl };
