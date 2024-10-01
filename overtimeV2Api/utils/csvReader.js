const axios = require("axios");
const stream = require("stream");
const csvParser = require("csv-parser");

/**
 * Fetches and parses CSV data from a given URL.
 *
 * @param {string} url - The URL of the CSV file to fetch.
 * @param {number} timeout - Request timeout.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of parsed CSV data objects.
 * @throws {Error} - Throws an error if the CSV data could not be fetched or parsed.
 */
async function readCsvFromUrl(url, timeout) {
  try {
    const response = await axios.get(url, { timeout });
    const csvContent = response.data;

    const csvStream = new stream.Readable();
    csvStream.push(csvContent);
    csvStream.push(null);

    const data = await parseCsv(csvStream);
    return data;
  } catch (error) {
    console.error(`Failed to read CSV from URL: ${url}`, error);
    throw error;
  }
}

/**
 * Parses CSV data from a readable stream.
 *
 * @param {stream.Readable} csvStream - A readable stream containing CSV data.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of parsed CSV data objects.
 * @throws {Error} - Throws an error if the CSV data could not be parsed.
 */
function parseCsv(csvStream) {
  return new Promise((resolve, reject) => {
    const results = [];
    csvStream
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

module.exports = {
  readCsvFromUrl,
};
