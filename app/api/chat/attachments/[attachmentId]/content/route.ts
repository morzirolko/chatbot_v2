import { AttachmentError, getAttachmentContentForUser } from "@/lib/attachments/service";
import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";

function buildContentDisposition(fileName: string) {
  return `inline; filename="${fileName.replace(/"/g, "")}"`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { attachmentId } = await context.params;
    const attachment = await getAttachmentContentForUser(user.id, attachmentId);

    return new Response(await attachment.blob.arrayBuffer(), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": buildContentDisposition(attachment.originalName),
        "Content-Type": attachment.mimeType,
      },
    });
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return Response.json(
        { error: "Authentication required." },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (error instanceof AttachmentError) {
      return Response.json(
        { error: error.message, code: error.code },
        {
          status: error.status,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    console.error(
      "[api/chat/attachments/[attachmentId]/content] Failed to stream attachment.",
      error,
    );
    return Response.json(
      { error: "Unable to load attachment.", code: "attachment_upload_failed" },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
