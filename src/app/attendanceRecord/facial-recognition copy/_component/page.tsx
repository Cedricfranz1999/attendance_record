"use client";
import { api } from "@/trpc/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StandbyStudents from "@/app/_components/standbyStudents";
const THRESHOLD = 0.7;

const page = () => {
  const { data, isLoading, refetch } = api.students.getStudents.useQuery({});
  const { data: standbyStudentsQuery, refetch: refetchStandby } =
    api.standbyStudents.getStandbyStudents.useQuery({});
  console.log("DATA", data, standbyStudentsQuery);

  const createStandbyStudentMutation =
    api.standbyStudents.FacialcreateStandbyStudent.useMutation({
      onSuccess: () => {
        refetch();
        refetchStandby();
      },
    });

  const videoHeight = 500;
  const videoWidth = 500;
  const [initializing, setInitializing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [videoReadyTimeIn, setVideoReadyTimeIn] = useState(false);
  const [videoReadyTimeOut, setVideoReadyTimeOut] = useState(false);
  const videoRefTimeIn = useRef<HTMLVideoElement | null>(null);
  const videoRefTimeOut = useRef<HTMLVideoElement | null>(null);
  const canvasRefTimeIn = useRef<HTMLCanvasElement | any>(null);
  const canvasRefTimeOut = useRef<HTMLCanvasElement | any>(null);
  const [faceMatcher, setFaceMatcher] = useState<any>(null);
  const [detectTimeIn, setDetectTimeIn] = useState<any>(null);
  const [detectTimeOut, setDetectTimeOut] = useState<any>(null);
  const [statusTimeIn, setStatusTimeIn] = useState<string>("");
  const [statusTimeOut, setStatusTimeOut] = useState<string>("");
  const [detectionCount, setDetectionCount] = useState(0);

  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [timeInCameraId, setTimeInCameraId] = useState<string>("");
  const [timeOutCameraId, setTimeOutCameraId] = useState<string>("");

  const timeInIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeOutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isProcessingTimeIn = useRef(false);
  const isProcessingTimeOut = useRef(false);

  const initializeFaceMatcher = async () => {
    try {
      if (!data || isLoading) {
        console.log("Data not available yet for face matcher initialization");
        return null;
      }

      const labeledFaceDescriptors = await Promise.all(
        data.data.map(async (user: any) => {
          try {
            const imgObj = new Image();
            imgObj.crossOrigin = "anonymous";
            imgObj.src = user.image;

            // Wait for image to load
            await new Promise((resolve, reject) => {
              imgObj.onload = resolve;
              imgObj.onerror = reject;
            });

            const detection = await faceapi
              .detectSingleFace(imgObj)
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (detection) {
              return new faceapi.LabeledFaceDescriptors(
                `${user.id}_${user.firstname}_${user.lastName}`,
                [new Float32Array(detection.descriptor)],
              );
            }
            return null;
          } catch (error) {
            console.error(`Error processing user ${user.id}:`, error);
            return null;
          }
        }),
      );

      const validDescriptors = labeledFaceDescriptors.filter(Boolean);
      if (validDescriptors.length > 0) {
        console.log(
          `Successfully created face matcher with ${validDescriptors.length} descriptors`,
        );
        return new faceapi.FaceMatcher(validDescriptors);
      } else {
        console.warn("No valid face descriptors found");
        return null;
      }
    } catch (error) {
      console.error("Error in face matcher initialization:", error);
      return null;
    }
  };

  const getCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );
      setCameraDevices(videoDevices);

      if (videoDevices.length > 0 && videoDevices[0]) {
        setTimeInCameraId(videoDevices[0].deviceId!);
      }
      if (videoDevices.length > 1 && videoDevices[1]) {
        setTimeOutCameraId(videoDevices[1].deviceId!);
      } else if (videoDevices.length === 1 && videoDevices[0]) {
        // If only one camera, use it for both
        setTimeOutCameraId(videoDevices[0].deviceId!);
      }

      return videoDevices;
    } catch (error) {
      console.error("Error getting camera devices:", error);
      return [];
    }
  };

  const startVideo = async (
    videoRef: React.RefObject<HTMLVideoElement>,
    deviceId: string,
  ) => {
    if (!videoRef.current || !deviceId) {
      console.log("Video reference is not set or no device ID provided.");
      return false;
    }

    try {
      // Stop any existing stream
      const existingStream = videoRef.current.srcObject as MediaStream;
      if (existingStream) {
        existingStream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          deviceId: { exact: deviceId },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      return true;
    } catch (error) {
      console.error("Error accessing webcam:", error);
      return false;
    }
  };

  const handleTimeInVideoOnPlay = () => {
    // Only start processing if models are loaded
    if (!modelsLoaded || !faceMatcher) {
      console.log(
        "Models or face matcher not loaded yet. Cannot start processing.",
      );
      setStatusTimeIn("Waiting for models to load...");
      return;
    }

    if (timeInIntervalRef.current) {
      clearInterval(timeInIntervalRef.current);
    }

    const processTimeInVideo = async () => {
      if (isProcessingTimeIn.current) return;
      isProcessingTimeIn.current = true;

      try {
        if (
          videoReadyTimeIn &&
          videoRefTimeIn.current &&
          canvasRefTimeIn.current &&
          faceMatcher
        ) {
          const displaySize = { width: videoWidth, height: videoHeight };
          faceapi.matchDimensions(canvasRefTimeIn.current, displaySize);

          const singleResult = await faceapi
            .detectSingleFace(
              videoRefTimeIn.current,
              new faceapi.SsdMobilenetv1Options(),
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          const ctx = canvasRefTimeIn.current.getContext("2d");
          ctx?.clearRect(0, 0, videoWidth, videoHeight);

          if (singleResult) {
            ctx?.save();
            const bestMatch = await faceMatcher.findBestMatch(
              singleResult.descriptor,
            );
            setStatusTimeIn(
              `Searching Face Match... Probability: ${(100 - Number.parseFloat(bestMatch.distance) * 100).toFixed(2)}`,
            );

            if (bestMatch.distance < THRESHOLD) {
              const foundData = bestMatch.toString().split("_");
              const firstName = foundData[1];
              const lastName = foundData[2];
              const id = foundData[0];
              const box = singleResult.detection.box;
              const resizedBox = new faceapi.draw.DrawBox(
                {
                  x: box.x - 50,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                },
                { label: `${firstName} ${lastName}` },
              );
              resizedBox.draw(canvasRefTimeIn.current);
              ctx?.restore();
              setDetectTimeIn({
                id: id,
                firstName,
                lastName,
              });

              if (id) {
                createStandbyStudentMutation.mutate({
                  studentId: Number(id),
                });
                setDetectionCount((prev) => prev + 1);
              }
            } else {
              const box = singleResult.detection.box;
              const resizedBox = new faceapi.draw.DrawBox(
                {
                  x: box.x - 50,
                  y: box.y - 50,
                  width: box.width,
                  height: box.height,
                },
                { label: `Unknown` },
              );
              resizedBox.draw(canvasRefTimeIn.current);
            }
          } else {
            setStatusTimeIn("No Face Detected, Come closer or add some light");
            setDetectTimeIn(null);
          }
        }
      } catch (error) {
        console.log("Time In processing error:", error);
      } finally {
        isProcessingTimeIn.current = false;
      }
    };

    // Start the interval
    timeInIntervalRef.current = setInterval(processTimeInVideo, 500);
  };

  const handleTimeOutVideoOnPlay = () => {
    // Only start processing if models are loaded
    if (!modelsLoaded || !faceMatcher) {
      console.log(
        "Models or face matcher not loaded yet. Cannot start processing.",
      );
      setStatusTimeOut("Waiting for models to load...");
      return;
    }

    if (timeOutIntervalRef.current) {
      clearInterval(timeOutIntervalRef.current);
    }

    const processTimeOutVideo = async () => {
      if (isProcessingTimeOut.current) return;
      isProcessingTimeOut.current = true;

      try {
        if (
          videoReadyTimeOut &&
          videoRefTimeOut.current &&
          canvasRefTimeOut.current &&
          faceMatcher
        ) {
          const displaySize = { width: videoWidth, height: videoHeight };
          faceapi.matchDimensions(canvasRefTimeOut.current, displaySize);

          const singleResult = await faceapi
            .detectSingleFace(
              videoRefTimeOut.current,
              new faceapi.SsdMobilenetv1Options(),
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          const ctx = canvasRefTimeOut.current.getContext("2d");
          ctx?.clearRect(0, 0, videoWidth, videoHeight);

          if (singleResult) {
            const resizedDetections = faceapi.resizeResults(
              singleResult,
              displaySize,
            );
            ctx?.save();
            const bestMatch = await faceMatcher.findBestMatch(
              singleResult.descriptor,
            );
            setStatusTimeOut(
              `Searching Face Match... Probability: ${(100 - Number.parseFloat(bestMatch.distance) * 100).toFixed(2)}`,
            );

            if (bestMatch.distance < THRESHOLD) {
              const foundData = bestMatch.toString().split("_");
              const firstName = foundData[1];
              const lastName = foundData[2];
              const id = foundData[0];
              const box = singleResult.detection.box;
              const resizedBox = new faceapi.draw.DrawBox(
                {
                  x: box.x - 50,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                },
                { label: `${firstName} ${lastName}` },
              );
              resizedBox.draw(canvasRefTimeOut.current);
              ctx?.restore();
              setDetectTimeOut({
                id: id,
                firstName,
                lastName,
              });

              // Record time out
              if (id) {
                createStandbyStudentMutation.mutate({
                  studentId: Number(id),
                });
                setDetectionCount((prev) => prev + 1);
              }
            } else {
              const box = singleResult.detection.box;
              const resizedBox = new faceapi.draw.DrawBox(
                {
                  x: box.x - 50,
                  y: box.y - 50,
                  width: box.width,
                  height: box.height,
                },
                { label: `Unknown` },
              );
              resizedBox.draw(canvasRefTimeOut.current);
            }
          } else {
            setStatusTimeOut("No Face Detected, Come closer or add some light");
            setDetectTimeOut(null);
          }
        }
      } catch (error) {
        console.log("Time Out processing error:", error);
      } finally {
        isProcessingTimeOut.current = false;
      }
    };

    // Start the interval
    timeOutIntervalRef.current = setInterval(processTimeOutVideo, 500);
  };

  const handleTimeInCameraChange = (deviceId: string) => {
    setTimeInCameraId(deviceId);
    startVideo(videoRefTimeIn, deviceId);
  };

  const handleTimeOutCameraChange = (deviceId: string) => {
    setTimeOutCameraId(deviceId);
    startVideo(videoRefTimeOut, deviceId);
  };

  // Load models and initialize face matcher
  useEffect(() => {
    const loadModelsAndInitialize = async () => {
      if (typeof window === "undefined" || isLoading) return;

      try {
        setInitializing(true);
        setStatusTimeIn("Loading face recognition models...");
        setStatusTimeOut("Loading face recognition models...");

        // Step 1: Load models
        const MODEL_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/assets/models`;
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        console.log("Face-api models loaded successfully");
        setModelsLoaded(true);

        // Step 2: Initialize face matcher
        setStatusTimeIn("Initializing face recognition...");
        setStatusTimeOut("Initializing face recognition...");
        const matcher = await initializeFaceMatcher();

        if (matcher) {
          setFaceMatcher(matcher);
          setStatusTimeIn("Face recognition ready");
          setStatusTimeOut("Face recognition ready");
        } else {
          setStatusTimeIn("Failed to initialize face recognition");
          setStatusTimeOut("Failed to initialize face recognition");
        }
      } catch (error) {
        console.error("Error loading models or initializing:", error);
        setStatusTimeIn("Error loading face recognition");
        setStatusTimeOut("Error loading face recognition");
      } finally {
        setInitializing(false);
      }
    };

    loadModelsAndInitialize();
  }, [isLoading, data]);

  // Set up camera devices and event listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const setupCamerasAndListeners = async () => {
      // Get camera devices
      await getCameraDevices();

      // Set up event listeners
      const handleCanPlayTimeIn = () => {
        setVideoReadyTimeIn(true);
      };

      const handleCanPlayTimeOut = () => {
        setVideoReadyTimeOut(true);
      };

      const videoElementTimeIn = videoRefTimeIn.current;
      const videoElementTimeOut = videoRefTimeOut.current;

      if (videoElementTimeIn) {
        videoElementTimeIn.addEventListener("canplay", handleCanPlayTimeIn);
      }

      if (videoElementTimeOut) {
        videoElementTimeOut.addEventListener("canplay", handleCanPlayTimeOut);
      }

      // Return cleanup function
      return () => {
        if (timeInIntervalRef.current) {
          clearInterval(timeInIntervalRef.current);
        }

        if (timeOutIntervalRef.current) {
          clearInterval(timeOutIntervalRef.current);
        }

        isProcessingTimeIn.current = false;
        isProcessingTimeOut.current = false;

        if (videoElementTimeIn) {
          videoElementTimeIn.removeEventListener(
            "canplay",
            handleCanPlayTimeIn,
          );
          const stream = videoElementTimeIn.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        }

        if (videoElementTimeOut) {
          videoElementTimeOut.removeEventListener(
            "canplay",
            handleCanPlayTimeOut,
          );
          const stream = videoElementTimeOut.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        }
      };
    };

    setupCamerasAndListeners();
  }, []);

  // Start videos when camera IDs are set
  useEffect(() => {
    if (timeInCameraId) {
      startVideo(videoRefTimeIn, timeInCameraId);
    }
  }, [timeInCameraId]);

  useEffect(() => {
    if (timeOutCameraId) {
      startVideo(videoRefTimeOut, timeOutCameraId);
    }
  }, [timeOutCameraId]);

  // Restart video processing when face matcher is ready
  useEffect(() => {
    if (faceMatcher && modelsLoaded) {
      // If videos are already playing, restart the processing
      if (videoRefTimeIn.current && videoRefTimeIn.current.readyState >= 2) {
        handleTimeInVideoOnPlay();
      }

      if (videoRefTimeOut.current && videoRefTimeOut.current.readyState >= 2) {
        handleTimeOutVideoOnPlay();
      }
    }
  }, [faceMatcher, modelsLoaded]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white p-4">
      <h1 className="mb-8 text-2xl font-bold">
        Facial Recognition Attendance System
      </h1>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
        {/* Time In Camera */}
        <div className="flex flex-col items-center">
          <h2 className="mb-2 text-xl font-semibold">Time In</h2>

          {/* Camera selector */}
          <div className="mb-4 w-full max-w-xs">
            <Select
              value={timeInCameraId}
              onValueChange={handleTimeInCameraChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Time In Camera" />
              </SelectTrigger>
              <SelectContent>
                {cameraDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label ||
                      `Camera ${cameraDevices.indexOf(device) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-2 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-[16px] text-black">
              {initializing ? "Loading Models..." : statusTimeIn}
            </span>
          </div>
          <div className="relative flex items-center justify-center">
            <video
              ref={videoRefTimeIn}
              autoPlay
              muted
              height={videoHeight}
              width={videoWidth}
              onPlay={handleTimeInVideoOnPlay}
              className="rounded border border-gray-300"
            />
            <canvas
              ref={canvasRefTimeIn}
              height={videoHeight}
              width={videoWidth}
              className="absolute left-0 top-0 z-10"
            />
          </div>
          {detectTimeIn && (
            <div className="mt-4 rounded border border-green-300 bg-green-100 p-3">
              <p className="font-medium">
                Detected: {detectTimeIn.firstName} {detectTimeIn.lastName}
              </p>
              <p className="text-sm text-green-700">
                Time In recorded successfully
              </p>
            </div>
          )}
        </div>

        {/* Time Out Camera */}
        <div className="flex flex-col items-center">
          <h2 className="mb-2 text-xl font-semibold">Time Out</h2>

          {/* Camera selector */}
          <div className="mb-4 w-full max-w-xs">
            <Select
              value={timeOutCameraId}
              onValueChange={handleTimeOutCameraChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Time Out Camera" />
              </SelectTrigger>
              <SelectContent>
                {cameraDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label ||
                      `Camera ${cameraDevices.indexOf(device) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-2 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-[16px] text-black">
              {initializing ? "Loading Models..." : statusTimeOut}
            </span>
          </div>
          <div className="relative flex items-center justify-center">
            <video
              ref={videoRefTimeOut}
              autoPlay
              muted
              height={videoHeight}
              width={videoWidth}
              onPlay={handleTimeOutVideoOnPlay}
              className="rounded border border-gray-300"
            />
            <canvas
              ref={canvasRefTimeOut}
              height={videoHeight}
              width={videoWidth}
              className="absolute left-0 top-0 z-10"
            />
          </div>
          {detectTimeOut && (
            <div className="mt-4 rounded border border-blue-300 bg-blue-100 p-3">
              <p className="font-medium">
                Detected: {detectTimeOut.firstName} {detectTimeOut.lastName}
              </p>
              <p className="text-sm text-blue-700">
                Time Out recorded successfully
              </p>
            </div>
          )}
        </div>
      </div>
      <StandbyStudents refetchTrigger={detectionCount} />
    </div>
  );
};

export default page;
