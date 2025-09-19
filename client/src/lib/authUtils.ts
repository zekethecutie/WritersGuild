
import { authService } from "./auth";

export function isUnauthorizedError(error: Error): boolean {
  return authService.isUnauthorizedError(error);
}

export { authService };
