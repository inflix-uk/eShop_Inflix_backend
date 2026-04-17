import { Errors, User, ShippingInformation } from '../../../../../types';
import { toast } from 'react-toastify';
import { api, RegisterRequest } from '../api';

export interface LoginResponse {
  status: number;
  user: User;
  message?: string;
}

export interface RegisterResponse {
  status: number;
  message: string;
  user?: User;
}

export class AuthService {
  static init(): AuthService {
    return new AuthService();
  }

  async login(email: string, password: string): Promise<LoginResponse | false> {
    const errors = this.validateLoginInput(email, password);
    if (errors.email || errors.password) {
      throw new Error('Validation failed');
    }

    try {
      const response = await api.login({ email, password });

      if (response.status === 201) {
        return response;
      } else {
        // Return the response with error message (e.g., "Invalid password")
        return response;
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      // Return error message from API response
      if (error.response?.data?.message) {
        return {
          status: error.response.status || 401,
          message: error.response.data.message,
          user: {} as any
        };
      }
      return false;
    }
  }

  async register(
    email: string,
    password: string,
    confirmPassword: string,
    shippingInformation: ShippingInformation
  ): Promise<RegisterResponse | false> {
    const errors = this.validateRegistrationInput(
      email,
      password,
      confirmPassword,
      shippingInformation
    );

    if (this.hasValidationErrors(errors)) {
      throw new Error('Validation failed');
    }

    try {
      const {
        firstName,
        lastName,
        companyName,
        phoneNumber,
        address,
        apartment,
        country,
        city,
        county,
        postalCode,
      } = shippingInformation;

      const registerData: RegisterRequest = {
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        companyname: companyName,
        address: {
          address,
          apartment,
          country,
          city,
          county,
          postalCode,
        },
      };

      const response = await api.register(registerData);

      if (response.status === 201) {
        toast.success('Registration successful!');
        return response;
      } else {
        // Return the response with error message (e.g., "Email already exists")
        return response;
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // Return error message from API response
      if (error.response?.data?.message) {
        return {
          status: error.response.status || 400,
          message: error.response.data.message
        };
      }
      return false;
    }
  }

  validateLoginInput(email: string, password: string): Partial<Errors> {
    const errors: Partial<Errors> = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = 'Enter a valid email address';
    }

    if (!password || password.length < 4) {
      errors.password = 'Password must be at least 4 characters long';
    }

    return errors;
  }

  validateRegistrationInput(
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = 'Enter a valid email address';
    }

    // Name validation
    const nameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)?$/;
    if (!shippingInformation.firstName || !nameRegex.test(shippingInformation.firstName)) {
      errors.firstName = 'Enter a valid first name (letters only)';
    }
    if (!shippingInformation.lastName || !nameRegex.test(shippingInformation.lastName)) {
      errors.lastName = 'Enter a valid last name (letters only)';
    }

    // Phone validation
    const phoneRegex = /^(?:0|\+?44)(?:\d\s?){9,10}$/;
    if (!shippingInformation.phoneNumber || !phoneRegex.test(shippingInformation.phoneNumber)) {
      errors.phoneNumber = 'Enter a valid UK phone number';
    }

    // Address validation
    if (!shippingInformation.address || shippingInformation.address.trim().length === 0) {
      errors.address = 'Enter a valid address';
    }

    // City validation
    const cityRegex = /^[a-zA-Z\s\-]+$/;
    if (!shippingInformation.city || !cityRegex.test(shippingInformation.city) || shippingInformation.city.length < 2) {
      errors.city = 'Enter a valid city name (letters, spaces, and hyphens only)';
    }

    // Postal code validation
    const postalCodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})$/i;
    if (!shippingInformation.postalCode || !postalCodeRegex.test(shippingInformation.postalCode)) {
      errors.postalCode = 'Enter a valid UK postal code';
    }

    // Password validation
    if (!password || password.length < 4) {
      errors.password = 'Password must be at least 4 characters long';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  }

  private hasValidationErrors(errors: Errors): boolean {
    return Object.values(errors).some((error) => error !== '');
  }
}