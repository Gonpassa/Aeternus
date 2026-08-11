import { PublicUser } from '../db/users';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging requires an interface, not a type alias
    interface User extends PublicUser {}
  }
}

export {};
