import { Request } from 'express';

export type AuthenticatedRequest = Request;

// Route handlers behind ensureAuth can rely on req.user being set - this is the one place
// that assumption is encoded, so every controller shares it rather than re-casting locally.
export const getUserId = (req: Request): number => (req.user as Express.User).id;
