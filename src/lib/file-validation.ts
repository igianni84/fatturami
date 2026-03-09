/**
 * File type validation using magic bytes (file signatures).
 * Prevents MIME type spoofing by checking actual file content.
 */

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

type AllowedMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

interface FileSignature {
  bytes: number[];
  offset: number;
  mediaType: AllowedMediaType;
}

// Magic byte signatures for allowed file types
const FILE_SIGNATURES: FileSignature[] = [
  // PDF: %PDF
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, mediaType: "application/pdf" },
  // JPEG: FF D8 FF
  { bytes: [0xff, 0xd8, 0xff], offset: 0, mediaType: "image/jpeg" },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0, mediaType: "image/png" },
  // GIF87a
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0, mediaType: "image/gif" },
  // GIF89a
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0, mediaType: "image/gif" },
  // WebP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mediaType: "image/webp" },
];

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function matchesSignature(header: Uint8Array, sig: FileSignature): boolean {
  for (let i = 0; i < sig.bytes.length; i++) {
    if (header[sig.offset + i] !== sig.bytes[i]) return false;
  }
  return true;
}

/**
 * Detect file media type from magic bytes.
 * Returns the media type if recognized, null otherwise.
 */
export function detectMediaType(header: Uint8Array): AllowedMediaType | null {
  for (const sig of FILE_SIGNATURES) {
    if (matchesSignature(header, sig)) {
      // WebP needs extra check: bytes 8-11 must be "WEBP"
      if (sig.mediaType === "image/webp") {
        if (
          header[8] === 0x57 && // W
          header[9] === 0x45 && // E
          header[10] === 0x42 && // B
          header[11] === 0x50   // P
        ) {
          return "image/webp";
        }
        continue;
      }
      return sig.mediaType;
    }
  }
  return null;
}

/**
 * Validate a file's type by checking both extension and magic bytes.
 * Returns the detected media type on success, or an error message.
 */
export async function validateFileType(
  file: File
): Promise<{ valid: true; mediaType: AllowedMediaType } | { valid: false; error: string }> {
  // 1. Check extension
  const ext = getExtension(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: "Tipo di file non supportato. Usa PDF, JPG, PNG, WebP o GIF.",
    };
  }

  // 2. Read first 12 bytes for magic number check
  const headerSlice = file.slice(0, 12);
  const headerBuffer = await headerSlice.arrayBuffer();
  const header = new Uint8Array(headerBuffer);

  if (header.length < 3) {
    return { valid: false, error: "File troppo piccolo o corrotto." };
  }

  // 3. Detect actual type from magic bytes
  const detectedType = detectMediaType(header);
  if (!detectedType) {
    return {
      valid: false,
      error: "Il contenuto del file non corrisponde al tipo dichiarato.",
    };
  }

  return { valid: true, mediaType: detectedType };
}
