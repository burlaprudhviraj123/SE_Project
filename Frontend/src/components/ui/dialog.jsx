import * as React from "react"
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
  return <>{children}</>
}

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const context = React.useContext(DialogContext)
  if (!context?.open) return null
  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
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
  if (!context?.open) return null
  return (
    <>
      <DialogOverlay />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative w-full max-w-lg rounded-lg border border-line bg-paper-light p-6 shadow-xl transition-all duration-200",
            className
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => context?.onOpenChange?.(false)}
            className="absolute right-4 top-4 rounded-md p-1 text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    </>
  )
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
