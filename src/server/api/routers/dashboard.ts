import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { format, subDays, getDay } from "date-fns";

export const DashboardRouter = createTRPCRouter({
  // Get summary statistics
  getSummaryStats: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      const lastWeek = subDays(today, 7);

      // Base where clause for filtering by subject
      const subjectFilter =
        input?.subjectId && input.subjectId !== "all"
          ? { subjectId: Number.parseInt(input.subjectId) }
          : {};

      // Total students
      const totalStudents = await ctx.db.students.count();

      // Active students in last 7 days
      const activeStudents = await ctx.db.attendanceRecord
        .groupBy({
          by: ["studentId"],
          where: {
            ...subjectFilter,
            attendance: {
              date: {
                gte: lastWeek,
              },
            },
          },
        })
        .then((records) => records.length);

      // Total subjects
      const totalSubjects = await ctx.db.subject.count();

      // Total teachers
      const totalTeachers = await ctx.db.teacher.count();

      // Total attendance records
      const totalRecords = await ctx.db.attendanceRecord.count({
        where: subjectFilter,
      });

      // Recent records in last 7 days
      const recentRecords = await ctx.db.attendanceRecord.count({
        where: {
          ...subjectFilter,
          attendance: {
            date: {
              gte: lastWeek,
            },
          },
        },
      });

      return {
        totalStudents,
        activeStudents,
        totalSubjects,
        totalTeachers,
        totalRecords,
        recentRecords,
      };
    }),

  // Get attendance status distribution
  getAttendanceStatusDistribution: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Base where clause for filtering by subject
      const whereClause =
        input?.subjectId && input.subjectId !== "all"
          ? { subjectId: Number.parseInt(input.subjectId) }
          : {};

      // Count records by status
      const present = await ctx.db.attendanceRecord.count({
        where: {
          ...whereClause,
          status: "PRESENT",
        },
      });

      const absent = await ctx.db.attendanceRecord.count({
        where: {
          ...whereClause,
          status: "ABSENT",
        },
      });

      const late = await ctx.db.attendanceRecord.count({
        where: {
          ...whereClause,
          status: "LATE",
        },
      });

      return {
        present,
        absent,
        late,
      };
    }),

  // Get attendance trends over time
  getAttendanceTrends: publicProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        subjectId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, subjectId } = input;

      // Get all attendance dates in the range
      const attendanceDates = await ctx.db.attendance.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      // Base where clause for filtering by subject
      const subjectFilter =
        subjectId && subjectId !== "all"
          ? { subjectId: Number.parseInt(subjectId) }
          : {};

      // For each date, get the count of each status
      const trends = await Promise.all(
        attendanceDates.map(async (attendance) => {
          const present = await ctx.db.attendanceRecord.count({
            where: {
              ...subjectFilter,
              attendanceId: attendance.id,
              status: "PRESENT",
            },
          });

          const absent = await ctx.db.attendanceRecord.count({
            where: {
              ...subjectFilter,
              attendanceId: attendance.id,
              status: "ABSENT",
            },
          });

          const late = await ctx.db.attendanceRecord.count({
            where: {
              ...subjectFilter,
              attendanceId: attendance.id,
              status: "LATE",
            },
          });

          return {
            date: attendance.date,
            present,
            absent,
            late,
          };
        }),
      );

      return trends;
    }),

  // Get subject-wise attendance
  getSubjectAttendance: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // If a specific subject is selected, only get that subject
      const subjectsQuery: {
        select: { id: true; name: true };
        where?: { id: number };
      } = {
        select: { id: true, name: true },
      };

      if (input?.subjectId && input.subjectId !== "all") {
        subjectsQuery.where = { id: Number.parseInt(input.subjectId) };
      }

      const subjects = await ctx.db.subject.findMany({
        ...subjectsQuery,
      });

      const subjectAttendance = await Promise.all(
        subjects.map(async (subject) => {
          const totalRecords = await ctx.db.attendanceRecord.count({
            where: {
              subjectId: subject.id,
            },
          });

          const presentRecords = await ctx.db.attendanceRecord.count({
            where: {
              subjectId: subject.id,
              status: "PRESENT",
            },
          });

          const absentRecords = await ctx.db.attendanceRecord.count({
            where: {
              subjectId: subject.id,
              status: "ABSENT",
            },
          });

          const lateRecords = await ctx.db.attendanceRecord.count({
            where: {
              subjectId: subject.id,
              status: "LATE",
            },
          });

          return {
            id: subject.id,
            name: subject.name,
            presentRate: totalRecords > 0 ? presentRecords / totalRecords : 0,
            absentRate: totalRecords > 0 ? absentRecords / totalRecords : 0,
            lateRate: totalRecords > 0 ? lateRecords / totalRecords : 0,
          };
        }),
      );

      return subjectAttendance;
    }),

  // Get student performance
  getStudentPerformance: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
        subjectId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, subjectId } = input;

      const students = await ctx.db.students.findMany({
        take: limit,
      });

      const studentPerformance = await Promise.all(
        students.map(async (student) => {
          // Base where clause for filtering by subject
          const whereClause =
            subjectId && subjectId !== "all"
              ? {
                  studentId: student.id,
                  subjectId: Number.parseInt(subjectId),
                }
              : { studentId: student.id };

          const totalRecords = await ctx.db.attendanceRecord.count({
            where: whereClause,
          });

          const presentRecords = await ctx.db.attendanceRecord.count({
            where: {
              ...whereClause,
              status: "PRESENT",
            },
          });

          const lateRecords = await ctx.db.attendanceRecord.count({
            where: {
              ...whereClause,
              status: "LATE",
            },
          });

          return {
            id: student.id,
            firstname: student.firstname,
            lastName: student.lastName,
            attendanceRate:
              totalRecords > 0
                ? (presentRecords + lateRecords) / totalRecords
                : 0,
            lateRate: totalRecords > 0 ? lateRecords / totalRecords : 0,
          };
        }),
      );

      // Sort by attendance rate descending
      return studentPerformance.sort(
        (a, b) => b.attendanceRate - a.attendanceRate,
      );
    }),

  // Get day of week attendance patterns
  getDayOfWeekAttendance: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const attendances = await ctx.db.attendance.findMany();

      // Initialize counts for each day of week
      const dayOfWeekCounts = Array(7)
        .fill(0)
        .map((_, index) => ({
          dayOfWeek: index,
          present: 0,
          absent: 0,
          late: 0,
        }));

      // Base where clause for filtering by subject
      const subjectFilter =
        input?.subjectId && input.subjectId !== "all"
          ? { subjectId: Number.parseInt(input.subjectId) }
          : {};

      // Count records by day of week
      for (const attendance of attendances) {
        const dayOfWeek = getDay(new Date(attendance.date));

        const present = await ctx.db.attendanceRecord.count({
          where: {
            ...subjectFilter,
            attendanceId: attendance.id,
            status: "PRESENT",
          },
        });

        const absent = await ctx.db.attendanceRecord.count({
          where: {
            ...subjectFilter,
            attendanceId: attendance.id,
            status: "ABSENT",
          },
        });

        const late = await ctx.db.attendanceRecord.count({
          where: {
            ...subjectFilter,
            attendanceId: attendance.id,
            status: "LATE",
          },
        });

        // Fix: Ensure the array element exists before accessing it
        if (dayOfWeekCounts[dayOfWeek]) {
          dayOfWeekCounts[dayOfWeek].present += present;
          dayOfWeekCounts[dayOfWeek].absent += absent;
          dayOfWeekCounts[dayOfWeek].late += late;
        }
      }

      return dayOfWeekCounts;
    }),

  // Get monthly comparison
  getMonthlyComparison: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const attendances = await ctx.db.attendance.findMany();

      // Base where clause for filtering by subject
      const subjectFilter =
        input?.subjectId && input.subjectId !== "all"
          ? { subjectId: Number.parseInt(input.subjectId) }
          : {};

      // Group by month
      const monthlyData = [];
      const monthMap = new Map();

      for (const attendance of attendances) {
        const month = format(new Date(attendance.date), "yyyy-MM");

        if (!monthMap.has(month)) {
          monthMap.set(month, {
            month: attendance.date,
            totalRecords: 0,
            presentRecords: 0,
          });
        }

        const monthData = monthMap.get(month);

        const records = await ctx.db.attendanceRecord.findMany({
          where: {
            ...subjectFilter,
            attendanceId: attendance.id,
          },
        });

        monthData.totalRecords += records.length;
        monthData.presentRecords += records.filter(
          (r) => r.status === "PRESENT",
        ).length;
      }

      // Calculate attendance rate for each month
      for (const [_, data] of monthMap.entries()) {
        monthlyData.push({
          month: data.month,
          attendanceRate:
            data.totalRecords > 0 ? data.presentRecords / data.totalRecords : 0,
        });
      }

      return monthlyData;
    }),

  // Get time of day patterns
  getTimeOfDayPatterns: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Base where clause for filtering by subject
      const whereClause =
        input?.subjectId && input.subjectId !== "all"
          ? {
              timeStart: { not: null },
              subjectId: Number.parseInt(input.subjectId),
            }
          : { timeStart: { not: null } };

      // Get all records with timeStart
      const records = await ctx.db.attendanceRecord.findMany({
        where: whereClause,
        select: {
          timeStart: true,
          status: true,
        },
      });

      // Group by hour
      const hourMap = new Map();

      for (const record of records) {
        if (record.timeStart) {
          const hour = new Date(record.timeStart).getHours();

          if (!hourMap.has(hour)) {
            hourMap.set(hour, {
              hour,
              count: 0,
              lateCount: 0,
            });
          }

          const hourData = hourMap.get(hour);
          hourData.count++;

          if (record.status === "LATE") {
            hourData.lateCount++;
          }
        }
      }

      // Convert map to array and sort by hour
      return Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
    }),

  // Get teacher performance
  getTeacherPerformance: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // If a specific subject is selected, only get teachers who teach that subject
      const teachersQuery: {
        include: { subjects: true };
        where?: { subjects: { some: { id: number } } };
      } = {
        include: { subjects: true },
      };

      if (input?.subjectId && input.subjectId !== "all") {
        teachersQuery.where = {
          subjects: {
            some: {
              id: Number.parseInt(input.subjectId),
            },
          },
        };
      }

      const teachers = await ctx.db.teacher.findMany({
        ...teachersQuery,
        include: {
          subjects: true,
        },
      });

      const teacherPerformance = await Promise.all(
        teachers.map(async (teacher) => {
          let totalRecords = 0;
          let presentRecords = 0;
          let absentRecords = 0;
          let lateRecords = 0;

          // Filter subjects if a specific subject is selected
          const subjectsToProcess =
            input?.subjectId && input.subjectId !== "all"
              ? teacher.subjects.filter(
                  (subject) => subject.id === parseInt(input.subjectId as any),
                )
              : teacher.subjects;

          // Aggregate records for all subjects taught by this teacher
          for (const subject of subjectsToProcess) {
            const records = await ctx.db.attendanceRecord.findMany({
              where: {
                subjectId: subject.id,
              },
            });

            totalRecords += records.length;
            presentRecords += records.filter(
              (r) => r.status === "PRESENT",
            ).length;
            absentRecords += records.filter(
              (r) => r.status === "ABSENT",
            ).length;
            lateRecords += records.filter((r) => r.status === "LATE").length;
          }

          return {
            id: teacher.id,
            firstname: teacher.firstname,
            lastName: teacher.lastName,
            presentRate: totalRecords > 0 ? presentRecords / totalRecords : 0,
            absentRate: totalRecords > 0 ? absentRecords / totalRecords : 0,
            lateRate: totalRecords > 0 ? lateRecords / totalRecords : 0,
          };
        }),
      );

      return teacherPerformance;
    }),

  // Get attendance duration distribution
  getAttendanceDuration: publicProcedure
    .input(
      z
        .object({
          subjectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Base where clause for filtering by subject
      const whereClause =
        input?.subjectId && input.subjectId !== "all"
          ? {
              timeStart: { not: null },
              timeEnd: { not: null },
              subjectId: Number.parseInt(input.subjectId),
            }
          : {
              timeStart: { not: null },
              timeEnd: { not: null },
            };

      // Get all records with timeStart and timeEnd
      const records = await ctx.db.attendanceRecord.findMany({
        where: whereClause,
        select: {
          timeStart: true,
          timeEnd: true,
        },
      });

      // Calculate duration in hours and group
      const durationMap = new Map();

      for (const record of records) {
        if (record.timeStart && record.timeEnd) {
          const startTime = new Date(record.timeStart).getTime();
          const endTime = new Date(record.timeEnd).getTime();
          const durationMs = endTime - startTime;
          const durationHours = Math.floor(durationMs / (1000 * 60 * 60));

          // Group by hour
          if (!durationMap.has(durationHours)) {
            durationMap.set(durationHours, {
              durationHours,
              count: 0,
            });
          }

          durationMap.get(durationHours).count++;
        }
      }

      // Convert map to array and sort by duration
      return Array.from(durationMap.values()).sort(
        (a, b) => a.durationHours - b.durationHours,
      );
    }),
});
