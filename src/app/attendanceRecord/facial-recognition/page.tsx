'use client'

// men ayaw baguha kay magka error sa hydration
import dynamic from "next/dynamic";
const FaceRecognitionPage = dynamic(() => import("./_component/page"), { ssr: false });
export default FaceRecognitionPage;