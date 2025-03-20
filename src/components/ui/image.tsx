
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ className, ...props }, ref) => {
    return (
      <img
        ref={ref}
        className={cn("object-contain", className)}
        {...props}
      />
    );
  }
);

Image.displayName = "Image";

export { Image };
