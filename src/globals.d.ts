// QWIK_VERSION is injected at build time via tsdown define (EB-05).
// At runtime via tsx (test mode), it is undefined — caught by try/catch in version command.
declare const QWIK_VERSION: string;
