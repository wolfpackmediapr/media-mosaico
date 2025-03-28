
import { Skeleton } from "@/components/ui/skeleton";

export function RatesLoadingState() {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      
      {Array(5).fill(0).map((_, index) => (
        <div key={index} className="flex justify-between items-center p-2 border-b">
          <Skeleton className="h-5 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
