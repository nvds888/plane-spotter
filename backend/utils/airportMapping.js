// utils/airportMapping.js
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Read and parse the CSV file
const csvFilePath = path.join(__dirname, '../data/airportdata.csv');
const csvData = fs.readFileSync(csvFilePath, 'utf-8');

// Initialize mapping objects
const iataToAirport = {};
const icaoToAirport = {};

// Parse CSV and populate mappings
Papa.parse(csvData, {
  complete: (results) => {
    results.data.forEach(row => {
      // Assuming CSV columns: id, name, city, country, iata, icao, latitude, longitude, altitude, timezone, dst, tz, type, source
      const [id, name, city, country, iata, icao] = row;

      // Use the airport name as the display name
      const displayName = name;

      // Add to IATA mapping if exists and not empty
      if (iata && iata !== '\\N' && iata !== '') {
        iataToAirport[iata] = displayName;
      }

      // Add to ICAO mapping if exists and not empty
      if (icao && icao !== '\\N' && icao !== '') {
        icaoToAirport[icao] = displayName;
      }
    });
  },
  header: false,
  skipEmptyLines: true
});

/**
 * Get airport name from IATA or ICAO code
 * @param {string} code - IATA or ICAO code
 * @returns {string} Airport name or original code if not found
 */
const getAirportName = (code) => {
  if (!code) return 'Unknown';

  const iataName = iataToAirport[code];
  if (iataName) return iataName;

  const icaoName = icaoToAirport[code];
  if (icaoName) return icaoName;

  return code;
};

module.exports = {
  getAirportName,
  iataToAirport,
  icaoToAirport
};