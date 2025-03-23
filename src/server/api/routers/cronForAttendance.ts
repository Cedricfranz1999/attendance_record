import { createTRPCRouter, publicProcedure } from "../trpc";

export const cronForAttendanceRouter = createTRPCRouter({
  ensureAttendanceForToday: publicProcedure.mutation(async ({ ctx }) => {
    const today = new Date();

    // Set the time to the start of the day in the local timezone (Philippines)
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

    console.log("Local start of day:", startOfDayLocal.toISOString());
    console.log("UTC start of day:", startOfDayUTC.toISOString());

    const existingAttendance = await ctx.db.attendance.findFirst({
      where: { date: startOfDayUTC },
    });

    let attendance;
    if (!existingAttendance) {
      try {
        attendance = await ctx.db.attendance.upsert({
          where: { date: startOfDayUTC },
          update: {}, // No updates needed
          create: { date: startOfDayUTC },
        });
      } catch (error) {
        // Handle race condition by finding the record again
        attendance = await ctx.db.attendance.findFirst({
          where: { date: startOfDayUTC },
        });

        if (!attendance) throw error;
      }
      await ctx.db.subject.updateMany({
        data: { active: false },
      });
    } else {
      attendance = existingAttendance;
    }

    // **Set all subjects to inactive**

    return attendance;
  }),
});
