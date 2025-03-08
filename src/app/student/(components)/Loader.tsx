import { Label } from "@/components/ui/label";
import { Bot, LoaderCircle } from "lucide-react";
import React from "react";

const Loader = () => {
  return (
    <div className="flex w-full items-center justify-center gap-1 py-48 font-bold text-teal-900">
      <LoaderCircle className="animate-spin" />
      <Label className="text-md">Loading...</Label>
    </div>
  );
};

export default Loader;
