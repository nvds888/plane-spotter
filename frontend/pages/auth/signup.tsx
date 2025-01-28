"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignUp() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('https://plane-spotter-backend.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = '/auth/signin';
      } else {
        alert(data.error || 'Failed to register');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An error occurred during registration. Please try again.');
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
          <p className="text-gray-400">Create your account</p>
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
            Sign Up
          </motion.button>
        </form>

        <div className="mt-6 text-center text-gray-400">
          Already have an account? {' '}
          <Link 
            href="/auth/signin" 
            className="text-white underline hover:text-gray-300"
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}