# algorand_logger.py
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
import json
import base64
import sys
import os

# Algorand connection details
ALGOD_ADDRESS = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""  # Your token here
SENDER_MNEMONIC = os.environ.get('ALGORAND_MNEMONIC')
if not SENDER_MNEMONIC:
    raise ValueError("ALGORAND_MNEMONIC environment variable is not set")

def log_spot_flights(flights):
    """Log all flights from a single spot as a group transaction"""
    try:
        # Add validation
        if not flights or not isinstance(flights, list):
            raise ValueError(f"Invalid flights data format: {flights}")
            
        print(f"Processing {len(flights)} flights: {json.dumps(flights, indent=2)}")
        
        # Validate that all flights have the same user address
        user_addresses = set(flight.get('userAddress') for flight in flights)
        if len(user_addresses) != 1:
            raise ValueError("All flights in a group must be from the same user")
        
        receiver_address = flights[0]['userAddress']
        if not receiver_address:
            raise ValueError("User Algorand address is required")
            
        # Initialize Algorand client
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        private_key = mnemonic.to_private_key(SENDER_MNEMONIC)
        sender = account.address_from_private_key(private_key)

        # Get transaction parameters
        params = algod_client.suggested_params()
        
        # Create a transaction for each flight in the spot
        unsigned_txns = []
        for flight in flights:
            # Create memo with flight details
            memo = {
                "flt": flight['flight'],
                "arl": flight['operator'],
                "alt": flight['altitude'],
                "org": flight['departure'],
                "dst": flight['destination'],
                "hex": flight['hex']
            }
            memo_bytes = base64.b64encode(json.dumps(memo).encode()).decode()

            # Create transaction - now sending to user's address
            txn = transaction.PaymentTxn(
                sender=sender,
                sp=params,
                receiver=receiver_address,  # Send to user's address
                amt=0,  # 0 Algo transaction
                note=memo_bytes.encode()
            )
            unsigned_txns.append(txn)

        # Group the transactions for this spot
        transaction.assign_group_id(unsigned_txns)
        
        # Sign all transactions
        signed_txns = [txn.sign(private_key) for txn in unsigned_txns]
        
        # Send group transaction
        tx_id = algod_client.send_transactions(signed_txns)
        
        # Wait for confirmation
        transaction.wait_for_confirmation(algod_client, tx_id)
        print(f"Successfully logged spot with {len(flights)} flights to user {receiver_address}. Group transaction ID: {tx_id}")
        
    except Exception as e:
        print(f"Error logging to Algorand: {str(e)}", file=sys.stderr)
        # Print the full error traceback for debugging
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python algorand_logger.py '<flights_json>'", file=sys.stderr)
        sys.exit(1)

    try:
        flights = json.loads(sys.argv[1])
        log_spot_flights(flights)
    except json.JSONDecodeError as e:
        print(f"Error parsing flight data: {e}", file=sys.stderr)
        sys.exit(1)