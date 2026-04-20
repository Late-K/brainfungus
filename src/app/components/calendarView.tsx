// calendar view, renders a calendar with month navigation, showing markers for days with rehearsals
"use client";

import { useState } from "react";
import { Rehearsal } from "@/app/types";
import { doesRehearsalOccurOnDate, toDateStr } from "@/app/lib/rehearsalUtils";

interface CalendarViewProps {
  rehearsals: Rehearsal[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({
  rehearsals,
  selectedDate,
  onSelectDate,
}: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const handleDateClick = (date: string) => {
    onSelectDate(date);
  };

  const getRehearsalsForDate = (date: Date) => {
    return rehearsals.filter((r) => doesRehearsalOccurOnDate(r, date));
  };

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const renderCalendar = () => {
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const calendar: (Date | null)[][] = [];
    let week: (Date | null)[] = [];

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(viewYear, viewMonth, day);
      const dayOfWeek = date.getDay();
      if (day === 1) {
        for (let i = 0; i < dayOfWeek; i++) {
          week.push(null);
        }
      }
      week.push(date);
      if (dayOfWeek === 6 || day === lastDayOfMonth.getDate()) {
        // pad last week
        while (week.length < 7) {
          week.push(null);
        }
        calendar.push(week);
        week = [];
      }
    }
    return calendar;
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });

  const todayStr = toDateStr(today);

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button
          className="btn btn-small btn--tertiary"
          onClick={goToPreviousMonth}
        >
          ‹
        </button>
        <button
          className="calendar-month-label btn btn-small btn--tertiary"
          onClick={goToToday}
        >
          {monthLabel}
        </button>
        <button className="btn btn-small btn--tertiary" onClick={goToNextMonth}>
          ›
        </button>
      </div>

      <div className="calendar-day-headers">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="calendar-day-header">
            {d}
          </div>
        ))}
      </div>

      {renderCalendar().map((week, index) => (
        <div key={index} className="calendar-week">
          {week.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="calendar-day empty"></div>;
            }
            const dateString = toDateStr(date);
            const rehearsalsForDate = getRehearsalsForDate(date);
            const isToday = dateString === todayStr;
            const isSelected = selectedDate === dateString;

            return (
              <div
                key={idx}
                className={`calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
                onClick={() => handleDateClick(dateString)}
              >
                <span className="calendar-day-number">{date.getDate()}</span>
                {rehearsalsForDate.length > 0 && (
                  <div className="rehearsal-markers">
                    {rehearsalsForDate.slice(0, 3).map((r, i) => (
                      <span key={i} className="rehearsal-marker" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
