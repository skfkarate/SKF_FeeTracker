import type { PracticeFolder, PracticePhoto, PortalVideo } from "@/lib/api";
import { BELT_OPTIONS, type SortMode } from "./library-shared";

export function childrenOf(folders: PracticeFolder[], parentId: string | null) {
  const ids = new Set(folders.map((folder) => folder.id));
  const list = folders.filter((folder) => {
    const parent = folder.parentFolderId || null;
    if (parentId === null) return parent === null || !ids.has(parent);
    return parent === parentId;
  });
  return sortFolders(list, "auto");
}

/**
 * Ordering used by the athlete portal shelf: content with no belt level is
 * general and leads; belt-specific content then climbs White → Black. A video
 * with several belts ranks at its lowest (most permissive) belt. Collisions
 * fall back to featured → drag sort order → title.
 */
export function videoBeltSortRank(beltLevels: string[] | undefined) {
  const ranks = (beltLevels || [])
    .map((belt) => BELT_OPTIONS.indexOf(belt))
    .filter((rank) => rank >= 0);
  if (!ranks.length) return -1;
  return Math.min(...ranks);
}

export function sortFolders(list: PracticeFolder[], mode: SortMode) {
  const copy = [...list];
  if (mode === "name") {
    return copy.sort((left, right) => left.title.localeCompare(right.title));
  }
  if (mode === "newest") {
    return copy.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }
  return copy.sort((left, right) => {
    const featuredDiff = Number(right.isFeatured) - Number(left.isFeatured);
    if (featuredDiff !== 0) return featuredDiff;
    const orderDiff = (left.sortOrder || 0) - (right.sortOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return left.title.localeCompare(right.title);
  });
}

export function sortVideos(list: PortalVideo[], mode: SortMode) {
  const copy = [...list];
  if (mode === "name") {
    return copy.sort((left, right) => left.title.localeCompare(right.title));
  }
  if (mode === "newest") {
    return copy.sort((left, right) => new Date(right.createdAt || right.updatedAt || 0).getTime() - new Date(left.createdAt || left.updatedAt || 0).getTime());
  }
  return copy.sort((left, right) => {
    const beltDiff = videoBeltSortRank(left.beltLevels) - videoBeltSortRank(right.beltLevels);
    if (beltDiff !== 0) return beltDiff;
    const featuredDiff = Number(right.isFeatured) - Number(left.isFeatured);
    if (featuredDiff !== 0) return featuredDiff;
    const orderDiff = (left.sortOrder || 0) - (right.sortOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return left.title.localeCompare(right.title);
  });
}

export function sortPhotos(list: PracticePhoto[], mode: SortMode) {
  const copy = [...list];
  if (mode === "name") {
    return copy.sort((left, right) => left.title.localeCompare(right.title));
  }
  if (mode === "newest") {
    return copy.sort((left, right) => Number(right.id || 0) - Number(left.id || 0));
  }
  return copy.sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
}

function flattenFolderPreorder(folders: PracticeFolder[]) {
  const byParent = new Map<string | null, PracticeFolder[]>();
  for (const folder of folders) {
    const key = folder.parentFolderId || null;
    const list = byParent.get(key) || [];
    list.push(folder);
    byParent.set(key, list);
  }
  const ids: string[] = [];
  const visit = (parent: string | null) => {
    for (const child of sortFolders(byParent.get(parent) || [], "auto")) {
      ids.push(child.id);
      visit(child.id);
    }
  };
  visit(null);
  return ids;
}

/**
 * Every video id in the grouping the portal reorder API expects: video ids
 * grouped by folder in depth-first pre-order, with unfiled videos last.
 * `shelfOverrideIds` replaces the direct videos of one shelf (a folder or the
 * top-level "unfiled" view) so a drag inside the current shelf is reflected
 * in the persisted order.
 */
export function flattenVideoScopeIds(
  folders: PracticeFolder[],
  videos: PortalVideo[],
  shelfOverride?: { folderId: string | null; ids: string[] },
) {
  const byFolder = new Map<string | null, PortalVideo[]>();
  for (const video of videos) {
    const key = video.folderId || null;
    const list = byFolder.get(key) || [];
    list.push(video);
    byFolder.set(key, list);
  }
  const groupIds = (folderId: string | null) =>
    shelfOverride && shelfOverride.folderId === folderId
      ? shelfOverride.ids
      : sortVideos(byFolder.get(folderId) || [], "auto").map((video) => video.id);

  const ids: string[] = [];
  for (const folderId of flattenFolderPreorder(folders)) ids.push(...groupIds(folderId));
  ids.push(...groupIds(null));
  return ids;
}

export function getAncestorChain(folderId: string | null, folders: PracticeFolder[]) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const chain: PracticeFolder[] = [];
  let cursor = folderId ? byId.get(folderId) : undefined;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor.id)) {
    guard.add(cursor.id);
    chain.unshift(cursor);
    cursor = cursor.parentFolderId ? byId.get(cursor.parentFolderId) : undefined;
  }
  return chain;
}

