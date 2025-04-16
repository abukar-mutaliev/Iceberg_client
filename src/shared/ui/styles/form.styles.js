import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const isSmallDevice = height < 700;
const isLargeDevice = height > 800;

const adaptiveSize = (baseSize) => {
    if (isSmallDevice) return baseSize * 0.85;
    if (isLargeDevice) return baseSize * 1.1;
    return baseSize;
};

export const formStyles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: adaptiveSize(30),
    },

    inputContainer: {
        marginBottom: adaptiveSize(15),
    },
    inputLabel: {
        fontSize: adaptiveSize(14),
        color: '#888',
        marginBottom: 6,
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    input: {
        height: adaptiveSize(50),
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 15,
        fontSize: adaptiveSize(16),
        color: '#000',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        borderColor: '#E5E5E5',
        borderWidth: 1,
    },
    inputFocused: {
        borderColor: '#000cff',
        borderWidth: 1,
    },
    inputError: {
        borderColor: '#FF3B30',
        borderWidth: 1,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: adaptiveSize(12),
        marginTop: 4,
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },

    button: {
        backgroundColor: '#000CFF',
        height: adaptiveSize(56),
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: adaptiveSize(20),
    },
    buttonDisabled: {
        backgroundColor: '#D1D1D6',
    },
    buttonText: {
        color: '#FFF',
        fontSize: adaptiveSize(16),
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    buttonTextDisabled: {
        color: '#8E8E93',
    },

    forgotPassword: {
        marginTop: 10,
        alignSelf: 'flex-end',
    },
    forgotPasswordText: {
        color: '#000CFF',
        fontSize: adaptiveSize(14),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },

    verificationContainer: {
        alignItems: 'center',
        paddingTop: adaptiveSize(40),
    },
    verificationTitle: {
        fontSize: adaptiveSize(20),
        fontWeight: '600',
        marginBottom: adaptiveSize(8),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    verificationSubtitle: {
        fontSize: adaptiveSize(14),
        color: '#666',
        marginBottom: adaptiveSize(30),
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: adaptiveSize(40),
        width: '100%',
        paddingHorizontal: 20,
    },
    codeInput: {
        width: adaptiveSize(50),
        height: adaptiveSize(60),
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        textAlign: 'center',
        fontSize: adaptiveSize(24),
        borderColor: '#E5E5E5',
        borderWidth: 1,
    },

    keyboardAvoidingView: {
        flex: 1,
    },
});