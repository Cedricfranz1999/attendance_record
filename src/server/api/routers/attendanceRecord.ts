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
            status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Process each record - create new ones or update existing ones
      const results = await Promise.all(
        input.records.map(async (record) => {
          if (record.id) {
            // Update existing record
            return ctx.db.attendanceRecord.update({
              where: { id: record.id },
              data: {
                status: record.status,
              },
            });
          } else {
            // Create new record
            return ctx.db.attendanceRecord.create({
              data: {
                studentId: record.studentId,
                attendanceId: record.attendanceId,
                subjectId: record.subjectId,
                status: record.status,
                remainingBreak: 600, // 10 minutes in seconds
              },
            });
          }
        }),
      );

      return { count: results.length };
    }),

  // New procedure to handle camera detection events
  updateDetectionStatus: publicProcedure
    .input(
      z.object({
        recordId: z.number(),
        type: z.enum(["in", "out"]),
        value: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.attendanceRecord.findUnique({
        where: { id: input.recordId },
      });

      if (!record) {
        throw new Error("Attendance record not found");
      }

      const now = new Date();

      if (input.type === "in") {
        // Student entering the classroom
        if (input.value && !record.detectIn) {
          // Student is entering for the first time
          if (!record.timeStart) {
            return ctx.db.attendanceRecord.update({
              where: { id: input.recordId },
              data: {
                detectIn: true,
                detectOut: false,
                active: true,
                timeStart: now,
              },
            });
          }
          // Student is re-entering after a break
          else {
            // Calculate how much break time was used
            let updatedRemainingBreak = record.remainingBreak;
            const updatedTotalTime = record.totalTime || 0;

            if (record.lastExitTime) {
              const breakDuration = Math.floor(
                (now.getTime() - record.lastExitTime.getTime()) / 1000,
              );

              // If student had remaining break time, use it
              if (record.remainingBreak > 0) {
                updatedRemainingBreak = Math.max(
                  0,
                  record.remainingBreak - breakDuration,
                );
              }
              // If no break time left, don't count the time they were out
              else {
                // No need to update total time as the break time was exhausted
              }
            }

            return ctx.db.attendanceRecord.update({
              where: { id: input.recordId },
              data: {
                detectIn: true,
                detectOut: false,
                active: true,
                remainingBreak: updatedRemainingBreak,
                totalTime: updatedTotalTime,
              },
            });
          }
        }
        // Student is already detected as in, no change needed
        else if (!input.value && record.detectIn) {
          return ctx.db.attendanceRecord.update({
            where: { id: input.recordId },
            data: {
              detectIn: false,
              active: false,
            },
          });
        }
      } else if (input.type === "out") {
        // Student exiting the classroom
        if (input.value && !record.detectOut) {
          // Record the exit time
          return ctx.db.attendanceRecord.update({
            where: { id: input.recordId },
            data: {
              detectOut: true,
              detectIn: false,
              active: false,
              lastExitTime: now,
            },
          });
        }
        // Student is no longer detected as out
        else if (!input.value && record.detectOut) {
          return ctx.db.attendanceRecord.update({
            where: { id: input.recordId },
            data: {
              detectOut: false,
            },
          });
        }
      }

      // If no conditions were met, just return the record
      return record;
    }),

  // New procedure to handle camera detection from automated systems
  cameraDetection: publicProcedure
    .input(
      z.object({
        studentId: z.number(),
        attendanceId: z.number(),
        subjectId: z.number(),
        cameraType: z.enum(["entrance", "exit"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the attendance record or create if it doesn't exist
      let record = await ctx.db.attendanceRecord.findFirst({
        where: {
          studentId: input.studentId,
          attendanceId: input.attendanceId,
          subjectId: input.subjectId,
        },
      });

      const now = new Date();

      if (!record) {
        // Create a new record if none exists
        record = await ctx.db.attendanceRecord.create({
          data: {
            studentId: input.studentId,
            attendanceId: input.attendanceId,
            subjectId: input.subjectId,
            status: "PRESENT",
            remainingBreak: 600, // 10 minutes in seconds
          },
        });
      }

      // Handle entrance camera detection
      if (input.cameraType === "entrance") {
        // If student is entering for the first time
        if (!record.timeStart) {
          return ctx.db.attendanceRecord.update({
            where: { id: record.id },
            data: {
              detectIn: true,
              detectOut: false,
              active: true,
              timeStart: now,
            },
          });
        }
        // Student is re-entering after a break
        else if (record.detectOut) {
          // Calculate how much break time was used
          let updatedRemainingBreak = record.remainingBreak;
          const updatedTotalTime = record.totalTime || 0;

          if (record.lastExitTime) {
            const breakDuration = Math.floor(
              (now.getTime() - record.lastExitTime.getTime()) / 1000,
            );

            // If student had remaining break time, use it
            if (record.remainingBreak > 0) {
              updatedRemainingBreak = Math.max(
                0,
                record.remainingBreak - breakDuration,
              );
            }
          }

          return ctx.db.attendanceRecord.update({
            where: { id: record.id },
            data: {
              detectIn: true,
              detectOut: false,
              active: true,
              remainingBreak: updatedRemainingBreak,
              totalTime: updatedTotalTime,
            },
          });
        }
      }
      // Handle exit camera detection
      else if (input.cameraType === "exit") {
        // Only process if the student was previously detected as in
        if (record.detectIn) {
          // Calculate time spent in class for this session
          let updatedTotalTime = record.totalTime || 0;

          if (record.timeStart) {
            const sessionDuration = Math.floor(
              (now.getTime() - record.timeStart.getTime()) / 1000,
            );
            updatedTotalTime += sessionDuration;
          }

          return ctx.db.attendanceRecord.update({
            where: { id: record.id },
            data: {
              detectIn: false,
              detectOut: true,
              active: false,
              lastExitTime: now,
              totalTime: updatedTotalTime,
            },
          });
        }
      }

      // If no conditions were met, just return the record
      return record;
    }),

  // Calculate total attendance time for reporting
  calculateAttendanceTime: publicProcedure
    .input(
      z.object({
        attendanceId: z.number(),
        subjectId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.attendanceRecord.findMany({
        where: {
          attendanceId: input.attendanceId,
          subjectId: input.subjectId,
        },
        include: {
          student: true,
        },
      });

      const now = new Date();

      // Calculate current total time for each student
      return records.map((record) => {
        let totalTime = record.totalTime || 0;

        // If student is currently active, add the current session time
        if (record.active && record.timeStart) {
          const currentSessionTime = Math.floor(
            (now.getTime() - record.timeStart.getTime()) / 1000,
          );
          totalTime += currentSessionTime;
        }

        return {
          studentId: record.studentId,
          studentName: `${record.student.firstname} ${record.student.lastName}`,
          totalTimeSeconds: totalTime,
          totalTimeFormatted: formatDuration(totalTime),
          status: record.status,
          remainingBreak: record.remainingBreak,
        };
      });
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

// Helper function to format duration
function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default attendanceRecord;
