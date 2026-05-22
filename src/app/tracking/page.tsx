"use client";

import { useSearchParams } from "next/navigation";
import TrackProduct from "@/components/TrackProduct";
import { Suspense } from "react";

function TrackingPageInner() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] py-12 px-4 md:px-8">
      <TrackProduct initialId={batchId} isFocusMode={false} />
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-fruit-emerald/30 border-t-fruit-emerald"></div>
      </div>
    }>
      <TrackingPageInner />
    </Suspense>
  );
}
