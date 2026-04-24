// calendar page
"use client";

import Image from "next/image";
import CalendarView from "@/app/components/calendarView";
import RehearsalForm from "@/app/components/rehearsalForm";
import ExpandedUserList from "@/app/components/expandedUserList";
import CalendarRehearsals from "@/app/components/calendarRehearsals";
import CalendarModalDialog from "@/app/components/calendarModalDialog";
import { useCalendarPage } from "@/app/hooks/useCalendarPage";

export default function CalendarPage() {
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
    getAvailabilityForDate,
    getAvailableUsersForDate,
    handleAvailabilityToggle,
  } = useCalendarPage();

  return (
    <div>
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
      <h2>Calendar</h2>

      <div className="calendar-container">
        <CalendarView
          rehearsals={rehearsals}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      </div>

      {selectedDate && (
        <CalendarRehearsals
          rehearsals={rehearsals}
          selectedDate={selectedDate}
          onCreateRehearsal={openCreateForm}
          onEditRehearsal={handleEditClick}
          onDeleteRehearsal={handleDeleteClick}
          onToggleAvailability={handleAvailabilityToggle}
          getAvailabilityForDate={getAvailabilityForDate}
          getAvailableUsersForDate={getAvailableUsersForDate}
          onShowAllUsers={setExpandedUsers}
        />
      )}

      {choiceTarget && choiceAction && (
        <CalendarModalDialog
          target={choiceTarget}
          action={choiceAction}
          onClose={closeChoice}
          onChooseThis={
            choiceAction === "edit" ? handleEditThis : handleDeleteThis
          }
          onChooseAll={
            choiceAction === "edit" ? handleEditAll : () => handleDeleteAll()
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
