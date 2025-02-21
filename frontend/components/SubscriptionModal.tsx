import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Wallet, Crown, Star } from 'lucide-react';
import { PeraWalletConnect } from '@perawallet/connect';

interface SubscriptionPlan {
  price: number;
  duration: string;
  savings: number;
}

interface SubscriptionPlans {
  [key: string]: SubscriptionPlan;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface SubscriptionButtonProps {
  userId: string;
  isPremium: boolean;
  subscriptionEndDate?: string;
}

interface PaymentResponse {
  txnGroups: {
    txn: string;
    signers: string[];
  }[];
}

const subscriptionPlans: SubscriptionPlans = {
  '3': { price: 15, duration: '3 months', savings: 0 },
  '6': { price: 25, duration: '6 months', savings: 5 },
  '12': { price: 40, duration: '12 months', savings: 20 }
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, userId }) => {
    const [selectedDuration, setSelectedDuration] = useState<string>('3');
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [accountAddress, setAccountAddress] = useState<string>('');
  
    const peraWallet = useMemo(() => {
      return typeof window !== 'undefined' ? new PeraWalletConnect() : null;
    }, []);
  
    // Add type definition
    type DisconnectHandler = () => Promise<void>;
  
    // Update the handler with proper typing
    const handleDisconnectWallet: DisconnectHandler = useCallback(async () => {
      if (peraWallet) {
        await peraWallet.disconnect();
        setAccountAddress('');
      }
    }, [peraWallet]);
  
    useEffect(() => {
      if (typeof window !== 'undefined' && peraWallet && isOpen) {
        peraWallet.reconnectSession().then((accounts) => {
          if (accounts.length) {
            setAccountAddress(accounts[0]);
          }
          // Set up disconnect listener
          peraWallet.connector?.on("disconnect", handleDisconnectWallet);
        }).catch(console.error);
  
        return () => {
          peraWallet.connector?.off("disconnect", handleDisconnectWallet);
        };
      }
    }, [peraWallet, isOpen, handleDisconnectWallet]);

  // Cleanup on unmount or modal close
  useEffect(() => {
    return () => {
      if (peraWallet) {
        peraWallet.disconnect();
      }
    };
  }, [peraWallet]);

  const handleConnectWalletClick = async () => {
    if (!peraWallet) {
      setError('Pera Wallet is not available');
      return;
    }

    try {
      setIsConnecting(true);
      setError('');

      // If already connected, proceed with subscription
      if (accountAddress) {
        await handleSubscribe(accountAddress);
        return;
      }

      // Request wallet connection
      const newAccounts = await peraWallet.connect();
      setAccountAddress(newAccounts[0]);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSubscribe = async (walletAddress: string) => {
    if (!peraWallet) {
      setError('Pera Wallet is not available');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      const response = await fetch('/api/subscription/connect-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          duration: selectedDuration,
          amount: subscriptionPlans[selectedDuration].price,
          walletAddress
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate subscription');
      }

      const data = await response.json() as PaymentResponse;

      // Sign transactions
      const signedTxn = await peraWallet.signTransaction(data.txnGroups);

      // Confirm subscription
      const confirmResponse = await fetch('/api/subscription/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          duration: selectedDuration,
          txId: signedTxn[0],
          walletAddress
        })
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm subscription');
      }

      // Close modal on success
      onClose();
      
      // Reload page to reflect changes
      window.location.reload();

    } catch (err) {
      console.error("Subscription error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process subscription';
      setError(errorMessage);
      await handleDisconnectWallet();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = useCallback(async () => {
    await handleDisconnectWallet();
    setError('');
    onClose();
  }, [handleDisconnectWallet, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6">
              {/* Free Plan */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">Free Plan</h3>
                <p className="text-gray-500 mb-6">Basic features for casual spotters</p>
                <div className="text-3xl font-bold mb-6">$0</div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>4 spots per day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Basic insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Standard features</span>
                  </li>
                </ul>
              </div>

              {/* Premium Plan */}
              <div className="border-2 border-blue-500 rounded-xl p-6 relative">
                <div className="absolute -top-3 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                  PREMIUM
                </div>
                <h3 className="text-xl font-semibold mb-2">Premium Plan</h3>
                <p className="text-gray-500 mb-6">Advanced features for enthusiasts</p>
                
                <div className="mb-4">
                  <select 
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="3">3 months - $15</option>
                    <option value="6">6 months - $25 (Save $5)</option>
                    <option value="12">12 months - $40 (Save $20)</option>
                  </select>
                </div>

                <div className="text-3xl font-bold mb-2">
                  ${subscriptionPlans[selectedDuration].price}
                </div>
                {subscriptionPlans[selectedDuration].savings > 0 && (
                  <p className="text-green-500 text-sm mb-6">
                    Save ${subscriptionPlans[selectedDuration].savings}!
                  </p>
                )}

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>8 spots per day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Advanced insights and analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Premium features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span>Priority support</span>
                  </li>
                </ul>

                <button
                  onClick={handleConnectWalletClick}
                  disabled={isConnecting || isProcessing}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Wallet size={20} />
                  {isConnecting ? 'Connecting Wallet...' : 
                   isProcessing ? 'Processing...' :
                   accountAddress ? 'Confirm Subscription' : 
                   'Connect Pera Wallet'}
                </button>
                
                {accountAddress && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Connected: {accountAddress.slice(0, 4)}...{accountAddress.slice(-4)}
                  </p>
                )}
                
                {error && (
                  <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({ 
  userId, 
  isPremium, 
  subscriptionEndDate 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2"
      >
        {isPremium ? (
          <>
            <Crown className="w-4 h-4" />
            Premium{subscriptionEndDate && ` (Expires: ${new Date(subscriptionEndDate).toLocaleDateString()})`}
          </>
        ) : (
          <>
            <Star className="w-4 h-4" />
            Upgrade to Premium
          </>
        )}
      </button>
      
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
      />
    </>
  );
};

export default SubscriptionModal;