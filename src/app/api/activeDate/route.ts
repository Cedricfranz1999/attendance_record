import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("Fetching latest attendance date..."); // Debug log

    // Fetch the latest attendance date
    const latestAttendance = await prisma.attendance.findFirst({
      orderBy: {
        date: "desc", // Order by date in descending order to get the latest date
      },
      select: {
        date: true, // Select only the date field
      },
    });

    console.log("Latest attendance date fetched:", latestAttendance); // Debug log

    // If no attendance records exist, return a 404 response
    if (!latestAttendance) {
      return new Response(
        JSON.stringify({ error: "No attendance records found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Return the latest attendance date
    return new Response(JSON.stringify(latestAttendance), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching latest attendance date:", error); // Debug log
    return new Response(
      JSON.stringify({ error: "Failed to fetch latest attendance date" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
