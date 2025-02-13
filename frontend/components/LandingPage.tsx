"use client"

import { useState } from "react"
import Image from "next/image"
import { Plane, MapPin, Trophy, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function LandingPage() {
  const [showInstructions, setShowInstructions] = useState(false)

  const toggleInstructions = () => setShowInstructions(!showInstructions)

  return (
    <div className="min-h-screen bg-white">
      {/* Header with gradient */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-b-[40px] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
            <Image src="/pwa-nobackground.png" alt="Planeify" width={120} height={30} className="object-contain" />
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-white/90 hover:text-white transition-colors font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-white/90 hover:text-white transition-colors font-medium">
              How It Works
            </a>
          </nav>
          <motion.button 
            onClick={toggleInstructions} 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-medium shadow-md hover:shadow-lg transition-all"
          >
            Install App
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f112_1px,transparent_1px),linear-gradient(to_bottom,#6366f112_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
              Spot, Guess, and Collect Aircraft
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join the community of aviation enthusiasts. Spot planes in real-time, guess their details, and build your
              collection.
            </p>
            
            {/* Enhanced Install Button */}
            <motion.button 
              onClick={toggleInstructions}
              className="group relative inline-flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute -inset-1 rounded-[30px] bg-gradient-to-r from-indigo-600 to-blue-600 blur-lg opacity-70 group-hover:opacity-100 animate-pulse transition-opacity duration-500"></div>
              <div className="relative px-12 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[30px] text-xl font-medium text-white shadow-xl">
                <div className="flex items-center gap-3">
                  <Plane className="w-6 h-6" />
                  <span>Install Planeify</span>
                </div>
              </div>
            </motion.button>

            <p className="text-sm text-gray-500">
              Add to your home screen for the full app experience!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-white to-blue-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MapPin className="h-10 w-10 text-white" />,
                title: "Real-time Spotting",
                description: "Use your device's GPS to spot aircraft flying overhead in real-time."
              },
              {
                icon: <Plane className="h-10 w-10 text-white" />,
                title: "Aircraft Guessing Game",
                description: "Test your knowledge by guessing aircraft types, airlines, and destinations."
              },
              {
                icon: <Trophy className="h-10 w-10 text-white" />,
                title: "Achievements & XP",
                description: "Earn XP and unlock achievements as you spot more aircraft and improve your guessing skills."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="bg-white rounded-[30px] p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: "Install the App", description: "Add Planeify to your home screen for easy access." },
              { title: "Spot Aircraft", description: "Use the app to detect nearby aircraft in real-time." },
              { title: "Make Your Guess", description: "Try to identify the aircraft type, airline, and destination." },
              { title: "Grow Your Collection", description: "Build your aircraft collection and compete with friends." }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="bg-gradient-to-b from-white to-blue-50 rounded-[30px] p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center h-full">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl text-white text-xl font-bold flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-16 rounded-t-[40px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-4">Planeify</h3>
              <p className="text-white/80">
                Spot, guess, and collect aircraft with our community of aviation enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-white/80 hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-white/80 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/80 hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Connect</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-white/80 hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/80 hover:text-white transition-colors">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/80 hover:text-white transition-colors">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-16 text-center">
            <p className="text-white/80">&copy; 2024 Planeify. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Install Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-[30px] p-8 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl">
                    <Plane className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Install Planeify</h3>
                </div>
                <button
                  onClick={toggleInstructions}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <ol className="space-y-6">
                {[
                  "Open Planeify in your mobile browser",
                  "Tap the browser menu icon (usually three dots)",
                  "Select Add to Home Screen or Install App",
                  "Follow the on-screen prompts to complete installation"
                ].map((step, index) => (
                  <li key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center text-white font-medium">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-sm text-gray-500">
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



