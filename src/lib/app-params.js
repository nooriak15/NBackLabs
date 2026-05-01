/**
 * Standalone-build placeholder. The original Base44 version read app
 * parameters (appId, access token, app base URL, etc.) from the URL or
 * localStorage. Without Base44 there's nothing to read, so we export an
 * empty object. Components that used to depend on this no longer need
 * anything from it, but the file is kept so existing `import` statements
 * still resolve.
 */
export const appParams = {
  appId: null,
  token: null,
  fromUrl: null,
  functionsVersion: null,
  appBaseUrl: null,
};
