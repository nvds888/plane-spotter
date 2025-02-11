import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
    return (
        <motion.div 
        className="fixed inset-0 z-[9999] bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}  // Increased exit duration
        onAnimationComplete={onAnimationComplete}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 1,    // Increased duration
            type: "spring", 
            damping: 10, 
            stiffness: 100 
          }}
        >
          <Image 
            src="/pwa.png" 
            alt="Planeify Logo" 
            width={192} 
            height={192} 
            priority 
          />
        </motion.div>
      </motion.div>
    );
  };

export default SplashScreen;