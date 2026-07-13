function disabledDrizzleCall(): never {
  throw new Error('Cloud database query helpers are disabled in the SPICE local runtime.');
}

export const and = disabledDrizzleCall;
export const asc = disabledDrizzleCall;
export const count = disabledDrizzleCall;
export const desc = disabledDrizzleCall;
export const eq = disabledDrizzleCall;
export const gt = disabledDrizzleCall;
export const inArray = disabledDrizzleCall;
export const isNull = disabledDrizzleCall;
export const lt = disabledDrizzleCall;
export const lte = disabledDrizzleCall;
export const ne = disabledDrizzleCall;
export const neon = disabledDrizzleCall;
export const drizzle = disabledDrizzleCall;
export const gte = disabledDrizzleCall;
export const ilike = disabledDrizzleCall;
export const or = disabledDrizzleCall;
export const sql = disabledDrizzleCall;
