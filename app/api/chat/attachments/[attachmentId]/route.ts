import { NextResponse } from "next/server";

import { deleteStagedAttachmentForUser, AttachmentError } from "@/lib/attachments/service";
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { attachmentId } = await context.params;

    await deleteStagedAttachmentForUser(user.id, attachmentId);

    return new Response(null, {
      status: 204,
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

    console.error(
      "[api/chat/attachments/[attachmentId]] Failed to delete attachment.",
      error,
    );
    return jsonError("Unable to delete attachment.", 500, "attachment_upload_failed");
  }
}
