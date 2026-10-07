import { GlassCard } from "./GlassCard";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface MobileDateInputProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  inline?: boolean;
  placeholder?: string;
}

export function MobileDateInput({
  value,
  onChange,
  compact = false,
  inline = false,
  placeholder = "Seleziona data",
}: MobileDateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [isOpen]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      if (!dateStr) return compact || inline ? placeholder : "Seleziona una data";
      if (compact || inline) {
        return format(new Date(dateStr), "dd/MM/yyyy");
      }
      return format(new Date(dateStr), "EEEE, d MMMM yyyy", { locale: it });
    } catch {
      return compact || inline ? placeholder : "Seleziona una data";
    }
  };

  const openPicker = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setCurrentMonth(value ? new Date(value) : new Date());
    setIsOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDay = start.getDay();
    const emptyDays = Array(startDay).fill(null);
    return [...emptyDays, ...days];
  };

  const isToday = (date: Date) => isSameDay(date, new Date());
  const isSelected = (date: Date) => value && isSameDay(date, new Date(value));

  const calendarModal = isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md touch-none isolate"
          role="dialog"
          aria-modal="true"
          aria-label="Seleziona data"
          onClick={() => setIsOpen(false)}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div
            className="glass-card w-full max-w-sm max-h-[80vh] overflow-hidden border border-white/10 shadow-[var(--shadow-soft)] touch-auto"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 touch-manipulation"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seleziona data</p>
                <h3 className="text-base font-semibold capitalize text-white">
                  {format(currentMonth, "MMMM yyyy", { locale: it })}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 touch-manipulation"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pt-3">
              {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((day) => (
                <div key={day} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid max-h-56 grid-cols-7 gap-1 overflow-y-auto overscroll-contain px-3 pb-3 touch-auto">
              {getCalendarDays().map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-9" />;
                }

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateSelect(day);
                    }}
                    className={cn(
                      "h-9 rounded-xl text-xs font-semibold transition-all touch-manipulation",
                      isSelected(day)
                        ? "pill-active shadow-none"
                        : isToday(day)
                          ? "border border-white/20 bg-white/10 text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 border-t border-white/10 p-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateSelect(new Date());
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 touch-manipulation"
              >
                Oggi
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="flex-1 rounded-xl py-2.5 px-3 text-sm font-semibold pill-active touch-manipulation"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={openPicker}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left touch-manipulation transition-colors hover:bg-white/10"
        >
          <span className={cn("text-xs", value ? "text-white" : "text-muted-foreground")}>
            {formatDateDisplay(value)}
          </span>
        </button>
        {calendarModal}
      </>
    );
  }

  if (inline) {
    return (
      <>
        <button
          type="button"
          onClick={openPicker}
          className="text-left text-sm font-semibold text-white transition-colors hover:text-white/80 touch-manipulation"
        >
          {formatDateDisplay(value)}
        </button>
        {calendarModal}
      </>
    );
  }

  return (
    <>
      <GlassCard className="transition-all">
        <button
          type="button"
          className="flex w-full items-center gap-3 p-4 text-left touch-manipulation"
          onClick={openPicker}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-xs font-medium text-muted-foreground">Data</p>
            <p className="truncate text-sm font-semibold capitalize text-white">{formatDateDisplay(value)}</p>
          </div>
        </button>
      </GlassCard>
      {calendarModal}
    </>
  );
}
