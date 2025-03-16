import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log("Processing POST request..."); // Debug log

    // Parse the request body
    const body = await request.json();
    const { attendanceId, studentId, subjectId, timeStart, timeEnd, paused } =
      body;

    console.log("Request body:", body); // Debug log

    // Validate required fields
    if (!attendanceId || !studentId) {
      return NextResponse.json(
        { error: "attendanceId and studentId are required" },
        { status: 400 },
      );
    }

    // If subjectId is null or not provided, create a standby record
    if (subjectId === null || subjectId === undefined) {
      // Get the current time in the Philippines (UTC+8)
      const currentTime = new Date();
      const philippinesTime = new Date(
        currentTime.getTime() + 8 * 60 * 60 * 1000,
      );

      // Create a standby record
      const standbyRecord = await prisma.standbyStudents.create({
        data: {
          startTime: philippinesTime, // Set to current time in the Philippines
          status: "PRESENT", // Default status
          studentId, // Associate with the student
        },
      });

      console.log("Standby record created:", standbyRecord); // Debug log

      // Return the standby record
      return NextResponse.json(standbyRecord, { status: 200 });
    }

    // If subjectId is provided, proceed with the attendance record upsert
    const updateData: Record<string, any> = {
      timeEnd,
      paused,
    };

    if (timeStart !== null && timeStart !== undefined) {
      updateData.timeStart = timeStart;
    }

    // Use upsert to either update or create a record
    const record = await prisma.attendanceRecord.upsert({
      where: {
        attendanceId_studentId_subjectId: {
          attendanceId,
          studentId,
          subjectId,
        },
      },
      update: updateData, // Dynamically built update object
      create: {
        attendanceId,
        studentId,
        subjectId,
        timeStart,
        timeEnd,
        paused,
      },
    });

    console.log("Upserted record:", record); // Debug log

    // Return the upserted record
    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    console.error("Error processing POST request:", error); // Debug log
    return NextResponse.json(
      { error: "Failed to process POST request" },
      { status: 500 },
    );
  }
}
