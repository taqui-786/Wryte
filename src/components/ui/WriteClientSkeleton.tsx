import React from "react";
import { Skeleton } from "./skeleton";

function WriteClientSkeleton() {
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="p-2 flex items-center justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="flex-1 max-h-[546px] w-full" />
    </div>
  );
}

export default WriteClientSkeleton;