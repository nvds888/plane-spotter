# algorand_logger.py
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
import json
import base64
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('algorand_logger.log'),
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger(__name__)

# Algorand connection details
ALGOD_ADDRESS = "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = ""  # Your token here
SENDER_MNEMONIC = "theme expand floor wrong behave roof skull cattle denial gun trash run spend smooth magic position confirm trigger during riot weird window absent ability buffalo"  # Your mnemonic phrase

def log_spot_flights(flights):
    try:
        # Initialize Algorand client
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        private_key = mnemonic.to_private_key(SENDER_MNEMONIC)
        sender = account.address_from_private_key(private_key)

        # Get transaction parameters
        params = algod_client.suggested_params()
        
        # Create a single transaction for all flights
        unsigned_txns = []
        for flight in flights:
            # Create memo with full flight details
            memo = {
                "flt": flight.get('flight', 'N/A'),
                "arl": flight.get('operator', 'N/A'),
                "alt": flight.get('altitude', 0),
                "org": flight.get('departure', 'N/A'),
                "dst": flight.get('destination', 'N/A'),
                "hex": flight.get('hex', 'N/A'),
                "spotId": flight.get('spotId', 'N/A')
            }
            memo_bytes = base64.b64encode(json.dumps(memo).encode()).decode()

            # Create transaction
            txn = transaction.PaymentTxn(
                sender=sender,
                sp=params,
                receiver=sender,  # Send to self
                amt=0,  # 0 Algo transaction
                note=memo_bytes.encode()
            )
            unsigned_txns.append(txn)

        # Assign a single group ID to all transactions
        transaction.assign_group_id(unsigned_txns)
        
        # Sign all transactions
        signed_txns = [txn.sign(private_key) for txn in unsigned_txns]
        
        # Send group transaction
        tx_id = algod_client.send_transactions(signed_txns)
        
        # Wait for confirmation
        transaction.wait_for_confirmation(algod_client, tx_id)
        
    except Exception as e:
        logger.error(f"Critical error logging to Algorand: {e}", exc_info=True)
        sys.exit(1)