export function getDescendantIds(folderId: string, folders: PracticeFolder[]) {
  const ids = new Set<string>();
  let frontier = [folderId];
  while (frontier.length) {
    const next: string[] = [];
    for (const parent of frontier) {
      for (const folder of folders) {
        if (folder.parentFolderId === parent && !ids.has(folder.id)) {
          ids.add(folder.id);
          next.push(folder.id);
        }
      }
    }
    frontier = next;
  }
  return ids;
}

export type FolderCounts = { folders: number; videos: number; photos: number; total: number };

export function countSubtree(folderId: string | null, folders: PracticeFolder[], videos: PortalVideo[], photos: PracticePhoto[]): FolderCounts {
  if (folderId && getAncestorChain(folderId, folders).slice(-1)[0]?.id !== folderId) {
    return { folders: 0, videos: 0, photos: 0, total: 0 };
  }
  const directVideos = folderId
    ? videos.filter((video) => video.folderId === folderId)
    : videos.filter((video) => !video.folderId);
  const directPhotos = folderId
    ? photos.filter((photo) => photo.folderId === folderId)
    : photos.filter((photo) => !photo.folderId);
  const childFolders = childrenOf(folders, folderId);
  let totals: FolderCounts = {
    folders: childFolders.length,
    videos: directVideos.length,
    photos: directPhotos.length,
    total: directVideos.length + directPhotos.length,
  };
  for (const child of childFolders) {
    const childCounts = countSubtree(child.id, folders, videos, photos);
    totals = {
      ...totals,
      folders: totals.folders + childCounts.folders,
      videos: totals.videos + childCounts.videos,
      photos: totals.photos + childCounts.photos,
      total: totals.total + childCounts.total,
    };
  }
  return totals;
}

function videoMatches(video: PortalVideo, term: string) {
  return [
    video.title,
    video.description,
    video.lessonNote,
    video.category,
    video.youtubeId,
    ...(video.branchSlugs || []),
    ...(video.batchNames || []),
    ...(video.beltLevels || []),
  ].join(" ").toLowerCase().includes(term);
}

function photoMatches(photo: PracticePhoto, term: string) {
  return [photo.title, photo.description].join(" ").toLowerCase().includes(term);
}

function folderMatches(folder: PracticeFolder, term: string) {
  return [folder.title, folder.description, ...(folder.beltLevels || []), ...(folder.batchNames || [])].join(" ").toLowerCase().includes(term);
}

export type SearchResults = {
  folders: Array<{ folder: PracticeFolder; pathLabel: string }>;
  videos: Array<{ video: PortalVideo; pathLabel: string }>;
  photos: Array<{ photo: PracticePhoto; pathLabel: string }>;
};

export function searchLibrary(query: string, folders: PracticeFolder[], videos: PortalVideo[], photos: PracticePhoto[]): SearchResults {
  const term = query.trim().toLowerCase();
  if (!term) return { folders: [], videos: [], photos: [] };

  const pathFor = (folderId?: string | null) => {
    if (!folderId) return "";
    const chain = getAncestorChain(folderId, folders);
    return chain.map((item) => item.title).join(" / ");
  };

  return {
    folders: folders
      .filter((folder) => folderMatches(folder, term))
      .map((folder) => ({ folder, pathLabel: pathFor(folder.parentFolderId) })),
    videos: videos
      .filter((video) => videoMatches(video, term))
      .map((video) => ({ video, pathLabel: pathFor(video.folderId) })),
    photos: photos
      .filter((photo) => photoMatches(photo, term))
      .map((photo) => ({ photo, pathLabel: pathFor(photo.folderId) })),
  };
}
