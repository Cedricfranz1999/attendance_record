"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { api, type RouterOutputs } from "@/trpc/react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calendar,
  Clock,
  Square,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "@/app/attendanceRecord/(components)/Loader";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the attendance status options
const attendanceStatusOptions = [
  { value: "PRESENT", label: "Present", color: "bg-green-100 text-green-800" },
  { value: "ABSENT", label: "Absent", color: "bg-red-100 text-red-800" },
  { value: "LATE", label: "Late", color: "bg-amber-100 text-amber-800" },
  { value: "EXCUSED", label: "Excused", color: "bg-blue-100 text-blue-800" },
];
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StandbyStudents from "@/app/_components/standbyStudents";

// Type for student attendance record
type StudentAttendance = {
  id: number;
  recordId?: number; // The AttendanceRecord ID if it exists
  firstname: string;
  middleName?: string | null;
  lastName: string;
  image: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  timeStart?: Date | null;
  timeEnd?: Date | null;
  breakTime?: number | null; // Break time in seconds (remaining)
  paused?: boolean | null; // Track if student is currently on break (from DB)
  breakStartTime?: Date | null; // When the current break started (client-side only)
  changed?: boolean; // Track if the status has been changed
  lastActiveTime?: Date | null; // Last time the student was active (for paused with no break time)
  totalTimeRender?: number | null; // Total time rendered in seconds
  lastSavedBreakTime?: number | null; // Store the last saved break time from DB
  actualTimeRender?: number | null; // Actual time rendered regardless of pause state
};

