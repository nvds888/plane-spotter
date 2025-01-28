"use client";

import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignIn() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/'
      });

      if (result?.error) {
        alert(result.error);
      } else if (result?.ok) {
        window.location.href = result.url || '/';
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An error occurred during sign-in. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">✈️ Plane Spotter</h1>
          <p className="text-gray-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full p-4 bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:border-white"
              required
            />
          </div>
          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full p-4 bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:border-white"
              required
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit" 
            className="w-full p-4 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Sign In
          </motion.button>
        </form>

        <div className="mt-6 text-center text-gray-400">
          Do nott have an account? {' '}
          <Link 
            href="/auth/signup" 
            className="text-white underline hover:text-gray-300"
          >
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}