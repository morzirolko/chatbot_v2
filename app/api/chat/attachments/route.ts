import { NextResponse } from "next/server";

import { uploadAttachmentForUser, AttachmentError } from "@/lib/attachments/service";
import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(
    {
      error: message,
      code,
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const formData = await request.formData();
    const files = formData.getAll("file");
    const [file] = files;

    if (files.length !== 1) {
      return jsonError("Exactly one file is required.", 400, "attachment_upload_failed");
    }

    if (!(file instanceof File)) {
      return jsonError("A file is required.", 400, "attachment_upload_failed");
    }

    const payload = await uploadAttachmentForUser(user.id, file);

    return NextResponse.json(payload, {
      status: 201,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return jsonError("Authentication required.", 401);
    }

    if (error instanceof AttachmentError) {
      return jsonError(error.message, error.status, error.code);
    }

    console.error("[api/chat/attachments] Failed to upload attachment.", error);
    return jsonError("Unable to upload attachment.", 500, "attachment_upload_failed");
  }
}
