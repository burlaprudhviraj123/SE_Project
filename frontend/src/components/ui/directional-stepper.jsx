import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DirectionalStepper provides physical directional sliding between steps.
 * 
 * - Advancing forward (N -> N+1): current slides out to -80px / -100%, new enters from +80px / +100%.
 * - Going backward (N -> N-1): current slides out to +80px / +100%, previous enters from -80px / -100%.
 * - Spring physics settle on entry.
 */
export function DirectionalStepper({
  currentStep,
  direction = "forward",
  children,
  className,
}) {
  const [activeStep, setActiveStep] = React.useState(currentStep);
  const [previousStep, setPreviousStep] = React.useState(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [stepDirection, setStepDirection] = React.useState(direction);

  // Synchronously capture previous step during render when step prop changes
  if (currentStep !== activeStep) {
    setPreviousStep(activeStep);
    setActiveStep(currentStep);
    setStepDirection(direction);
    setIsTransitioning(true);
  }

  React.useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousStep(null);
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={cn("relative overflow-hidden w-full", className)}>
      {childrenArray.map((child) => {
        if (!React.isValidElement(child)) return null;
        const cleanKey =
          typeof child.key === "string"
            ? child.key.replace(/^\.\$?/, "")
            : child.key;
        const stepKey =
          child.props?.step ??
          child.props?.["data-step"] ??
          child.props?.id ??
          cleanKey;

        if (stepKey === activeStep) {
          return (
            <div
              key={stepKey}
              className={cn(
                "w-full",
                isTransitioning &&
                  (stepDirection === "forward"
                    ? "animate-step-in-forward"
                    : "animate-step-in-backward")
              )}
            >
              {child}
            </div>
          );
        }

        if (stepKey === previousStep && isTransitioning) {
          return (
            <div
              key={`prev-${stepKey}`}
              className={cn(
                "w-full absolute inset-0 pointer-events-none",
                stepDirection === "forward"
                  ? "animate-step-out-forward"
                  : "animate-step-out-backward"
              )}
            >
              {child}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export function DirectionalStep({ step, children, className, ...props }) {
  return (
    <div data-step={step} className={cn("w-full", className)} {...props}>
      {children}
    </div>
  );
}
