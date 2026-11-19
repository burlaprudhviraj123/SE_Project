
import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { animateSpring, applyRubberBand } from "@/lib/physics"

const SheetContext = React.createContext(null)

function Sheet({ open, onOpenChange, children }) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetTrigger({ asChild, children, onClick, ...props }) {
  const context = React.useContext(SheetContext)
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

function SheetPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const context = React.useContext(SheetContext)
  if (!context?.open) return null
  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out",
        className
      )}
      onClick={() => context?.onOpenChange?.(false)}
      {...props}
    />
  )
})
SheetOverlay.displayName = "SheetOverlay"

const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => {
  const context = React.useContext(SheetContext)
  const internalRef = React.useRef(null)
  const isBottom = side === "bottom";

  const dragRef = React.useRef({
    isDragging: false,
    startY: 0,
    currentOffset: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    cancelSpring: null,
  })

  // Prevent background scrolling and close on Escape
  React.useEffect(() => {
    if (!context?.open) return;
    const currentDrag = dragRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") context?.onOpenChange?.(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      currentDrag.cancelSpring?.();
    };
  }, [context?.open, context?.onOpenChange]);

  if (!context?.open) return null

  // Pointer drag gestures with velocity-preserving spring physics and rubber-band tension
  const handlePointerDown = (e) => {
    if (!isBottom) return;
    dragRef.current.cancelSpring?.();
    dragRef.current.isDragging = true;
    dragRef.current.startY = e.clientY;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = performance.now();
    dragRef.current.velocity = 0;
    dragRef.current.currentOffset = 0;

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.isDragging || !internalRef.current) return;
    const now = performance.now();
    const dt = now - dragRef.current.lastTime;
    const dy = e.clientY - dragRef.current.lastY;

    if (dt > 0) {
      dragRef.current.velocity = dy / dt; // px/ms
    }
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = now;

    const rawDelta = e.clientY - dragRef.current.startY;

    // 9. Rubber-Band Carousel / Sheet Boundaries: Non-linear exponential resistance
    // offset = limit + Math.pow(overshoot, 0.55)
    const computedOffset =
      rawDelta < 0 ? applyRubberBand(rawDelta, 0, 0, 0.55) : rawDelta;

    dragRef.current.currentOffset = computedOffset;
    internalRef.current.style.transform = `translate3d(0, ${computedOffset}px, 0)`;
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.isDragging || !internalRef.current) return;
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    const { currentOffset, velocity } = dragRef.current;

    // Check if dismissed (swiped down with velocity or dragged down past threshold)
    if (currentOffset > 120 || (velocity > 0.4 && currentOffset > 30)) {
      context?.onOpenChange?.(false);
      return;
    }

    // 8. Velocity-Preserving Spring Physics: Feed velocity vector into settling spring
    dragRef.current.cancelSpring = animateSpring({
      from: currentOffset,
      to: 0,
      velocity: velocity,
      stiffness: 380,
      damping: 35,
      onUpdate: (val) => {
        if (internalRef.current) {
          internalRef.current.style.transform =
            val === 0 ? "" : `translate3d(0, ${val}px, 0)`;
        }
      },
      onComplete: () => {
        if (internalRef.current) {
          internalRef.current.style.transform = "";
        }
      },
    });
  };

  const setCombinedRef = (node) => {
    internalRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const sheetNode = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <SheetOverlay />
      <div
        ref={setCombinedRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-50 bg-card p-6 shadow-2xl composited-layer will-change-transform",
          side === "right" &&
            "inset-y-0 right-0 h-full w-full sm:max-w-md border-l border-border/40 translate-x-0 animate-in slide-in-from-right duration-300",
          side === "left" &&
            "inset-y-0 left-0 h-full w-full sm:max-w-md border-r border-border/40 translate-x-0 animate-in slide-in-from-left duration-300",
          side === "top" &&
            "inset-x-0 top-0 w-full border-b border-border/40 translate-y-0 animate-in slide-in-from-top duration-300",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[88vh] w-full max-w-2xl mx-auto rounded-t-3xl border-t border-border/40 animate-sheet-slide-bottom overflow-y-auto",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {isBottom && (
          <div
            className="flex justify-center -mt-2 pb-4 cursor-grab active:cursor-grabbing touch-none select-none py-1"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/60 active:scale-95 transition-all" />
          </div>
        )}
        {children}
        <button
          type="button"
          onClick={() => context?.onOpenChange?.(false)}
          className="absolute right-4 top-4 rounded-xl p-1.5 opacity-70 hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-95 transition-all"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sheetNode, document.body);
})
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-2 text-left pb-4 border-b border-border/40", className)}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border/40 mt-auto", className)}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-black tracking-tight text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground font-medium leading-relaxed", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

function BottomSheet({ open, onOpenChange, children, className, ...props }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={className} {...props}>
        {children}
      </SheetContent>
    </Sheet>
  );
}

export {
  Sheet,
  SheetPortal,
  SheetTrigger,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  BottomSheet,
}
