"use client";
import { api } from "@/trpc/react";
import React from "react";

const page = () => {
  const { data, refetch } = api.facialRecognition.studentsDAta.useQuery();
  console.log("DATA", data);
  return <div> facial recognition</div>;
};

export default page;
