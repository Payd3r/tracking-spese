import { GlassCard } from "./GlassCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useId } from "react";

interface MobileDateInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function MobileDateInput({ value, onChange }: MobileDateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  const formatDateDisplay = (dateStr: string) => {
    try {
      if (!dateStr) return "Seleziona una data";
      return format(new Date(dateStr), "EEEE, d MMMM yyyy", { locale: it });
    } catch {
      return "Seleziona una data";
    }
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(date);
    onChange(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add empty cells for days before month start
    const startDay = start.getDay();
    const emptyDays = Array(startDay).fill(null);
    
    return [...emptyDays, ...days];
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isSelected = (date: Date) => {
    return value && isSameDay(date, new Date(value));
  };

  return (
    <>
      <GlassCard className="transition-all">
        <div className="flex items-center gap-2.5 p-4 cursor-pointer" onClick={() => setIsOpen(true)}>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5 font-medium">Data</p>
            <p className="font-semibold text-sm truncate capitalize">
              {formatDateDisplay(value)}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Calendar Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
          <div className="bg-background rounded-2xl w-full max-w-sm max-h-[75vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <h3 className="font-semibold text-base">
                {format(currentMonth, "MMMM yyyy", { locale: it })}
              </h3>
              
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 p-2">
              {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
                <div key={day} className="text-center text-xs text-muted-foreground py-1.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 p-2 max-h-56 overflow-y-auto">
              {getCalendarDays().map((day, index) => {
                if (!day) {
                  return <div key={index} className="h-9" />;
                }

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateSelect(day)}
                    className={`
                      h-9 rounded-lg text-xs font-medium transition-colors
                      ${isSelected(day) 
                        ? 'bg-primary text-primary-foreground' 
                        : isToday(day)
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                      }
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-3 border-t">
              <button
                onClick={() => handleDateSelect(new Date())}
                className="flex-1 py-2 px-3 bg-accent text-accent-foreground rounded-lg font-medium text-sm"
              >
                Oggi
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 px-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
