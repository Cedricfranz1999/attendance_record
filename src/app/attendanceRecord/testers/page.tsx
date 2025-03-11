"use client";

import type React from "react";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Loader from "../(components)/Loader";
import { useRouter } from "next/navigation";

const AttendancePage = () => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const router = useRouter();
  const pageSize = 10;

  const { data, refetch, isLoading } = api.attendances.getAttendance.useQuery({
    skip: (page - 1) * pageSize,
    take: pageSize,
    startDate,
    endDate,
  });

  const upsertAttendance = api.attendances.createOrUpdateAttendance.useMutation(
    {
      onSuccess: async () => {
        toast({
          title: "Success",
          description: editingAttendance
            ? "Attendance updated successfully"
            : "New attendance added successfully",
          className: "bg-green-50 border-green-200",
        });
        await refetch();
        setDialogOpen(false);
        setEditingAttendance(null);
        setSelectedDate(new Date());
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to save attendance",
        });
      },
    },
  );

  const deleteAttendance = api.attendances.deleteAttendance.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Attendance deleted successfully",
        className: "bg-green-50 border-green-200",
      });
      await refetch();
    },
  });

  const handleEdit = (attendance: any) => {
    setEditingAttendance(attendance);
    setSelectedDate(new Date(attendance.date));
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
      });
      return;
    }

    const attendanceData = {
      id: editingAttendance?.id,
      date: selectedDate,
    };

    upsertAttendance.mutate(attendanceData);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "PPP");
  };

  const applyFilter = () => {
    setPage(1);
    refetch();
  };

  const clearFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
    refetch();
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
                  Attendance Management
                </CardTitle>
                <Button
                  onClick={() => {
                    setEditingAttendance(null);
                    setSelectedDate(new Date());
                    setDialogOpen(true);
                  }}
                  className="group transition-all duration-300 hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                  Add New Attendance
                </Button>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <div className="mb-4 flex flex-col space-y-4 md:flex-row md:items-end md:justify-between md:space-y-0">
                  <div className="flex flex-col space-y-2 md:flex-row md:items-end md:space-x-4 md:space-y-0">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Popover
                        open={startDateOpen}
                        onOpenChange={setStartDateOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id="start-date"
                            variant="outline"
                            className="w-full justify-start text-left md:w-[200px]"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate
                              ? format(startDate, "PPP")
                              : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                              setStartDate(date);
                              setStartDateOpen(false);
                            }}
                            initialFocus
                            disabled={(date) =>
                              endDate ? date > endDate : false
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="end-date">End Date</Label>
                      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="end-date"
                            variant="outline"
                            className="w-full justify-start text-left md:w-[200px]"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => {
                              setEndDate(date);
                              setEndDateOpen(false);
                            }}
                            initialFocus
                            disabled={(date) =>
                              startDate ? date < startDate : false
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={applyFilter}
                        disabled={!startDate && !endDate}
                      >
                        Apply Filter
                      </Button>
                      <Button
                        variant="outline"
                        onClick={clearFilter}
                        disabled={!startDate && !endDate}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Select
                      defaultValue={pageSize.toString()}
                      onValueChange={(value) => {
                        const newSize = Number.parseInt(value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Rows" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 rows</SelectItem>
                        <SelectItem value="10">10 rows</SelectItem>
                        <SelectItem value="20">20 rows</SelectItem>
                        <SelectItem value="50">50 rows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Day of Week</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {data?.data.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="h-24 text-center"
                              >
                                No attendance records found.
                              </TableCell>
                            </TableRow>
                          )}
                          {data?.data.map((attendance) => (
                            <motion.tr
                              key={attendance.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell>{attendance.id}</TableCell>
                              <TableCell className="font-medium">
                                {formatDate(attendance.date.toISOString())}
                              </TableCell>
                              <TableCell>
                                {format(new Date(attendance.date), "EEEE")}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(attendance)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">Edit</span>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 border-destructive/20 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <span className="sr-only">Delete</span>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Are you sure?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This
                                          will permanently delete the attendance
                                          record for{" "}
                                          {formatDate(
                                            attendance.date.toISOString(),
                                          )}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            deleteAttendance.mutate({
                                              id: attendance.id,
                                            })
                                          }
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      router.push(
                                        `/attendanceRecord/testers/${attendance.id}`,
                                      )
                                    }
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only"></span>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
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
                    {Math.max(1, Math.ceil((data?.total || 0) / pageSize))}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={
                      !data?.data.length || data?.data.length < pageSize
                    }
                    className="gap-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Add/Edit Attendance Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingAttendance ? "Edit Attendance" : "Add New Attendance"}
                </DialogTitle>
                <DialogDescription>
                  Select a date for attendance. Each date can only have one
                  attendance record.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="mx-auto mb-4">
                    <div className="flex flex-col items-center gap-3">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border"
                      />
                      {!selectedDate && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Required</AlertTitle>
                          <AlertDescription>
                            Please select a date for the attendance record.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={upsertAttendance.isPending || !selectedDate}
                  >
                    {upsertAttendance.isPending
                      ? "Saving..."
                      : "Save Attendance"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
};

export default AttendancePage;
