import * as React from "react"
import { cn } from "@/lib/utils"

const FloatingInput = React.forwardRef(
  (
    {
      id,
      label,
      className,
      type = "text",
      value,
      defaultValue,
      placeholder = " ",
      endAdornment,
      required,
      disabled,
      error,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const [isFocused, setIsFocused] = React.useState(false)
    const [isShaking, setIsShaking] = React.useState(false)
    const prevErrorRef = React.useRef(error)

    React.useEffect(() => {
      const hasNewError = Boolean(error) && error !== prevErrorRef.current
      if (hasNewError) setIsShaking(true)
      prevErrorRef.current = error
    }, [error])

    React.useEffect(() => {
      if (isShaking) {
        const timer = setTimeout(() => setIsShaking(false), 500)
        return () => clearTimeout(timer)
      }
    }, [isShaking])

    const hasValue =
      (value !== undefined && value !== null && String(value).length > 0) ||
      (defaultValue !== undefined && defaultValue !== null && String(defaultValue).length > 0)

    const isFloated = isFocused || hasValue

    return (
      <div className="relative w-full group/floating">
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder || " "}
          disabled={disabled}
          required={required}
          data-slot="floating-input"
          onFocus={(e) => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          className={cn(
            "peer block w-full rounded-xl border border-line bg-paper px-4 pt-4.5 pb-2 min-h-[50px] text-sm font-sans text-ink outline-none transition-all duration-200 placeholder-transparent focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#181C1F] dark:border-[#2B3238] dark:text-[#F2EFEB] dark:focus:border-[#4A8C78] dark:focus:ring-[#4A8C78]/20",
            endAdornment ? "pr-12" : "pr-4",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            isShaking && "animate-input-shake",
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "pointer-events-none absolute left-3.5 select-none transition-all duration-200 origin-[0] font-sans",
              isFloated
                ? "top-0 -translate-y-1/2 bg-paper px-1 text-[10px] font-semibold tracking-wider uppercase text-accent dark:bg-[#181C1F] dark:text-[#7EB5A6]"
                : "top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-paper peer-focus:px-1 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wider peer-focus:uppercase peer-focus:text-accent dark:peer-focus:bg-[#181C1F] dark:peer-focus:text-[#7EB5A6] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:bg-paper peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase dark:peer-[:not(:placeholder-shown)]:bg-[#181C1F]"
            )}
          >
            {label}
          </label>
        )}
        {endAdornment && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center z-10 text-muted-foreground">
            {endAdornment}
          </div>
        )}
      </div>
    )
  }
)
FloatingInput.displayName = "FloatingInput"

export { FloatingInput }
