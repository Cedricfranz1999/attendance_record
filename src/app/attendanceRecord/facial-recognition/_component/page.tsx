"use client";
import { api } from "@/trpc/react";
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from 'face-api.js'
import { Button } from "@/components/ui/button";
const THRESHOLD = 0.35;

const page = () => {
  const { data, isLoading } = api.students.getStudents.useQuery({});
  const timeInMutate = api.facialRecognition.timeIn.useMutation()
  const timeOutMutate = api.facialRecognition.timeOut.useMutation()

  const videoHeight = 500;
  const videoWidth = 500;
  const [initializing, setInitializing] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | any>(null);
  const [faceMatcher, setFaceMatcher] = useState<any>(null);
  const [detect, setDetect] = useState<any>("");
  const [status, setStatus] = useState<string>("");

  const initializeFaceMatcher = async () => {
    try {
      if(data && !isLoading){
        const labeledFaceDescriptors = await Promise.all(data.data.map(async (user: any) => {
          const imgObj = new Image();
          imgObj.src = user.image;
          const detection = await faceapi.detectSingleFace(imgObj).withFaceLandmarks().withFaceDescriptor();
          if (detection) {
            return new faceapi.LabeledFaceDescriptors(
              `${user.id}_${user.firstname}_${user.lastName}`,
              [new Float32Array(detection.descriptor)]
            );
          }
        }));
        const validDescriptors = labeledFaceDescriptors.filter(Boolean); // Remove nulls
        if (validDescriptors.length > 0) {
          const faceMatcher = new faceapi.FaceMatcher(validDescriptors);
          setFaceMatcher(faceMatcher);
        }
      }
    } catch (error) {
      console.log(error)
    }
  }

  const startVideo = async () => {
    if (!videoRef.current) {
      console.log('Video reference is not set.');
      return;
    }

    const constraints = { video: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };

  const handleVideoOnPlay = () => {
    let intervalId: NodeJS.Timeout | null = null;
    let isProcessing = false;
    const processVideo = async () => {
      if (isProcessing) return; 
      isProcessing = true;
  
      if (initializing) {
        setInitializing(false);
      }
      try {
        if (videoReady && videoRef.current && canvasRef.current) {
          const displaySize = { width: videoWidth, height: videoHeight };
          faceapi.matchDimensions(canvasRef.current, displaySize);
  
          const singleResult = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();
  
          const ctx = canvasRef.current.getContext("2d");
          ctx?.clearRect(0, 0, videoWidth, videoHeight);
  
          if (singleResult) {
            const resizedDetections = faceapi.resizeResults(singleResult, displaySize);
            ctx?.save();
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
            const bestMatch = await faceMatcher.findBestMatch(singleResult.descriptor);
            setStatus(`Searching Face Match... Probability: ${(100 - parseFloat(bestMatch.distance) * 100).toFixed(2)}`);
  
            if(bestMatch.distance < THRESHOLD){
              const foundData = bestMatch.toString().split("_");
              const firstName = foundData[1];
              const lastName = foundData[2];
              const id = foundData[0];
              const box = singleResult.detection.box;
              const resizedBox = new faceapi.draw.DrawBox(
                { x: box.x - 50, y: box.y, width: box.width, height: box.height },
                { label: `${firstName} ${lastName}` }
              );
              resizedBox.draw(canvasRef.current);
              ctx?.restore();
              setDetect({
                id: id,
                firstName,
                lastName
              })
            }
          } else {
            setStatus("No Face Detected, Come closer or add some light");
            setDetect(null);
          }
        }
      } catch (error) {
        console.log(error);
      }
      isProcessing = false; 
    };
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(processVideo, 500);
  };
   

  useEffect(() => {
    // for use client mismatch
    if (typeof window === "undefined") return
    const handleCanPlay = () => {
      setVideoReady(true)
    }

    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.addEventListener("canplay", handleCanPlay)
    }
    const loadModels = async () => {
      try {
        const MODEL_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/assets/models`
        setInitializing(true)
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])

        await initializeFaceMatcher()
        startVideo()
      } catch (error) {
        console.error("Error loading models:", error)
      }
    }

    if (!isLoading) {
      loadModels()
    }

    // Return the cleanup function directly from useEffect
    return () => {
      if (videoElement) {
        videoElement.removeEventListener("canplay", handleCanPlay)
        // Cleanup video stream
        const stream = videoElement.srcObject as MediaStream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    }
  }, [isLoading])

   return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <span className="text-[16px] text-black">
          {initializing && 'Loading Models'}
          {`${status}`}
        </span>
      </div>
      <div className={`relative flex items-center justify-center `}>
        <video
          ref={videoRef}
          autoPlay
          muted
          height={videoHeight}
          width={videoWidth}
          onPlay={handleVideoOnPlay}
        />
        <canvas
          ref={canvasRef}
          height={videoHeight}
          width={videoWidth}
          className="absolute z-10"
        />
      </div>
    </div>
  );
};

export default page;
