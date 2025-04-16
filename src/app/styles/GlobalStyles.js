/* fonts */
export const FontFamily = {
    addres: "Inter-Medium",
    sFProText: "SF Pro Text",
    robotoMedium: "Roboto-Medium",
    sFPro: "SF Pro",
    montserratMedium: "Montserrat-Medium",
    montserratSemiBold: "Montserrat-SemiBold",
    SFProDisplay: "SF Pro Display",
    SFProDisplayMedium: "SFProDisplayMedium",
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
};

/* Colors */
export const Color = {
    colorLightMode: "#fff",
    dark: "#000",
    blue2: "#3339b0",
    categoriesIconBlue: "rgba(0, 12, 255, 1)",
    colorBlue: "#5e00ff",
    colorLightgray_100: "#d7d7d7",
    purpleSoft: "#6a5ae0",
    blue3: "#000CFF",
    blue250: "rgba(51, 57, 176, 0.5)",
    colorSilver_100: "#c2c2c2",
    gray: "#bebebe",
    colorCornflowerblue: "#7074c8",
    grayDarker: "#86868a",

};

/* Gaps */
export const Gap = {
    gap_md: 8,
    gap_0: 0,
    gap_lg: 10,
};

/* Paddings */
export const Padding = {
    p_9xs: 4,
    p_xl: 20,
    p_3xs: 10,
    p_2xl: 21,
    p_12xl: 31,
};

/* border radiuses */
export const Border = {
    br_base: 16,
    br_3xs: 10,
    br_sm: 15,
    br_xl: 20,
    br_lg: 18,
    br_3xl: 22,
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