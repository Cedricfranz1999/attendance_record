import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("Fetching students..."); // Debug log
    const students = await prisma.students.findMany({
      select: {
        id: true,
        firstname: true,
        middleName: true,
        lastName: true,
        image: true,
      },
    });
    console.log("Students fetched:", students); // Debug log

    // Correctly format the Response object
    return new Response(JSON.stringify(students), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error); // Debug log
    return new Response(JSON.stringify({ error: "Failed to fetch students" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
