import * as Device from 'expo-device';

/**
 * Device-specific keyboard gap for chat composer.
 *
 * Why: some Samsung firmwares (observed on S25 Ultra, production build) report/handle IME insets
 * in a way that leaves the composer visually lower than intended. We add a small extra margin
 * ONLY on that device model, ONLY when keyboard is visible.
 */
export function getChatKeyboardGapPx({ keyboardHeight } = {}) {
  const brand = String(Device.brand || '').toLowerCase();
  const modelName = String(Device.modelName || '');

  const isSamsung = brand.includes('samsung');
  const isS25Ultra = modelName.toLowerCase().includes('s25') && modelName.toLowerCase().includes('ultra');

  if (isSamsung && isS25Ultra) {
    // Tuned for Samsung Keyboard, portrait, production build.
    // Some firmwares misreport IME insets; we add an extra margin above the keyboard.
    // Use a minimum value + optional proportional component from actual keyboard height.
    const h = Number(keyboardHeight) || 0;
    const dynamic = h > 0 ? Math.round(h * 0.12) : 0; // ~12% of keyboard height
    return Math.max(90, dynamic);
  }

  return 0;
}


