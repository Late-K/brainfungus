"use client";

// the "+ Songlist" button on every song list. it opens a little menu of the
// user's bands, each with its covers and setlists. a custom song's own band
// comes first, then the band being looked at (or the bands shared with the
// person whose profile it is) - click a list to add the song or take it back
// out, escape or click away to close

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addSongToSetlistAction,
  removeSongFromSetlistAction,
} from "@/app/actions/setlists";
import {
  addBandCoverAction,
  removeBandCoverAction,
} from "@/app/actions/covers";
import { Song } from "@/app/types";
import {
  refreshMySonglistsIfStale,
  setSongInMySonglist,
  useMySonglists,
} from "@/app/hooks/useMySonglists";
import { arrangeSonglistBands } from "@/app/lib/setlistUtils";
import { unwrapAction } from "@/app/lib/actionResult";

const MENU_WIDTH = 280;
const MENU_GAP = 6;
// room the menu wants below the button before it opens upwards instead
const MENU_ROOM = 320;

// the menu is fixed to the page rather than inside the song's card, since
// cards clip anything that sticks out of them
type MenuPosition = { left: number } & (
  | { top: number; bottom?: never }
  | { bottom: number; top?: never }
);

// under the button, or above it when there's more room there
function getMenuPosition(button: HTMLElement | null): MenuPosition | null {
  const rect = button?.getBoundingClientRect();
  if (!rect) return null;
  const left = Math.max(
    8,
    Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8),
  );
  const roomBelow = window.innerHeight - rect.bottom;
  return roomBelow < MENU_ROOM && rect.top > roomBelow
    ? { left, bottom: window.innerHeight - rect.top + MENU_GAP }
    : { left, top: rect.bottom + MENU_GAP };
}

// a band's covers, or one of its setlists
type Songlist = { bandId: string; setlistId?: string; name: string };

interface AddToSonglistProps {
  // in the setlist format, so custom songs have isCustom, their own id and
  // the band they belong to
  song: Song;
  // the band whose page the song list is on, shown first in the menu
  bandId?: string;
  // on someone else's profile, the bands the user shares with them, shown
  // first in the menu
  sharedBandIds?: string[];
  // a private band's custom songs can only go in that band's setlists
  onlyBandId?: string;
  // leave out the list being shown - a setlist, or bandId's covers
  excludeSetlistId?: string;
  excludeCovers?: boolean;
}

