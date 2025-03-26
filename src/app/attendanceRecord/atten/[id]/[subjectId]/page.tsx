"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
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

  // Fetch attendance details
  const { data: attendanceData, isLoading: attendanceLoading } =
    api.attendanceRecord.getAttendanceById.useQuery(
      { id: attendanceId },
      { enabled: !!attendanceId },
    );

  // Fetch subject details
  const { data: subjectData, isLoading: subjectLoading } =
    api.subjects.getSubjectById.useQuery(
      { id: subjectId },
      { enabled: !!subjectId },
    );

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
    { enabled: !!attendanceId && !!subjectId },
  );

  // Update attendance records mutation
  const updateAttendance =
    api.attendanceRecord.updateAttendanceRecords.useMutation({
      onSuccess: (data) => {
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

  // Stop break time mutation
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
    onSuccess: () => {
      // Silent success - no toast needed for background updates
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
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to auto-adjust status",
      });
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

  // Initialize students state when data is loaded
  useEffect(() => {
    if (studentsData && !studentsLoading) {
      setStudents(
        studentsData.map((student) => ({
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
        })),
      );
      setLoading(false);
      breakStartTimesInitializedRef.current = false; // Reset flag to initialize break start times
    }
  }, [studentsData, studentsLoading]);

  // Initialize break start times for students who are on break
  useEffect(() => {
    if (!breakStartTimesInitializedRef.current && students.length > 0) {
      setStudents((prev) =>
        prev.map((student) => {
          if (student.paused && !student.timeEnd) {
            return {
              ...student,
              breakStartTime: new Date(), // Set break start time to now
            };
          }
          return student;
        }),
      );
      breakStartTimesInitializedRef.current = true;
    }
  }, [students]);

  // Update current time every second and handle break time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());

      // Update break times for students who are on break
      setStudents((prev) =>
        prev.map((student) => {
          if (student.paused && student.breakStartTime && !student.timeEnd) {
            // Calculate new break time
            const currentBreakTime = student.breakTime || 600;
            const newBreakTime = Math.max(0, currentBreakTime - 1); // Reduce by 1 second

            // If break time is depleted, stop the break automatically
            if (newBreakTime === 0 && student.recordId) {
              stopBreakTime.mutate({
                recordId: student.recordId,
                elapsedBreakTime: currentBreakTime,
              });

              return {
                ...student,
                breakTime: 0,
                paused: false,
                breakStartTime: null,
              };
            }

            return {
              ...student,
              breakTime: newBreakTime,
              // Keep paused state as true - don't reset it
            };
          }
          return student;
        }),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set up a separate interval to periodically update the server with current break times
  useEffect(() => {
    // Update the server with current break times every 5 seconds
    const updateServerBreakTimes = () => {
      students.forEach((student) => {
        if (
          student.paused &&
          student.recordId &&
          student.breakTime !== undefined
        ) {
          updateBreakTime.mutate({
            recordId: student.recordId,
            breakTime: student.breakTime ?? 0,
          });
        }
      });
    };

    const serverUpdateTimer = setInterval(updateServerBreakTimes, 5000);

    return () => clearInterval(serverUpdateTimer);
  }, [students]);

  // Handle status change
  const handleStatusChange = (
    studentId: number,
    newStatus: "PRESENT" | "ABSENT" | "LATE",
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

    // Trigger the mutation immediately
    updateAttendance.mutate({
      records: [
        {
          id: student?.recordId, // Will be undefined for new records
          studentId: studentId,
          attendanceId,
          subjectId,
          status: newStatus,
          // Don't include timeStart and timeEnd in this update
        },
      ],
    });
  };

  // Handle start time tracking
  const handleStartTimeTracking = (recordId: number) => {
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
              paused: false,
              breakStartTime: null,
              changed: true,
            }
          : student,
      ),
    );
  };

  // Handle stop time tracking
  const handleStopTimeTracking = (recordId: number) => {
    // Find the student to check if they're on break
    const student = students.find((s) => s.recordId === recordId);

    // If the student is on break, stop the break first
    if (student?.paused) {
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
              changed: true,
            }
          : s,
      ),
    );
  };

  // Handle start break time
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
              changed: true,
            }
          : s,
      ),
    );
  };

  // Handle stop break time
  const handleStopBreakTime = (recordId: number) => {
    // Find the student
    const student = students.find((s) => s.recordId === recordId);

    if (!student || !student.paused || !student.breakStartTime) {
      return;
    }

    // Calculate elapsed break time
    const breakStartTime = new Date(student.breakStartTime);
    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - breakStartTime.getTime()) / 1000,
    );

    stopBreakTime.mutate({
      recordId,
      elapsedBreakTime: elapsedSeconds,
    });

    // Calculate new break time
    const currentBreakTime = student.breakTime || 600;
    const newBreakTime = Math.max(0, currentBreakTime - elapsedSeconds);

    // Update local state
    setStudents((prev) =>
      prev.map((s) =>
        s.recordId === recordId
          ? {
              ...s,
              paused: false,
              breakTime: newBreakTime,
              breakStartTime: null,
              changed: true,
            }
          : s,
      ),
    );
  };

  // Handle auto-adjust status
  const handleAutoAdjustStatus = () => {
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

  // Calculate duration between two times
  const calculateDuration = (
    start: Date | null | undefined,
    end: Date | null | undefined,
  ) => {
    if (!start) return "00:00:00";

    const startTime = new Date(start).getTime();
    let endTime = end ? new Date(end).getTime() : currentTime.getTime();

    // Apply the subject duration limit if there's no end time yet
    if (!end && subjectDuration > 0) {
      const maxEndTime = startTime + subjectDuration * 60 * 1000;
      endTime = Math.min(endTime, maxEndTime);
    }

    // Calculate duration
    const durationMs = endTime - startTime;
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Calculate duration in minutes
  const calculateDurationMinutes = (
    start: Date | null | undefined,
    end: Date | null | undefined,
  ) => {
    if (!start) return 0;

    const startTime = new Date(start).getTime();
    let endTime = end ? new Date(end).getTime() : currentTime.getTime();

    // Apply the subject duration limit if there's no end time yet
    if (!end && subjectDuration > 0) {
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
  ) => {
    if (!start || subjectDuration <= 0) return 0;

    const durationMinutes = calculateDurationMinutes(start, end);
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
                          {new Date(subjectData.startTime).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}{" "}
                          -
                          {new Date(subjectData.endTime).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                          )
                        </span>
                      )}
                    </div>
                  )}
                  {subjectDuration > 0 && (
                    <div className="mt-1 flex items-center text-sm">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>Duration: {subjectDuration} minutes</span>
                    </div>
                  )}
                </CardDescription>
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAdjustStatus}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Auto-Adjust Status
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
                      <TableHead className="w-[120px]">Time Start</TableHead>
                      <TableHead className="w-[120px]">Time End</TableHead>
                      <TableHead className="w-[120px]">Total</TableHead>
                      <TableHead className="w-[100px]">Break Left</TableHead>
                      <TableHead className="w-[120px]">Percentage</TableHead>
                      <TableHead className="w-[220px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {students.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            No students found.
                          </TableCell>
                        </TableRow>
                      )}
                      {students.map((student) => {
                        const percentage = calculatePercentage(
                          student.timeStart,
                          student.timeEnd,
                        );
                        const percentageColor = getPercentageColor(percentage);
                        const isActive = student.timeStart && !student.timeEnd;
                        const hasReachedLimit =
                          isActive &&
                          calculateDurationMinutes(student.timeStart, null) >=
                            subjectDuration;
                        const isOnBreak = student.paused;
                        const hasNoBreakTime = hasNoBreakTimeLeft(
                          student.breakTime,
                        );

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
                                      On Break
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
                                      value as "PRESENT" | "ABSENT" | "LATE",
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[130px]">
                                    <SelectValue placeholder="Change status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {attendanceStatusOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatTime(student.timeStart)}
                            </TableCell>
                            <TableCell>{formatTime(student.timeEnd)}</TableCell>
                            <TableCell>
                              <div
                                className={`font-mono ${isActive && !isOnBreak ? "font-medium text-green-600" : ""}`}
                              >
                                {calculateDuration(
                                  student.timeStart,
                                  student.timeEnd,
                                )}
                              </div>
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
                              {student.recordId ? (
                                <div className="flex flex-wrap gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleStartTimeTracking(
                                              student.recordId!,
                                            )
                                          }
                                          className="h-8 px-2 py-0"
                                          disabled={!!student.timeStart}
                                        >
                                          <Clock className="mr-1 h-3 w-3" />
                                          Start
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {student.timeStart
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
                                          onClick={() =>
                                            handleStopTimeTracking(
                                              student.recordId!,
                                            )
                                          }
                                          className="h-8 px-2 py-0"
                                          disabled={
                                            !student.timeStart ||
                                            !!student.timeEnd
                                          }
                                        >
                                          <Square className="mr-1 h-3 w-3" />
                                          End
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {!student.timeStart
                                          ? "Start time tracking first"
                                          : student.timeEnd
                                            ? "Time tracking already ended"
                                            : hasReachedLimit
                                              ? "Maximum duration reached"
                                              : "End time tracking"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {isActive && (
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
                                                disabled={hasNoBreakTime}
                                              >
                                                <Pause className="mr-1 h-3 w-3" />
                                                Pause
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {hasNoBreakTime
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
                                              >
                                                <Play className="mr-1 h-3 w-3" />
                                                Resume
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Stop break and resume tracking
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Save status first
                                </div>
                              )}
                              {hasReachedLimit && (
                                <div className="mt-1 text-xs text-amber-600">
                                  Max duration reached
                                </div>
                              )}
                              {hasNoBreakTime && isActive && (
                                <div className="mt-1 text-xs text-red-600">
                                  No break time left
                                </div>
                              )}
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
      </motion.div>
    </div>
  );
}
