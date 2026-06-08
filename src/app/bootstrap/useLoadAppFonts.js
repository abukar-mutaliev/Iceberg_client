import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

export const useLoadAppFonts = () => {
    const [fontsReady, setFontsReady] = useState(false);

    useEffect(() => {
        async function loadFonts() {
            try {
                const fontMap = {};

                try {
                    const bezierSans = require('../../assets/fonts/BezierSans_Regular.ttf');
                    if (bezierSans !== undefined && bezierSans !== null && bezierSans !== 'undefined') {
                        const font = bezierSans.default || bezierSans;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['BezierSans'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ BezierSans font not found (non-critical):', e?.message || e);
                }

                try {
                    const sfProText = require('../../assets/fonts/SFProText-Regular.ttf');
                    if (sfProText !== undefined && sfProText !== null && sfProText !== 'undefined') {
                        const font = sfProText.default || sfProText;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['SFProText'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ SFProText font not found (non-critical):', e?.message || e);
                }

                try {
                    const sfProDisplay = require('../../assets/fonts/SF-Pro-Display-Regular.otf');
                    if (sfProDisplay !== undefined && sfProDisplay !== null && sfProDisplay !== 'undefined') {
                        const font = sfProDisplay.default || sfProDisplay;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['SF Pro Display'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ SF Pro Display font not found (non-critical):', e?.message || e);
                }

                try {
                    const sfProDisplayMedium = require('../../assets/fonts/SF-Pro-Display-Medium.otf');
                    if (sfProDisplayMedium !== undefined && sfProDisplayMedium !== null && sfProDisplayMedium !== 'undefined') {
                        const font = sfProDisplayMedium.default || sfProDisplayMedium;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['SFProDisplayMedium'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ SFProDisplayMedium font not found (non-critical):', e?.message || e);
                }

                const validFonts = Object.keys(fontMap).filter(key => {
                    const font = fontMap[key];
                    if (font === undefined || font === null) return false;
                    if (typeof font === 'string' && font === 'undefined') return false;
                    return true;
                });

                if (validFonts.length > 0 && Font && typeof Font.loadAsync === 'function') {
                    try {
                        const validFontMap = {};
                        validFonts.forEach(key => {
                            const font = fontMap[key];
                            if (font !== undefined && font !== null && font !== 'undefined') {
                                validFontMap[key] = font;
                            }
                        });

                        const finalValidFonts = Object.keys(validFontMap);
                        if (finalValidFonts.length > 0) {
                            await Font.loadAsync(validFontMap);
                            console.log(`✅ App: ${finalValidFonts.length} font(s) loaded`);
                        }
                    } catch (fontLoadError) {
                        console.error('❌ App: Font.loadAsync error (non-critical):', fontLoadError);
                    }
                }
            } catch (e) {
                console.error('❌ App: Font loading error (non-critical):', e);
            } finally {
                setFontsReady(true);
            }
        }

        loadFonts().catch(err => {
            console.error('❌ App: Unexpected error in loadFonts (non-critical):', err);
            setFontsReady(true);
        });
    }, []);

    return fontsReady;
};
