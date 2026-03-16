import { supabaseAdmin } from "./admin";
import { validateFileType } from "@/lib/file-validation";

const BUCKET = "documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_TTL = 300; // 5 minutes

/**
 * Upload a file to Supabase Storage.
 * Path: {userId}/{folder}/{timestamp}_{safeName}
 */
export async function uploadFile(
  file: File,
  folder: string,
  userId: string
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File troppo grande. Massimo 10MB consentiti.");
  }

  const fileValidation = await validateFileType(file);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error);
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${folder}/${timestamp}_${safeName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: fileValidation.mediaType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Errore upload file: ${error.message}`);
  }

  return storagePath;
}

/**
 * Get a signed URL for a file. Returns null for legacy `uploads/` paths.
 */
export async function getSignedUrl(filePath: string): Promise<string | null> {
  if (filePath.startsWith("uploads/")) {
    return null;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage. Silently skips legacy `uploads/` paths.
 */
export async function deleteFile(filePath: string): Promise<void> {
  if (filePath.startsWith("uploads/")) {
    return;
  }

  await supabaseAdmin.storage.from(BUCKET).remove([filePath]);
}
