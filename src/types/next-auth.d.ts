import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      freeReadingsLeft: number;
      credits: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    freeReadingsLeft?: number;
    credits?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
  }
}
