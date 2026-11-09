// The ceilings a Topic list is held to, said once for the module's two taggers. They match
// backend/src/modules/notes/validation.ts, which is the authority: the client refuses early so
// the user is told in the field rather than by a rejected request.
export const TOPIC_NAME_MAX = 60;
export const TOPIC_COUNT_MAX = 12;
