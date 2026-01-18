const path = require("path");
const fs = require("fs");

function calculateTotalVariantStock(variants = []) {
  return variants.reduce((sum, v) => {
    const qty = Number(v.stock);
    return sum + (Number.isNaN(qty) ? 0 : qty);
  }, 0);
}

function parseJsonSafe(value, fallback) {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// small helpers
const toBool = (v, def) =>
  v === undefined || v === null ? def : String(v) === "true";

const toNum = (v, def) => {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isNaN(n) ? def : n;
};

function tryDeleteLocalFileFromUrl(fileUrlOrPath) {
  try {
    if (!fileUrlOrPath) return { ok: false, reason: "empty url" };

    let relPath;

    // Handle full URLs and relative paths
    if (
      fileUrlOrPath.startsWith("http://") ||
      fileUrlOrPath.startsWith("https://")
    ) {
      const u = new URL(fileUrlOrPath);
      relPath = u.pathname; // "/uploads/products/file.jpg"
    } else {
      relPath = fileUrlOrPath; // "/uploads/products/file.jpg" or "uploads/products/file.jpg"
    }

    // Normalize: remove leading slashes -> "uploads/products/file.jpg"
    relPath = relPath.replace(/^\/+/, "");

    // IMPORTANT: if your stored url starts with "uploads/..." ok,
    // but if it starts with "uploads" it's fine; if it starts with "public/uploads" adjust
    if (!relPath.startsWith("uploads/")) {
      return { ok: false, reason: `not in uploads folder: ${relPath}` };
    }

    // Build absolute path safely
    const absPath = path.resolve(process.cwd(), relPath);

    if (!fs.existsSync(absPath)) {
      return { ok: false, reason: `file not found: ${absPath}` };
    }

    fs.unlinkSync(absPath);
    return { ok: true, absPath };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  calculateTotalVariantStock,
  parseJsonSafe,
  toBool,
  toNum,
  tryDeleteLocalFileFromUrl,
};
