import { expect, test } from "@playwright/test";
import {
  acceptPwaUpdateReload,
  cancelPwaUpdateReload,
  consumePwaUpdateReloadAllowance,
  preparePwaUpdateReload,
} from "../src/pwa/updateReload";

test("allows one unload only after the accepted update takes control", () => {
  // #given the current tab has explicitly accepted a waiting update
  acceptPwaUpdateReload();

  // #when an unrelated unload happens before control, then the worker requests its reload
  const result = {
    beforeWorkerControl: consumePwaUpdateReloadAllowance(),
    acceptedUpdateReload: false,
    laterUnrelatedReload: false,
  };
  preparePwaUpdateReload();
  result.acceptedUpdateReload = consumePwaUpdateReloadAllowance();
  result.laterUnrelatedReload = consumePwaUpdateReloadAllowance();

  // #then only the controller-triggered reload bypasses the data-loss warning
  expect(result).toEqual({
    beforeWorkerControl: false,
    acceptedUpdateReload: true,
    laterUnrelatedReload: false,
  });
});

test("revokes acceptance when worker activation fails", () => {
  // #given a waiting update was accepted but cannot activate
  acceptPwaUpdateReload();

  // #when the update flow reports failure
  cancelPwaUpdateReload();
  preparePwaUpdateReload();

  // #then the next unload still receives the normal data-loss protection
  expect(consumePwaUpdateReloadAllowance()).toBe(false);
});
