const { promisify } = require('util');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const stream = require('stream');
const { v4: uuidv4 } = require('uuid');

const pipeline = promisify(stream.pipeline);

const downloadPdfToTemp = async (pdfUrl, originalFileName) => {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${uuidv4()}-${originalFileName}`);
  console.log(`WORKER: Downloading PDF from ${pdfUrl} to ${tempFilePath}...`);

  return new Promise((resolve, reject) => {
    const request = https.get(pdfUrl, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        // get the error message
        let errorBody = '';
        response.on('data', (chunk) => {
          errorBody += chunk;
        });
        response.on('end', () => {
          reject(
            new Error(
              `Failed to download PDF. Status Code: ${response.statusCode}. Response: ${errorBody}`,
            ),
          );
        });
        return;
      }

      const fileStream = fs.createWriteStream(tempFilePath);
      pipeline(response, fileStream)
        .then(() => {
          console.log(
            `WORKER: Successfully downloaded PDF to ${tempFilePath}.`,
          );
          resolve(tempFilePath);
        })
        .catch((error) => {
          console.error(
            `WORKER: Error writing PDF to temp file ${tempFilePath}:`,
            error,
          );
          reject(error);
        });
    });

    request.on('error', (error) => {
      console.error(`WORKER: Error downloading PDF from ${pdfUrl}:`, error);
      // Attempt cleanup on write error
      fs.unlink(tempFilePath).catch((unlinkErr) =>
        console.error(
          `WORKER: Error cleaning up temp file ${tempFilePath} after write error:`,
          unlinkErr,
        ),
      );

      reject(error);
    });

    request.end();
  });
};

module.exports = { downloadPdfToTemp };
