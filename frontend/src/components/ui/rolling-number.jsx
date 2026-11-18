import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * SingleDigit rolls a single character vertically in a slot reel.
 * If the character is not a digit (e.g. ',', '.', '+', '%'), it renders statically.
 */
function SingleDigit({ digit, delay = 0 }) {
  const isDigit = /^[0-9]$/.test(digit)
  const targetNum = isDigit ? parseInt(digit, 10) : 0
  const [currentNum, setCurrentNum] = React.useState(0)

  React.useEffect(() => {
    // Schedule animation frame so transition triggers on mount and updates
    const frame = requestAnimationFrame(() => {
      setCurrentNum(targetNum)
    })
    return () => cancelAnimationFrame(frame)
  }, [targetNum])

  if (!isDigit) {
    return <span className="inline-block select-none">{digit}</span>
  }

  return (
    <span className="inline-block h-[1.25em] overflow-hidden align-baseline leading-[1.25em]">
      <span
        className="flex flex-col transition-transform duration-700 motion-reduce:transition-none"
        style={{
          transform: `translateY(-${currentNum * 10}%)`,
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: `${delay}ms`,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            className="h-[1.25em] flex items-center justify-center select-none font-mono font-bold"
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * RollingNumber splits a number or numeric string into digits
 * and animates each digit rolling up vertically in sequence.
 */
function RollingNumber({ value, className, stagger = 30 }) {
  const stringValue = String(value ?? 0)
  const chars = stringValue.split("")

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-mono tracking-tight tabular-nums",
        className
      )}
      aria-label={stringValue}
    >
      {chars.map((char, index) => (
        <SingleDigit
          key={`${index}-${char}`}
          digit={char}
          delay={index * stagger}
        />
      ))}
    </span>
  )
}

export { RollingNumber, SingleDigit }
