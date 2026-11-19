import * as React from "react"
import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  actionable = false,
  onClick,
  onKeyDown,
  role,
  ...props
}) {
  const isActionable = actionable || Boolean(onClick) || role === "button";

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && isActionable && onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick(event);
    }
  };

  return (
    <div
      data-slot="card"
      data-size={size}
      data-actionable={isActionable ? "true" : undefined}
      role={role ?? (isActionable ? "button" : undefined)}
      tabIndex={isActionable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isActionable ? handleKeyDown : onKeyDown}
      className={cn(
        "group/card flex flex-col rounded-2xl border border-line bg-card text-card-foreground shadow-sm transition-all",
        isActionable && "hover-lift cursor-pointer",
        className
      )}
      {...props} />
  );
}

function CardHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col space-y-2 p-6 sm:p-7 pb-4 sm:pb-5",
        className
      )}
      {...props} />
  );
}

function CardTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-lg sm:text-xl font-bold leading-snug tracking-tight text-foreground",
        className
      )}
      {...props} />
  );
}

function CardDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs sm:text-sm text-muted-foreground leading-relaxed", className)}
      {...props} />
  );
}

function CardAction({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "self-start justify-self-end",
        className
      )}
      {...props} />
  );
}

function CardContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0 sm:p-7 sm:pt-0 space-y-4", className)}
      {...props} />
  );
}

function CardFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center p-6 pt-2 sm:p-7 sm:pt-2",
        className
      )}
      {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