export default function AddToSonglist({
  song,
  bandId,
  sharedBandIds,
  onlyBandId,
  excludeSetlistId,
  excludeCovers = false,
}: AddToSonglistProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const isOpen = position !== null;

  const { bands: myBands, isLoading, error } = useMySonglists();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const bands = arrangeSonglistBands(myBands ?? [], {
    firstBandIds: bandId ? [bandId] : sharedBandIds,
    onlyBandId,
    songBandId: song.isCustom ? song.bandId : undefined,
    excludeSetlistId,
    excludeCoversBandId: excludeCovers ? bandId : undefined,
  });
  const bandLabel = (band: (typeof bands)[number]) =>
    band._id === bandId
      ? "This band"
      : band.isSongBand
        ? "Song's band"
        : band.isFirst
          ? "You're both in"
          : undefined;

  const open = () => {
    setPosition(getMenuPosition(buttonRef.current));
    refreshMySonglistsIfStale();
  };

  const close = (returnFocus = false) => {
    setPosition(null);
    setActionError("");
    if (returnFocus) buttonRef.current?.focus();
  };

  // close on escape or a click outside, and follow the button as the page
  // scrolls
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setPosition(null);
        setActionError("");
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      // the button toggles the menu itself
      if (buttonRef.current?.contains(target)) return;
      setPosition(null);
      setActionError("");
    };
    const onMove = () => setPosition(getMenuPosition(buttonRef.current));
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    menuRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [isOpen]);

  const handleToggle = async (list: Songlist, remove: boolean) => {
    setActionError("");
    setBusyKey(list.setlistId ?? list.bandId);
    try {
      if (list.setlistId) {
        if (remove) {
          unwrapAction(
            await removeSongFromSetlistAction(list.setlistId, song.id),
          );
        } else {
          unwrapAction(await addSongToSetlistAction(list.setlistId, song));
        }
      } else if (remove) {
        unwrapAction(await removeBandCoverAction(list.bandId, song.id));
      } else {
        unwrapAction(await addBandCoverAction(list.bandId, song));
      }
      setSongInMySonglist(list.bandId, list.setlistId, song.id, !remove);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : `Failed to update ${list.name}`,
      );
    } finally {
      setBusyKey(null);
    }
  };

  // up and down arrows move between the lists
  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        "[role=menuitem]:not(:disabled)",
      ) ?? [],
    );
    if (items.length === 0) return;
    e.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === "ArrowDown"
        ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length;
    items[next].focus();
  };

  // the band's active setlist is highlighted with a note under its name
  const renderItem = (list: Songlist, added: boolean, isActive = false) => {
    const key = list.setlistId ?? list.bandId;
    return (
      <button
        key={key}
        type="button"
        role="menuitem"
        className={`songlist-menu-item${added ? " songlist-menu-item-added" : ""}${isActive ? " songlist-menu-item-active" : ""}`}
        onClick={() => handleToggle(list, added)}
        disabled={busyKey !== null}
        title={added ? `Remove from ${list.name}` : `Add to ${list.name}`}
      >
        <span className="songlist-menu-label">
          <span className="songlist-menu-name">{list.name}</span>
          {isActive && (
            <span className="songlist-menu-active-note">Active setlist</span>
          )}
        </span>
        <span className="songlist-menu-status">
          {busyKey === key ? (
            "..."
          ) : added ? (
            <>
              <span className="songlist-menu-check">✓</span>
              <span className="songlist-menu-remove">✕</span>
            </>
          ) : (
            "+"
          )}
        </span>
      </button>
    );
  };

  const menu = position && (
    <div
      ref={menuRef}
      className="songlist-menu"
      style={{ ...position, width: MENU_WIDTH }}
      role="menu"
      aria-label={`Add ${song.title} to a song list`}
      tabIndex={-1}
      onKeyDown={handleMenuKeyDown}
    >
      <div className="songlist-menu-header">
        <span>Add to songlist</span>
        <button
          type="button"
          className="songlist-menu-close"
          onClick={() => close(true)}
          aria-label="Close"
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>

      {!myBands && isLoading ? (
        <p className="songlist-menu-note">Loading your song lists...</p>
      ) : !myBands && error ? (
        <p className="songlist-menu-note songlist-menu-error">{error}</p>
      ) : bands.length === 0 ? (
        <p className="songlist-menu-note">
          {onlyBandId
            ? "This song's band keeps its songs private, and has no other setlists."
            : "There's nowhere else to add this song yet."}
        </p>
      ) : (
        bands.map((band) => (
          <div key={band._id} className="songlist-menu-group">
            <p className="songlist-menu-band">
              {band.image && (
                <img src={band.image} alt="" className="songlist-menu-icon" />
              )}
              <span className="songlist-menu-name">{band.name}</span>
              {bandLabel(band) && (
                <span className="songlist-menu-current">{bandLabel(band)}</span>
              )}
            </p>
            {band.setlists.map((setlist) =>
              renderItem(
                { bandId: band._id, setlistId: setlist._id, name: setlist.name },
                setlist.songIds.includes(song.id),
                setlist.isActive,
              ),
            )}
            {band.canHoldCover &&
              renderItem(
                { bandId: band._id, name: "Band covers" },
                band.coverSongIds.includes(song.id),
              )}
          </div>
        ))
      )}

      {actionError && (
        <p className="songlist-menu-note songlist-menu-error">{actionError}</p>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className="button button-small button-secondary"
        title="Add to your band covers and setlists"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        + Songlist
      </button>
      {menu && createPortal(menu, document.body)}
    </>
  );
}
