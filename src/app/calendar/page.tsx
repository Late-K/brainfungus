// calendar page
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Image from "next/image";
import CalendarView from "@/app/components/rehearsals/calendarView";
import RehearsalForm from "@/app/components/rehearsals/rehearsalForm";
import ExpandedUserList from "@/app/components/ui/expandedUserList";
import CalendarRehearsals from "@/app/components/rehearsals/calendarRehearsals";
import CalendarModalDialog from "@/app/components/rehearsals/calendarModalDialog";
import DayAvailabilityPanel from "@/app/components/rehearsals/dayAvailabilityPanel";
import DayAvailabilityForm from "@/app/components/rehearsals/dayAvailabilityForm";
import DayAvailabilityRemoveDialog from "@/app/components/rehearsals/dayAvailabilityRemoveDialog";
import { useCalendarPage } from "@/app/hooks/useCalendarPage";

export default function CalendarPage() {
  const { data: session, status } = useSession();

  const {
    rehearsals,
    selectedDate,
    showForm,
    editRehearsal,
    editMode,
    choiceTarget,
    choiceAction,
    expandedUsers,
    setExpandedUsers,
    handleSelectDate,
    openCreateForm,
    handleFormSuccess,
    closeForm,
    handleEditClick,
    handleEditThis,
    handleEditAll,
    handleDeleteClick,
    handleDeleteThis,
    handleDeleteAll,
    closeChoice,
    handleAddToCalendarClick,
    handleAddToCalendarThis,
    handleAddToCalendarAll,
    getAvailabilityForDate,
    getAvailableUsersForDate,
    handleAvailabilityToggle,
    bands,
    dayAvailability,
    myDayAvailability,
    isMyAvailableDay,
    addableDayBands,
    showDayForm,
    setShowDayForm,
    dayRemoveTarget,
    setDayRemoveTarget,
    handleAddDayAvailability,
    handleRemoveDayAvailability,
    removeDayAvailability,
  } = useCalendarPage();

  if (status === "loading") return null;
  if (!session) redirect("/login");

  return (
    <div className="page-container">
      <div className="brand-spanned-wrap">
        <Image
          src="/brain-fungus-spanned.png"
          alt="Brain Fungus"
          width={420}
          height={84}
          priority
          className="brand-spanned-image"
        />
      </div>
      <div className="page-heading desktop-only">
        <h1>Calendar</h1>
      </div>

      <div className="calendar-layout">
        <div className="calendar-container">
          <CalendarView
            rehearsals={rehearsals}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            isAvailableDay={isMyAvailableDay}
          />
        </div>

        {selectedDate && (
          <CalendarRehearsals
            rehearsals={rehearsals}
            selectedDate={selectedDate}
            onCreateRehearsal={openCreateForm}
            onEditRehearsal={handleEditClick}
            onDeleteRehearsal={handleDeleteClick}
            onAddToCalendar={handleAddToCalendarClick}
            onToggleAvailability={handleAvailabilityToggle}
            getAvailabilityForDate={getAvailabilityForDate}
            getAvailableUsersForDate={getAvailableUsersForDate}
            onShowAllUsers={setExpandedUsers}
            dayAvailability={
              <DayAvailabilityPanel
                selectedDate={selectedDate}
                me={myDayAvailability}
                bands={bands}
                dayAvailability={dayAvailability}
                canAdd={addableDayBands.length > 0}
                onAdd={() => setShowDayForm(true)}
                onRemove={handleRemoveDayAvailability}
                onShowAllUsers={setExpandedUsers}
              />
            }
          />
        )}
      </div>

      {choiceTarget && choiceAction && (
        <CalendarModalDialog
          target={choiceTarget}
          action={choiceAction}
          onClose={closeChoice}
          onChooseThis={
            {
              edit: handleEditThis,
              delete: handleDeleteThis,
              calendar: handleAddToCalendarThis,
            }[choiceAction]
          }
          onChooseAll={
            {
              edit: handleEditAll,
              delete: () => handleDeleteAll(),
              calendar: handleAddToCalendarAll,
            }[choiceAction]
          }
        />
      )}

      {showForm && selectedDate && (
        <RehearsalForm
          selectedDate={selectedDate}
          onSuccess={handleFormSuccess}
          onCancel={closeForm}
          editRehearsal={editRehearsal ?? undefined}
          editMode={editMode ?? undefined}
        />
      )}

      {showDayForm && selectedDate && (
        <DayAvailabilityForm
          selectedDate={selectedDate}
          bands={addableDayBands}
          onSubmit={handleAddDayAvailability}
          onCancel={() => setShowDayForm(false)}
        />
      )}

      {dayRemoveTarget && (
        <DayAvailabilityRemoveDialog
          schedule={dayRemoveTarget}
          bandName={
            bands.find((b) => b._id === dayRemoveTarget.bandId)?.name ?? ""
          }
          onClose={() => setDayRemoveTarget(null)}
          onChoose={(scope) =>
            removeDayAvailability(dayRemoveTarget.bandId, scope)
          }
        />
      )}

      {expandedUsers && (
        <ExpandedUserList
          title="Available Members"
          users={expandedUsers}
          onClose={() => setExpandedUsers(null)}
        />
      )}
    </div>
  );
}
