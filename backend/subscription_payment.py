from algosdk.v2client import algod
from algosdk.transaction import AssetTransferTxn
import json
import sys
import os
import base64

# Algorand connection details
ALGOD_ADDRESS = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""
USDC_ASSET_ID = int(os.environ.get('USDC_ASSET_ID'))  # Testnet USDC asset ID
MERCHANT_ADDRESS = os.environ.get('MERCHANT_ADDRESS')

def create_payment_transaction(sender_address: str, amount_usd: float):
    """
    Create a USDC payment transaction
    """
    try:
        # Initialize Algorand client
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        
        # Get suggested parameters
        params = algod_client.suggested_params()
        
        # Convert USD amount to USDC units (6 decimals)
        amount_usdc = int(amount_usd * 1_000_000)
        
        # Create asset transfer transaction
        txn = AssetTransferTxn(
            sender=sender_address,
            sp=params,
            receiver=MERCHANT_ADDRESS,
            amt=amount_usdc,
            index=USDC_ASSET_ID
        )
        
        # Return the encoded transaction
        return {
            "success": True,
            "txn": base64.b64encode(txn.serialize()).decode('utf-8')
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def verify_payment(txn_id: str):
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
    if len(sys.argv) != 3:
        print("Usage: python subscription_payment.py <wallet_address> <amount>", file=sys.stderr)
        sys.exit(1)

    try:
        wallet_address = sys.argv[1]
        amount = float(sys.argv[2])
        
        print(f"Debug: Received wallet_address={wallet_address}, amount={amount}", file=sys.stderr)
        print(f"Debug: USDC_ASSET_ID={USDC_ASSET_ID}, MERCHANT_ADDRESS={MERCHANT_ADDRESS}", file=sys.stderr)
        
        if len(sys.argv) == 3:
            # Create payment transaction
            result = create_payment_transaction(wallet_address, amount)
        else:
            # Verify payment
            result = verify_payment(sys.argv[1])
            
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
    except Exception as e:
        print(f"Debug: Python error: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)