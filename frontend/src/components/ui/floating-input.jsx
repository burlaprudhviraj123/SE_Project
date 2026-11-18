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
            "peer block w-full rounded-xl border border-line bg-paper px-3.5 pt-5 pb-1.5 text-sm font-sans text-ink outline-none transition-all duration-200 placeholder-transparent focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#181C1F] dark:border-[#2B3238] dark:text-[#F2EFEB] dark:focus:border-[#4A8C78] dark:focus:ring-[#4A8C78]/20",
            endAdornment ? "pr-12" : "pr-3.5",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
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
                ? "top-2 translate-y-0 text-[10px] font-semibold tracking-wider uppercase text-accent dark:text-[#7EB5A6]"
                : "top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:tracking-wider peer-focus:uppercase peer-focus:text-accent dark:peer-focus:text-[#7EB5A6] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase"
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
