"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useFolderNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const rawFolderId = params.get("folder") || "";

  const navigate = useCallback(
    (folderId: string | null) => {
      const target = folderId ? `${pathname}?folder=${encodeURIComponent(folderId)}` : pathname;
      router.push(target, { scroll: false });
    },
    [router, pathname],
  );

  return { rawFolderId, navigate };
}
