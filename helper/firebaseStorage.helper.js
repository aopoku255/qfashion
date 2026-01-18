const { bucket } = require("../src/config/firebase"); // adjust path

// Extract object path from common Firebase/GCS URLs
function extractObjectPathFromUrl(url) {
  if (!url) return null;

  try {
    const u = new URL(url);

    // Case A: Firebase download URL:
    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/products%2Ffile.png?alt=media&token=...
    if (u.hostname.includes("firebasestorage.googleapis.com")) {
      const encodedPath = u.pathname.split("/o/")[1]; // "products%2Ffile.png"
      if (!encodedPath) return null;
      return decodeURIComponent(encodedPath);
    }

    // Case B: Signed URL from Google Cloud Storage:
    // https://storage.googleapis.com/<bucket>/products/file.png?X-Goog-...
    if (u.hostname.includes("storage.googleapis.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      // parts[0] is bucket name if URL is /<bucket>/<object>
      if (parts.length >= 2) return parts.slice(1).join("/");
      return null;
    }

    // Case C: Your own server static style:
    // http://localhost:8081/uploads/products/file.png
    // -> this is NOT firebase; return null
    return null;
  } catch {
    // maybe it’s already a path like "products/file.png"
    if (typeof url === "string" && url.includes("/")) return url;
    return null;
  }
}

async function deleteFromFirebase({ storagePath, url }) {
  const objectPath = storagePath || extractObjectPathFromUrl(url);
  if (!objectPath)
    return {
      ok: false,
      reason: "No storagePath and could not extract from url",
    };

  try {
    await bucket.file(objectPath).delete({ ignoreNotFound: true });
    return { ok: true, objectPath };
  } catch (err) {
    return { ok: false, objectPath, reason: err.message };
  }
}

module.exports = { deleteFromFirebase };
