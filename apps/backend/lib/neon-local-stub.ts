export function neon(): never {
  throw new Error('Neon is not bundled into the SPICE local runtime.');
}

export class Client {
  constructor() {
    throw new Error('Neon realtime connections are not bundled into the SPICE local runtime.');
  }
}
