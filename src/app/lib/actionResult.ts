// server actions return their errors as values instead of throwing them.
// next hides the message of anything thrown from a server action in production
// builds, so a thrown "Only admins can do this" would reach the user as a
// generic error. keep this free of server-only imports so client code can use
// unwrapAction

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// an error whose message is written for the user and safe to show them.
// anything else (database, blob storage...) is logged and replaced with a
// generic message
export class UserError extends Error {}

// runs the body of a server action, turning a thrown error into a result
export async function runAction<T>(
  failureMessage: string,
  body: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    console.error(`${failureMessage}:`, error);
    return {
      ok: false,
      error: error instanceof UserError ? error.message : failureMessage,
    };
  }
}

// client side - gives back the action's data, or throws its error so callers
// can keep using try/catch and err.message
export function unwrapAction<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
