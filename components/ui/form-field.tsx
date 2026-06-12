"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatFieldLabel, FORM_HINTS } from "@/lib/ui/labels"
import { cn } from "@/lib/utils"

export { FormGrid, FormSection } from "@/components/module/form-layout"
export { FORM_HINTS }

export const formLabelClassName = "text-xs font-medium text-muted-foreground"

export function FormLabel({
  children,
  htmlFor,
  required,
  className,
}: {
  children: React.ReactNode
  htmlFor?: string
  required?: boolean
  className?: string
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(formLabelClassName, className)}
    >
      {children}
      {required ? <span className="text-muted-foreground/70"> *</span> : null}
    </Label>
  )
}

export function FormHelpText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-xs text-muted-foreground text-pretty", className)}>{children}</p>
  )
}

export function FormErrorText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn("text-xs text-destructive", className)}>{children}</p>
}

export function FormField({
  label,
  fieldKey,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string
  /** When set, label is derived via formatFieldLabel (display only). */
  fieldKey?: string
  htmlFor?: string
  hint?: React.ReactNode
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  const displayLabel = label ?? (fieldKey ? formatFieldLabel(fieldKey) : undefined)

  return (
    <div className={cn("space-y-1.5", className)}>
      {displayLabel ? (
        <FormLabel htmlFor={htmlFor} required={required}>
          {displayLabel}
        </FormLabel>
      ) : null}
      {children}
      {hint ? <FormHelpText>{hint}</FormHelpText> : null}
      {error ? <FormErrorText>{error}</FormErrorText> : null}
    </div>
  )
}

const TEXTAREA_SIZE_CLASS = {
  sm: "min-h-16",
  default: "min-h-20",
  lg: "min-h-28",
  xl: "min-h-48",
} as const

export function FormTextarea({
  size = "default",
  className,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  size?: keyof typeof TEXTAREA_SIZE_CLASS
}) {
  return (
    <Textarea
      className={cn(TEXTAREA_SIZE_CLASS[size], className)}
      {...props}
    />
  )
}
