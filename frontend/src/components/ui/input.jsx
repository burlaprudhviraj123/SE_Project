import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  error,
  shake,
  ...props
}) {
  const [isShaking, setIsShaking] = React.useState(Boolean(shake));
  const prevErrorRef = React.useRef(error);

  React.useEffect(() => {
    const hasNewError = Boolean(error) && error !== prevErrorRef.current;
    if (hasNewError || shake) setIsShaking(true);
    prevErrorRef.current = error;
  }, [error, shake]);

  React.useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  const hasError = Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';

  return (
    <input
      type={type}
      data-slot="input"
      aria-invalid={hasError ? "true" : undefined}
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-transparent px-3.5 py-2 text-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        isShaking && "animate-input-shake",
        className
      )}
      {...props} />
  );
}

export { Input }
export { FloatingInput } from "./floating-input"

