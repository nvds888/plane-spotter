import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 w-full bg-white border-t">
      <div className="flex justify-around p-4">
        <Link href="/" className="text-blue-500">Spot</Link>
        <Link href="/achievements" className="text-gray-600">Achievements</Link>
        <Link href="/leaderboard" className="text-gray-600">Leaderboard</Link>
        <Link href="/account" className="text-gray-600">Account</Link>
      </div>
    </nav>
  );
}