"use client";

import { signIn } from 'next-auth/react';

export default function SignIn() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('Attempting signin...');
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    console.log('Signin result:', result);

    if (result?.error) {
      alert(result.error);
    } else {
      // Redirect to home page after successful sign-in
      window.location.href = '/';
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Sign In</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="p-2 border mb-2 w-full"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="p-2 border mb-2 w-full"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 w-full">
          Sign In
        </button>
      </form>
    </div>
  );
}