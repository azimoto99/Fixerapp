declare namespace google.maps.places {
  interface PlaceResult {
    address_components?: GeocoderAddressComponent[];
    formatted_address?: string;
    geometry?: {
      location?: LatLng;
      viewport?: LatLngBounds;
    };
    place_id?: string;
    types?: string[];
    name?: string;
  }

  class Autocomplete {
    constructor(inputElement: HTMLInputElement, options?: AutocompleteOptions);
    addListener(eventName: string, handler: Function): MapsEventListener;
    getPlace(): PlaceResult;
  }

  interface AutocompleteOptions {
    bounds?: LatLngBounds | LatLngBoundsLiteral;
    componentRestrictions?: ComponentRestrictions;
    fields?: string[];
    strictBounds?: boolean;
    types?: string[];
  }

  interface ComponentRestrictions {
    country: string | string[];
  }
}

declare namespace google.maps {
  class MapsEventListener {
    remove(): void;
  }

  class LatLng {
    constructor(lat: number, lng: number, noWrap?: boolean);
    lat(): number;
    lng(): number;
    toString(): string;
    equals(other: LatLng): boolean;
  }

  class LatLngBounds {
    constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
    contains(latLng: LatLng | LatLngLiteral): boolean;
    extend(point: LatLng | LatLngLiteral): LatLngBounds;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface LatLngBoundsLiteral {
    east: number;
    north: number;
    south: number;
    west: number;
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  namespace event {
    function clearInstanceListeners(instance: Object): void;
  }
}