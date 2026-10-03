export function firstName(fullName: string): string {
  const part = fullName.replace(/\s+/g, " ").trim().split(" ")[0];
  return part || "there";
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function roleLabel(role: string, memberRole?: string): string {
  if (role === "platform_admin") return "Platform admin";
  if (memberRole === "viewer") return "Viewer";
  if (memberRole === "member" || role === "member") return "Family member";
  return "Desk owner";
}
