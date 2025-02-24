# subscription_payment.py
from algosdk.v2client import algod
from algosdk import transaction
from algosdk.transaction import AssetTransferTxn
import algosdk.encoding
import json
import sys
import os
import base64

# Algorand connection details
ALGOD_ADDRESS = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""
USDC_ASSET_ID = int(os.environ.get('USDC_ASSET_ID', 0))
MERCHANT_ADDRESS = os.environ.get('MERCHANT_ADDRESS', '')

def create_payment_transaction(sender_address: str, amount_usd: float):
    """Create a USDC payment transaction."""
    try:
        print(f"Debug: Connecting to {ALGOD_ADDRESS}", file=sys.stderr)
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        
        print("Debug: Fetching suggested params", file=sys.stderr)
        params = algod_client.suggested_params()
        
        amount_usdc = int(amount_usd * 1_000_000)  # Convert USD to microUSDC
        print(f"Debug: Creating txn with amount={amount_usdc}", file=sys.stderr)
        
        txn = AssetTransferTxn(
            sender=sender_address,
            sp=params,
            receiver=MERCHANT_ADDRESS,
            amt=amount_usdc,
            index=USDC_ASSET_ID
        )
        
        return {
            "success": True,
            "txn": txn.dictify(),  # Just return the transaction object directly
            "txId": txn.get_txid()
        }
        
    except Exception as e:
        print(f"Debug: Error in create_payment_transaction: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e)
        }
        
def verify_payment(txn_id: str):
    """Verify that a subscription payment transaction was successful."""
    try:
        print(f"Debug: Connecting to {ALGOD_ADDRESS} for verification", file=sys.stderr)
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        
        print(f"Debug: Waiting for confirmation of txn_id={txn_id}", file=sys.stderr)
        # Wait for transaction confirmation (up to 4 rounds)
        txn_info = transaction.wait_for_confirmation(algod_client, txn_id, 4)
        
        # Verify it's an asset transfer transaction
        if "asset-transfer-transaction" not in txn_info:
            print("Debug: Not an asset transfer transaction", file=sys.stderr)
            return {
                "success": False,
                "error": "Not an asset transfer transaction"
            }
            
        transfer = txn_info["asset-transfer-transaction"]
        
        # Verify it's a USDC transfer
        if transfer["asset-id"] != USDC_ASSET_ID:
            print(f"Debug: Asset ID {transfer['asset-id']} does not match USDC_ASSET_ID {USDC_ASSET_ID}", file=sys.stderr)
            return {
                "success": False,
                "error": "Not a USDC transfer"
            }
            
        # Verify recipient is merchant
        if transfer["receiver"] != MERCHANT_ADDRESS:
            print(f"Debug: Receiver {transfer['receiver']} does not match MERCHANT_ADDRESS", file=sys.stderr)
            return {
                "success": False,
                "error": "Invalid recipient"
            }
            
        amount_usd = transfer["amount"] / 1_000_000  # Convert microUSDC to USD
        
        print("Debug: Payment verified successfully", file=sys.stderr)
        return {
            "success": True,
            "amount": amount_usd,
            "sender": txn_info["sender"],
            "confirmed_round": txn_info["confirmed-round"]
        }
        
    except Exception as e:
        print(f"Debug: Error in verify_payment: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python subscription_payment.py <wallet_address> <amount> [txn_id]", file=sys.stderr)
        sys.exit(1)

    try:
        wallet_address = sys.argv[1]
        amount_or_txn = sys.argv[2]
        
        print(f"Debug: Received args={sys.argv[1:]}", file=sys.stderr)
        print(f"Debug: USDC_ASSET_ID={USDC_ASSET_ID}, MERCHANT_ADDRESS={MERCHANT_ADDRESS}", file=sys.stderr)
        
        if len(sys.argv) == 3:
            # Create payment transaction
            amount = float(amount_or_txn)
            print(f"Debug: Processing payment creation for amount={amount}", file=sys.stderr)
            result = create_payment_transaction(wallet_address, amount)
        elif len(sys.argv) == 4:
            # Verify payment
            print(f"Debug: Processing payment verification for txn_id={amount_or_txn}", file=sys.stderr)
            result = verify_payment(amount_or_txn)
        else:
            raise ValueError("Invalid number of arguments")
            
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
        
    except Exception as e:
        print(f"Debug: Python error: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)