
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  clearable?: boolean
}

export function DatePicker({ 
  date, 
  onDateChange, 
  placeholder = "Seleccionar fecha", 
  clearable = true 
}: DatePickerProps) {
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateChange(undefined)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-auto justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
          {date && clearable && (
            <X 
              className="ml-2 h-4 w-4 text-muted-foreground hover:text-foreground" 
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          className="pointer-events-auto rounded-md border"
        />
      </PopoverContent>
    </Popover>
  )
}
