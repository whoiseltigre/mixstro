/** Only these paths may be returned to after sign-in: a shared opening (/o/<id>), nothing else. */
export const RETURN_COOKIE = "mx_return";
export const isReturnPath = (p: string | undefined | null): p is string => Boolean(p && /^\/o\/\d{1,18}$/.test(p));
