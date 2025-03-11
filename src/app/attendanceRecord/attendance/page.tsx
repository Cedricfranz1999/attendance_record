"use client";

import { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  RefreshCw,
  FileDown,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Loader from "../(components)/Loader";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

const AttendancePage = () => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [studentIds, setStudentIds] = useState<number[]>([]);
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<AttendanceStatus | "">("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const pageSize = 10;
  const tableRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch students for filter
  const { data: studentsData } = api.students.getStudents.useQuery({
    take: 100, // Get all students for filtering
  });

  // Fetch subjects for filter
  const { data: subjectsData } = api.attendanceOverview.getSubjects.useQuery({
    take: 100, // Get all subjects for filtering
  });

  // Fetch attendance records with filters
  const {
    data: attendanceData,
    refetch,
    isLoading,
  } = api.attendanceOverview.getAttendanceRecords.useQuery({
    skip: (page - 1) * pageSize,
    take: pageSize,
    studentIds: studentIds.length > 0 ? studentIds : undefined,
    subjectIds: subjectIds.length > 0 ? subjectIds : undefined,
    startDate,
    endDate,
    status: status || undefined,
  });

  // Fetch all attendance records for export (no pagination)
  // Remove this query:
  // const { data: exportData, refetch: refetchExport } = api.attendance.getAttendanceRecords.useQuery(
  //   {
  //     take: 1000, // Get more records for export
  //     studentIds: studentIds.length > 0 ? studentIds : undefined,
  //     subjectIds: subjectIds.length > 0 ? subjectIds : undefined,
  //     startDate,
  //     endDate,
  //     status: status || undefined,
  //   },
  //   {
  //     enabled: isExporting, // Only fetch when exporting
  //   },
  // )

  const resetFilters = () => {
    setStudentIds([]);
    setSubjectIds([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setStatus("");
    setPage(1);
  };

  const handleStudentFilterChange = (studentId: number) => {
    setStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
    setPage(1);
  };

  const handleSubjectFilterChange = (subjectId: number) => {
    setSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as AttendanceStatus | "");
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600">
            Present
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600">
            Absent
          </Badge>
        );
      case "LATE":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600">
            Late
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600">
            Unknown
          </Badge>
        );
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "Present";
      case "ABSENT":
        return "Absent";
      case "LATE":
        return "Late";
      default:
        return "Unknown";
    }
  };

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return "-";
    return format(new Date(date), "h:mm a");
  };

  const getInitials = (firstname: string, lastName: string) => {
    return `${firstname.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (studentIds.length > 0) count++;
    if (subjectIds.length > 0) count++;
    if (startDate || endDate) count++;
    if (status) count++;
    return count;
  };

  // Handle print functionality with explicit contentRef
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    documentTitle: "Attendance Records",
    // Use the contentRef property instead of content function
    contentRef: componentRef,
    onBeforeGetContent: () => {
      return new Promise<void>((resolve) => {
        toast({
          title: "Preparing print view",
          description: "Please wait while we prepare the print view.",
        });
        setTimeout(() => {
          resolve();
        }, 500);
      });
    },
    onAfterPrint: () => {
      toast({
        title: "Print successful",
        description: "The attendance records have been sent to your printer.",
        className: "bg-green-50 border-green-200",
      });
    },
  } as any);

  // Add a function to calculate render hours (time difference)
  const calculateRenderHours = (
    timeStart: Date | null | undefined,
    timeEnd: Date | null | undefined,
  ) => {
    if (!timeStart || !timeEnd) return "-";

    const start = new Date(timeStart);
    const end = new Date(timeEnd);

    // Calculate difference in milliseconds
    const diffMs = end.getTime() - start.getTime();

    // Convert to hours and minutes
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} hr`;
    } else {
      return `${hours} hr ${minutes} min`;
    }
  };

  // Handle Excel export
  const handleExportExcel = () => {
    setIsExporting(true);

    try {
      if (attendanceData && attendanceData.data.length > 0) {
        // Prepare data for export using current table data
        const exportRows = attendanceData.data.map((record) => ({
          Date: format(new Date(record.attendance.date), "yyyy-MM-dd"),
          Student: `${record.student.firstname} ${record.student.lastName}`,
          Subject: record?.subject?.name,
          Status: getStatusText(record.status),
          "Time In": record.timeStart ? formatTime(record.timeStart) : "-",
          "Time Out": record.timeEnd ? formatTime(record.timeEnd) : "-",
          "Render Hours": calculateRenderHours(
            record.timeStart,
            record.timeEnd,
          ),
        }));

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportRows);

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Records");

        // Generate file name with date range if available
        let fileName = "attendance_records";
        if (startDate && endDate) {
          fileName += `_${format(startDate, "yyyyMMdd")}_to_${format(endDate, "yyyyMMdd")}`;
        } else if (startDate) {
          fileName += `_from_${format(startDate, "yyyyMMdd")}`;
        } else if (endDate) {
          fileName += `_until_${format(endDate, "yyyyMMdd")}`;
        }
        fileName += ".xlsx";

        // Export to file
        XLSX.writeFile(workbook, fileName);

        toast({
          title: "Export successful",
          description: `${exportRows.length} records exported to Excel.`,
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({
          title: "Export failed",
          description: "No data available to export.",
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <div className="container mx-auto p-2 md:p-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col space-y-2 bg-primary/5 md:flex-row md:items-center md:justify-between md:space-y-0">
                <CardTitle className="text-xl font-bold md:text-2xl">
                  Attendance Records
                </CardTitle>
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-1">
                        <FileDown className="h-4 w-4" />
                        Export/Print
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExportExcel()}
                        disabled={isExporting || !attendanceData?.data.length}
                        className="cursor-pointer"
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        {isExporting ? "Exporting..." : "Export to Excel"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePrint()}
                        disabled={!attendanceData?.data.length}
                        className="cursor-pointer"
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print Table
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="group">
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                        {getActiveFiltersCount() > 0 && (
                          <Badge className="ml-2 bg-primary text-primary-foreground">
                            {getActiveFiltersCount()}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md">
                      <SheetHeader>
                        <SheetTitle>Filter Attendance Records</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 grid gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Date Range</h3>
                            {(startDate || endDate) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setStartDate(undefined);
                                  setEndDate(undefined);
                                }}
                                className="h-auto p-0 text-xs text-muted-foreground"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col space-y-1">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="startDate"
                                      variant="outline"
                                      className="justify-start text-left font-normal"
                                    >
                                      {startDate ? (
                                        format(startDate, "PPP")
                                      ) : (
                                        <span className="text-muted-foreground">
                                          Pick a date
                                        </span>
                                      )}
                                      <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <CalendarComponent
                                      mode="single"
                                      selected={startDate}
                                      onSelect={setStartDate}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <Label htmlFor="endDate">End Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="endDate"
                                      variant="outline"
                                      className="justify-start text-left font-normal"
                                    >
                                      {endDate ? (
                                        format(endDate, "PPP")
                                      ) : (
                                        <span className="text-muted-foreground">
                                          Pick a date
                                        </span>
                                      )}
                                      <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <CalendarComponent
                                      mode="single"
                                      selected={endDate}
                                      onSelect={setEndDate}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Status</h3>
                            {status && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatus("")}
                                className="h-auto p-0 text-xs text-muted-foreground"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <Select
                            value={status}
                            onValueChange={handleStatusChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All Statuses</SelectItem>
                              <SelectItem value="PRESENT">Present</SelectItem>
                              <SelectItem value="ABSENT">Absent</SelectItem>
                              <SelectItem value="LATE">Late</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="students">
                            <AccordionTrigger className="text-sm font-medium">
                              Students
                              {studentIds.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 bg-primary/10"
                                >
                                  {studentIds.length}
                                </Badge>
                              )}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="mb-2 mt-2">
                                <Input
                                  placeholder="Search students..."
                                  className="mb-2"
                                />
                              </div>
                              <div className="max-h-[200px] overflow-y-auto">
                                {studentsData?.data.map((student) => (
                                  <div
                                    key={student.id}
                                    className="flex items-center space-x-2 py-1"
                                  >
                                    <Checkbox
                                      id={`student-${student.id}`}
                                      checked={studentIds.includes(student.id)}
                                      onCheckedChange={() =>
                                        handleStudentFilterChange(student.id)
                                      }
                                    />
                                    <Label
                                      htmlFor={`student-${student.id}`}
                                      className="flex flex-1 items-center space-x-2 text-sm"
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={student.image}
                                          alt={student.firstname}
                                        />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(
                                            student.firstname,
                                            student.lastName,
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>
                                        {student.firstname} {student.lastName}
                                      </span>
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="subjects">
                            <AccordionTrigger className="text-sm font-medium">
                              Subjects
                              {subjectIds.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 bg-primary/10"
                                >
                                  {subjectIds.length}
                                </Badge>
                              )}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="mb-2 mt-2">
                                <Input
                                  placeholder="Search subjects..."
                                  className="mb-2"
                                />
                              </div>
                              <div className="max-h-[200px] overflow-y-auto">
                                {subjectsData?.data.map((subject) => (
                                  <div
                                    key={subject.id}
                                    className="flex items-center space-x-2 py-1"
                                  >
                                    <Checkbox
                                      id={`subject-${subject.id}`}
                                      checked={subjectIds.includes(subject.id)}
                                      onCheckedChange={() =>
                                        handleSubjectFilterChange(subject.id)
                                      }
                                    />
                                    <Label
                                      htmlFor={`subject-${subject.id}`}
                                      className="flex-1 text-sm"
                                    >
                                      {subject.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                        <div className="flex justify-between pt-4">
                          <Button
                            variant="outline"
                            onClick={resetFilters}
                            className="w-full"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reset Filters
                          </Button>
                          <Button
                            onClick={() => {
                              setIsFilterOpen(false);
                              refetch();
                            }}
                            className="ml-2 w-full"
                          >
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <div
                  className="overflow-hidden rounded-md border"
                  ref={tableRef}
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Time In
                          </TableHead>
                          <TableHead className="hidden md:table-cell">
                            Time Out
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {attendanceData?.data.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="h-24 text-center"
                              >
                                No attendance records found.
                              </TableCell>
                            </TableRow>
                          )}
                          {attendanceData?.data.map((record) => (
                            <motion.tr
                              key={record.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell>
                                {format(
                                  new Date(record.attendance.date),
                                  "MMM dd, yyyy",
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={record.student.image}
                                      alt={record.student.firstname}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(
                                        record.student.firstname,
                                        record.student.lastName,
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>
                                    {record.student.firstname}{" "}
                                    {record.student.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{record?.subject?.name}</TableCell>
                              <TableCell>
                                {getStatusBadge(record.status)}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {formatTime(record.timeStart)}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {formatTime(record.timeEnd)}
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of{" "}
                    {Math.max(
                      1,
                      Math.ceil((attendanceData?.total || 0) / pageSize),
                    )}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={
                      !attendanceData?.data.length ||
                      attendanceData?.data.length < pageSize
                    }
                    className="gap-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Printable area - always in DOM but hidden */}
          <div className="hidden">
            <div ref={componentRef} className="p-8">
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold">Attendance Records</h1>
                {startDate && endDate && (
                  <p className="text-muted-foreground">
                    {format(startDate, "MMMM d, yyyy")} -{" "}
                    {format(endDate, "MMMM d, yyyy")}
                  </p>
                )}
                {startDate && !endDate && (
                  <p className="text-muted-foreground">
                    From {format(startDate, "MMMM d, yyyy")}
                  </p>
                )}
                {!startDate && endDate && (
                  <p className="text-muted-foreground">
                    Until {format(endDate, "MMMM d, yyyy")}
                  </p>
                )}
                {status && (
                  <p className="text-muted-foreground">
                    Status: {getStatusText(status)}
                  </p>
                )}
              </div>
              <table className="min-w-full border-collapse border">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                      Date
                    </th>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                      Student
                    </th>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                      Subject
                    </th>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                      Status
                    </th>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                      Time In
                    </th>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                      Time Out
                    </th>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                      Render Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData?.data.map((record) => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 p-2">
                        {format(
                          new Date(record.attendance.date),
                          "MMM dd, yyyy",
                        )}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {record.student.firstname} {record.student.lastName}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {record?.subject?.name}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {getStatusText(record.status)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {formatTime(record.timeStart)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {formatTime(record.timeEnd)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {calculateRenderHours(record.timeStart, record.timeEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>
                  Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
                </p>
                <p>
                  Page {page} of{" "}
                  {Math.max(
                    1,
                    Math.ceil((attendanceData?.total || 0) / pageSize),
                  )}
                </p>
                <p>Total Records: {attendanceData?.total || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendancePage;
