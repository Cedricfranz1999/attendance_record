import { createTRPCRouter, publicProcedure } from "../trpc";

export const cronForAttendanceRouter = createTRPCRouter({
  ensureAttendanceForToday: publicProcedure.mutation(async ({ ctx }) => {
    // Get the current date in the local timezone (Philippines)
    const today = new Date();

    // Set the time to the start of the day in the local timezone
    const startOfDayLocal = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0,
    );

    // Convert the local start of the day to UTC
    const startOfDayUTC = new Date(
      Date.UTC(
        startOfDayLocal.getFullYear(),
        startOfDayLocal.getMonth(),
        startOfDayLocal.getDate(),
        0,
        0,
        0,
        0,
      ),
    );

    // Log for debugging
    console.log("Local start of day:", startOfDayLocal.toISOString());
    console.log("UTC start of day:", startOfDayUTC.toISOString());

    const existingAttendance = await ctx.db.attendance.findFirst({
      where: {
        date: startOfDayUTC,
      },
    });

    // If no record exists, create one with upsert to avoid race conditions
    if (!existingAttendance) {
      try {
        const newAttendance = await ctx.db.attendance.upsert({
          where: {
            date: startOfDayUTC,
          },
          update: {}, // No updates needed if it exists
          create: {
            date: startOfDayUTC,
          },
        });
        return newAttendance;
      } catch (error) {
        // If there's still an error, try to find the record again
        // as it might have been created in a race condition
        const retryExistingAttendance = await ctx.db.attendance.findFirst({
          where: {
            date: startOfDayUTC,
          },
        });

        if (retryExistingAttendance) {
          return retryExistingAttendance;
        }

        throw error; // If we still can't find it, rethrow the error
      }
    }

    return existingAttendance;
  }),
});
