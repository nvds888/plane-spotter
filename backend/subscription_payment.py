# verify_payment.py
from algosdk.v2client import algod
import json
import sys
import os

# Algorand connection details
ALGOD_ADDRESS = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""
USDC_ASSET_ID = int(os.environ.get('USDC_ASSET_ID'))  # Testnet USDC asset ID
MERCHANT_ADDRESS = os.environ.get('MERCHANT_ADDRESS')

def verify_payment(txn_id):
    """
    Verify that a subscription payment transaction was successful
    """
    try:
        # Initialize Algorand client
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        
        # Wait for transaction confirmation
        algod_client.status_after_block(txn_id)
        
        # Get transaction info
        txn_info = algod_client.pending_transaction_info(txn_id)
        
        # Verify it's an asset transfer transaction
        if "asset-transfer-transaction" not in txn_info:
            return {
                "success": False,
                "error": "Not an asset transfer transaction"
            }
            
        # Get transaction details
        transfer = txn_info["asset-transfer-transaction"]
        
        # Verify it's a USDC transfer
        if transfer["asset-id"] != USDC_ASSET_ID:
            return {
                "success": False,
                "error": "Not a USDC transfer"
            }
            
        # Verify recipient is merchant
        if transfer["receiver"] != MERCHANT_ADDRESS:
            return {
                "success": False,
                "error": "Invalid recipient"
            }
            
        # Calculate amount in USD (convert from micro USDC)
        amount_usd = transfer["amount"] / 1000000
        
        return {
            "success": True,
            "amount": amount_usd,
            "sender": txn_info["sender"],
            "confirmed_round": txn_info["confirmed-round"]
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python verify_payment.py <txn_id>", file=sys.stderr)
        sys.exit(1)

    try:
        txn_id = sys.argv[1]
        result = verify_payment(txn_id)
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)