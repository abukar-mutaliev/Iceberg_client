/* fonts */
export const FontFamily = {
    address: __DEV__ ? "SF Pro Text" : "System",
    sFProText: __DEV__ ? "SF Pro Text" : "System",
    robotoMedium: __DEV__ ? "Roboto-Medium" : "System",
    sFPro: __DEV__ ? "SF Pro" : "System",
    montserratMedium: __DEV__ ? "Montserrat-Medium" : "System",
    montserratSemiBold: __DEV__ ? "Montserrat-SemiBold" : "System",
    SFProDisplay: __DEV__ ? "SF Pro Display" : "System",
    sFProDisplay: __DEV__ ? "SF Pro Display" : "System",
    SFProDisplayMedium: __DEV__ ? "SF Pro Display-Medium" : "System",
    regular: __DEV__ ? "SF Pro Text" : "System",
    medium: __DEV__ ? "SF Pro Text-Medium" : "System",
    bold: __DEV__ ? "SF Pro Text-Bold" : "System",
};

/* font sizes */
export const FontSize = {
    size_5xs: 8,
    size_xs: 12,
    size_sm: 14,
    size_md: 16,
    size_lg: 18,
    size_xl: 20,
    size_3xl: 22,
    xxxlarge: 24,
};

/* Colors */
export const Color = {
    colorLightMode: "#FFFFFF",
    colorDarkgray: "rgba(152, 152, 152, 0.6)",
    colorGray_100: "#101010",
    colorDarkMode: "#000000",
    blue2: "rgba(106, 90, 224, 1)",
    categoriesIconBlue: "rgba(0, 12, 255, 1)",
    colorBlue: "#5e00ff",
    colorLightgray_100: "#D1D1D6",
    colorLightgray: "#d7d7d7",
    colorGainsboro: "#e5e5e5",
    colorLavender: "#e6ebff",
    grey7D7D7D: "#7d7d7d",
    purpleSoft: "#6a5ae0",
    purpleLight: "rgba(51, 57, 176, 0.05)",
    blue3: "#000CFF",
    blue250: "rgba(51, 57, 176, 0.5)",
    colorSilver_100: "#919191",
    gray: "#bebebe",
    colorCornflowerblue: "#7074c8",
    grayDarker: "#86868a",
    red: "#ef0004",
    activeBlue: "rgba(195, 223, 250, 1)",
    primary: "#3339B0",
    secondary: "#F2F2F7",
    error: "#FF3B30",
    success: "#34C759",
    warning: "#FFCC00",
    orange: "#fd7e14",
    textPrimary: "#000000",
    textSecondary: "#666666",
    background: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E5EA",
    dark: "#000000"
};

/* Gaps */
export const Gap = {
    gap_md: 8,
    gap_0: 0,
    gap_lg: 10,
    small: 8,
    medium: 16,
    large: 24,
};

/* Paddings */
export const Padding = {
    p_9xs: 4,
    p_xl: 20,
    p_3xs: 10,
    p_2xl: 21,
    p_12xl: 31,
    small: 8,
    medium: 16,
    large: 24,
};

/* border radiuses */
export const Border = {
    br_base: 16,
    br_3xs: 10,
    br_sm: 15,
    br_xl: 20,
    br_lg: 18,
    br_3xl: 22,
    radius: {
        small: 4,
        medium: 8,
        large: 12,
        xlarge: 16,
    },
    width: {
        thin: 0.5,
        normal: 1,
        thick: 2,
    },
};

/* Размеры экрана */
export const ScreenDimensions = {
    width: '100%',
    height: '100%',
    screenWidth: (size) => `${size}%`,
    screenHeight: (size) => `${size}%`,
};

/* Тени */
export const Shadow = {
    default: {
        shadowColor: "rgba(51, 57, 176, 0.05)",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    button: {
        shadowColor: "rgba(51, 57, 176, 0.1)",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 6,
    },
    card: {
        shadowColor: "rgba(51, 57, 176, 0.05)",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
    },
    light: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    heavy: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
};

/* Общие стили для компонентов */
export const CommonStyles = {
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    flexRow: {
        flexDirection: 'row',
    },
    flexColumn: {
        flexDirection: 'column',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    spaceBetween: {
        justifyContent: 'space-between',
    },
    textBase: {
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
    },
    textTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_3xl,
        fontWeight: '600',
        color: Color.purpleSoft,
    },
    textBody: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        color: Color.dark,
    },
    textCaption: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        color: Color.colorSilver_100,
    },
    buttonPrimary: {
        backgroundColor: Color.purpleSoft,
        borderRadius: Border.br_xl,
        paddingVertical: Padding.p_3xs,
        paddingHorizontal: Padding.p_xl,
        ...Shadow.button,
    },
    buttonSecondary: {
        backgroundColor: Color.colorLightMode,
        borderColor: Color.purpleSoft,
        borderWidth: 1,
        borderRadius: Border.br_xl,
        paddingVertical: Padding.p_3xs,
        paddingHorizontal: Padding.p_xl,
    },
    roundedBox: {
        borderRadius: Border.br_xl,
        backgroundColor: Color.colorLightMode,
        ...Shadow.default,
    },
    // Новые стили
    addressText: {
        fontSize: FontSize.size_lg,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        letterSpacing: 0.9,
    },
    timeText: {
        fontSize: FontSize.size_md,
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProDisplay,
        letterSpacing: 0.9,
    },
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingLeft: 36,
        height: 60,
        borderBottomWidth: 0.5,
        borderBottomColor: Color.colorLavender,
        backgroundColor: Color.colorLightMode
    },
    activeLocationItem: {
        backgroundColor: Color.activeBlue,
    },
};

/* Параметры анимаций */
export const Animation = {
    default: {
        duration: 300,
        easing: 'ease',
    },
    fast: {
        duration: 150,
        easing: 'ease-out',
    },
    slow: {
        duration: 500,
        easing: 'ease-in-out',
    },
};

/* Адаптивные размеры */
export const Responsive = {
    fontScale: (size) => size,
    scale: (size) => size,
};

export default {
    FontFamily,
    FontSize,
    Color,
    Gap,
    Padding,
    Border,
    ScreenDimensions,
    Shadow,
    CommonStyles,
    Animation,
    Responsive,
};