"use client";

import Link from "next/link";
import { ProfileLearntSong, ProfileSongList } from "@/app/types";
import SongListPreview from "@/app/components/profile/songListPreview";
import { useFetchData } from "@/app/hooks/useFetchData";

const lists = {
  learnt: {
    fetchUrl: "/api/learnt-songs/profile",
    href: "/profile/learnt-songs",
    heading: "My Learnt Songs",
    name: "learnt songs",
  },
  learning: {
    fetchUrl: "/api/learning-songs/profile",
    href: "/profile/learning-songs",
    heading: "Currently Learning",
    name: "learning songs",
  },
};

// the newest few songs from the user's own learnt or learning list
export default function ProfileSongsPreview({
  list,
}: {
  list: ProfileSongList;
}) {
  const config = lists[list];
  const { data, isLoading, error } = useFetchData<{
    songs: ProfileLearntSong[];
  }>(config.fetchUrl);

  return (
    <SongListPreview
      heading={config.heading}
      songs={data?.songs ?? []}
      href={config.href}
      isLoading={isLoading}
      loadingMessage={`Loading ${config.name}...`}
      error={error}
      emptyMessage={
        <>
          No {config.name} yet. <Link href={config.href}>Add some!</Link>
        </>
      }
    />
  );
}
