import Image from "next/image";
import { cn } from "@/lib/utils";

export function OnyxLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/OnyxWhite.png"
      alt="Onyx"
      width={420}
      height={234}
      className={cn("h-6 w-auto select-none", className)}
      priority
    />
  );
}
