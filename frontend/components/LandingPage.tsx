import Link from "next/link"
import Image from "next/image"
import { Plane, MapPin, Trophy } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image src="/pwa-nobackground.png" alt="Planeify" width={120} height={30} className="object-contain" />
          </div>
          <nav className="hidden md:flex space-x-6">
            <a
              href="#features"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              How It Works
            </a>
          </nav>
          <div className="flex space-x-4">
            <Link href="/auth/signin" className="btn-secondary">
              Sign In
            </Link>
            <Link href="/auth/signup" className="btn-primary">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
            Spot, Guess, and Collect Aircraft
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Join the community of aviation enthusiasts. Spot planes in real-time, guess their details, and build your
            collection.
          </p>
          <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
            Get Started
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MapPin className="h-10 w-10 text-blue-600" />}
              title="Real-time Spotting"
              description="Use your device's GPS to spot aircraft flying overhead in real-time."
            />
            <FeatureCard
              icon={<Plane className="h-10 w-10 text-blue-600" />}
              title="Aircraft Guessing Game"
              description="Test your knowledge by guessing aircraft types, airlines, and destinations."
            />
            <FeatureCard
              icon={<Trophy className="h-10 w-10 text-blue-600" />}
              title="Achievements & XP"
              description="Earn XP and unlock achievements as you spot more aircraft and improve your guessing skills."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-100 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <StepCard number={1} title="Sign Up" description="Create your account and join the Planeify community." />
            <StepCard
              number={2}
              title="Spot Aircraft"
              description="Use the app to detect nearby aircraft in real-time."
            />
            <StepCard
              number={3}
              title="Make Your Guess"
              description="Try to identify the aircraft type, airline, and destination."
            />
            <StepCard
              number={4}
              title="Grow Your Collection"
              description="Build your aircraft collection and compete with friends."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Planeify</h3>
              <p className="text-gray-400">
                Spot, guess, and collect aircraft with our community of aviation enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-gray-400 hover:text-white">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">&copy; 2023 Planeify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode; // Assuming icon is a React component
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
      <div className="inline-block p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}

interface StepCardProps {
  number: number; // Assuming number is a numeric value
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-6 text-center">
      <div className="inline-block w-12 h-12 bg-blue-600 text-white rounded-full text-xl font-bold flex items-center justify-center mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}

