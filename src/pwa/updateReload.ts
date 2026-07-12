const UPDATE_ACCEPTANCE_MS = 10_000;
const RELOAD_ALLOWANCE_MS = 1_000;

let updateAccepted = false;
let reloadAllowed = false;
let acceptanceTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let allowanceTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

function revokeUpdateAcceptance(): void {
  updateAccepted = false;
  if (acceptanceTimer !== null) globalThis.clearTimeout(acceptanceTimer);
  acceptanceTimer = null;
}

function revokeReloadAllowance(): void {
  reloadAllowed = false;
  if (allowanceTimer !== null) globalThis.clearTimeout(allowanceTimer);
  allowanceTimer = null;
}

export function acceptPwaUpdateReload(): () => void {
  cancelPwaUpdateReload();
  updateAccepted = true;
  // A no-op worker update must not authorize an unrelated unload later.
  acceptanceTimer = globalThis.setTimeout(revokeUpdateAcceptance, UPDATE_ACCEPTANCE_MS);
  return cancelPwaUpdateReload;
}

export function preparePwaUpdateReload(): void {
  const accepted = updateAccepted;
  revokeUpdateAcceptance();
  revokeReloadAllowance();
  if (!accepted) return;

  reloadAllowed = true;
  // This is consumed synchronously by the reload's beforeunload event.
  allowanceTimer = globalThis.setTimeout(revokeReloadAllowance, RELOAD_ALLOWANCE_MS);
}

export function cancelPwaUpdateReload(): void {
  revokeUpdateAcceptance();
  revokeReloadAllowance();
}

export function consumePwaUpdateReloadAllowance(): boolean {
  const allowed = reloadAllowed;
  revokeReloadAllowance();
  return allowed;
}
