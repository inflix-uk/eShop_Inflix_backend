import { Errors, ShippingInformation } from '../../../../../types';

export class ValidationService {
  // Email validation regex
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Name validation regex (letters and spaces only)
  private static readonly NAME_REGEX = /^[a-zA-Z]+(?: [a-zA-Z]+)?$/;

  // UK phone number regex
  private static readonly UK_PHONE_REGEX = /^(?:0|\+?44)(?:\d\s?){9,10}$/;

  // City validation regex
  private static readonly CITY_REGEX = /^[a-zA-Z\s\-]+$/;

  // UK postal code regex
  private static readonly UK_POSTAL_CODE_REGEX = /^([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})$/i;

  static validateEmail(email: string): string {
    if (!email || !this.EMAIL_REGEX.test(email)) {
      return 'Enter a valid email address';
    }
    return '';
  }

  static validatePassword(password: string, minLength: number = 4): string {
    if (!password || password.length < minLength) {
      return `Password must be at least ${minLength} characters long`;
    }
    return '';
  }

  static validateConfirmPassword(password: string, confirmPassword: string): string {
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  }

  static validateName(name: string, fieldName: string): string {
    if (!name || !this.NAME_REGEX.test(name)) {
      return `Enter a valid ${fieldName} (letters only)`;
    }
    return '';
  }

  static validatePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) {
      return 'Phone number is required';
    }
    if (!this.UK_PHONE_REGEX.test(phoneNumber)) {
      return 'Enter a valid UK phone number (e.g., 07123456789 or +447123456789)';
    }
    return '';
  }

  static validateAddress(address: string): string {
    if (!address || address.trim().length === 0) {
      return 'Enter a valid address';
    }
    return '';
  }

  static validateCity(city: string): string {
    if (!city || !this.CITY_REGEX.test(city) || city.length < 2) {
      return 'Enter a valid city name (letters, spaces, and hyphens only)';
    }
    return '';
  }

  static validatePostalCode(postalCode: string): string {
    if (!postalCode || !this.UK_POSTAL_CODE_REGEX.test(postalCode)) {
      return 'Enter a valid UK postal code';
    }
    return '';
  }

  static validateLoginForm(email: string, password: string): Partial<Errors> {
    const errors: Partial<Errors> = {};

    const emailError = this.validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = this.validatePassword(password);
    if (passwordError) errors.password = passwordError;

    return errors;
  }

  static validateRegistrationForm(
    email: string,
    password: string,
    confirmPassword: string,
    shippingInformation: ShippingInformation
  ): Errors {
    const errors: Errors = {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      password: '',
      county: '',
      confirmPassword: '',
      email: '',
    };

    // Email validation
    errors.email = this.validateEmail(email);

    // Name validation
    errors.firstName = this.validateName(shippingInformation.firstName, 'first name');
    errors.lastName = this.validateName(shippingInformation.lastName, 'last name');

    // Phone validation
    errors.phoneNumber = this.validatePhoneNumber(shippingInformation.phoneNumber);

    // Address validation
    errors.address = this.validateAddress(shippingInformation.address);

    // City validation
    errors.city = this.validateCity(shippingInformation.city);

    // Postal code validation
    errors.postalCode = this.validatePostalCode(shippingInformation.postalCode);

    // Password validation
    errors.password = this.validatePassword(password);
    if (!errors.password) {
      errors.confirmPassword = this.validateConfirmPassword(password, confirmPassword);
    }

    return errors;
  }

  static validateShippingInformation(shippingInformation: ShippingInformation): Partial<Errors> {
    const errors: Partial<Errors> = {};

    const firstNameError = this.validateName(shippingInformation.firstName, 'first name');
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = this.validateName(shippingInformation.lastName, 'last name');
    if (lastNameError) errors.lastName = lastNameError;

    const phoneError = this.validatePhoneNumber(shippingInformation.phoneNumber);
    if (phoneError) errors.phoneNumber = phoneError;

    const addressError = this.validateAddress(shippingInformation.address);
    if (addressError) errors.address = addressError;

    const postalCodeError = this.validatePostalCode(shippingInformation.postalCode);
    if (postalCodeError) errors.postalCode = postalCodeError;

    return errors;
  }

  static hasValidationErrors(errors: Partial<Errors>): boolean {
    return Object.values(errors).some((error) => error !== '');
  }

  static validateEmailAndUserId(email: string, userId: string): boolean {
    return !!(
      email &&
      email.trim() !== '' &&
      email.includes('@') &&
      userId &&
      userId.trim() !== ''
    );
  }

  static validateCartData(cartData: any[]): boolean {
    return cartData && Array.isArray(cartData) && cartData.length > 0;
  }

  static validateTermsAccepted(isChecked: boolean): string {
    if (!isChecked) {
      return 'Please accept the terms and conditions';
    }
    return '';
  }

  // Helper method to get clean errors object
  static getCleanErrors(): Errors {
    return {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      password: '',
      county: '',
      confirmPassword: '',
      email: '',
    };
  }
}