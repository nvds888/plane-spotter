# create_wallet.py
from algosdk import account
import json
import sys

def create_algorand_wallet():
    """
    Creates a new Algorand account and returns the public address.
    Private key and mnemonic are intentionally not returned for security.
    """
    try:
        # Generate new account
        private_key, public_address = account.generate_account()
        
        # Return only the public address
        return {
            "success": True,
            "address": public_address
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    result = create_algorand_wallet()
    # Print result as JSON to stdout for the Node.js process to capture
    print(json.dumps(result))
    
    # Exit with appropriate status code
    if not result["success"]:
        sys.exit(1)
    sys.exit(0)