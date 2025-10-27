import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt", // ✅ Use JWT-based session
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET, // ✅ Single consistent secret
  providers: [
    // ✅ Credentials Provider (Email + Password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🟢 Received credentials:", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.error("❌ Missing credentials");
          throw new Error("Email and password are required");
        }

        // ✅ Check if user exists
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log("🔍 Found user:", user?.email || "none");

        if (!user) {
          console.error("❌ No user found for email:", credentials.email);
          throw new Error("No user found with this email");
        }

        // ✅ Compare password with bcrypt
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("🔑 Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          console.error("❌ Invalid password for user:", user.email);
          throw new Error("Invalid email or password");
        }

        // ✅ Return minimal safe user object for JWT
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),

    // ✅ Optional Google Login
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],

  pages: {
    signIn: "/login", // ✅ Custom login page
  },

  callbacks: {
    /**
     * ✅ Add user info to JWT token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },

    /**
     * ✅ Add JWT info to session
     */
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          firstName: token.firstName as string,
          lastName: token.lastName as string,
        };
      }
      return session;
    },
  },

  /**
   * ✅ Enable debug mode during development
   */
  debug: process.env.NODE_ENV === "development",
};
