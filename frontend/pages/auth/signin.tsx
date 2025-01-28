"use client"

import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Plane, Mail, Lock, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SignIn() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/'
      })

      if (result?.error) {
        alert(result.error)
      } else if (result?.ok) {
        window.location.href = result.url || '/'
      }
    } catch (error) {
      console.error('Signin error:', error)
      alert('An error occurred during sign-in. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link 
          href="/"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane className="text-blue-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-500">Sign in to continue your spotting journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={20} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <motion.button 
              type="submit" 
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition duration-200"
              whileTap={{ scale: 0.95 }}
            >
              Sign In
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-blue-500 hover:text-blue-600 font-medium">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}