function localDbDisabled(): never {
  throw new Error('Cloud database routes are disabled in the SPICE local runtime.');
}

export const db = new Proxy(
  {},
  {
    get() {
      return localDbDisabled();
    },
  },
) as never;
