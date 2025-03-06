"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
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
  Camera,
  Upload,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Loader from "../(components)/Loader";

const TeachersPage = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"upload" | "camera">("upload");
  const [showCameraPermissionAlert, setShowCameraPermissionAlert] =
    useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 10;

  const { data, refetch, isLoading } = api.teachers.getTeacher.useQuery({
    skip: (page - 1) * pageSize,
    take: pageSize,
    search,
  });

  const upsertStudent = api.teachers.createOrUpdateTeacher.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: editingStudent
          ? "Teacher updated successfully"
          : "New Teacher added successfully",
        className: "bg-green-50 border-green-200",
      });
      await refetch();
      setDialogOpen(false);
      setEditingStudent(null);
      setImagePreview(null);
      setImageSource("upload");
      setShowCameraPermissionAlert(false);
    },
  });

  const deleteStudent = api.teachers.deleteTeacher.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
        className: "bg-green-50 border-green-200",
      });
      await refetch();
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setImagePreview(student.image);
    setImageSource("upload");
    setShowCameraPermissionAlert(false);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          cameraInputRef.current?.click();
          setShowCameraPermissionAlert(false);
        })
        .catch((err) => {
          console.error("Camera permission denied:", err);
          toast({
            title: "Camera Access Denied",
            description: "Please allow camera access to take a photo.",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Camera Not Supported",
        description: "Your browser doesn't support camera access.",
        variant: "destructive",
      });
    }
  };

  const handleImageSourceChange = (value: string) => {
    setImageSource(value as "upload" | "camera");
    if (value === "camera") {
      setShowCameraPermissionAlert(true);
    } else {
      setShowCameraPermissionAlert(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const studentData = {
      id: editingStudent?.id,
      firstname: formData.get("firstname") as string,
      middleName: (formData.get("middleName") as string) || null,
      lastName: formData.get("lastName") as string,
      image: imagePreview || "/placeholder.svg?height=100&width=100",
      username: (formData.get("username") as string) || null,
      Password: (formData.get("password") as string) || null,
    };

    upsertStudent.mutate(studentData);
  };

  const getInitials = (firstname: string, lastName: string) => {
    return `${firstname.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  useEffect(() => {
    if (!dialogOpen) {
      setShowCameraPermissionAlert(false);
      setImageSource("upload");
    }
  }, [dialogOpen]);

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
                  Teachers Management
                </CardTitle>
                <Button
                  onClick={() => {
                    setEditingStudent(null);
                    setImagePreview(null);
                    setImageSource("upload");
                    setShowCameraPermissionAlert(false);
                    setDialogOpen(true);
                  }}
                  className="group transition-all duration-300 hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                  Add New Teacher
                </Button>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <div className="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search teachers..."
                      value={search}
                      onChange={handleSearch}
                      className="w-full pl-8"
                    />
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
                          <TableHead>Profile</TableHead>
                          <TableHead>First Name</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Middle Name
                          </TableHead>
                          <TableHead>Last Name</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Username
                          </TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {data?.data.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="h-24 text-center"
                              >
                                No teachers found.
                              </TableCell>
                            </TableRow>
                          )}
                          {data?.data.map((student) => (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell>
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
                              </TableCell>
                              <TableCell className="font-medium">
                                {student.firstname}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {student.middleName || "-"}
                              </TableCell>
                              <TableCell>{student.lastName}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {student.username || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(student)}
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
                                          will permanently delete the teacher
                                          record for {student.firstname}{" "}
                                          {student.lastName}.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            deleteStudent.mutate({
                                              id: student.id,
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
                  {editingStudent ? "Edit Teacher" : "Add New Teacher"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details of the Teacher.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="mx-auto mb-4">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="h-24 w-24 border-2 border-primary/20">
                        <AvatarImage
                          src={
                            imagePreview ||
                            "/placeholder.svg?height=100&width=100"
                          }
                          alt="Preview"
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-lg">
                          {editingStudent
                            ? getInitials(
                                editingStudent.firstname,
                                editingStudent.lastName,
                              )
                            : "Upload"}
                        </AvatarFallback>
                      </Avatar>

                      <Tabs
                        defaultValue="upload"
                        value={imageSource}
                        onValueChange={handleImageSourceChange}
                        className="w-full max-w-xs"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="upload">Upload</TabsTrigger>
                          <TabsTrigger value="camera">Camera</TabsTrigger>
                        </TabsList>

                        <AnimatePresence mode="wait">
                          {imageSource === "upload" && (
                            <motion.div
                              key="upload"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <TabsContent value="upload" className="mt-2">
                                <div className="flex justify-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerFileInput}
                                    className="w-full"
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Choose File
                                  </Button>
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                  />
                                </div>
                              </TabsContent>
                            </motion.div>
                          )}

                          {imageSource === "camera" && (
                            <motion.div
                              key="camera"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <TabsContent value="camera" className="mt-2">
                                {showCameraPermissionAlert && (
                                  <Alert className="mb-3">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>
                                      Camera Permission Required
                                    </AlertTitle>
                                    <AlertDescription>
                                      You'll need to allow camera access to take
                                      a photo.
                                    </AlertDescription>
                                  </Alert>
                                )}
                                <div className="flex justify-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerCameraInput}
                                    className="w-full"
                                  >
                                    <Camera className="mr-2 h-4 w-4" />
                                    Take Photo
                                  </Button>
                                  <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    className="hidden"
                                  />
                                </div>
                              </TabsContent>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Tabs>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstname">First Name*</Label>
                      <Input
                        id="firstname"
                        name="firstname"
                        defaultValue={editingStudent?.firstname}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        name="middleName"
                        defaultValue={editingStudent?.middleName}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name*</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        defaultValue={editingStudent?.lastName}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        defaultValue={editingStudent?.username}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      {editingStudent
                        ? "New Password (leave blank to keep current)"
                        : "Password"}
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      defaultValue=""
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={upsertStudent.isPending}
                  >
                    {upsertStudent.isPending ? "Saving..." : "Save Teacher"}
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

export default TeachersPage;
