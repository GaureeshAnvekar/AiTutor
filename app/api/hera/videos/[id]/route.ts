import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const HERA_API_BASE_URL = "https://api.hera.video/v1";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.HERA_API_KEY) {
      return NextResponse.json({ error: "Hera API key not configured" }, { status: 500 });
    }

    const heraResponse = await fetch(`${HERA_API_BASE_URL}/videos/${params.id}`, {
      headers: {
        "x-api-key": process.env.HERA_API_KEY,
      },
      cache: "no-store",
    });

    const data = await heraResponse.json().catch(() => ({}));

    if (!heraResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch Hera video status", details: data },
        { status: heraResponse.status }
      );
    }

    const playableOutput = data.outputs?.find((output: any) => output.status === "success" && output.file_url);

    return NextResponse.json({
      videoId: data.video_id,
      projectUrl: data.project_url,
      status: data.status,
      videoUrl: playableOutput?.file_url || null,
      outputs: data.outputs || [],
    });
  } catch (error) {
    console.error("Hera video status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
