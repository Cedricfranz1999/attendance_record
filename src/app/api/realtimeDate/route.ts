import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    console.log("Creating attendance..."); // Debug log
    const { date } = await request.json();

    const attendance = await prisma.attendance.create({
      data: { date: new Date(date) },
    });

    console.log("Attendance created:", attendance); // Debug log

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance:", error); // Debug log
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 },
    );
  }
}
