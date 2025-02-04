# algorand_logger.py
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
import json
import base64
import sys
import logging
from typing import List, Dict

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
SENDER_MNEMONIC = "theme expand floor wrong behave roof skull cattle denial gun trash run spend smooth magic position confirm trigger during riot weird window absent ability buffalo"  # Securely manage this

def log_spot_flights(flights: List[Dict]):
    """Log all flights from a single spot as a single group transaction"""
    try:
        logger.info(f"Starting to log {len(flights)} flights")
        logger.info(f"Flight details: {json.dumps(flights, indent=2)}")

        # Initialize Algorand client
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        logger.info("Algorand client initialized")

        private_key = mnemonic.to_private_key(SENDER_MNEMONIC)
        sender = account.address_from_private_key(private_key)
        logger.info(f"Sender address: {sender}")

        # Get transaction parameters
        params = algod_client.suggested_params()
        logger.info(f"Transaction parameters: {params}")
        
        # Create a single group transaction to log all flights
        unsigned_txns = []
        for flight in flights:
            try:
                # Create comprehensive memo with flight details
                memo = {
                    "flt": flight.get('flight', 'N/A'),
                    "arl": flight.get('operator', 'N/A'),
                    "alt": flight.get('altitude', 0),
                    "org": flight.get('departure', 'N/A'),
                    "dst": flight.get('destination', 'N/A'),
                    "hex": flight.get('hex', 'N/A')
                }
                logger.info(f"Processing flight memo: {memo}")

                memo_bytes = base64.b64encode(json.dumps(memo).encode()).decode()

                # Create transaction (minimal Algo transfer to self)
                txn = transaction.PaymentTxn(
                    sender=sender,
                    sp=params,
                    receiver=sender,  # Send to self
                    amt=0,  # 0 Algo transaction
                    note=memo_bytes.encode()
                )
                unsigned_txns.append(txn)
                logger.info(f"Transaction created for flight: {flight.get('flight', 'N/A')}")

            except Exception as flight_error:
                logger.error(f"Error processing individual flight: {flight_error}")
                logger.error(f"Problematic flight data: {flight}")

        # Group all transactions
        if unsigned_txns:
            transaction.assign_group_id(unsigned_txns)
            logger.info(f"Assigned group ID to {len(unsigned_txns)} transactions")
        
            # Sign all transactions
            signed_txns = [txn.sign(private_key) for txn in unsigned_txns]
            logger.info("All transactions signed")
        
            # Send group transaction
            tx_id = algod_client.send_transactions(signed_txns)
            logger.info(f"Transactions sent. Transaction ID: {tx_id}")
        
            # Wait for confirmation
            transaction.wait_for_confirmation(algod_client, tx_id)
            logger.info(f"Successfully logged spot with {len(flights)} flights. Group transaction ID: {tx_id}")
        else:
            logger.warning("No transactions to send")
        
    except Exception as e:
        logger.error(f"Critical error logging to Algorand: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    logger.info("Script started")
    
    if len(sys.argv) != 2:
        logger.error("Incorrect usage. Requires JSON flights argument.")
        print("Usage: python algorand_logger.py '<flights_json>'", file=sys.stderr)
        sys.exit(1)

    try:
        flights = json.loads(sys.argv[1])
        logger.info(f"Parsed flights JSON: {flights}")
        log_spot_flights(flights)
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing flight data: {e}")
        print(f"Error parsing flight data: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)

    logger.info("Script completed successfully")