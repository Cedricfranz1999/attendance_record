"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Trash2, Plus, RefreshCw } from "lucide-react";
import { api } from "@/trpc/react";
import Image from "next/image";

const StandbyStudents = () => {
  // State for search, pagination, and dialog
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const pageSize = 10;

  // Fetch standby students with search and pagination
  const standbyStudentsQuery = api.standbyStudents.getStandbyStudents.useQuery({
    skip: (page - 1) * pageSize,
    take: pageSize,
    search: search,
  });

  // Fetch all students for selection
  const studentsQuery = api.students.getStudents.useQuery({
    take: 100, // Adjust based on your needs
  });

  // Mutations
  const createStandbyStudentMutation =
    api.standbyStudents.createStandbyStudent.useMutation({
      onSuccess: () => {
        standbyStudentsQuery.refetch();
        setIsAddDialogOpen(false);
        setSelectedStudentId(null);
      },
    });

  const deleteStandbyStudentMutation =
    api.standbyStudents.deleteStandbyStudent.useMutation({
      onSuccess: () => {
        standbyStudentsQuery.refetch();
      },
    });

  // Filter out students who are already in standby
  const availableStudents =
    studentsQuery.data?.data.filter(
      (student: any) =>
        !standbyStudentsQuery.data?.data.some(
          (standby: any) => standby.studentId === student.id,
        ),
    ) || [];

  // Handle adding a student to standby
  const handleAddStandbyStudent = () => {
    if (selectedStudentId) {
      createStandbyStudentMutation.mutate({
        studentId: selectedStudentId,
        startTime: new Date(),
        status: "PRESENT",
      });
    }
  };

  // Handle deleting a standby student
  const handleDeleteStandbyStudent = (id: number) => {
    if (confirm("Are you sure you want to remove this student from standby?")) {
      deleteStandbyStudentMutation.mutate({ id });
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(
    (standbyStudentsQuery.data?.total || 0) / pageSize,
  );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Standby Students</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students..."
              className="w-[250px] pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => standbyStudentsQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student to Standby</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="student">Select Student</label>
                  <Select
                    onValueChange={(value) =>
                      setSelectedStudentId(Number(value))
                    }
                    value={selectedStudentId?.toString() || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.map((student) => (
                        <SelectItem
                          key={student.id}
                          value={student.id.toString()}
                        >
                          {student.firstname}{" "}
                          {student.middleName ? student.middleName + " " : ""}
                          {student.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddStandbyStudent}
                  disabled={
                    !selectedStudentId || createStandbyStudentMutation.isPending
                  }
                >
                  {createStandbyStudentMutation.isPending
                    ? "Adding..."
                    : "Add to Standby"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standbyStudentsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : standbyStudentsQuery.data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  No standby students found
                </TableCell>
              </TableRow>
            ) : (
              standbyStudentsQuery.data?.data.map((standby) => (
                <TableRow key={standby.id}>
                  <TableCell>
                    <div>
                      <Image
                        src={standby.student.image}
                        alt="student image"
                        height={100}
                        width={100}
                        className="rounded-full"
                      />
                    </div>
                  </TableCell>

                  <TableCell>
                    {standby.student.firstname}{" "}
                    {standby.student.middleName
                      ? standby.student.middleName + " "
                      : ""}
                    {standby.student.lastName}
                  </TableCell>
                  <TableCell>
                    {format(new Date(standby.startTime), "PPp")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        standby.status === "PRESENT"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {standby.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteStandbyStudent(standby.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={page === p}
                  onClick={() => setPage(p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={
                  page >= totalPages ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default StandbyStudents;
