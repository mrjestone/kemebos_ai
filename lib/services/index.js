// Picks the implementation once. NEXT_PUBLIC_USE_MOCK=true -> offline mock demo.
import * as mock from "./mock";
import * as real from "./real";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const impl = USE_MOCK ? mock : real;

export const warmup = impl.warmup;
export const auth = impl.auth;
export const admin = impl.admin;
export const chatStream = impl.chatStream;
export const ApiError = impl.ApiError;
