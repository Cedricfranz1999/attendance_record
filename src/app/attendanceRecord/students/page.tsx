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
  X,
  RefreshCcw,
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

// Define a type for camera devices
interface CameraDevice {
  deviceId: string;
  label: string;
}

const StudentsPage = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"upload" | "camera">("upload");
  const [showCameraPermissionAlert, setShowCameraPermissionAlert] =
    useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageSize = 10;

  const { data, refetch, isLoading } = api.students.getStudents.useQuery({
    skip: (page - 1) * pageSize,
    take: pageSize,
    search,
  });

  const upsertStudent = api.students.createOrUpdateStudent.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: editingStudent
          ? "Student updated successfully"
          : "New student added successfully",
        className: "bg-green-50 border-green-200",
      });
      await refetch();
      setDialogOpen(false);
      setEditingStudent(null);
      setImagePreview(null);
      setImageSource("upload");
      setShowCameraPermissionAlert(false);
      stopCameraStream();
    },
  });

  const deleteStudent = api.students.deleteStudent.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Student deleted successfully",
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

  // Function to enumerate and list available camera devices
  const getCameraDevices = async () => {
    setIsLoadingDevices(true);
    try {
      // First request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Stop this initial stream
      stream.getTracks().forEach((track) => track.stop());

      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
        }));

      setCameraDevices(videoDevices);

      // Select the first camera by default if we have devices and none is selected
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0]?.deviceId ?? "");
      }

      setShowCameraPermissionAlert(false);
    } catch (err) {
      console.error("Error accessing camera devices:", err);
      toast({
        title: "Camera Access Error",
        description:
          "Could not access camera devices. Please check permissions.",
      });
      setShowCameraPermissionAlert(true);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  // Start camera with the selected device
  const startCameraStream = async () => {
    stopCameraStream(); // Stop any existing stream first

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // If no camera is selected but we have devices, select the first one
      if (!selectedCamera && cameraDevices.length > 0) {
        setSelectedCamera(cameraDevices[0]?.deviceId ?? "");
      }

      // Configure camera constraints
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
      };

      console.log("Starting camera with constraints:", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setIsCameraActive(true);

      // We'll handle setting the video source in the useEffect hook
      // This ensures the video element exists before we try to use it

      setShowCameraPermissionAlert(false);
    } catch (err) {
      console.error("Camera stream error:", err);
      toast({
        title: "Camera Error",
        description: `Could not start camera: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
      setShowCameraPermissionAlert(true);
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        console.log(`Stopping track: ${track.kind}, enabled: ${track.enabled}`);
        track.stop();
      });
      setCameraStream(null);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) {
      console.error("Video ref is null when trying to capture photo");
      toast({
        title: "Capture Error",
        description: "Could not access camera preview",
      });
      return;
    }

    if (!canvasRef.current) {
      console.error("Canvas ref is null");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      // Make sure video has dimensions
      if (!video.videoWidth) {
        console.error("Video dimensions not available");
        toast({
          title: "Capture Error",
          description: "Video stream not ready yet. Please try again.",
        });
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      console.log(`Capturing photo: ${canvas.width}x${canvas.height}`);

      // Draw the current video frame to the canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL and set as preview
        const dataUrl = canvas.toDataURL("image/png");
        setImagePreview(dataUrl);

        // Stop the camera stream after capturing
        stopCameraStream();
      } else {
        console.error("Could not get canvas context");
      }
    } catch (err) {
      console.error("Error capturing photo:", err);
      toast({
        title: "Capture Error",
        description: "Could not capture photo from camera",
      });
    }
  };

  const handleImageSourceChange = (value: string) => {
    setImageSource(value as "upload" | "camera");

    if (value === "camera") {
      setShowCameraPermissionAlert(true);
      // Get camera devices first, then user can select which one to use
      getCameraDevices();
    } else {
      stopCameraStream();
      setShowCameraPermissionAlert(false);
    }
  };

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (isCameraActive) {
      // Restart the stream with the new camera
      stopCameraStream();
      setTimeout(() => startCameraStream(), 100);
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

  // Effect to handle video ref initialization
  useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, []);

  // Effect to handle camera stream when it changes
  useEffect(() => {
    // This effect handles setting the video source when the stream changes
    // It ensures the video element exists before trying to use it
    if (cameraStream && videoRef.current) {
      console.log("Setting video source with stream");
      videoRef.current.srcObject = cameraStream;

      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded");
        videoRef.current
          ?.play()
          .catch((e) => console.error("Error playing video:", e));
      };

      videoRef.current.onplay = () => console.log("Video started playing");
      videoRef.current.onerror = (e) => console.error("Video error:", e);
    }
  }, [cameraStream, videoRef.current]);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Handle dialog close
  useEffect(() => {
    if (!dialogOpen) {
      stopCameraStream();
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
                  Students Management
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
                  Add New Student
                </Button>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <div className="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search students..."
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
                                No students found.
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
                                          will permanently delete the student
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

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                stopCameraStream();
              }
              setDialogOpen(open);
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details of the student.
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
                                {showCameraPermissionAlert &&
                                  !isCameraActive && (
                                    <Alert className="mb-3">
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertTitle>
                                        Camera Permission Required
                                      </AlertTitle>
                                      <AlertDescription>
                                        You'll need to allow camera access to
                                        take a photo.
                                      </AlertDescription>
                                    </Alert>
                                  )}

                                {/* Camera selection dropdown */}
                                <div className="mb-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <Label>Select Camera</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={getCameraDevices}
                                      disabled={isLoadingDevices}
                                      className="h-8 px-2"
                                    >
                                      <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                                      Refresh
                                    </Button>
                                  </div>

                                  {isLoadingDevices ? (
                                    <div className="flex justify-center py-2">
                                      <Loader />
                                    </div>
                                  ) : (
                                    <Select
                                      value={selectedCamera}
                                      onValueChange={handleCameraChange}
                                      disabled={cameraDevices.length === 0}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a camera" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {cameraDevices.length === 0 ? (
                                          <SelectItem
                                            value="no-cameras"
                                            disabled
                                          >
                                            No cameras found
                                          </SelectItem>
                                        ) : (
                                          cameraDevices.map((device) => (
                                            <SelectItem
                                              key={device.deviceId}
                                              value={device.deviceId}
                                            >
                                              {device.label}
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>

                                {/* Camera preview - ALWAYS render the video element but hide it when not active */}
                                <div
                                  className={`relative mb-3 overflow-hidden rounded-lg border bg-black ${!isCameraActive ? "hidden" : ""}`}
                                >
                                  <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="h-auto w-full"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute right-2 top-2 h-8 w-8 bg-background/80 p-0 backdrop-blur-sm"
                                    onClick={stopCameraStream}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Hidden canvas for capturing photos */}
                                <canvas ref={canvasRef} className="hidden" />

                                <div className="flex justify-center">
                                  {!isCameraActive ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={startCameraStream}
                                      className="w-full"
                                      disabled={
                                        !selectedCamera &&
                                        cameraDevices.length > 0
                                      }
                                    >
                                      <Camera className="mr-2 h-4 w-4" />
                                      Start Camera
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="default"
                                      onClick={capturePhoto}
                                      className="w-full"
                                    >
                                      <Camera className="mr-2 h-4 w-4" />
                                      Take Photo
                                    </Button>
                                  )}
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
                    {upsertStudent.isPending ? "Saving..." : "Save Student"}
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

export default StudentsPage;
