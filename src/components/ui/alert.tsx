import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertTriangle as DefaultAlertTriangleIcon } from "lucide-react"; // Renamed to avoid conflict

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border", // Ensure default uses theme border
        destructive:
          "border-destructive/60 text-destructive dark:border-destructive/70 [&>svg]:text-destructive bg-destructive/5 dark:bg-destructive/10", // Enhanced destructive variant
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & {
    icon?: React.ElementType; // Allow custom icon
  }
>(({ className, variant, children, icon: Icon, ...props }, ref) => {
  const DefaultIcon = variant === "destructive" ? DefaultAlertTriangleIcon : null;
  const IconToRender = Icon || DefaultIcon;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {IconToRender && !React.Children.toArray(children).find(child => React.isValidElement(child) && child.type === IconToRender) && (
         <IconToRender className="h-4 w-4" />
      )}
      {children}
    </div>
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
