import { RequestHandler } from 'express';
import helmet from 'helmet';

export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        "https://js.stripe.com",
        "https://api.stripe.com",
        "https://api.mapbox.com",
        "https://accounts.google.com"
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://connect.stripe.com"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://api.mapbox.com",
        "wss://localhost:*",
        "ws://localhost:*"
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
      manifestSrc: ["'self'"],
      childSrc: ["'self'", "blob:", "https://js.stripe.com"],
      workerSrc: ["'self'", "blob:", "https://js.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});
