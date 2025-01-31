// utils/airlineMapping.js
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Read and parse the CSV file
const csvFilePath = path.join(__dirname, '../data/airlinesdata.csv');
const csvData = fs.readFileSync(csvFilePath, 'utf-8');

// Initialize mapping objects
const icaoToAirline = {};
const iataToAirline = {};

// Parse CSV and populate mappings
Papa.parse(csvData, {
  complete: (results) => {
    results.data.forEach(row => {
      // Assuming CSV columns: id, name, alias, iata, icao, callsign, country, active
      const [id, name, alias, iata, icao, callsign] = row;
      
      // Use callsign if available, otherwise use name
      const displayName = callsign || name;
      
      // Add to ICAO mapping if exists and not empty
      if (icao && icao !== '\\N' && icao !== '') {
        icaoToAirline[icao] = displayName.toUpperCase();
      }
      
      // Add to IATA mapping if exists and not empty
      if (iata && iata !== '\\N' && iata !== '') {
        iataToAirline[iata] = displayName.toUpperCase();
      }
    });
  },
  header: false,
  skipEmptyLines: true
});

/**
 * Get airline name from ICAO or IATA code
 * @param {string} code - ICAO or IATA code
 * @returns {string} Airline name or original code if not found
 */
const getAirlineName = (code) => {
  if (!code) return 'Unknown';
  
  const icaoName = icaoToAirline[code];
  if (icaoName) return icaoName;
  
  const iataName = iataToAirline[code];
  if (iataName) return iataName;
  
  return code;
};

/**
 * Get airline name preferring operating name over painted name
 * @param {string} operatingCode - Operating airline code
 * @param {string} paintedCode - Painted as airline code
 * @returns {string} Best matching airline name
 */
const getBestAirlineName = (operatingCode, paintedCode) => {
  const operatingName = getAirlineName(operatingCode);
  const paintedName = getAirlineName(paintedCode);
  
  // Prefer operating name if available
  return operatingName !== operatingCode ? operatingName : 
         paintedName !== paintedCode ? paintedName :
         operatingCode || paintedCode || 'Unknown';
};

module.exports = {
  getAirlineName,
  getBestAirlineName,
  icaoToAirline,
  iataToAirline
};