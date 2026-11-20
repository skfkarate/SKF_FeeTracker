export type ClassValue = string | number | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  return parts
    .filter((part): part is string | number => part !== false && part !== null && part !== undefined)
    .map((part) => String(part))
    .join(" ");
}