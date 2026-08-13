import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function GET() {
  try {
    const result = await cloudinary.api.resources({
      resource_type: "video",
      max_results: 1,
    });

    return NextResponse.json({
      success: true,
      message: "Cloudinary connection successful",
      resources: result.resources,
    });
  } catch (error) {
    console.error("Cloudinary error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Cloudinary connection failed",
      },
      { status: 500 }
    );
  }
}