import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const HERA_API_BASE_URL = "https://api.hera.video/v1";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.HERA_API_KEY) {
      return NextResponse.json({ error: "Hera API key not configured" }, { status: 500 });
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const heraResponse = await fetch(`${HERA_API_BASE_URL}/videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.HERA_API_KEY,
      },
      body: JSON.stringify({
        prompt: `Create a concise educational motion graphic that visually explains this tutoring response. Use clear labels, simple diagrams, smooth motion, and avoid adding unsupported facts:\n\n${prompt}`,
        //duration_seconds: 8,
        outputs: [
          {
            format: "mp4",
            aspect_ratio: "16:9",
            fps: "30",
            resolution: "480p",
          },
        ],
      }),
    });

    const data = await heraResponse.json().catch(() => ({}));

    if (!heraResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to create Hera video", details: data },
        { status: heraResponse.status }
      );
    }

    return NextResponse.json({
      videoId: data.video_id,
      projectUrl: data.project_url,
    });
  } catch (error) {
    console.error("Hera video creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
