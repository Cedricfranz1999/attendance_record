import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: {
  json: () => PromiseLike<{ date: string }> | { date: string };
}) {
  try {
    console.log("Creating attendance..."); // Debug log
    const { date } = await request.json();

    const attendance = await prisma.attendance.create({
      data: { date: new Date(date) },
    });

    console.log("Attendance created:", attendance); // Debug log

    return new Response(JSON.stringify(attendance), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating attendance:", error); // Debug log
    return new Response(
      JSON.stringify({ error: "Failed to create attendance" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
