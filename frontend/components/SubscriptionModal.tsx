"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Crown, Star, Clock, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { useWallet, WalletProvider, WalletManager, WalletId, NetworkId } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';

const walletManager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY],
  defaultNetwork: NetworkId.TESTNET
});

const USDC_ASSET_ID = 10458941; // Move to env/config
const MERCHANT_ADDRESS = 'MQYGWBVAXQHTOFWTF4KZZ3EAP6L45NCGG7JQCBH3622FVEX57WGAR7DJEI'; // Move to env/config

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
  isPremium: boolean; // New prop
  subscriptionDetails?: { // New prop for subscription details
    startDate?: string;
    endDate?: string;
    plan?: string;
    transactionId?: string;
    walletAddress?: string;
  };
}

interface SubscriptionButtonProps {
  userId: string;
  isPremium: boolean;
  subscriptionEndDate?: string;
  subscriptionDetails?: SubscriptionModalProps['subscriptionDetails']; // Pass details to button
}

const subscriptionPlans: SubscriptionPlans = {
  '3': { price: 15, duration: '3 months', savings: 0 },
  '6': { price: 25, duration: '6 months', savings: 5 },
  '12': { price: 40, duration: '12 months', savings: 20 }
};

const ModalContent: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, userId, isPremium, subscriptionDetails }) => {
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
      const amount = subscriptionPlans[selectedDuration].price;
      const amountInMicroUsdc = amount * 1_000_000;
      const suggestedParams = await algodClient.getTransactionParams().do();
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: MERCHANT_ADDRESS,
        amount: amountInMicroUsdc,
        assetIndex: USDC_ASSET_ID,
        suggestedParams: { ...suggestedParams, fee: 1000, flatFee: true }
      });
      const atc = new algosdk.AtomicTransactionComposer();
      atc.addTransaction({ txn, signer: transactionSigner });
      const result = await atc.execute(algodClient, 4);
      const confirmResponse = await fetch('https://plane-spotter-backend.onrender.com/api/subscription/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          duration: selectedDuration,
          txId: result.txIDs[0],
          walletAddress: activeAddress
        })
      });
      if (!confirmResponse.ok) throw new Error((await confirmResponse.json()).error || 'Failed to confirm');
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate duration in months if premium
  const durationInMonths = isPremium && subscriptionDetails?.plan ? parseInt(subscriptionDetails.plan) : null;
  const pricePaid = durationInMonths ? subscriptionPlans[subscriptionDetails!.plan!].price : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-t-2xl max-w-lg w-full"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {isPremium ? 'Your Premium Subscription' : 'Upgrade to Premium'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              {isPremium && subscriptionDetails ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown size={20} />
                      <h3 className="font-semibold">Active Premium Subscription</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>
                          Start: {new Date(subscriptionDetails.startDate!).toLocaleDateString()}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>
                          End: {new Date(subscriptionDetails.endDate!).toLocaleDateString()}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>Duration: {subscriptionPlans[subscriptionDetails.plan!].duration}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <DollarSign size={16} />
                        <span>Price Paid: ${pricePaid} USDC</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ExternalLink size={16} />
                        <a
                          href={`https://testnet.explorer.perawallet.app/tx/${subscriptionDetails.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-gray-200"
                        >
                          Transaction: {subscriptionDetails.transactionId?.slice(0, 8)}...
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-xl mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown size={20} />
                      <h3 className="font-semibold">Premium Benefits</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2"><Check size={16} /><span>8 spots per day (Free: 4 spots)</span></li>
                      <li className="flex items-center gap-2"><Check size={16} /><span>Advanced insights and analytics</span></li>
                      <li className="flex items-center gap-2"><Check size={16} /><span>Priority support</span></li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(subscriptionPlans).map(([duration, plan]) => (
                        <option key={duration} value={duration}>
                          {plan.duration} - ${plan.price}{plan.savings > 0 ? ` (Save $${plan.savings})` : ''}
                        </option>
                      ))}
                    </select>
                    {!activeAddress ? (
                      <div className="space-y-3">
                        {wallets.map((wallet) => (
                          <button
                            key={wallet.id}
                            onClick={() => wallet.connect().catch((err) => setError(err.message || 'Failed to connect'))}
                            disabled={wallet.isConnected}
                            className="w-full bg-white border border-gray-200 hover:bg-gray-50 py-3 px-4 rounded-xl flex items-center justify-between disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2">
                              <img src={wallet.metadata.icon} alt={wallet.metadata.name} className="w-6 h-6" />
                              <span>{wallet.metadata.name}</span>
                            </div>
                            {wallet.isConnected && <Check size={16} className="text-green-500" />}
                          </button>
                        ))}
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm text-gray-500 text-center">
                            Connected: {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
                          </p>
                        </div>
                        <button
                          onClick={handleSubscribe}
                          disabled={isProcessing}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Crown size={18} />
                              <span>Confirm Subscription</span>
                            </>
                          )}
                        </button>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = (props) => {
  return (
    <WalletProvider manager={walletManager}>
      <ModalContent {...props} />
    </WalletProvider>
  );
};

export const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({ userId, isPremium, subscriptionEndDate, subscriptionDetails }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg 
          hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-1.5 text-sm"
        title={subscriptionEndDate ? `Expires: ${new Date(subscriptionEndDate).toLocaleDateString()}` : undefined}
      >
        {isPremium ? (
          <>
            <Crown className="w-4 h-4" />
            <span>Premium</span>
          </>
        ) : (
          <>
            <Star className="w-4 h-4" />
            <span>Upgrade</span>
          </>
        )}
      </button>
      
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        isPremium={isPremium}
        subscriptionDetails={subscriptionDetails}
      />
    </>
  );
};

export default SubscriptionModal;