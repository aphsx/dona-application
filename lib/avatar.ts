const AVATAR_SIZE = 128;
const WEBP_QUALITY = 0.72;

/** Resize + compress a picked image to a tiny WebP avatar blob. */
export async function compressAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("กรุณาเลือกรูปภาพ");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ไม่สามารถประมวลผลรูปได้");

    const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (AVATAR_SIZE - w) / 2, (AVATAR_SIZE - h) / 2, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob) throw new Error("บีบอัดรูปไม่สำเร็จ");
    return blob;
  } finally {
    bitmap.close();
  }
}