// Format date for display
const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format time for display
const formatTime = (date: Date | null | undefined) => {
  if (!date) return "--:--";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Format break time for display
const formatBreakTime = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined) return "10:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Format duration for display
const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// Calculate duration between two times
const calculateDuration = (
  start: Date | null | undefined,
  end: Date | null | undefined,
  studentObj?: StudentAttendance,
  currentTimeValue?: Date,
  subjectDurationValue?: number,
) => {
  // If we have totalTimeRender in the database, use that instead of calculating
  if (
    studentObj?.totalTimeRender !== undefined &&
    studentObj?.totalTimeRender !== null
  ) {
    return formatDuration(studentObj.totalTimeRender);
  }

  if (!start) return "00:00:00";

  const startTime = new Date(start).getTime();
  let endTime;

  // If end time is provided, use it
  if (end) {
    endTime = new Date(end).getTime();
  }
  // If student is paused with no break time, use lastActiveTime or don't update
  else if (
    studentObj &&
    studentObj.paused &&
    (studentObj.breakTime || 0) <= 0
  ) {
    if (studentObj.lastActiveTime) {
      endTime = new Date(studentObj.lastActiveTime).getTime();
    } else {
      // If no lastActiveTime is available, use current time but this shouldn't happen
      endTime = currentTimeValue
        ? currentTimeValue.getTime()
        : new Date().getTime();
    }
  }
  // Otherwise use current time
  else {
    endTime = currentTimeValue
      ? currentTimeValue.getTime()
      : new Date().getTime();
  }

  // Always apply the subject duration limit
  if (subjectDurationValue && subjectDurationValue > 0) {
    const maxEndTime = startTime + subjectDurationValue * 60 * 1000;
    endTime = Math.min(endTime, maxEndTime);
  }

  // Calculate duration
  const durationMs = endTime - startTime;
  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// Calculate actual duration regardless of pause state
const calculateActualDuration = (
  start: Date | null | undefined,
  end: Date | null | undefined,
  studentObj?: StudentAttendance,
  currentTimeValue?: Date,
  subjectDurationValue?: number,
) => {
  if (!start) return "00:00:00";

  // If student is paused with no break time, don't update actual time
  if (studentObj && studentObj.paused && (studentObj.breakTime || 0) <= 0) {
    if (
      studentObj.actualTimeRender !== null &&
      studentObj.actualTimeRender !== undefined
    ) {
      return formatDuration(studentObj.actualTimeRender);
    }

    // If no actualTimeRender is available, calculate up to lastActiveTime
    if (studentObj.lastActiveTime) {
      const startTime = new Date(start).getTime();
      const lastActiveTime = new Date(studentObj.lastActiveTime).getTime();
      const durationMs = lastActiveTime - startTime;
      const totalSeconds = Math.floor(durationMs / 1000);
      return formatDuration(totalSeconds);
    }
  }

  const startTime = new Date(start).getTime();
  let endTime;

  // If end time is provided, use it
  if (end) {
    endTime = new Date(end).getTime();
  } else {
    // Otherwise use current time
    endTime = currentTimeValue
      ? currentTimeValue.getTime()
      : new Date().getTime();
  }

  // Always apply the subject duration limit
  if (subjectDurationValue && subjectDurationValue > 0) {
    const maxEndTime = startTime + subjectDurationValue * 60 * 1000;
    endTime = Math.min(endTime, maxEndTime);
  }

  // Calculate duration
  const durationMs = endTime - startTime;
  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// Check if time render should be updated based on student state
// We always want to update time render EXCEPT when paused=true AND breakTime=0
const shouldUpdateTimeRender = (student: StudentAttendance) => {
  // Only stop counting if paused AND no break time left
  return !(student.paused && (student.breakTime || 0) <= 0);
};

export default function AttendanceRecordPage() {
  const params = useParams();
  const attendanceId = Number(params.id);
  const subjectId = Number(params.subjectId);

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [subjectDuration, setSubjectDuration] = useState(0); // Duration in minutes
  const [subjectStartTime, setSubjectStartTime] = useState<Date | null>(null);

  // Use ref to store interval ID for the break time updater
  const breakTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use ref to track if we've initialized break start times
  const breakStartTimesInitializedRef = useRef(false);

  // Add a new state to track the last time we updated totalTimeRender
  const [lastTotalTimeUpdate, setLastTotalTimeUpdate] = useState<
    Record<string, Date>
  >({});

  // Add a ref to track if auto-adjust is in progress
  const autoAdjustInProgressRef = useRef(false);

  // Add a ref to store the current client-side state before auto-adjust
  const studentsBeforeAutoAdjustRef = useRef<StudentAttendance[]>([]);

  // Fetch attendance details
  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
  } = api.attendanceRecord.getAttendanceById.useQuery(
    { id: attendanceId },
    { enabled: !!attendanceId },
  );
  refetchAttendance();

  // Fetch subject details
  const { data: subjectData, isLoading: subjectLoading } =
    api.subjects.getSubjectById.useQuery(
      { id: subjectId },
      { enabled: !!subjectId },
    );

  // Type for the student data from the API
  type StudentData =
    RouterOutputs["attendanceRecord"]["getStudentsForAttendance"][0];

  // Fetch students with their attendance records for this attendance and subject
  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch,
  } = api.attendanceRecord.getStudentsForAttendance.useQuery(
    {
      attendanceId,
      subjectId,
      search,
    },
    {
      enabled: !!attendanceId && !!subjectId,
    },
  );

  // Handle the success case for student data fetching
  useEffect(() => {
    if (studentsData && !studentsLoading) {
      // If auto-adjust is in progress, we need to preserve client-side break times
      if (
        autoAdjustInProgressRef.current &&
        studentsBeforeAutoAdjustRef.current.length > 0
      ) {
        const updatedStudents = studentsData.map((student: StudentData) => {
          // Find the previous state of this student
          const prevStudent = studentsBeforeAutoAdjustRef.current.find(
            (s) => s.id === student.id,
          );

          // If we have previous state and the student has an attendance record
          if (prevStudent && student.attendanceRecord?.id) {
            return {
              id: student.id,
              recordId: student.attendanceRecord?.id,
              firstname: student.firstname,
              middleName: student.middleName,
              lastName: student.lastName,
              image: student.image,
              status: student.attendanceRecord?.status || "ABSENT",
              timeStart: student.attendanceRecord?.timeStart || null,
              timeEnd: student.attendanceRecord?.timeEnd || null,
              // Preserve client-side break time
              breakTime: prevStudent.breakTime,
              // Preserve paused state
              paused: prevStudent.paused,
              breakStartTime: prevStudent.breakStartTime,
              lastActiveTime: prevStudent.lastActiveTime,
              totalTimeRender:
                student.attendanceRecord?.totalTimeRender || null,
              lastSavedBreakTime: student.attendanceRecord?.breakTime || null,
              actualTimeRender: prevStudent.actualTimeRender,
            };
          }

          // Otherwise, use the data from the server
          return {
            id: student.id,
            recordId: student.attendanceRecord?.id,
            firstname: student.firstname,
            middleName: student.middleName,
            lastName: student.lastName,
            image: student.image,
            status: student.attendanceRecord?.status || "ABSENT",
            timeStart: student.attendanceRecord?.timeStart || null,
            timeEnd: student.attendanceRecord?.timeEnd || null,
            breakTime: student.attendanceRecord?.breakTime || 600,
            paused: student.attendanceRecord?.paused || false,
            breakStartTime: null,
            lastActiveTime: null,
            totalTimeRender: student.attendanceRecord?.totalTimeRender || null,
            lastSavedBreakTime: student.attendanceRecord?.breakTime || null,
            actualTimeRender: null,
          };
        });

        setStudents(updatedStudents);
        setLoading(false);
        breakStartTimesInitializedRef.current = false;
        autoAdjustInProgressRef.current = false;
        studentsBeforeAutoAdjustRef.current = [];
      } else if (!autoAdjustInProgressRef.current) {
        // Normal case - initialize students state when data is loaded
        setStudents(
          studentsData.map((student: StudentData) => ({
            id: student.id,
            recordId: student.attendanceRecord?.id,
            firstname: student.firstname,
            middleName: student.middleName,
            lastName: student.lastName,
            image: student.image,
            status: student.attendanceRecord?.status || "ABSENT",
            timeStart: student.attendanceRecord?.timeStart || null,
            timeEnd: student.attendanceRecord?.timeEnd || null,
            breakTime: student.attendanceRecord?.breakTime || 600, // Default to 10 minutes (600 seconds)
            paused: student.attendanceRecord?.paused || false, // Get paused state from DB
            breakStartTime: null, // Will be initialized in the next effect
            lastActiveTime: null, // Will be set when needed
            totalTimeRender: student.attendanceRecord?.totalTimeRender || null, // Get totalTimeRender from DB
            lastSavedBreakTime: student.attendanceRecord?.breakTime || null, // Store the last saved break time
            actualTimeRender: null, // Initialize actual time render
          })),
        );
        setLoading(false);
        breakStartTimesInitializedRef.current = false; // Reset flag to initialize break start times
      }
    }
  }, [studentsData, studentsLoading]);

  // Update attendance records mutation
  const updateAttendance =
    api.attendanceRecord.updateAttendanceRecords.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Attendance updated successfully",
          className: "bg-green-50 border-green-200",
        });
        refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update attendance records",
        });
      },
    });

  // Create and start time tracking in one step
  const createAndStartTimeTracking =
    api.attendanceRecord.createAndStartTimeTracking.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Time tracking started",
          className: "bg-green-50 border-green-200",
        });
        refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to start time tracking",
        });
      },
    });

  // Start time tracking mutation
  const startTimeTracking = api.attendanceRecord.startTimeTracking.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time tracking started",
        className: "bg-green-50 border-green-200",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start time tracking",
      });
    },
  });

  // Stop time tracking mutation
  const stopTimeTracking = api.attendanceRecord.stopTimeTracking.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time tracking stopped",
        className: "bg-green-50 border-green-200",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop time tracking",
      });
    },
  });

  // Start break time mutation
  const startBreakTime = api.attendanceRecord.startBreakTime.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Break time started",
        className: "bg-blue-50 border-blue-200",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start break time",
      });
    },
  });

  // Stop break time mutation - using the correct mutation
  const stopBreakTime = api.attendanceRecord.stopBreakTime.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Break time stopped",
        className: "bg-blue-50 border-blue-200",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop break time",
      });
    },
  });

  // Update break time mutation (for real-time updates)
  const updateBreakTime = api.attendanceRecord.updateBreakTime.useMutation({
    onSuccess: (data) => {
      // Silent success - no toast needed for background updates
      // Update lastSavedBreakTime for the student
      setStudents((prev) =>
        prev.map((student) =>
          student.recordId === data.id
            ? { ...student, lastSavedBreakTime: data.breakTime }
            : student,
        ),
      );
    },
    onError: (error) => {
      console.error("Failed to update break time:", error);
    },
  });

  // Auto-adjust status mutation
  const autoAdjustStatus = api.attendanceRecord.autoAdjustStatus.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Status auto-adjusted for ${data.count} students`,
        className: "bg-green-50 border-green-200",
      });
      // Don't set autoAdjustInProgressRef to false here
      // It will be set to false in the onSuccess callback of the refetch
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to auto-adjust status",
      });
      autoAdjustInProgressRef.current = false;
      studentsBeforeAutoAdjustRef.current = [];
    },
  });

  // Toggle subject active status mutation
  const toggleSubjectActive = api.subjects.toggleSubjectActive.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Subject ${data.active ? "activated" : "deactivated"} successfully`,
        className: "bg-green-50 border-green-200",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle subject active status",
      });
    },
  });

  // Add a new mutation for updating totalTimeRender
  const updateTotalTimeRender =
    api.attendanceRecord.updateTotalTimeRender.useMutation({
      onSuccess: () => {
        // Silent success - no toast needed for background updates
      },
      onError: (error) => {
        console.error("Failed to update total time render:", error);
      },
    });

  // Calculate subject duration and set subject start time when subject data is loaded
  useEffect(() => {
    if (subjectData) {
      if (subjectData.startTime && subjectData.endTime) {
        const startTime = new Date(subjectData.startTime);
        const endTime = new Date(subjectData.endTime);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));

        setSubjectDuration(durationMinutes);
        setSubjectStartTime(startTime);
      } else if (subjectData.duration) {
        // If duration is directly available in the subject data
        setSubjectDuration(subjectData.duration);
      }
    }
  }, [subjectData]);

  // Initialize break start times for students who are on break
  useEffect(() => {
    if (!breakStartTimesInitializedRef.current && students.length > 0) {
      setStudents((prev) =>
        prev.map((student) => {
          if (student.paused && !student.timeEnd) {
            // If student is paused with no break time, set lastActiveTime to now
            if ((student.breakTime || 0) <= 0) {
              return {
                ...student,
                breakStartTime: null,
                lastActiveTime: new Date(),
              };
            }
            // Otherwise, set breakStartTime to now
            return {
              ...student,
              breakStartTime: new Date(),
            };
          }
          return student;
        }),
      );
      breakStartTimesInitializedRef.current = true;
    }
  }, [students]);

  // Handle status change
  const handleStatusChange = (
    studentId: number,
    newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
  ) => {
    // Update local state first for immediate UI feedback
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, status: newStatus, changed: true }
          : student,
      ),
    );

    // Find the student to get the recordId if it exists
    const student = students.find((s) => s.id === studentId);

    // Only send valid statuses to the backend (exclude EXCUSED if the backend doesn't support it)
    const validStatus =
      newStatus === "EXCUSED"
        ? "ABSENT"
        : (newStatus as "PRESENT" | "ABSENT" | "LATE");

    // Trigger the mutation immediately
    updateAttendance.mutate({
      records: [
        {
          id: student?.recordId, // Will be undefined for new records
          studentId: studentId,
          attendanceId,
          subjectId,
          status: validStatus,
          // Don't include timeStart and timeEnd in this update
        },
      ],
    });
  };

  // Handle start time tracking
  const handleStartTimeTracking = (recordId: number, studentId?: number) => {
    // If recordId is -1, we need to pass studentId, attendanceId, and subjectId
    if (recordId === -1) {
      // Find the student to get the studentId if not provided
      const student = students.find((s) => s.id === studentId);
      if (student) {
        startTimeTracking.mutate({
          recordId: -1,
          studentId: student.id,
          attendanceId,
          subjectId,
        });

        // Update local state for immediate UI feedback
        setStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? {
                  ...s,
                  timeStart: new Date(),
                  timeEnd: null,
                  breakTime: 600, // Reset to 10 minutes (600 seconds)
                  lastSavedBreakTime: 600, // Also update the last saved break time
                  paused: false,
                  breakStartTime: null,
                  lastActiveTime: null,
                  changed: true,
                  actualTimeRender: 0, // Reset actual time render
                }
              : s,
          ),
        );
      } else {
        toast({
          title: "Error",
          description: "Student not found",
        });
      }
    } else {
      // For existing records, just pass the recordId
      startTimeTracking.mutate({ recordId });

      // Update local state for immediate UI feedback
      setStudents((prev) =>
        prev.map((student) =>
          student.recordId === recordId
            ? {
                ...student,
                timeStart: new Date(),
                timeEnd: null,
                breakTime: 600, // Reset to 10 minutes (600 seconds)
                lastSavedBreakTime: 600, // Also update the last saved break time
                paused: false,
                breakStartTime: null,
                lastActiveTime: null,
                changed: true,
                actualTimeRender: 0, // Reset actual time render
              }
            : student,
        ),
      );
    }
  };

  // Update break times and save to database
  useEffect(() => {
    // Function to update break times in the database
    const updateBreakTimes = () => {
      // Skip if auto-adjust is in progress
      if (autoAdjustInProgressRef.current) return;

      students.forEach((student) => {
        if (
          student.paused &&
          student.recordId &&
          student.breakTime !== undefined &&
          student.breakTime !== null
        ) {
          // Always update if break time is 0 to ensure it's saved to the database
          if (
            student.breakTime === 0 ||
            student.breakTime !== student.lastSavedBreakTime
          ) {
            // Update the break time in the database
            updateBreakTime.mutate({
              recordId: student.recordId,
              breakTime: student.breakTime,
            });
          }
        }
      });
    };

    // Set up interval to update break times every 15 seconds
    const breakUpdateInterval = setInterval(updateBreakTimes, 15000); // Changed to 15 seconds

    // Clean up
    return () => clearInterval(breakUpdateInterval);
  }, [students]);

  // Main timer effect for updating current time, break times, and totalTimeRender
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const now = new Date();

      // Skip updates if auto-adjust is in progress
      if (autoAdjustInProgressRef.current) return;

      // Update students state with new break times and handle time render
      setStudents((prev) =>
        prev.map((student) => {
          // Skip if student has ended time tracking
          if (student.timeEnd) return student;

          // Calculate actual time render regardless of pause state
          let actualTimeRender = student.actualTimeRender || 0;
          if (
            student.timeStart &&
            !(student.paused && (student.breakTime || 0) <= 0)
          ) {
            const startTime = new Date(student.timeStart).getTime();
            const currentTime = now.getTime();
            actualTimeRender = Math.floor((currentTime - startTime) / 1000);
          }

          // Check if we need to auto-unpause when percentage reaches 100%
          if (student.timeStart && student.paused) {
            const percentage = calculatePercentage(
              student.timeStart,
              null,
              student,
            );
            if (percentage >= 100) {
              // Auto-unpause when percentage reaches 100%
              if (student.recordId) {
                stopBreakTime.mutate({
                  recordId: student.recordId,
                  elapsedBreakTime: 0,
                });
              }

              return {
                ...student,
                paused: false,
                breakStartTime: null,
                lastActiveTime: null,
                actualTimeRender,
              };
            }
          }

          // Check if percentage reaches 75% and trigger auto-adjust
          if (student.timeStart && !student.paused && student.recordId) {
            const percentage = calculatePercentage(
              student.timeStart,
              null,
              student,
            );
            if (
              percentage >= 75 &&
              percentage < 76 &&
              !autoAdjustInProgressRef.current
            ) {
              // Trigger auto-adjust when percentage reaches 75%
              handleAutoAdjustStatus();
            }
          }

          // Check if percentage reaches 100% and automatically end time tracking
          if (student.timeStart && !student.timeEnd && !student.paused) {
            const percentage = calculatePercentage(
              student.timeStart,
              null,
              student,
            );
            if (percentage >= 100) {
              // Auto-end time tracking when percentage reaches 100%
              if (student.recordId) {
                stopTimeTracking.mutate({
                  recordId: student.recordId,
                  subjectDuration,
                });
              }

              return {
                ...student,
                timeEnd: new Date(),
                paused: false,
                breakStartTime: null,
                lastActiveTime: null,
                actualTimeRender,
              };
            }
          }

          // Handle students on break
          if (student.paused && student.breakStartTime && !student.timeEnd) {
            // Calculate new break time
            const currentBreakTime = student.breakTime || 600;
            const newBreakTime = Math.max(0, currentBreakTime - 1); // Reduce by 1 second

            // If break time is depleted, set lastActiveTime and remove breakStartTime
            if (newBreakTime === 0) {
              // Save the break time of 0 to the database immediately
              if (student.recordId) {
                updateBreakTime.mutate({
                  recordId: student.recordId,
                  breakTime: 0,
                });
              }

              return {
                ...student,
                breakTime: 0,
                breakStartTime: null,
                lastActiveTime: now,
                lastSavedBreakTime: 0, // Update lastSavedBreakTime to match
                // Keep paused as true when break time reaches 0
                actualTimeRender,
              };
            }

            return {
              ...student,
              breakTime: newBreakTime,
              actualTimeRender,
            };
          }

          // Update totalTimeRender for active students based on shouldUpdateTimeRender logic
          if (
            student.recordId &&
            student.timeStart &&
            !student.timeEnd &&
            shouldUpdateTimeRender(student)
          ) {
            // Calculate current total time in seconds
            const startTime = new Date(student.timeStart).getTime();
            const currentTime = now.getTime();
            const totalTimeSeconds = Math.floor(
              (currentTime - startTime) / 1000,
            );

            // Update totalTimeRender in local state every second
            return {
              ...student,
              totalTimeRender: totalTimeSeconds,
              actualTimeRender,
            };
          }

          return {
            ...student,
            actualTimeRender,
          };
        }),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [students, subjectDuration]);

  // Effect to save totalTimeRender to the database every second
  useEffect(() => {
    const saveTimer = setInterval(() => {
      // Skip if auto-adjust is in progress
      if (autoAdjustInProgressRef.current) return;

      students.forEach((student) => {
        if (
          student.recordId &&
          student.timeStart &&
          !student.timeEnd &&
          student.totalTimeRender !== undefined &&
          student.totalTimeRender !== null &&
          shouldUpdateTimeRender(student)
        ) {
          // Update the totalTimeRender in the database
          updateTotalTimeRender.mutate({
            recordId: student.recordId,
            totalTimeRender: student.totalTimeRender,
          });
        }
      });
    }, 1000); // Update every second

    return () => clearInterval(saveTimer);
  }, [students]);

  // Add a visibility change event listener to handle browser tab switching
  useEffect(() => {
    // Function to handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When tab becomes visible again, refresh the data to get current break times
        refetch();
      }
    };

    // Add event listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  // Modify the handleStartBreakTime function to save the current totalTimeRender
  const handleStartBreakTime = (recordId: number) => {
    // Find the student
    const student = students.find((s) => s.recordId === recordId);

    if (!student || (student.breakTime || 0) <= 0) {
      toast({
        title: "Error",
        description: "No break time remaining",
      });
      return;
    }

    // Calculate current total time in seconds
    if (student.timeStart) {
      const startTime = new Date(student.timeStart).getTime();
      const currentTime = new Date().getTime();
      const totalTimeSeconds = Math.floor((currentTime - startTime) / 1000);

      // Update the totalTimeRender before pausing
      updateTotalTimeRender.mutate({
        recordId,
        totalTimeRender: totalTimeSeconds,
      });
    }

    // Call the API to update the database
    startBreakTime.mutate({ recordId });

    // Update local state to show the student is on break
    setStudents((prev) =>
      prev.map((s) =>
        s.recordId === recordId
          ? {
              ...s,
              paused: true, // Set paused to true
              breakStartTime: new Date(),
              lastActiveTime: null,
              changed: true,
            }
          : s,
      ),
    );
  };

  // Modify the handleStopBreakTime function to handle the case when break time is 0
  const handleStopBreakTime = (recordId: number) => {
    // Find the student
    const student = students.find((s) => s.recordId === recordId);

    if (!student || !student.paused) {
      return;
    }

    // If break time is already 0, just unpause without calculating elapsed time
    if ((student.breakTime || 0) <= 0) {
      stopBreakTime.mutate({
        recordId,
        elapsedBreakTime: 0,
      });

      // Reset the last total time update for this student to force an immediate update
      setLastTotalTimeUpdate((prev) => ({
        ...prev,
        [recordId.toString()]: new Date(0), // Set to epoch time to force update
      }));

      // Update local state
      setStudents((prev) =>
        prev.map((s) =>
          s.recordId === recordId
            ? {
                ...s,
                paused: false,
                breakTime: 0,
                lastSavedBreakTime: 0,
                breakStartTime: null,
                lastActiveTime: null,
                changed: true,
              }
            : s,
        ),
      );
      return;
    }

    // For normal case with remaining break time
    if (!student.breakStartTime) {
      return;
    }

    // Calculate elapsed break time
    const breakStartTime = new Date(student.breakStartTime);
    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - breakStartTime.getTime()) / 1000,
    );

    // Use the current break time from the student object
    const currentBreakTime = student.breakTime || 0;
    const newBreakTime = Math.max(0, currentBreakTime);

    stopBreakTime.mutate({
      recordId,
      elapsedBreakTime: elapsedSeconds,
    });

    // Reset the last total time update for this student to force an immediate update
    setLastTotalTimeUpdate((prev) => ({
      ...prev,
      [recordId.toString()]: new Date(0), // Set to epoch time to force update
    }));

    // Update local state
    setStudents((prev) =>
      prev.map((s) =>
        s.recordId === recordId
          ? {
              ...s,
              paused: false,
              breakTime: newBreakTime,
              lastSavedBreakTime: newBreakTime,
              breakStartTime: null,
              lastActiveTime: null,
              changed: true,
            }
          : s,
      ),
    );
  };

  // Modify the handleStopTimeTracking function to save the final totalTimeRender
  const handleStopTimeTracking = (recordId: number) => {
    // Find the student to check if they're on break
    const student = students.find((s) => s.recordId === recordId);

    if (!student) return;

    // Calculate final total time in seconds
    if (student.timeStart) {
      const startTime = new Date(student.timeStart).getTime();
      const currentTime = new Date().getTime();
      const totalTimeSeconds = Math.floor((currentTime - startTime) / 1000);

      // Update the totalTimeRender before stopping
      updateTotalTimeRender.mutate({
        recordId,
        totalTimeRender: totalTimeSeconds,
      });
    }

    // If the student is on break, stop the break first
    if (student.paused) {
      handleStopBreakTime(recordId);
    }

    stopTimeTracking.mutate({
      recordId,
      subjectDuration, // Pass the subject duration to limit the end time
    });

    // Update local state for immediate UI feedback
    setStudents((prev) =>
      prev.map((s) =>
        s.recordId === recordId
          ? {
              ...s,
              timeEnd: new Date(),
              paused: false,
              breakStartTime: null,
              lastActiveTime: null,
              changed: true,
            }
          : s,
      ),
    );
  };

  // Handle auto-adjust status
  const handleAutoAdjustStatus = () => {
    if (!subjectStartTime && !subjectData?.startTime) {
      toast({
        title: "Error",
        description: "Subject start time is not available",
      });
      return;
    }

    // Store the current state of students before auto-adjust
    studentsBeforeAutoAdjustRef.current = [...students];

    // Set auto-adjust in progress flag
    autoAdjustInProgressRef.current = true;

    // Get all records that have time tracking data
    const recordsWithTimeData = students
      .filter((student) => student.recordId && student.timeStart)
      .map((student) => ({
        recordId: student.recordId!,
        timeStart: student.timeStart!,
        timeEnd: student.timeEnd || new Date(),
        percentage: calculatePercentage(student.timeStart, student.timeEnd),
      }));

    if (recordsWithTimeData.length === 0) {
      toast({
        title: "Info",
        description: "No time tracking data available to adjust status",
      });
      autoAdjustInProgressRef.current = false;
      studentsBeforeAutoAdjustRef.current = [];
      return;
    }

    // Call the API to auto-adjust status
    autoAdjustStatus.mutate({
      attendanceId,
      subjectId,
      subjectStartTime: subjectStartTime || new Date(subjectData!.startTime!),
      minPercentage: 75, // 75% attendance required
    });
  };

  // Handle toggle active status
  const handleToggleActive = () => {
    if (!subjectId) return;

    toggleSubjectActive.mutate({
      subjectId,
    });
  };

  // Calculate duration between two times
  const calculateDurationMinutes = (
    start: Date | null | undefined,
    end: Date | null | undefined,
    studentObj?: StudentAttendance,
  ) => {
    if (!start) return 0;

    const startTime = new Date(start).getTime();
    let endTime;

    // If end time is provided, use it
    if (end) {
      endTime = new Date(end).getTime();
    }
    // If student is paused with no break time, use lastActiveTime or don't update
    else if (
      studentObj &&
      studentObj.paused &&
      (studentObj.breakTime || 0) <= 0
    ) {
      if (studentObj.lastActiveTime) {
        endTime = new Date(studentObj.lastActiveTime).getTime();
      } else {
        // If no lastActiveTime is available, use current time but this shouldn't happen
        endTime = currentTime.getTime();
      }
    }
    // Otherwise use current time
    else {
      endTime = currentTime.getTime();
    }

    // Always apply the subject duration limit
    if (subjectDuration > 0) {
      const maxEndTime = startTime + subjectDuration * 60 * 1000;
      endTime = Math.min(endTime, maxEndTime);
    }

    // Calculate duration in minutes
    const durationMs = endTime - startTime;
    return Math.floor(durationMs / (1000 * 60));
  };

  // Calculate percentage of time spent relative to subject duration
  const calculatePercentage = (
    start: Date | null | undefined,
    end: Date | null | undefined,
    studentObj?: StudentAttendance,
  ) => {
    if (!start || subjectDuration <= 0) return 0;

    const durationMinutes = calculateDurationMinutes(start, end, studentObj);
    const percentage = (durationMinutes / subjectDuration) * 100;

    // Cap at 100%
    return Math.min(percentage, 100);
  };

  // Get initials for avatar fallback
  const getInitials = (firstname: string, lastName: string) => {
    return `${firstname.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get full name
  const getFullName = (student: StudentAttendance) => {
    return `${student.firstname} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    return (
      attendanceStatusOptions.find((option) => option.value === status)
        ?.color || "bg-gray-100 text-gray-800"
    );
  };

  // Get color for percentage based on value
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 75) return "text-emerald-500";
    if (percentage >= 50) return "text-amber-500";
    if (percentage >= 25) return "text-orange-500";
    return "text-red-500";
  };

  // Check if a student has no break time left
  const hasNoBreakTimeLeft = (breakTime: number | null | undefined) => {
    return (breakTime || 0) <= 0;
  };

  // Auto-adjust effect that runs every 15 seconds
  useEffect(() => {
    const autoAdjustTimer = setInterval(() => {
      if (
        subjectData?.active &&
        attendanceId &&
        subjectId &&
        !autoAdjustInProgressRef.current
      ) {
        // Store the current state of students before auto-adjust
        studentsBeforeAutoAdjustRef.current = [...students];

        // Only run auto-adjust if the subject is active and no auto-adjust is in progress
        autoAdjustInProgressRef.current = true;
        autoAdjustStatus.mutate({
          attendanceId,
          subjectId,
          subjectStartTime:
            subjectStartTime || new Date(subjectData.startTime || new Date()),
          minPercentage: 75, // 75% attendance required
        });
      }
    }, 15000); // Run every 15 seconds

    return () => clearInterval(autoAdjustTimer);
  }, [subjectData, attendanceId, subjectId, subjectStartTime, students]);

  if (loading || attendanceLoading || subjectLoading || studentsLoading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto p-2 md:p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attendance">attendance</TabsTrigger>
            <TabsTrigger value="standby">standby</TabsTrigger>
          </TabsList>
          <TabsContent value="attendance">
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary/5">
                <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <CardTitle className="text-xl font-bold md:text-2xl">
                      Attendance Record
                    </CardTitle>
                    <CardDescription>
                      {attendanceData && (
                        <div className="mt-1 flex items-center text-sm">
                          <Calendar className="mr-1 h-4 w-4" />
                          {formatDate(attendanceData.date)}
                        </div>
                      )}
                      {subjectData && (
                        <div className="mt-1 flex items-center text-sm">
                          <Clock className="mr-1 h-4 w-4" />
                          {subjectData.name}
                          {subjectData.startTime && subjectData.endTime && (
                            <span className="ml-1">
                              (
                              {new Date(
                                subjectData.startTime,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              -
                              {new Date(subjectData.endTime).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                              )
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-1 flex items-center text-sm">
                        <Clock className="mr-1 h-4 w-4" />
                        <span>Duration: {subjectData?.duration} minutes</span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoAdjustStatus}
                      className="flex items-center gap-1"
                      disabled={autoAdjustInProgressRef.current}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${autoAdjustInProgressRef.current ? "animate-spin" : ""}`}
                      />
                      {autoAdjustInProgressRef.current
                        ? "Adjusting..."
                        : "Auto-Adjust Status"}
                    </Button>
                    <Button
                      className={`${subjectData?.active ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 hover:bg-green-500"}`}
                      size="sm"
                      onClick={handleToggleActive}
                    >
                      {subjectData?.active ? "Active" : "Inactive"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <div className="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search students..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {students.length} students
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="w-[150px]">Status</TableHead>
                          <TableHead className="w-[120px]">
                            Time Start
                          </TableHead>
                          <TableHead className="w-[120px]">Time End</TableHead>
                          <TableHead className="w-[120px]">
                            Time Render
                          </TableHead>
                          <TableHead className="w-[120px]">
                            Actual Time
                          </TableHead>
                          <TableHead className="w-[100px]">
                            Break Left
                          </TableHead>
                          <TableHead className="w-[120px]">
                            Percentage
                          </TableHead>
                          <TableHead className="w-[220px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {students.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={9}
                                className="h-24 text-center"
                              >
                                No students found.
                              </TableCell>
                            </TableRow>
                          )}
                          {students.map((student) => {
                            const percentage = calculatePercentage(
                              student.timeStart,
                              student.timeEnd,
                              student,
                            );
                            const percentageColor =
                              getPercentageColor(percentage);
                            const isActive =
                              student.timeStart && !student.timeEnd;
                            const hasReachedLimit =
                              isActive &&
                              calculateDurationMinutes(
                                student.timeStart,
                                null,
                                student,
                              ) >= subjectDuration;
                            const isOnBreak = student.paused;
                            const hasNoBreakTime = hasNoBreakTimeLeft(
                              student.breakTime,
                            );
                            const isCountingTime =
                              shouldUpdateTimeRender(student);

                            return (
                              <motion.tr
                                key={student.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className={`border-b transition-colors hover:bg-muted/50 ${
                                  student.changed ? "bg-primary/5" : ""
                                } ${isOnBreak ? "bg-blue-50" : ""}`}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border">
                                      <AvatarImage
                                        src={student.image}
                                        alt={student.firstname}
                                      />
                                      <AvatarFallback className="bg-primary/10">
                                        {getInitials(
                                          student.firstname,
                                          student.lastName,
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">
                                        {getFullName(student)}
                                      </div>
                                      {student.changed && (
                                        <div className="text-xs text-muted-foreground">
                                          Modified
                                        </div>
                                      )}
                                      {isOnBreak && (
                                        <div className="text-xs font-medium text-blue-600">
                                          On Break{" "}
                                          {isCountingTime
                                            ? "(Counting)"
                                            : "(Paused)"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                                        student.status,
                                      )}`}
                                    >
                                      {
                                        attendanceStatusOptions.find(
                                          (option) =>
                                            option.value === student.status,
                                        )?.label
                                      }
                                    </div>
                                    <Select
                                      value={student.status}
                                      onValueChange={(value) =>
                                        handleStatusChange(
                                          student.id,
                                          value as
                                            | "PRESENT"
                                            | "ABSENT"
                                            | "LATE"
                                            | "EXCUSED",
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-[130px]">
                                        <SelectValue placeholder="Change status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {attendanceStatusOptions.map(
                                          (option) => (
                                            <SelectItem
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatTime(student.timeStart)}
                                </TableCell>
                                <TableCell>
                                  {formatTime(student.timeEnd)}
                                </TableCell>
                                <TableCell>
                                  <div
                                    className={`font-mono ${isActive && isCountingTime ? "font-medium text-green-600" : ""}`}
                                  >
                                    {calculateDuration(
                                      student.timeStart,
                                      student.timeEnd,
                                      student,
                                      currentTime,
                                      subjectDuration,
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {student.paused && student.timeStart && (
                                    <div className="font-mono text-blue-600">
                                      {calculateActualDuration(
                                        student.timeStart,
                                        student.timeEnd,
                                        student,
                                        currentTime,
                                        subjectDuration,
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div
                                    className={`font-mono ${hasNoBreakTime ? "text-red-600" : isOnBreak ? "font-medium text-blue-600" : ""}`}
                                  >
                                    {formatBreakTime(student.breakTime)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <div
                                      className={`text-sm font-medium ${percentageColor}`}
                                    >
                                      {percentage.toFixed(0)}%
                                    </div>
                                    <Progress
                                      value={percentage}
                                      className="h-2"
                                      indicatorClassName={
                                        percentage >= 100
                                          ? "bg-green-600"
                                          : percentage >= 75
                                            ? "bg-emerald-500"
                                            : percentage >= 50
                                              ? "bg-amber-500"
                                              : percentage >= 25
                                                ? "bg-orange-500"
                                                : "bg-red-500"
                                      }
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              if (!student.recordId) {
                                                // Use the new combined mutation for one-click operation
                                                createAndStartTimeTracking.mutate(
                                                  {
                                                    studentId: student.id,
                                                    attendanceId,
                                                    subjectId,
                                                    status:
                                                      student.status ===
                                                      "EXCUSED"
                                                        ? "ABSENT"
                                                        : student.status,
                                                  },
                                                );

                                                // Update local state for immediate UI feedback
                                                setStudents((prev) =>
                                                  prev.map((s) =>
                                                    s.id === student.id
                                                      ? {
                                                          ...s,
                                                          timeStart: new Date(),
                                                          timeEnd: null,
                                                          breakTime: 600,
                                                          lastSavedBreakTime: 600,
                                                          paused: false,
                                                          breakStartTime: null,
                                                          lastActiveTime: null,
                                                          changed: true,
                                                          actualTimeRender: 0,
                                                        }
                                                      : s,
                                                  ),
                                                );
                                              } else {
                                                handleStartTimeTracking(
                                                  student.recordId,
                                                );
                                              }
                                            }}
                                            className="h-8 px-2 py-0"
                                            disabled={
                                              !!student.timeStart ||
                                              !subjectData?.active ||
                                              percentage >= 100
                                            }
                                          >
                                            <Clock className="mr-1 h-3 w-3" />
                                            Start
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {percentage >= 100
                                            ? "Maximum attendance reached"
                                            : student.timeStart
                                              ? "Time tracking already started"
                                              : "Start time tracking"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              if (student.recordId) {
                                                handleStopTimeTracking(
                                                  student.recordId,
                                                );
                                              }
                                            }}
                                            className="h-8 px-2 py-0"
                                            disabled={
                                              !student.recordId ||
                                              !student.timeStart ||
                                              !!student.timeEnd ||
                                              percentage >= 100
                                            }
                                          >
                                            <Square className="mr-1 h-3 w-3" />
                                            End
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {percentage >= 100
                                            ? "Maximum attendance reached"
                                            : !student.timeStart
                                              ? "Start time tracking first"
                                              : student.timeEnd
                                                ? "Time tracking already ended"
                                                : hasReachedLimit
                                                  ? "Maximum duration reached"
                                                  : "End time tracking"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    {isActive && student.recordId && (
                                      <>
                                        {!isOnBreak ? (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleStartBreakTime(
                                                      student.recordId!,
                                                    )
                                                  }
                                                  className="h-8 px-2 py-0"
                                                  disabled={
                                                    hasNoBreakTime ||
                                                    percentage >= 100
                                                  }
                                                >
                                                  <Pause className="mr-1 h-3 w-3" />
                                                  Pause
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {percentage >= 100
                                                  ? "Maximum attendance reached"
                                                  : hasNoBreakTime
                                                    ? "No break time remaining"
                                                    : "Start break (pause tracking)"}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ) : (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleStopBreakTime(
                                                      student.recordId!,
                                                    )
                                                  }
                                                  className="h-8 bg-blue-50 px-2 py-0"
                                                  disabled={percentage >= 100}
                                                >
                                                  <Play className="mr-1 h-3 w-3" />
                                                  Resume
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {percentage >= 100
                                                  ? "Maximum attendance reached"
                                                  : "Stop break and resume tracking"}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="standby">
            <StandbyStudents />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
