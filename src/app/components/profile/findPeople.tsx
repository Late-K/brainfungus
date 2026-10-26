"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User } from "@/app/types";
import { useFetchData } from "@/app/hooks/useFetchData";

const max_results = 5;

export default function FindPeople() {
  const { data, isLoading, error } = useFetchData<{ users: User[] }>(
    "/api/users/all",
  );
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const matches = trimmedQuery
    ? (data?.users ?? [])
        .filter((user) => user.name?.toLowerCase().includes(trimmedQuery))
        .slice(0, max_results)
    : [];

  return (
    <section className="card">
      <div className="section-header">
        <h2>Find People</h2>
      </div>
      <p className="meta-text meta-text-medium">
        View someone&apos;s profile to compare learnt songs.
      </p>

      <input
        type="search"
        className="input margin-top"
        placeholder="Search by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isLoading}
      />

      {error && <p className="alert alert-error">{error}</p>}

      {trimmedQuery &&
        (matches.length === 0 ? (
          <p className="empty-state">No users found.</p>
        ) : (
          <div className="list-compact list-top">
            {matches.map((user) => (
              <Link
                key={user._id}
                href={`/users/${user._id}`}
                className="member-row card-item member-link"
              >
                <div className="member-info">
                  <div className="member-avatar">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={36}
                        height={36}
                        className="avatar-small"
                      />
                    ) : (
                      <div className="avatar-small-fallback">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="member-name">{user.name}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
    </section>
  );
}
