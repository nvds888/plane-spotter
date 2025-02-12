import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.5,
          type: "spring",
          damping: 20,
          stiffness: 200
        }}
        onAnimationComplete={onAnimationComplete}
      >
        <Image 
          src="/pwa.png" 
          alt="Planeify Logo" 
          width={192} 
          height={192} 
          priority 
        />
      </motion.div>
    </div>
  );
};

export default SplashScreen;