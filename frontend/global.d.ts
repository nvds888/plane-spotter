// global.d.ts
import { Mongoose } from 'mongoose';

declare global {
  namespace NodeJS {
    interface Global {
      mongoose?: { // Add "?" to make it optional
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      };
    }
  }
}

export {};