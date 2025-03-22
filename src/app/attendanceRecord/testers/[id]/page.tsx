"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader,
  Eye,
  CheckCircle,
  MinusCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SubjectsPage = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [testCounter, setTestCounter] = useState(0);
  const [subjectToActivate, setSubjectToActivate] = useState<number | null>(
    null,
  );
  const router = useRouter();
  const pageSize = 10;

  // Fetch subjects with search, pagination, and teacher filter
  const { data, refetch, isLoading } = api.subjects.getSubjects.useQuery({
    skip: (page - 1) * pageSize,
    take: pageSize,
    search,
    teacherId: selectedTeacher || undefined,
  });

  // Fetch all teachers for the dropdown
  const { data: teachers } = api.subjects.getAllTeachers.useQuery();
  const pathname = usePathname(); // Get the current path

  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch: refetchAttendance,
  } = api.attendanceRecord.getStudentAttendanceRefetch.useQuery();

  const toggleSubjectActive = api.subjects.toggleSubjectActive.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Subject ${data.active ? "activated" : "deactivated"} successfully`,
        className: "bg-green-50 border-green-200",
      });
      refetch();
      refetchAttendance();
      setSubjectToActivate(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle subject active status",
      });
    },
  });

  const upsertSubject = api.subjects.createOrUpdateSubject.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: editingSubject
          ? "Subject updated successfully"
          : "New subject added successfully",
        className: "bg-green-50 border-green-200",
      });
      await refetch();
      setDialogOpen(false);
      setEditingSubject(null);
    },
  });

  const deleteSubject = api.subjects.deleteSubject.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Subject deleted successfully",
        className: "bg-green-50 border-green-200",
      });
      await refetch();
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleTeacherFilter = (value: string) => {
    setSelectedTeacher(value === "all" ? null : Number(value));
    setPage(1);
  };

  const handleEdit = (subject: any) => {
    // Format times for the form
    const formattedSubject = {
      ...subject,
      startTime: subject.startTime
        ? new Date(subject.startTime).toTimeString().slice(0, 5)
        : "",
      endTime: subject.endTime
        ? new Date(subject.endTime).toTimeString().slice(0, 5)
        : "",
    };
    setEditingSubject(formattedSubject);
    setDialogOpen(true);
  };

  // Handle toggle active status
  const handleToggleActive = (subjectId: number) => {
    toggleSubjectActive.mutate({
      subjectId,
    });
  };

  // Handle activation from dropdown
  const handleActivateSelectedSubject = () => {
    if (subjectToActivate) {
      toggleSubjectActive.mutate({
        subjectId: subjectToActivate,
      });
    } else {
      toast({
        title: "Warning",
        description: "Please select a subject to activate",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Get current date to combine with time
    const today = new Date();

    // Create full datetime by combining today's date with selected time
    const startTime = formData.get("startTime")
      ? new Date(today.toDateString() + " " + formData.get("startTime"))
      : null;
    const endTime = formData.get("endTime")
      ? new Date(today.toDateString() + " " + formData.get("endTime"))
      : null;

    const subjectData = {
      id: editingSubject?.id,
      name: formData.get("name") as string,
      startTime: startTime ? startTime.toISOString() : null,
      endTime: endTime ? endTime.toISOString() : null,
      duration: formData.get("duration")
        ? Number(formData.get("duration"))
        : null,
      teacherId: Number(formData.get("teacherId")),
      order: formData.get("order") ? Number(formData.get("order")) : null,
    };

    upsertSubject.mutate(subjectData);
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;
  };

  const getTeacherName = (teacher: any) => {
    return `${teacher.firstname} ${teacher.middleName ? teacher.middleName + " " : ""}${teacher.lastName}`;
  };

  const getInitials = (firstname: string, lastName: string) => {
    return `${firstname.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const deactivateAllSubjects = api.subjects.deactivateAllSubjects.useMutation({
    onMutate: () => {
      console.log("Mutation started");
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded:", data);
      toast({
        title: "Success",
        description: `All subjects deactivated successfully`,
        className: "bg-green-50 border-green-200",
      });
      refetch();
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate subjects",
      });
    },
  });

  // Add this function at the top level of your component
  const handleDeactivateAllSubjects = () => {
    console.log("Deactivate function called");
    try {
      deactivateAllSubjects.mutate();
      console.log("Mutation called");
    } catch (error) {
      console.error("Error calling mutation:", error);
    }
  };

  // Add this useEffect to check if the component is mounting properly
  useEffect(() => {
    console.log("SubjectsPage component mounted");
  }, []);

  return (
    <>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
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
                  Subjects Management
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    className="group bg-red-400 transition-all duration-300 hover:bg-primary/90 hover:bg-red-500"
                    onClick={handleDeactivateAllSubjects}
                    disabled={deactivateAllSubjects.isPending}
                  >
                    {deactivateAllSubjects.isPending ? (
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MinusCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                    )}
                    Inactive All Subjects
                  </Button>

                  <Button
                    onClick={() => {
                      setEditingSubject(null);
                      setDialogOpen(true);
                    }}
                    className="group bg-green-600 transition-all duration-300 hover:bg-green-800"
                  >
                    <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                    Add New Subject
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <div className="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
                    <div className="relative w-full max-w-sm">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search subjects..."
                        value={search}
                        onChange={handleSearch}
                        className="w-full pl-8"
                      />
                    </div>
                    <Select
                      value={selectedTeacher ? String(selectedTeacher) : "all"}
                      onValueChange={handleTeacherFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teachers</SelectItem>
                        {teachers?.map((teacher) => (
                          <SelectItem
                            key={teacher.id}
                            value={teacher.id.toString()}
                          >
                            {getTeacherName(teacher)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                {/* Subject Activation Dropdown */}
                {/* <div className="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                  <div className="flex-1">
                    <Select
                      value={subjectToActivate ? String(subjectToActivate) : ""}
                      onValueChange={(value) =>
                        setSubjectToActivate(value ? Number(value) : null)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select subject to activate" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.data.map((subject) => (
                          <SelectItem
                            key={subject.id}
                            value={subject.id.toString()}
                          >
                            {subject.name} - {getTeacherName(subject.teacher)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleActivateSelectedSubject}
                    disabled={
                      !subjectToActivate || toggleSubjectActive.isPending
                    }
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {toggleSubjectActive.isPending ? (
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Activate Selected Subject
                  </Button>
                </div> */}

                <div className="overflow-hidden rounded-md border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject Name</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Start Time
                          </TableHead>
                          <TableHead className="hidden md:table-cell">
                            End Time
                          </TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {data?.data.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className="h-24 text-center"
                              >
                                No subjects found.
                              </TableCell>
                            </TableRow>
                          )}
                          {data?.data.map((subject) => (
                            <motion.tr
                              key={subject.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                              className={`border-b transition-colors hover:bg-muted/50 ${
                                subject.active ? "bg-green-50" : ""
                              }`}
                            >
                              <TableCell className="font-medium">
                                {subject.name}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 border">
                                    <AvatarImage
                                      src={subject.teacher.image}
                                      alt={subject.teacher.firstname}
                                    />
                                    <AvatarFallback className="bg-primary/10">
                                      {getInitials(
                                        subject.teacher.firstname,
                                        subject.teacher.lastName,
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="hidden md:inline">
                                    {getTeacherName(subject.teacher as any)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {formatTime(subject.startTime as any)}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {formatTime(subject.endTime as any)}
                              </TableCell>
                              <TableCell>
                                {formatDuration(subject.duration)}
                              </TableCell>
                              <TableCell>{subject.order}</TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant={
                                          subject.active ? "default" : "outline"
                                        }
                                        disabled={toggleSubjectActive.isPending}
                                        size="sm"
                                        onClick={() =>
                                          handleToggleActive(subject.id)
                                        }
                                        className={`h-8 w-[90px] ${
                                          subject.active
                                            ? "bg-green-500 hover:bg-green-600"
                                            : "hover:bg-green-100"
                                        }`}
                                      >
                                        {subject.active ? (
                                          <>
                                            <CheckCircle className="mr-1 h-4 w-4" />
                                            Active
                                          </>
                                        ) : (
                                          "Inactive"
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {subject.active
                                        ? "This subject is currently active"
                                        : "Click to make this subject active (will deactivate other subjects)"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(subject)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">Edit</span>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      router.push(`${pathname}/${subject.id}`)
                                    }
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="sr-only">
                                      Show Attendance
                                    </span>
                                    <Eye className="h-4 w-4" />
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
                                          will permanently delete the subject{" "}
                                          {subject.name}.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            deleteSubject.mutate({
                                              id: subject.id,
                                            })
                                          }
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? "Edit Subject" : "Add New Subject"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details of the subject.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Subject Name*</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingSubject?.name}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacherId">Teacher*</Label>
                    <Select
                      name="teacherId"
                      defaultValue={
                        editingSubject?.teacherId?.toString() || undefined
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers?.map((teacher) => (
                          <SelectItem
                            key={teacher.id}
                            value={teacher.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={teacher.image}
                                  alt={teacher.firstname}
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(
                                    teacher.firstname,
                                    teacher.lastName,
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              {getTeacherName(teacher)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="startTime"
                          name="startTime"
                          type="time"
                          defaultValue={editingSubject?.startTime}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="endTime"
                          name="endTime"
                          type="time"
                          defaultValue={editingSubject?.endTime}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">
                      Duration (minutes, optional)
                    </Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      min="0"
                      defaultValue={editingSubject?.duration?.toString()}
                      placeholder="e.g., 60 for 1 hour"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Order of subjects</Label>
                    <Input
                      id="order"
                      name="order"
                      type="number"
                      min="0"
                      defaultValue={editingSubject?.order?.toString()}
                      placeholder="order of subjects time"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={upsertSubject.isPending}
                  >
                    {upsertSubject.isPending ? "Saving..." : "Save Subject"}
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

export default SubjectsPage;
