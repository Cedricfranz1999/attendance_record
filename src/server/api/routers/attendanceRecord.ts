import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const attendanceRecord = createTRPCRouter({
  getAttendanceById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.attendance.findUnique({
        where: { id: input.id },
      });
    }),

  getStudentsForAttendance: publicProcedure
    .input(
      z.object({
        attendanceId: z.number(),
        subjectId: z.number(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all students
      const students = await ctx.db.students.findMany({
        where: input.search
          ? {
              OR: [
                { firstname: { contains: input.search, mode: "insensitive" } },
                { lastName: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {},
        orderBy: [{ firstname: "asc" }, { lastName: "asc" }],
        include: {
          // Include the attendance record for this specific attendance and subject if it exists
          attendanceRecords: {
            where: {
              attendanceId: input.attendanceId,
              subjectId: input.subjectId,
            },
            take: 1,
          },
        },
      });

      // Transform the data to make it easier to work with
      return students.map((student) => ({
        ...student,
        attendanceRecord: student.attendanceRecords[0] || null,
      }));
    }),

  updateAttendanceRecords: publicProcedure
    .input(
      z.object({
        records: z.array(
          z.object({
            id: z.number().optional(), // Optional for new records
            studentId: z.number(),
            attendanceId: z.number(),
            subjectId: z.number(),
            status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]), // Updated to include EXCUSED
            timeStart: z.date().nullable().optional(),
            timeEnd: z.date().nullable().optional(),
            breakTime: z.number().nullable().optional(),
            paused: z.boolean().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Process each record - create new ones or update existing ones
      const results = await Promise.all(
        input.records.map(async (record) => {
          const data: any = {
            status: record.status,
          };

          // Only include fields if they are provided
          if (record.timeStart !== undefined) {
            data.timeStart = record.timeStart;
          }

          if (record.timeEnd !== undefined) {
            data.timeEnd = record.timeEnd;
          }

          if (record.breakTime !== undefined) {
            data.breakTime = record.breakTime;
          }

          if (record.paused !== undefined) {
            data.paused = record.paused;
          }

          if (record.id) {
            // Update existing record
            return ctx.db.attendanceRecord.update({
              where: { id: record.id },
              data,
            });
          } else {
            // Create new record
            return ctx.db.attendanceRecord.create({
              data: {
                studentId: record.studentId,
                attendanceId: record.attendanceId,
                subjectId: record.subjectId,
                status: record.status,
                ...(record.timeStart !== undefined && {
                  timeStart: record.timeStart,
                }),
                ...(record.timeEnd !== undefined && {
                  timeEnd: record.timeEnd,
                }),
                ...(record.breakTime !== undefined && {
                  breakTime: record.breakTime,
                }),
                ...(record.paused !== undefined && {
                  paused: record.paused,
                }),
              },
            });
          }
        }),
      );

      return { count: results.length };
    }),

  // Rest of your router code...
  startTimeTracking: publicProcedure
    .input(
      z.object({
        recordId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Use a more specific update that only updates the timeStart field
      return ctx.db.attendanceRecord.update({
        where: { id: input.recordId },
        data: {
          timeStart: new Date(),
          breakTime: 600, // Initialize break time to 10 minutes (600 seconds)
          paused: false, // Ensure break is not active
        },
      });
    }),

  stopTimeTracking: publicProcedure
    .input(
      z.object({
        recordId: z.number(),
        subjectDuration: z.number().optional(), // Add subject duration parameter
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current record to check the start time and break time
      const record = await ctx.db.attendanceRecord.findUnique({
        where: { id: input.recordId },
      });

      if (!record || !record.timeStart) {
        throw new Error("Record not found or time tracking not started");
      }

      // If a break is active, stop it first
      if (record.paused) {
        // Update the record to stop the break
        await ctx.db.attendanceRecord.update({
          where: { id: input.recordId },
          data: {
            paused: false,
          },
        });
      }

      // Calculate the end time
      let endTime = new Date();

      // If subject duration is provided, limit the end time based on the duration
      if (input.subjectDuration && record.timeStart) {
        const startTime = new Date(record.timeStart).getTime();
        const maxEndTime = new Date(
          startTime + input.subjectDuration * 60 * 1000,
        );

        // If the current time exceeds the max end time, use the max end time
        if (endTime > maxEndTime) {
          endTime = maxEndTime;
        }
      }

      // Calculate final total time in seconds if not already set
      let totalTimeRender = record.totalTimeRender;
      if (!totalTimeRender && record.timeStart) {
        const startTime = new Date(record.timeStart).getTime();
        const endTimeMs = endTime.getTime();
        totalTimeRender = Math.floor((endTimeMs - startTime) / 1000);
      }

      // Update the record with the calculated end time and total time render
      return ctx.db.attendanceRecord.update({
        where: { id: input.recordId },
        data: {
          timeEnd: endTime,
          paused: false, // Ensure break is not active
          totalTimeRender: totalTimeRender,
        },
      });
    }),

  // Add the missing startBreakTime procedure
  startBreakTime: publicProcedure
    .input(
      z.object({
        recordId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current record to check if it exists and has a start time
      const record = await ctx.db.attendanceRecord.findUnique({
        where: { id: input.recordId },
      });

      if (!record || !record.timeStart) {
        throw new Error("Record not found or time tracking not started");
      }

      if (record.timeEnd) {
        throw new Error(
          "Cannot start break time after time tracking has ended",
        );
      }

      if (record.paused) {
        throw new Error("Break already started");
      }

      if ((record.breakTime || 0) <= 0) {
        throw new Error("No break time remaining");
      }

      // Update the record to indicate break has started
      return ctx.db.attendanceRecord.update({
        where: { id: input.recordId },
        data: {
          paused: true, // Explicitly set paused to true in the database
        },
      });
    }),

  stopBreakTime: publicProcedure
    .input(
      z.object({
        recordId: z.number(),
        elapsedBreakTime: z.number(), // Elapsed break time in seconds
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current record to check if it exists and has a start time
      const record = await ctx.db.attendanceRecord.findUnique({
        where: { id: input.recordId },
      });

      if (!record || !record.timeStart) {
        throw new Error("Record not found or time tracking not started");
      }

      if (record.timeEnd) {
        throw new Error("Cannot stop break time after time tracking has ended");
      }

      // Calculate the remaining break time
      const currentBreakTime = record.breakTime || 600; // Default to 10 minutes if null
      const newBreakTime = Math.max(
        0,
        currentBreakTime - input.elapsedBreakTime,
      );

      // Update the record with the new break time and explicitly set paused to false
      return ctx.db.attendanceRecord.update({
        where: { id: input.recordId },
        data: {
          breakTime: newBreakTime,
          paused: false, // Always set paused to false when stopping break time
        },
      });
    }),

  updateBreakTime: publicProcedure
    .input(
      z.object({
        recordId: z.number(),
        breakTime: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current record to check if it exists
      const record = await ctx.db.attendanceRecord.findUnique({
        where: { id: input.recordId },
      });

      if (!record) {
        throw new Error("Record not found");
      }

      // Update the break time without changing paused status
      return ctx.db.attendanceRecord.update({
        where: { id: input.recordId },
        data: {
          breakTime: input.breakTime,
          // Don't change paused status here - we want to keep paused as true even when break time is 0
        },
      });
    }),

  updateTotalTimeRender: publicProcedure
    .input(
      z.object({
        recordId: z.number(),
        totalTimeRender: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current record to check if it's paused and has break time
      const record = await ctx.db.attendanceRecord.findUnique({
        where: { id: input.recordId },
      });

      if (!record) {
        throw new Error("Record not found");
      }

      // Only update totalTimeRender if:
      // 1. Not paused, OR
      // 2. Paused but has break time remaining
      if (!record.paused || (record.paused && (record.breakTime || 0) > 0)) {
        // Update the totalTimeRender field
        return ctx.db.attendanceRecord.update({
          where: { id: input.recordId },
          data: {
            totalTimeRender: input.totalTimeRender,
          },
        });
      }

      // If paused with no break time, don't update totalTimeRender
      return record;
    }),

  autoAdjustStatus: publicProcedure
    .input(
      z.object({
        attendanceId: z.number(),
        subjectId: z.number(),
        subjectStartTime: z.date(),
        minPercentage: z.number().default(75), // Default to 75% attendance required
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get all attendance records for this attendance and subject
      const records = await ctx.db.attendanceRecord.findMany({
        where: {
          attendanceId: input.attendanceId,
          subjectId: input.subjectId,
          timeStart: { not: null }, // Only consider records with time tracking data
        },
      });

      if (records.length === 0) {
        return { count: 0 };
      }

      // Get the subject to calculate duration
      const subject = await ctx.db.subject.findUnique({
        where: { id: input.subjectId },
      });

      if (!subject) {
        throw new Error("Subject not found");
      }

      // Calculate subject duration in minutes
      let subjectDuration = 0;
      if (subject.startTime && subject.endTime) {
        const startTime = new Date(subject.startTime).getTime();
        const endTime = new Date(subject.endTime).getTime();
        subjectDuration = Math.floor((endTime - startTime) / (1000 * 60));
      } else if (subject.duration) {
        subjectDuration = subject.duration;
      } else {
        throw new Error("Subject duration not available");
      }

      // Process each record to determine the appropriate status
      const updatePromises = records.map(async (record) => {
        if (!record.timeStart) return null; // Skip records without time tracking

        // Calculate end time (use current time if not ended yet)
        const endTime = record.timeEnd || new Date();

        // Calculate duration in minutes
        const startTime = new Date(record.timeStart).getTime();
        const endTimeMs = new Date(endTime).getTime();
        const durationMinutes = Math.floor(
          (endTimeMs - startTime) / (1000 * 60),
        );

        // Calculate percentage of attendance
        const percentage = (durationMinutes / subjectDuration) * 100;

        // Determine if student was late
        const studentStartTime = new Date(record.timeStart);
        const subjectStart = new Date(input.subjectStartTime);
        const isLate = studentStartTime > subjectStart;

        // Determine status based on criteria
        let newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

        if (percentage < input.minPercentage) {
          // Less than minimum percentage = ABSENT
          newStatus = "ABSENT";
        } else if (isLate) {
          // More than minimum percentage but late = LATE
          newStatus = "LATE";
        } else {
          // More than minimum percentage and on time = PRESENT
          newStatus = "PRESENT";
        }

        // Only update if status has changed
        if (record.status !== newStatus) {
          return ctx.db.attendanceRecord.update({
            where: { id: record.id },
            data: { status: newStatus },
          });
        }

        return null;
      });

      // Execute all updates and filter out null results
      const results = (await Promise.all(updatePromises)).filter(Boolean);

      return { count: results.length };
    }),

  createAttendance: publicProcedure
    .input(
      z.object({
        date: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if attendance for this date already exists
      const existingAttendance = await ctx.db.attendance.findUnique({
        where: { date: input.date },
      });

      if (existingAttendance) {
        return existingAttendance;
      }

      // Create new attendance
      return ctx.db.attendance.create({
        data: {
          date: input.date,
        },
      });
    }),
});

export default attendanceRecord;
