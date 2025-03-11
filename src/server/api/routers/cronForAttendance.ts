import { createTRPCRouter, publicProcedure } from "../trpc";

export const cronForAttendanceRouter = createTRPCRouter({
  ensureAttendanceForToday: publicProcedure.mutation(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await ctx.db.attendance.findFirst({
      where: {
        date: today,
      },
    });

    // If no record exists, create one with upsert to avoid race conditions
    if (!existingAttendance) {
      try {
        const newAttendance = await ctx.db.attendance.upsert({
          where: {
            date: today,
          },
          update: {}, // No updates needed if it exists
          create: {
            date: today,
          },
        });
        return newAttendance;
      } catch (error) {
        // If there's still an error, try to find the record again
        // as it might have been created in a race condition
        const retryExistingAttendance = await ctx.db.attendance.findFirst({
          where: {
            date: today,
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
