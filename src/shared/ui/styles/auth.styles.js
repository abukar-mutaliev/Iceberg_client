import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const baseStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 40,
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',

    },
    backIcon: {
        width: 17,
        height: 17,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',

    },
    statusText: {
        fontFamily: 'SFProText',
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginRight: 10,
    },
    statusIcon: {
        width: 15,
        height: 11,
        marginHorizontal: 5,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: '#FFFFFF',

    },
    logo: {
        width: 89,
        height: 77,
        marginBottom: 10,
    },
    logoText: {
        fontFamily: 'Montserrat-Medium',
        fontSize: 31,
        fontWeight: '500',
        color: '#3339b0',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },
    tab: {
        marginHorizontal: 20,
    },
    tabText: {
        fontFamily: 'SFProText',
        fontSize: 17,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#000',
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        paddingBottom: 5,
    },
    inactiveTabText: {
        color: '#3339b0',
        borderBottomWidth: 2,
        borderBottomColor: '#3339b0',
        paddingBottom: 5,
    },
    input: {
        width: '100%',
        height: 57,
        fontFamily: 'SFProText',
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 10,
        marginBottom: 40,
        backgroundColor: '#FDFFFE',
    },
    inputPlaceholder: {
        fontFamily: 'SFProText',
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        opacity: 0.4,
        marginBottom: 5,
        backgroundColor: '#FDFFFE',
    },
    button: {
        backgroundColor: '#000cff',
        borderRadius: 30,
        width: width * 0.8,
        height: 70,
        paddingHorizontal: 20,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    buttonDisabled: {
        backgroundColor: '#d3d3d3',
    },
    buttonText: {
        fontFamily: 'SFProText',
        fontSize: 17,
        fontWeight: '500',
        lineHeight: 17,
        textTransform: 'uppercase',
        color: '#fff',
        textAlign: 'center',
    },
    linkButton: {
        marginTop: 20,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkText: {
        fontFamily: 'SFProText',
        fontSize: 17,
        color: '#3339b0',
        fontWeight: '600',
        textAlign: 'center',
    },
    scrollContainer: {
        width: '100%',
    }
});