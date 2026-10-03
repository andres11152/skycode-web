import Image from "next/image";
import type { PublicTeamMember } from "@/content/teamShared";
import { cn } from "@/lib/utils";

/**
 * Autor de un post: foto + nombre (+ cargo) si hay perfil público en
 * `team_profiles`, y solo el nombre en texto si no — un post creado con un
 * `author_slug` sin perfil publicado sigue viéndose bien.
 */
export function AuthorChip({
  name,
  member,
  showRole = false,
  className,
}: {
  name: string;
  member?: PublicTeamMember | null;
  showRole?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {member?.photo && (
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-foreground/10 bg-foreground/5">
          <Image src={member.photo} alt="" fill sizes="36px" className="object-cover object-top" />
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-foreground">{member?.name ?? name}</span>
        {showRole && member?.role && <span className="truncate text-xs text-foreground/70">{member.role}</span>}
      </span>
    </span>
  );
}
