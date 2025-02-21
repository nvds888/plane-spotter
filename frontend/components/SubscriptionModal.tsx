import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Wallet, Crown, Star } from 'lucide-react';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';

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
  txnGroups: Array<{
    txn: string;
    signers: string[];
  }>;
}

const subscriptionPlans: SubscriptionPlans = {
  '3': { price: 15, duration: '3 months', savings: 0 },
  '6': { price: 25, duration: '6 months', savings: 5 },
  '12': { price: 40, duration: '12 months', savings: 20 }
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, userId }) => {
  const { activeAddress, transactionSigner, algodClient, wallets } = useWallet();
  const [selectedDuration, setSelectedDuration] = useState<string>('3');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubscribe = async () => {
    if (!activeAddress || !transactionSigner || !algodClient) {
      setError('Please connect your wallet first');
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
          walletAddress: activeAddress
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate subscription');
      }

      const data = await response.json() as PaymentResponse;

      const atc = new algosdk.AtomicTransactionComposer();
      
      atc.addTransaction({
        txn: algosdk.decodeUnsignedTransaction(Buffer.from(data.txnGroups[0].txn, 'base64')),
        signer: transactionSigner
      });

      const result = await atc.execute(algodClient, 4);

      const confirmResponse = await fetch('/api/subscription/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          duration: selectedDuration,
          txId: result.txIDs[0],
          walletAddress: activeAddress
        })
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm subscription');
      }

      onClose();
      window.location.reload();

    } catch (err) {
      console.error("Subscription error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process subscription';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderWalletOptions = () => (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-3">Select your preferred wallet:</p>
      {wallets.map((wallet) => (
        <button
          key={wallet.id}
          onClick={() => {
            setError('');
            wallet.connect().catch((err) => {
              console.error("Wallet connection error:", err);
              setError(err instanceof Error ? err.message : 'Failed to connect wallet');
            });
          }}
          disabled={wallet.isConnected}
          className="w-full bg-white border-2 border-blue-500 hover:bg-blue-50 text-blue-500 py-3 px-4 rounded-xl flex items-center justify-between disabled:opacity-50 disabled:hover:bg-white"
        >
          <div className="flex items-center gap-2">
            <Wallet size={20} />
            <span>{wallet.metadata.name}</span>
          </div>
          {wallet.isConnected && <Check size={16} className="text-green-500" />}
        </button>
      ))}
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );

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
                onClick={onClose}
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

                {!activeAddress ? (
                  renderWalletOptions()
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleSubscribe}
                      disabled={isProcessing}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Wallet size={20} />
                      {isProcessing ? 'Processing...' : 'Confirm Subscription'}
                    </button>
                    
                    <p className="text-sm text-gray-500 text-center">
                      Connected: {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
                    </p>
                    
                    {error && (
                      <p className="text-red-500 text-sm text-center">{error}</p>
                    )}
                  </div>
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