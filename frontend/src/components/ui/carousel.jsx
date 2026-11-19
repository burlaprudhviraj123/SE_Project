import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { animateSpring, applyRubberBand } from "@/lib/physics"
import { Button } from "./button"

/**
 * High-performance Carousel featuring:
 * 1. Rubber-band exponential boundaries (offset = limit + Math.pow(overshoot, 0.55))
 * 2. Velocity-preserving spring physics on drag release
 * 3. GPU-composited 60/120 FPS transforms
 * 4. Tactile press controls
 */
export function Carousel({
  children,
  className,
  itemClassName,
  showControls = true,
  ...props
}) {
  const containerRef = React.useRef(null)
  const trackRef = React.useRef(null)

  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const stateRef = React.useRef({
    isDragging: false,
    startX: 0,
    currentTranslate: 0,
    startTranslate: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    maxScroll: 0,
    cancelSpring: null,
  })

  const items = React.Children.toArray(children)

  const updateBounds = React.useCallback(() => {
    if (!containerRef.current || !trackRef.current) return
    const containerWidth = containerRef.current.clientWidth
    const trackWidth = trackRef.current.scrollWidth
    const maxScroll = Math.max(0, trackWidth - containerWidth)
    stateRef.current.maxScroll = maxScroll

    const current = Math.abs(stateRef.current.currentTranslate)
    setCanScrollPrev(current > 2)
    setCanScrollNext(current < maxScroll - 2)
  }, [])

  React.useEffect(() => {
    updateBounds()
    window.addEventListener("resize", updateBounds)
    return () => window.removeEventListener("resize", updateBounds)
  }, [updateBounds, children])

  const scrollToIndex = (index, velocity = 0) => {
    if (!trackRef.current) return
    const childrenNodes = trackRef.current.children
    if (!childrenNodes || childrenNodes.length === 0) return

    const clampedIndex = Math.max(0, Math.min(index, childrenNodes.length - 1))
    setCurrentIndex(clampedIndex)

    const targetElement = childrenNodes[clampedIndex]
    const targetOffset = -Math.min(
      targetElement.offsetLeft,
      stateRef.current.maxScroll
    )

    stateRef.current.cancelSpring?.()
    stateRef.current.cancelSpring = animateSpring({
      from: stateRef.current.currentTranslate,
      to: targetOffset,
      velocity: velocity,
      stiffness: 380,
      damping: 35,
      onUpdate: (x) => {
        stateRef.current.currentTranslate = x
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${x}px, 0, 0)`
        }
      },
      onComplete: () => {
        updateBounds()
      },
    })
  }

  const handlePointerDown = (e) => {
    stateRef.current.cancelSpring?.()
    stateRef.current.isDragging = true
    stateRef.current.startX = e.clientX
    stateRef.current.lastX = e.clientX
    stateRef.current.lastTime = performance.now()
    stateRef.current.startTranslate = stateRef.current.currentTranslate
    stateRef.current.velocity = 0

    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!stateRef.current.isDragging || !trackRef.current) return

    const now = performance.now()
    const dt = now - stateRef.current.lastTime
    const dx = e.clientX - stateRef.current.lastX

    if (dt > 0) {
      stateRef.current.velocity = dx / dt // px/ms
    }
    stateRef.current.lastX = e.clientX
    stateRef.current.lastTime = now

    const rawDelta = e.clientX - stateRef.current.startX
    const rawPosition = stateRef.current.startTranslate + rawDelta
    const minLimit = -stateRef.current.maxScroll
    const maxLimit = 0

    // 9. Rubber-Band Carousel Boundaries: non-linear exponential resistance
    const rubberBanded = applyRubberBand(rawPosition, minLimit, maxLimit, 0.55)

    stateRef.current.currentTranslate = rubberBanded
    trackRef.current.style.transform = `translate3d(${rubberBanded}px, 0, 0)`
  }

  const handlePointerUp = (e) => {
    if (!stateRef.current.isDragging || !trackRef.current) return
    stateRef.current.isDragging = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)

    const minLimit = -stateRef.current.maxScroll
    const maxLimit = 0
    const current = stateRef.current.currentTranslate
    const velocity = stateRef.current.velocity

    // Settle past bounds if pulled into rubber band
    if (current > maxLimit) {
      scrollToIndex(0, velocity)
      return
    }
    if (current < minLimit) {
      scrollToIndex(items.length - 1, velocity)
      return
    }

    // Velocity-preserving flick physics to advance or rewind
    if (Math.abs(velocity) > 0.35) {
      const step = velocity < 0 ? 1 : -1
      scrollToIndex(currentIndex + step, velocity)
    } else {
      // Find nearest item
      const childrenNodes = Array.from(trackRef.current.children)
      let nearestIndex = 0
      let minDistance = Infinity
      const currentAbs = Math.abs(current)

      childrenNodes.forEach((node, idx) => {
        const dist = Math.abs(node.offsetLeft - currentAbs)
        if (dist < minDistance) {
          minDistance = dist
          nearestIndex = idx
        }
      })
      scrollToIndex(nearestIndex, velocity)
    }
  }

  return (
    <div className={cn("relative group/carousel w-full", className)} {...props}>
      <div
        ref={containerRef}
        className="overflow-hidden w-full cursor-grab active:cursor-grabbing select-none touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={trackRef}
          className="flex gap-4 will-change-transform composited-layer"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              className={cn("shrink-0", itemClassName)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {showControls && (
        <>
          <Button
            variant="outline"
            size="icon"
            disabled={!canScrollPrev}
            onClick={() => scrollToIndex(currentIndex - 1)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 bg-background/80 backdrop-blur-sm border-line shadow-md opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 transition-opacity z-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!canScrollNext}
            onClick={() => scrollToIndex(currentIndex + 1)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 bg-background/80 backdrop-blur-sm border-line shadow-md opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 transition-opacity z-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}
