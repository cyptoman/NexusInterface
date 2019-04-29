import memoize from 'memoize-one';

import store from 'store';
import { updateModuleState } from 'actions/moduleActionCreators';
import UIController from 'components/UIController';
import * as RPC from 'scripts/rpc';
import { readModuleStorage, writeModuleStorage } from './storage';

let webview = null;
let module = null;
let data = null;
let unsubscribe = null;

/**
 * Exports
 * ===========================================================================
 */

/**
 * Register active webview, called when the webview is mounted
 *
 * @export
 * @param {*} _webview
 * @param {*} _module
 */
export function registerWebView(_webview, _module) {
  webview = _webview;
  module = _module;

  webview.addEventListener('ipc-message', handleIpcMessage);
  webview.addEventListener('dom-ready', () => {
    const state = store.getState();
    const moduleState = state.moduleStates[module.name];
    const storageData = readModuleStorage(module);
    data = getModuleData(state);
    webview.send('initialize', {
      ...data,
      moduleState,
      storageData,
    });
    unsubscribe = store.subscribe(handleStateChange);
  });
}

/**
 * Unregister active webview, called when the webview is unmounted
 *
 * @export
 */
export function unregisterWebView() {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }
  webview = null;
  module = null;
  data = null;
  unsubscribe = null;
}

/**
 * Toggle the active webview's DevTools
 *
 * @export
 */
export function toggleWebViewDevTools() {
  if (webview) {
    if (webview.isDevToolsOpened()) {
      webview.closeDevTools();
    } else {
      webview.openDevTools();
    }
  }
}

/**
 * Check whether there's a webview being active
 *
 * @export
 * @returns
 */
export function isWebViewActive() {
  return !!webview;
}

/**
 * Outgoing IPC messages TO modules
 * ===========================================================================
 */

function handleStateChange() {
  if (!data) return;
  const state = store.getState();
  const newData = getModuleData(state);
  const { theme, settings, coreInfo } = newData;

  if (data.theme !== theme) {
    webview.send('theme-updated', theme);
  }
  if (settingsChanged(data.settings, settings)) {
    webview.send('settings-updated', settings);
  }
  if (data.coreInfo !== coreInfo) {
    webview.send('core-info-updated', coreInfo);
  }
  data = newData;
}

/**
 * Incoming IPC messages FROM modules
 * ===========================================================================
 */

function handleIpcMessage(event) {
  switch (event.channel) {
    case 'rpc-call':
      rpcCall(event.args);
      break;
    case 'show-notification':
      showNotif(event.args);
      break;
    case 'show-error-dialog':
      showErrorDialog(event.args);
      break;
    case 'show-success-dialog':
      showSuccessDialog(event.args);
      break;
    case 'confirm':
      confirm(event.args);
      break;
    case 'update-state':
      updateState(event.args);
      break;
    case 'update-storage':
      updateStorage(event.args);
      break;
  }
}

async function rpcCall([{ command, params, callId }]) {
  try {
    const response = await RPC.PROMISE(command, ...(params || []));
    webview.send(`rpc-return${callId ? `:${callId}` : ''}`, null, response);
  } catch (err) {
    console.error(err);
    webview.send(`rpc-return${callId ? `:${callId}` : ''}`, err);
  }
}

function showNotif([content, param = {}]) {
  const options =
    typeof param === 'string'
      ? { type: param }
      : {
          type: param.type,
          autoClose: param.autoClose,
        };
  UIController.showNotification(content, options);
}

function showErrorDialog([options = {}]) {
  const { message, note } = options;
  UIController.openErrorDialog({
    message,
    note,
  });
}

function showSuccessDialog([options = {}]) {
  const { message, note } = options;
  UIController.openSuccessDialog({
    message,
    note,
  });
}

function confirm([options = {}]) {
  const {
    confirmationId,
    question,
    note,
    yesLabel,
    yesSkin,
    noLabel,
    noSkin,
  } = options;
  UIController.openConfirmDialog({
    question,
    note,
    yesLabel,
    yesSkin,
    yesCallback: () => {
      webview.send(
        `confirm-answer${confirmationId ? `:${confirmationId}` : ''}`,
        true
      );
    },
    noLabel,
    noSkin,
    noCallback: () => {
      webview.send(
        `confirm-answer${confirmationId ? `:${confirmationId}` : ''}`,
        false
      );
    },
  });
}

function updateState([moduleState]) {
  const moduleName = module.name;
  if (typeof moduleState === 'object') {
    store.dispatch(updateModuleState(moduleName, moduleState));
  } else {
    console.error(
      `Module ${moduleName} is trying to update its state to a non-object value ${moduleState}`
    );
  }
}

function updateStorage([data]) {
  writeModuleStorage(module, data);
}

/**
 * Utilities
 * ===========================================================================
 */

const getSettingsForModules = memoize((locale, fiatCurrency, addressStyle) => ({
  locale,
  fiatCurrency,
  addressStyle,
}));

const settingsChanged = (settings1, settings2) =>
  settings1.locale !== settings2.locale ||
  settings1.fiatCurrency !== settings2.fiatCurrency ||
  settings1.addressStyle !== settings2.addressStyle;

const getModuleData = ({
  theme,
  core,
  settings: { locale, fiatCurrency, addressStyle },
}) => ({
  theme,
  settings: getSettingsForModules(locale, fiatCurrency, addressStyle),
  coreInfo: core.info,
});
