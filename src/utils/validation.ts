import { Alert } from 'react-native';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const NAME_REGEX = /^[^0-9]*$/; // No numbers allowed

export type ValidationResult = {
    isValid: boolean;
    message?: string;
};

export const validateEmail = (email: string): ValidationResult => {
    if (!email.trim()) {
        return { isValid: false, message: 'Email address is required.' };
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        return { isValid: false, message: 'Please enter a valid email address (e.g., name@example.com).' };
    }
    return { isValid: true };
};

export const validatePhone = (phone: string, isOptional = false): ValidationResult => {
    const digits = phone.replace(/\D/g, '');
    if (!digits && isOptional) return { isValid: true };
    
    if (!digits) {
        return { isValid: false, message: 'Phone number is required.' };
    }
    if (!PHONE_REGEX.test(digits)) {
        return { isValid: false, message: 'Phone number must be 10 digits and start with 6-9.' };
    }
    return { isValid: true };
};

export const validateName = (name: string, label = 'Name'): ValidationResult => {
    const trimmedName = name.trim();
    if (!trimmedName) {
        return { isValid: false, message: `${label} is required.` };
    }
    if (!NAME_REGEX.test(trimmedName)) {
        return { isValid: false, message: `${label} cannot contain numbers.` };
    }
    if (trimmedName.length < 2) {
        return { isValid: false, message: `${label} must be at least 2 characters long.` };
    }
    return { isValid: true };
};

export const showAlert = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
};
