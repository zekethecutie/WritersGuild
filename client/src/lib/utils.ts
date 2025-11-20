import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function linkifyMentions(text: string): string {
  return text.replace(/@(\w+)/g, (match, username) => {
    return `<a href="/user/${username}" class="text-primary hover:underline font-medium" data-testid="link-mention-${username}">@${username}</a>`;
  });
}
