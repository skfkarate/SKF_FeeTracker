"use client";

import { useEffect, useState } from "react";

import { avatarTintStyle, initials } from "@/lib/profile-photo";

type PhotoStatus = "loading" | "ready" | "failed";

export default function StudentAvatar({
  name,
  photoUrl,
  className = "",
  initialClassName = "text-xs",
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
  initialClassName?: string;
}) {
  const url = photoUrl || "";
  const [status, setStatus] = useState<PhotoStatus>("loading");

  useEffect(() => {
    if (!url) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) setStatus("ready");
    };
    image.onerror = () => {
      if (active) setStatus("failed");
    };
    image.src = url;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  const showPhoto = Boolean(url) && status === "ready";

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden rounded-full border border-[color:var(--color-hairline)] bg-[color:var(--color-well)] ${className}`}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-bold ${initialClassName}`}
          style={avatarTintStyle(name)}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}
