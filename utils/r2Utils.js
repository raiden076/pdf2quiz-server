const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const R2 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL_BASE =
  process.env.R2_PUBLIC_URL_BASE || `${process.env.R2_ENDPOINT}/${BUCKET_NAME}`;

const uploadToR2 = async (
  fileBuffer,
  originalFileName,
  mimeType,
  userId = 'general',
) => {
  if (
    !BUCKET_NAME ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_ENDPOINT
  ) {
    throw new Error('R2 is not properly configured.');
  }

  if (!fileBuffer || !originalFileName || !mimeType) {
    throw new Error(
      'Incomplete file information recieved/No file information recieved.',
    );
  }

  const fileExtension = path.extname(originalFileName);
  const uniqueKey = `uploads/${userId}/${uuidv4()}${fileExtension}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      originalFileName,
    },
  };

  try {
    console.log(
      `Uploading ${uniqueKey} (${originalFileName}) to R2 bucket ${BUCKET_NAME}...`,
    );
    await R2.send(new PutObjectCommand(params));
    console.log(
      `Successfully uploaded ${uniqueKey} to R2 bucket ${BUCKET_NAME}.`,
    );
    const fileLocation = `${PUBLIC_URL_BASE.replace(/\/$/, '')}/${uniqueKey}`;

    return {
      fileLocation,
      fileKey: uniqueKey,
    };
  } catch (err) {
    console.error(`Error uploading file to R2: ${err.message}`);
    throw new Error(`Error uploading file to R2: ${err.message}`);
  }
};

module.exports = {
  uploadToR2,
};
