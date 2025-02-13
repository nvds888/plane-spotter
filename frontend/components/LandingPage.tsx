"use client"

import { useState } from "react"
import Image from "next/image"
import { Plane, MapPin, Trophy, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function LandingPage() {
  const [showInstructions, setShowInstructions] = useState(false)

  const toggleInstructions = () => setShowInstructions(!showInstructions)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with gradient */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
            <Image src="/pwa-nobackground.png" alt="Planeify" width={120} height={30} className="object-contain" />
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#features" className="text-white/80 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors">
              How It Works
            </a>
          </nav>
          <motion.button 
            onClick={toggleInstructions} 
            whileTap={{ scale: 0.95 }}
            className="bg-white/10 px-6 py-2 rounded-xl backdrop-blur-md text-white hover:bg-white/20 transition-colors"
          >
            Install App
          </motion.button>
        </div>
      </header>

      {/* Hero Section with pattern background */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-6">
              Spot, Guess, and Collect Aircraft
            </h1>
            <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Join the community of aviation enthusiasts. Spot planes in real-time, guess their details, and build your
              collection.
            </p>
            <motion.button 
              onClick={toggleInstructions}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-200" />
              <div className="relative px-8 py-4 bg-gray-900 rounded-xl leading-none">
                <span className="text-indigo-400 group-hover:text-indigo-300 transition duration-200">
                  Install Planeify
                </span>
              </div>
            </motion.button>
            <p className="mt-4 text-sm text-gray-400">
              Add to your home screen for the full app experience!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MapPin className="h-10 w-10 text-indigo-400" />,
                title: "Real-time Spotting",
                description: "Use your device's GPS to spot aircraft flying overhead in real-time."
              },
              {
                icon: <Plane className="h-10 w-10 text-indigo-400" />,
                title: "Aircraft Guessing Game",
                description: "Test your knowledge by guessing aircraft types, airlines, and destinations."
              },
              {
                icon: <Trophy className="h-10 w-10 text-indigo-400" />,
                title: "Achievements & XP",
                description: "Earn XP and unlock achievements as you spot more aircraft and improve your guessing skills."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-200" />
                <div className="relative p-6 bg-gray-800 rounded-2xl">
                  <div className="bg-indigo-600/20 p-3 rounded-xl w-fit mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: "Install the App", description: "Add Planeify to your home screen for easy access." },
              { title: "Spot Aircraft", description: "Use the app to detect nearby aircraft in real-time." },
              { title: "Make Your Guess", description: "Try to identify the aircraft type, airline, and destination." },
              { title: "Grow Your Collection", description: "Build your aircraft collection and compete with friends." }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-200" />
                <div className="relative p-6 bg-gray-900 rounded-2xl text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white text-xl font-bold flex items-center justify-center mb-4 mx-auto">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-300">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
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
                  <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">&copy; 2024 Planeify. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Install Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl">
                    <Plane className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Install Planeify</h3>
                </div>
                <button
                  onClick={toggleInstructions}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <ol className="space-y-4 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">
                    1
                  </div>
                  Open Planeify in your mobile browser
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">
                    2
                  </div>
                  Tap the browser menu icon (usually three dots)
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">
                    3
                  </div>
                  Select Add to Home Screen or Install App
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">
                    4
                  </div>
                  Follow the on-screen prompts to complete installation
                </li>
              </ol>
              <p className="mt-6 text-sm text-gray-400">
                Note: The exact steps may vary depending on your device and browser. Once installed, open the app from
                your home screen for the full experience!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



