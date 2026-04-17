import axios from 'axios';

export interface PostcodeValidationResult {
  valid: boolean;
  formatted?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  administrativeAreas?: {
    country: string;
    region: string;
    adminDistrict: string;
    adminCounty?: string;
  };
}

export interface AddressLookupResult {
  line_1: string;
  line_2?: string;
  line_3?: string;
  town_or_city: string;
  county: string;
  district?: string;
  country: string;
}

export interface AddressLookupResponse {
  addresses: AddressLookupResult[];
  success: boolean;
  message?: string;
}

export interface AutocompleteSuggestion {
  address: string;
  url: string;
  id: string;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

export interface GetAddressResult {
  postcode: string;
  latitude: number;
  longitude: number;
  formatted_address: string[];
  thoroughfare: string;
  building_name: string;
  sub_building_name: string;
  sub_building_number: string;
  building_number: string;
  line_1: string;
  line_2: string;
  line_3: string;
  line_4: string;
  locality: string;
  town_or_city: string;
  county: string;
  district: string;
  country: string;
  residential: boolean;
}

export class AddressService {
  private static readonly POSTCODES_IO_BASE = 'https://api.postcodes.io';
  private static readonly GETADDRESS_BASE = 'https://api.getAddress.io';
  private getAddressApiKey: string | null = null;
  private domainToken: string | null = null;

  constructor(getAddressApiKey?: string, domainToken?: string) {
    this.getAddressApiKey = getAddressApiKey || process.env.NEXT_PUBLIC_GETADDRESS_API_KEY || null;
    this.domainToken = domainToken || process.env.NEXT_PUBLIC_GETADDRESS_DOMAIN_TOKEN || null;
  }

  static init(getAddressApiKey?: string, domainToken?: string): AddressService {
    return new AddressService(getAddressApiKey, domainToken);
  }

  /**
   * Get the appropriate API key or domain token for requests
   */
  private getApiCredential(): string | null {
    // Prefer domain token for browser security, fallback to API key
    return this.domainToken || this.getAddressApiKey;
  }

  /**
   * Validate UK postcode using postcodes.io (free service)
   */
  async validatePostcode(postcode: string): Promise<PostcodeValidationResult> {
    try {
      const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();

      const response = await axios.get(
        `${AddressService.POSTCODES_IO_BASE}/postcodes/${cleanPostcode}/validate`
      );

      if (response.data.result) {
        // Get additional postcode information
        const infoResponse = await axios.get(
          `${AddressService.POSTCODES_IO_BASE}/postcodes/${cleanPostcode}`
        );

        if (infoResponse.data.status === 200) {
          const data = infoResponse.data.result;
          return {
            valid: true,
            formatted: this.formatPostcode(cleanPostcode),
            coordinates: {
              latitude: data.latitude,
              longitude: data.longitude,
            },
            administrativeAreas: {
              country: data.country,
              region: data.region,
              adminDistrict: data.admin_district,
              adminCounty: data.admin_county,
            },
          };
        }
      }

      return { valid: response.data.result };
    } catch (error) {
      console.error('Postcode validation failed:', error);
      return { valid: false };
    }
  }

  /**
   * Lookup addresses by postcode using GetAddress.io
   */
  async lookupAddressByPostcode(postcode: string): Promise<AddressLookupResponse> {
    if (!this.getAddressApiKey) {
      return {
        addresses: [],
        success: false,
        message: 'GetAddress API key not configured',
      };
    }

    try {
      const cleanPostcode = postcode.replace(/\s+/g, '');

      const response = await axios.get(
        `https://api.getAddress.io/find/${cleanPostcode}`,
        {
          headers: {
            'api-key': this.getAddressApiKey,
          },
        }
      );

      if (response.data && response.data.addresses) {
        const addresses: AddressLookupResult[] = response.data.addresses.map((addr: string) => {
          const parts = addr.split(', ');
          return {
            line_1: parts[0] || '',
            line_2: parts[1] || '',
            line_3: parts[2] || '',
            town_or_city: parts[parts.length - 3] || '',
            county: parts[parts.length - 2] || '',
            country: 'United Kingdom',
          };
        });

        return {
          addresses,
          success: true,
        };
      }

      return {
        addresses: [],
        success: false,
        message: 'No addresses found for this postcode',
      };
    } catch (error: any) {
      console.error('Address lookup failed:', error);

      let message = 'Address lookup failed';
      if (error.response?.status === 401) {
        message = 'Invalid API key';
      } else if (error.response?.status === 404) {
        message = 'Postcode not found';
      } else if (error.response?.status === 429) {
        message = 'Too many requests. Please try again later.';
      }

      return {
        addresses: [],
        success: false,
        message,
      };
    }
  }

  /**
   * Get autocomplete suggestions using GetAddress.io
   */
  async getAutocompleteSuggestions(
    term: string,
    options: {
      top?: number;
      filter?: {
        county?: string;
        town_or_city?: string;
        postcode?: string;
        residential?: boolean;
      };
      location?: {
        latitude: number;
        longitude: number;
      };
    } = {}
  ): Promise<AutocompleteSuggestion[]> {
    const credential = this.getApiCredential();
    if (!credential) {
      console.warn('GetAddress API key or domain token not configured');
      return [];
    }

    if (term.length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        'api-key': credential,
        top: (options.top || 6).toString(),
      });

      const requestBody: any = {};

      if (options.filter) {
        requestBody.filter = options.filter;
      }

      if (options.location) {
        requestBody.location = options.location;
      }

      const url = `${AddressService.GETADDRESS_BASE}/autocomplete/${encodeURIComponent(term)}?${params}`;

      const response = await fetch(url, {
        method: Object.keys(requestBody).length > 0 ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Autocomplete failed: ${response.statusText}`);
      }

      const data: AutocompleteResponse = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Autocomplete failed:', error);
      return [];
    }
  }

  /**
   * Get full address details by suggestion ID
   */
  async getAddressById(id: string): Promise<GetAddressResult | null> {
    const credential = this.getApiCredential();
    if (!credential) {
      console.warn('GetAddress API key or domain token not configured');
      return null;
    }

    try {
      const response = await fetch(
        `${AddressService.GETADDRESS_BASE}/get/${id}?api-key=${credential}`
      );

      if (!response.ok) {
        throw new Error(`Get address failed: ${response.statusText}`);
      }

      const data: GetAddressResult = await response.json();
      return data;
    } catch (error) {
      console.error('Get address failed:', error);
      return null;
    }
  }

  /**
   * Validate if a string looks like a UK postcode
   */
  isValidPostcodeFormat(postcode: string): boolean {
    // UK postcode regex pattern
    const ukPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
    return ukPostcodeRegex.test(postcode.trim());
  }

  /**
   * Format postcode to standard UK format (e.g., "SW1A 1AA")
   */
  private formatPostcode(postcode: string): string {
    const clean = postcode.replace(/\s+/g, '').toUpperCase();

    if (clean.length === 5) {
      return `${clean.slice(0, 2)} ${clean.slice(2)}`;
    } else if (clean.length === 6) {
      return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    } else if (clean.length === 7) {
      return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    }

    return clean;
  }

  /**
   * Parse address components for form population
   */
  parseAddressComponents(addressLine: string) {
    const parts = addressLine.split(', ');

    return {
      line1: parts[0] || '',
      line2: parts[1] || '',
      town: parts[parts.length - 3] || '',
      county: parts[parts.length - 2] || '',
      postcode: parts[parts.length - 1] || '',
    };
  }
}