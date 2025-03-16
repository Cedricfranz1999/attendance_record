import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("Fetching active subject ID..."); // Debug log

    // Fetch the active subject
    const activeSubject = await prisma.subject.findFirst({
      where: {
        active: true, // Only fetch subjects where `active` is true
      },
      select: {
        id: true, // Select only the ID field
      },
    });

    console.log("Active subject fetched:", activeSubject); // Debug log

    // If no active subject is found, return a 404 response
    if (!activeSubject) {
      return new Response(
        JSON.stringify({ error: "No active subject found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Return the active subject ID
    return new Response(JSON.stringify(activeSubject), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching active subject ID:", error); // Debug log
    return new Response(
      JSON.stringify({ error: "Failed to fetch active subject ID" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
