// const { promisify } = require('util');
// const https = require('https');
// const fs = require('fs');
// const path = require('path');
// const os = require('os');
// const stream = require('stream');
// const { v4: uuidv4 } = require('uuid');

// const pipeline = promisify(stream.pipeline);

// const downloadPdfToTemp = async (pdfUrl, originalFileName) => {
//   const tempDir = os.tmpdir();
//   const tempFilePath = path.join(tempDir, `${uuidv4()}-${originalFileName}`);
//   console.log(`WORKER: Downloading PDF from ${pdfUrl} to ${tempFilePath}...`);

//   return new Promise((resolve, reject) => {
//     const request = https.get(pdfUrl, (response) => {
//       if (response.statusCode < 200 || response.statusCode > 299) {
//         // get the error message
//         let errorBody = '';
//         response.on('data', (chunk) => {
//           errorBody += chunk;
//         });
//         response.on('end', () => {
//           reject(
//             new Error(
//               `Failed to download PDF. Status Code: ${response.statusCode}. Response: ${errorBody}`,
//             ),
//           );
//         });
//         return;
//       }

//       const fileStream = fs.createWriteStream(tempFilePath);
//       pipeline(response, fileStream)
//         .then(() => {
//           console.log(
//             `WORKER: Successfully downloaded PDF to ${tempFilePath}.`,
//           );
//           resolve(tempFilePath);
//         })
//         .catch((error) => {
//           console.error(
//             `WORKER: Error writing PDF to temp file ${tempFilePath}:`,
//             error,
//           );
//           reject(error);
//         });
//     });

//     request.on('error', (error) => {
//       console.error(`WORKER: Error downloading PDF from ${pdfUrl}:`, error);
//       // Attempt cleanup on write error
//       fs.unlink(tempFilePath).catch((unlinkErr) =>
//         console.error(
//           `WORKER: Error cleaning up temp file ${tempFilePath} after write error:`,
//           unlinkErr,
//         ),
//       );

//       reject(error);
//     });

//     request.end();
//   });
// };

// module.exports = { downloadPdfToTemp };
const { promisify } = require('util');
const fs = require('fs'); // Use promise-based fs if preferred: const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const stream = require('stream');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config(); // Ensure environment variables are loaded

// AWS SDK v3 client for S3 (R2 compatible)
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// Promisify the stream pipeline function for cleaner async/await usage
const pipeline = promisify(stream.pipeline);

// --- Configure S3 Client for R2 ---
// Ensure R2 environment variables are set:
// R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
const R2 = new S3Client({
  region: 'auto', // Required for R2
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // Optional: Add retry strategy if needed
  // retryStrategy: new StandardRetryStrategy({ maxAttempts: 3 }),
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

/**
 * Downloads a PDF from Cloudflare R2 using AWS SDK and saves it to a temporary file.
 * @param {string} r2ObjectKey - The key (path/filename) of the object in the R2 bucket.
 * @param {string} originalFileName - The original filename (used for temp file naming).
 * @returns {Promise<string>} A promise that resolves with the path to the temporary file.
 */
const downloadPdfToTemp = async (r2ObjectKey, originalFileName) => {
  // Validate inputs
  if (!R2_BUCKET_NAME) {
    throw new Error('WORKER: R2_BUCKET_NAME environment variable is not set.');
  }
  if (!r2ObjectKey || !originalFileName) {
    throw new Error(
      'WORKER: R2 object key and original filename are required.',
    );
  }

  // Generate a unique temporary file path
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(
    tempDir,
    `${uuidv4()}-${path.basename(originalFileName)}`,
  ); // Use path.basename for safety

  console.log(
    `WORKER: Downloading R2 object s3://${R2_BUCKET_NAME}/${r2ObjectKey} to ${tempFilePath}...`,
  );

  try {
    // Prepare the GetObject command
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2ObjectKey,
    });

    // Send the command to R2/S3 and get the response
    const { Body } = await R2.send(command);

    // Check if the Body is a readable stream
    if (!Body || typeof Body.pipe !== 'function') {
      // Body might be a Blob in some environments, handle if necessary
      // For Node.js, it should be a ReadableStream
      throw new Error(
        'R2 GetObjectCommand did not return a readable stream body.',
      );
    }

    // Create a writable stream to the temporary file
    const fileStream = fs.createWriteStream(tempFilePath);

    // Use stream.pipeline to efficiently pipe the download stream to the file stream
    // This handles backpressure and errors properly.
    await pipeline(Body, fileStream);

    console.log(`WORKER: Successfully downloaded PDF to ${tempFilePath}.`);
    return tempFilePath; // Resolve the promise with the path
  } catch (error) {
    console.error(
      `WORKER: Failed to download object ${r2ObjectKey} from R2:`,
      error,
    );
    // Attempt to clean up the potentially partially written temp file
    await fs.promises.unlink(tempFilePath).catch((unlinkError) => {
      // Log cleanup error but don't overshadow the original download error
      console.error(
        `WORKER: Error cleaning up temp file ${tempFilePath} after download failure:`,
        unlinkError,
      );
    });
    // Re-throw the original error to indicate failure
    throw new Error(
      `Failed to download PDF from R2: ${error.message || error.Code || 'Unknown R2 Error'}`,
    );
  }
};

// Export the modified function
// export { downloadPdfToTemp }; // Use ES Module export if your project uses it
// If using CommonJS:
module.exports = { downloadPdfToTemp };
