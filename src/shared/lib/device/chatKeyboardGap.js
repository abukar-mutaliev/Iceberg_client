import * as Device from 'expo-device';

/**
 * Device-specific keyboard gap for chat composer.
 *
 * Some Android vendors misreport / incorrectly handle IME insets, leaving the
 * composer visually lower than intended.  We compensate with a small extra
 * margin ONLY when the keyboard is visible.
 *
 * @param {number}      keyboardHeight — reported keyboard height
 * @param {string|null} brand          — pre-detected brand key (from useChatKeyboard)
 */
export function getChatKeyboardGapPx({ keyboardHeight, brand: detectedBrand } = {}) {
  const brand = detectedBrand ?? String(Device.brand || '').toLowerCase();
  const modelName = String(Device.modelName || '').toLowerCase();

  // Samsung S25 Ultra — tuned value (firmware misreports IME insets)
  if (brand === 'samsung') {
    const isS25Ultra = modelName.includes('s25') && modelName.includes('ultra');
    if (isS25Ultra) {
      const h = Number(keyboardHeight) || 0;
      const dynamic = h > 0 ? Math.round(h * 0.08) : 0;
      return Math.max(40, dynamic);
    }
    return 0;
  }

  // Chinese OEMs — conservative gap; many ROMs leave a thin strip between
  // the composer and the keyboard because adjustResize overshoots / undershoots.
  const chineseBrands = [
    'xiaomi', 'redmi', 'poco',
    'huawei', 'honor',
    'oppo', 'vivo', 'realme',
    'oneplus', 'meizu', 'zte',
    'tecno', 'infinix', 'itel',
  ];
  if (chineseBrands.some(b => brand.includes(b))) {
    const h = Number(keyboardHeight) || 0;
    if (h > 0) {
      const dynamic = Math.round(h * 0.04);
      return Math.max(8, dynamic);
    }
    return 0;
  }

  return 0;
}


