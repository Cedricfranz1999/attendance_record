import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log("Processing POST request...");

    // Parse the request body
    const body = await request.json();
    const { attendanceId, studentId, subjectId, paused } = body;

    console.log("Request body:", body);

    // Validate required fields
    if (!attendanceId || !studentId || !subjectId) {
      return NextResponse.json(
        { error: "attendanceId, studentId, and subjectId are required" },
        { status: 400 },
      );
    }

    // ✅ Get the correct Philippines time (UTC+8)
    const philippinesTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
    });

    const formattedPhilippinesTime = new Date(philippinesTime);

    // Find the existing attendance record
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        attendanceId_studentId_subjectId: {
          attendanceId,
          studentId,
          subjectId,
        },
      },
    });

    // ✅ If paused is true and there is no timeStart, do nothing and return success
    if (paused && existingRecord && !existingRecord.timeStart) {
      console.log(
        "No action taken as 'paused' is true and no timeStart exists.",
      );
      return NextResponse.json({ message: "No action taken" }, { status: 200 });
    }

    let record;

    if (existingRecord) {
      // Preserve totalTimeRender by not modifying it
      const updateData: Record<string, any> = { paused };

      if (!existingRecord.timeStart) {
        updateData.timeStart = formattedPhilippinesTime;
      }

      // ✅ Ensure totalTimeRender remains unchanged
      record = await prisma.attendanceRecord.update({
        where: {
          attendanceId_studentId_subjectId: {
            attendanceId,
            studentId,
            subjectId,
          },
        },
        data: updateData,
      });
    } else {
      // Create a new record with the correct time
      record = await prisma.attendanceRecord.create({
        data: {
          attendanceId,
          studentId,
          subjectId,
          timeStart: formattedPhilippinesTime,
          paused,
        },
      });
    }

    console.log("Record processed:", record);
    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return NextResponse.json(
      { error: "Failed to process POST request" },
      { status: 500 },
    );
  }
}
