"use client";

import { signIn } from 'next-auth/react';

export default function SignIn() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      console.log('Attempting signin...');
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/'
      });

      console.log('Signin result:', result);

      if (result?.error) {
        alert(result.error);
      } else if (result?.ok) {
        // Successful sign-in
        window.location.href = result.url || '/';
      }
    } catch (error) {
      console.error('Signin error:', error);
      alert('An error occurred during sign-in. Please try again.');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Sign In</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="p-2 border mb-2 w-full rounded"
            required
          />
        </div>
        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="p-2 border mb-2 w-full rounded"
            required
          />
        </div>
        <button 
          type="submit" 
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 w-full rounded transition duration-200"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}