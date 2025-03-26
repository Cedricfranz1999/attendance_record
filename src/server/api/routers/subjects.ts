import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { AttendanceStatus } from "@prisma/client";

export const SubjectsRouter = createTRPCRouter({
  deactivateAllSubjects: publicProcedure.mutation(async ({ ctx }) => {
    // Deactivate all subjects
    const result = await ctx.db.subject.updateMany({
      data: {
        active: false,
      },
    });

    return {
      message: "All subjects deactivated successfully",
      count: result.count,
    };
  }),
  toggleSubjectActive: publicProcedure
    .input(z.object({ subjectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Starting toggleSubjectActive procedure...");

        // Get the new subject to activate
        console.log("Fetching new subject...");
        const newSubject = await ctx.db.subject.findUnique({
          where: { id: input.subjectId },
        });

        if (!newSubject) {
          throw new Error("Subject not found");
        }
        console.log("New subject found:", newSubject);

        // Get the currently active subject (if any)
        console.log("Fetching currently active subject...");
        const activeSubject = await ctx.db.subject.findFirst({
          where: { active: true },
        });
        console.log("Active subject:", activeSubject);

        // Get the latest attendance record
        console.log("Fetching latest attendance record...");
        const latestAttendance = await ctx.db.attendance.findFirst({
          orderBy: { date: "desc" }, // Get the most recent attendance by date
        });

        if (!latestAttendance) {
          throw new Error("No attendance record found");
        }
        console.log("Latest attendance record found:", latestAttendance);

        const latestAttendanceId = latestAttendance.id;
        console.log("Latest attendance ID:", latestAttendanceId);

        // Get ALL students
        console.log("Fetching all students...");
        const allStudents = await ctx.db.students.findMany();
        console.log(`Found ${allStudents.length} students`);

        if (activeSubject) {
          // If there is an active subject, get its attendance records
          console.log("Fetching attendance records for active subject...");
          const attendanceRecords = await ctx.db.attendanceRecord.findMany({
            where: {
              subjectId: activeSubject.id,
              attendanceId: latestAttendanceId, // Make sure we're using records from the latest attendance
            },
          });
          console.log("Attendance records found:", attendanceRecords);

          // Update the past subject's attendance records to add timeEnd and set paused to false
          // But only for PRESENT and LATE statuses
          console.log("Updating past subject's attendance records...");
          await Promise.all(
            attendanceRecords.map(async (record) => {
              // Only update timeEnd for PRESENT and LATE statuses
              const updateData: any = { paused: false };

              if (
                record.status === AttendanceStatus.PRESENT ||
                record.status === AttendanceStatus.LATE
              ) {
                updateData.timeEnd = activeSubject.endTime;
              }

              console.log(
                "Updating record for student:",
                record.studentId,
                "with data:",
                updateData,
              );

              await ctx.db.attendanceRecord.update({
                where: { id: record.id },
                data: updateData,
              });
              console.log("Record updated for student:", record.studentId);
            }),
          );

          // Create maps of student IDs to their status and totalTimeRender from the previous subject
          const studentStatusMap = new Map();
          const studentTotalTimeRenderMap = new Map();
          attendanceRecords.forEach((record) => {
            studentStatusMap.set(record.studentId, record.status);
            studentTotalTimeRenderMap.set(
              record.studentId,
              record.totalTimeRender || 0,
            );
          });

          // Create new attendance records for ALL students for the new subject
          console.log(
            "Creating new attendance records for ALL students for the new subject...",
          );
          await Promise.all(
            allStudents.map(async (student) => {
              // Get the status from the previous subject, or default to ABSENT
              const status =
                studentStatusMap.get(student.id) || AttendanceStatus.ABSENT;

              // Get the totalTimeRender from the previous subject, or default to 0
              const totalTimeRender =
                studentTotalTimeRenderMap.get(student.id) || 0;

              console.log(
                "Creating new record for student:",
                student.id,
                "with status:",
                status,
                "and totalTimeRender:",
                totalTimeRender,
              );

              // Only set timeStart for PRESENT or LATE status
              const timeStart =
                status === AttendanceStatus.PRESENT ||
                status === AttendanceStatus.LATE
                  ? newSubject.startTime
                  : null;

              // Check if record exists first
              const existingRecord = await ctx.db.attendanceRecord.findUnique({
                where: {
                  attendanceId_studentId_subjectId: {
                    attendanceId: latestAttendanceId,
                    studentId: student.id,
                    subjectId: input.subjectId,
                  },
                },
              });

              if (existingRecord) {
                // Update existing record
                console.log(
                  "Existing record found, updating instead of creating",
                );
                await ctx.db.attendanceRecord.update({
                  where: {
                    id: existingRecord.id,
                  },
                  data: {
                    status: status,
                    timeStart: timeStart,
                    timeEnd: null,
                    breakTime: 600,
                    totalTimeRender: totalTimeRender,
                    paused: false,
                  },
                });
              } else {
                // Create new record
                await ctx.db.attendanceRecord.create({
                  data: {
                    attendanceId: latestAttendanceId,
                    studentId: student.id,
                    subjectId: input.subjectId,
                    status: "ABSENT", // Inherit status from previous subject or default to ABSENT
                    timeStart: timeStart, // Only set timeStart for PRESENT or LATE
                    timeEnd: null, // timeEnd is not set initially
                    breakTime: 600, // Default breakTime
                    totalTimeRender: totalTimeRender, // Preserve totalTimeRender from previous subject
                    paused: false, // Set paused to false
                  },
                });
              }
            }),
          );
        } else {
          // If no subject is active, check for standby students first
          console.log("No active subject found. Fetching standby students...");
          const standbyStudents = await ctx.db.standbyStudents.findMany({
            include: { student: true },
          });
          console.log("Standby students found:", standbyStudents);

          // Create a map of standby student IDs
          const standbyStudentIds = new Set(
            standbyStudents.map((s) => s.studentId),
          );

          // Process standby students
          await Promise.all(
            standbyStudents.map(async (standbyStudent) => {
              console.log(
                "Creating new record for standby students:",
                standbyStudent.studentId,
              );

              // Convert string status to enum value
              let statusValue: AttendanceStatus = AttendanceStatus.ABSENT;

              if (standbyStudent.status) {
                if (
                  Object.values(AttendanceStatus).includes(
                    standbyStudent.status as any,
                  )
                ) {
                  statusValue = standbyStudent.status as AttendanceStatus;
                }
              }

              // Check if record exists first
              const existingRecord = await ctx.db.attendanceRecord.findUnique({
                where: {
                  attendanceId_studentId_subjectId: {
                    attendanceId: latestAttendanceId,
                    studentId: standbyStudent.studentId,
                    subjectId: input.subjectId,
                  },
                },
              });

              if (existingRecord) {
                // Update existing record
                console.log(
                  "Existing record found for standby student, updating instead of creating",
                );
                await ctx.db.attendanceRecord.update({
                  where: {
                    id: existingRecord.id,
                  },
                  data: {
                    status: statusValue,
                    timeStart: newSubject.startTime,
                    timeEnd: null,
                    breakTime: 600,
                    totalTimeRender: 0,
                    paused: false,
                  },
                });
              } else {
                // Create new record
                await ctx.db.attendanceRecord.create({
                  data: {
                    attendanceId: latestAttendanceId,
                    studentId: standbyStudent.studentId,
                    subjectId: input.subjectId,
                    status: statusValue, // Use the converted enum value
                    timeStart: newSubject.startTime, // Use the subject's start time instead of standby start time
                    timeEnd: null, // timeEnd is not set initially
                    breakTime: 600, // Default breakTime
                    totalTimeRender: 0, // Default to 0 for standby students since they don't have totalTimeRender field
                    paused: false, // Set paused to false
                  },
                });
              }

              console.log(
                "New record created for standby student:",
                standbyStudent.studentId,
              );

              // Delete the standby student record
              console.log(
                "Deleting standby student record:",
                standbyStudent.id,
              );
              await ctx.db.standbyStudents.delete({
                where: { id: standbyStudent.id },
              });
              console.log("Standby student record deleted:", standbyStudent.id);
            }),
          );

          // Create records for all other students (not standby) with ABSENT status
          console.log(
            "Creating records for all other students with ABSENT status...",
          );
          await Promise.all(
            allStudents
              .filter((student) => !standbyStudentIds.has(student.id))
              .map(async (student) => {
                console.log(
                  "Creating new record for non-standby student:",
                  student.id,
                );

                // Check if record exists first
                const existingRecord = await ctx.db.attendanceRecord.findUnique(
                  {
                    where: {
                      attendanceId_studentId_subjectId: {
                        attendanceId: latestAttendanceId,
                        studentId: student.id,
                        subjectId: input.subjectId,
                      },
                    },
                  },
                );

                if (existingRecord) {
                  // Update existing record
                  console.log(
                    "Existing record found for non-standby student, updating instead of creating",
                  );
                  await ctx.db.attendanceRecord.update({
                    where: {
                      id: existingRecord.id,
                    },
                    data: {
                      status: AttendanceStatus.ABSENT,
                      timeStart: null,
                      timeEnd: null,
                      breakTime: 600,
                      totalTimeRender: 0,
                      paused: false,
                    },
                  });
                } else {
                  // Create new record
                  await ctx.db.attendanceRecord.create({
                    data: {
                      attendanceId: latestAttendanceId,
                      studentId: student.id,
                      subjectId: input.subjectId,
                      status: AttendanceStatus.ABSENT, // Default to ABSENT for non-standby students
                      timeStart: null, // No timeStart for ABSENT
                      timeEnd: null, // timeEnd is not set initially
                      breakTime: 600, // Default breakTime
                      totalTimeRender: 0, // Default to 0 for non-standby students
                      paused: false, // Set paused to false
                    },
                  });
                }

                console.log(
                  "New record created for non-standby student:",
                  student.id,
                );
              }),
          );
        }

        // Deactivate all subjects
        console.log("Deactivating all subjects...");
        await ctx.db.subject.updateMany({
          data: {
            active: false,
          },
        });
        console.log("All subjects deactivated.");

        // Activate the new subject
        console.log("Activating new subject...");
        const updatedSubject = await ctx.db.subject.update({
          where: { id: input.subjectId },
          data: {
            active: true,
          },
        });
        console.log("New subject activated:", updatedSubject);

        return updatedSubject;
      } catch (error) {
        console.error("Error in toggleSubjectActive:", error);
        throw new Error("Failed to toggle subject active status");
      }
    }),

  getSubjects: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
        teacherId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const total = await ctx.db.subject.count({
        where: {
          AND: [
            input.search
              ? {
                  name: { contains: input.search, mode: "insensitive" },
                }
              : {},
            input.teacherId ? { teacherId: input.teacherId } : {},
          ],
        },
      });

      const data = await ctx.db.subject.findMany({
        where: {
          AND: [
            input.search
              ? {
                  name: { contains: input.search, mode: "insensitive" },
                }
              : {},
            input.teacherId ? { teacherId: input.teacherId } : {},
          ],
        },
        include: {
          teacher: true,
        },
        orderBy: {
          order: "asc",
        },
        skip: input.skip,
        take: input.take,
      });

      return { data, total };
    }),

  getSubjectById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.subject.findUnique({
        where: { id: input.id },
        include: {
          teacher: true,
        },
      });
    }),

  createOrUpdateSubject: publicProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string(),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        duration: z.number().optional().nullable(),
        teacherId: z.number(),
        order: z.number().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Convert string times to Date objects if provided
      const startTime = input.startTime ? new Date(input.startTime) : null;
      const endTime = input.endTime ? new Date(input.endTime) : null;

      if (input.id) {
        return ctx.db.subject.update({
          where: { id: input.id },
          data: {
            name: input.name,
            startTime,
            endTime,
            duration: input.duration,
            teacherId: input.teacherId,
            order: input.order,
          },
          include: {
            teacher: true,
          },
        });
      } else {
        return ctx.db.subject.create({
          data: {
            name: input.name,
            startTime,
            endTime,
            duration: input.duration,
            teacherId: input.teacherId,
            order: input.order,
          },
          include: {
            teacher: true,
          },
        });
      }
    }),

  deleteSubject: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.subject.delete({
        where: { id: input.id },
      });
      return { message: "Subject deleted successfully" };
    }),

  getAllTeachers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.teacher.findMany({
      orderBy: { firstname: "asc" },
      select: {
        id: true,
        firstname: true,
        middleName: true,
        lastName: true,
        image: true,
      },
    });
  }),
});

export default SubjectsRouter;
