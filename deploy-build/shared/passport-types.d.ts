declare module 'passport-google-oauth20' {
  import { Request } from 'express';
  import * as passport from 'passport';

  export interface Profile {
    id: string;
    displayName: string;
    name?: {
      familyName: string;
      givenName: string;
      middleName?: string;
    };
    emails?: Array<{ value: string; type?: string }>;
    photos?: Array<{ value: string }>;
    provider: string;
    _json?: any;
    _raw?: string;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    passReqToCallback?: boolean;
    scope?: string[];
    session?: boolean;
  }

  export type VerifyCallback = (
    error: Error | null,
    user?: any,
    info?: any
  ) => void;

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ) => void | Promise<void>;

  export type VerifyFunctionWithRequest = (
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ) => void | Promise<void>;

  export class Strategy implements passport.Strategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyFunction | VerifyFunctionWithRequest
    );
    name: string;
    authenticate(req: Request, options?: any): void;
  }
}

declare module 'passport-facebook' {
  import { Request } from 'express';
  import * as passport from 'passport';

  export interface Profile {
    id: string;
    displayName: string;
    name?: {
      familyName: string;
      givenName: string;
      middleName?: string;
    };
    emails?: Array<{ value: string; type?: string }>;
    photos?: Array<{ value: string }>;
    provider: string;
    _json?: any;
    _raw?: string;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    profileFields?: string[];
    passReqToCallback?: boolean;
    scope?: string[];
    session?: boolean;
  }

  export type VerifyCallback = (
    error: Error | null,
    user?: any,
    info?: any
  ) => void;

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ) => void | Promise<void>;

  export type VerifyFunctionWithRequest = (
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ) => void | Promise<void>;

  export class Strategy implements passport.Strategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyFunction | VerifyFunctionWithRequest
    );
    name: string;
    authenticate(req: Request, options?: any): void;
  }
}