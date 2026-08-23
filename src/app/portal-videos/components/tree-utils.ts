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

export function sortFolders(list: PracticeFolder[], mode: SortMode) {
  const copy = [...list];
  if (mode === "name") {
    return copy.sort((left, right) => left.title.localeCompare(right.title));
  }
  if (mode === "newest") {
    return copy.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }
  return copy.sort((left, right) => {
    const leftBelt = BELT_OPTIONS.findIndex((belt) => left.beltLevels?.includes(belt));
    const rightBelt = BELT_OPTIONS.findIndex((belt) => right.beltLevels?.includes(belt));
    return (leftBelt < 0 ? 99 : leftBelt) - (rightBelt < 0 ? 99 : rightBelt) || (left.sortOrder || 0) - (right.sortOrder || 0) || left.title.localeCompare(right.title);
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
    const leftBelt = BELT_OPTIONS.findIndex((belt) => left.beltLevels?.includes(belt));
    const rightBelt = BELT_OPTIONS.findIndex((belt) => right.beltLevels?.includes(belt));
    return (left.sortOrder || 0) - (right.sortOrder || 0) || (leftBelt < 0 ? 99 : leftBelt) - (rightBelt < 0 ? 99 : rightBelt);
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
