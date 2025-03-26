"use client";

// men ayaw baguha kay magka error sa hydration
import dynamic from "next/dynamic";
const Page = dynamic(() => import("./_component/page"), {
  ssr: false,
});
export default Page;
