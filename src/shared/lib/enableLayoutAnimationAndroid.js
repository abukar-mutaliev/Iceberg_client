import { Platform, UIManager } from 'react-native';

function isFabricEnabled() {
  return typeof global !== 'undefined' && global.nativeFabricUIManager != null;
}

/** Enables LayoutAnimation on legacy Android bridge only (no-op / warns on New Architecture). */
export function enableLayoutAnimationExperimentalAndroid() {
  if (Platform.OS !== 'android') return;
  if (isFabricEnabled()) return;
  const enable = UIManager.setLayoutAnimationEnabledExperimental;
  if (typeof enable === 'function') {
    enable(true);
  }
}
