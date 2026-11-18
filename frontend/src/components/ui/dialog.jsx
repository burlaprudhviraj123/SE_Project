import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const DialogContext = React.createContext(null)

function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({ asChild, children, onClick, ...props }) {
  const context = React.useContext(DialogContext)
  const child = React.Children.only(children)
  return React.cloneElement(child, {
    onClick: (e) => {
      onClick?.(e);
      child.props.onClick?.(e);
      context?.onOpenChange?.(true);
    },
    ...props
  })
}

function DialogPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const context = React.useContext(DialogContext)
  if (!context?.open) return null
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
        className
      )}
      onClick={() => context?.onOpenChange?.(false)}
      {...props}
    />
  )
})
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(DialogContext)

  // Prevent background scrolling and close on Escape
  React.useEffect(() => {
    if (!context?.open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        context?.onOpenChange?.(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [context?.open, context?.onOpenChange]);

  if (!context?.open) return null

  const modalNode = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <DialogOverlay />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg my-auto max-h-[92vh] flex flex-col rounded-3xl border border-line bg-paper-light p-6 shadow-2xl transition-all duration-200",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={() => context?.onOpenChange?.(false)}
          className="absolute right-4 top-4 z-20 rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalNode, document.body);
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-left pb-3 border-b border-line", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-3 border-t border-line mt-2", className)}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-serif font-semibold text-ink tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-ink-muted leading-relaxed", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogPortal,
  DialogTrigger,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
