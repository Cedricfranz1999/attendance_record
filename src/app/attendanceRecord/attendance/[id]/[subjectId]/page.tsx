"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Calendar, Clock, LogIn, LogOut, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "@/app/attendanceRecord/(components)/Loader";

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
  recordId?: number;
  firstname: string;
  middleName?: string | null;
  lastName: string;
  image: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  detectIn: boolean;
  detectOut: boolean;
  active: boolean;
  timeStart?: Date | null;
  timeEnd?: Date | null;
  remainingBreak: number;
  totalTime: number;
  lastExitTime?: Date | null;
  changed?: boolean;
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

  // Fetch students with their attendance records
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
          variant: "destructive",
        });
      },
    });

  // Update student detection status
  const updateDetectionStatus =
    api.attendanceRecord.updateDetectionStatus.useMutation({
      onSuccess: () => {
        refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update detection status",
          variant: "destructive",
        });
      },
    });

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
          detectIn: student.attendanceRecord?.detectIn || false,
          detectOut: student.attendanceRecord?.detectOut || false,
          active: student.attendanceRecord?.active || false,
          timeStart: student.attendanceRecord?.timeStart || null,
          timeEnd: student.attendanceRecord?.timeEnd || null,
          remainingBreak: student.attendanceRecord?.remainingBreak || 600,
          totalTime: student.attendanceRecord?.totalTime || 0,
          lastExitTime: student.attendanceRecord?.lastExitTime || null,
        })),
      );
      setLoading(false);
    }
  }, [studentsData, studentsLoading]);

  // Update current time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle status change
  const handleStatusChange = (
    studentId: number,
    newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, status: newStatus, changed: true }
          : student,
      ),
    );

    const student = students.find((s) => s.id === studentId);

    updateAttendance.mutate({
      records: [
        {
          id: student?.recordId,
          studentId: studentId,
          attendanceId,
          subjectId,
          status: newStatus,
        },
      ],
    });
  };

  // Handle manual detection toggle
  const handleDetectionToggle = (studentId: number, type: "in" | "out") => {
    const student = students.find((s) => s.id === studentId);
    if (!student?.recordId) return;

    updateDetectionStatus.mutate({
      recordId: student.recordId,
      type,
      value: type === "in" ? !student.detectIn : !student.detectOut,
    });
  };

  // Format time display
  const formatTime = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Format duration in HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate current duration for active students
  const getCurrentDuration = (student: StudentAttendance) => {
    if (!student.timeStart) return 0;

    let totalSeconds = student.totalTime;

    // If student is active (in class), add current session time
    if (student.active && !student.detectOut) {
      const startTime = new Date(student.timeStart);
      const now = new Date();
      totalSeconds += Math.floor((now.getTime() - startTime.getTime()) / 1000);
    }

    return totalSeconds;
  };

  // Format remaining break time
  const formatBreakTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    return (
      attendanceStatusOptions.find((option) => option.value === status)
        ?.color || "bg-gray-100 text-gray-800"
    );
  };

  // Get initials for avatar fallback
  const getInitials = (firstname: string, lastName: string) => {
    return `${firstname.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get full name
  const getFullName = (student: StudentAttendance) => {
    return `${student.firstname} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
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
                </CardDescription>
              </div>
              <div className="text-sm">
                Current Time: {currentTime.toLocaleTimeString()}
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
                      <TableHead>Status</TableHead>
                      <TableHead>Detection</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Total Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {students.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No students found.
                          </TableCell>
                        </TableRow>
                      )}
                      {students.map((student) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className={`border-b transition-colors hover:bg-muted/50 ${
                            student.changed ? "bg-primary/5" : ""
                          } ${student.active ? "bg-green-50" : ""}`}
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
                                {student.active && (
                                  <div className="text-xs text-green-600">
                                    Active
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
                                    (option) => option.value === student.status,
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
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <LogIn className="h-4 w-4 text-green-600" />
                                <Badge
                                  variant={
                                    student.detectIn ? "default" : "outline"
                                  }
                                  className="cursor-pointer"
                                  onClick={() =>
                                    handleDetectionToggle(student.id, "in")
                                  }
                                >
                                  {student.detectIn ? "In" : "Not In"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <LogOut className="h-4 w-4 text-amber-600" />
                                <Badge
                                  variant={
                                    student.detectOut ? "default" : "outline"
                                  }
                                  className="cursor-pointer"
                                  onClick={() =>
                                    handleDetectionToggle(student.id, "out")
                                  }
                                >
                                  {student.detectOut ? "Out" : "Not Out"}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              <div>
                                <span className="font-medium">In:</span>{" "}
                                {formatTime(student.timeStart)}
                              </div>
                              <div>
                                <span className="font-medium">Out:</span>{" "}
                                {formatTime(student.timeEnd)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="text-sm">
                                <Timer className="mr-1 inline-block h-3 w-3" />
                                {formatBreakTime(student.remainingBreak)}
                              </div>
                              <Progress
                                value={(student.remainingBreak / 600) * 100}
                                className="h-2 w-24"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatDuration(getCurrentDuration(student))}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
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
