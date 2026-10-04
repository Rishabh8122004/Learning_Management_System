// "Rishabh Pareek" -> "RP". Shared so the navbar and profile always agree.
export function initialsOf(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?"
  );
}
