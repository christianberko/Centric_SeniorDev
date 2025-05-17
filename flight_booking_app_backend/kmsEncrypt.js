import AWS from 'aws-sdk';
import { configDotenv } from 'dotenv';
configDotenv();

const AWS_ACCESS_KEY_ID = "AKIA3FLDY64AOWCNLRVN";
const AWS_SECRET_ACCESS_KEY = "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";
const AWS_REGION = "us-east-1";
const AWS_KMS_KEY_ID = "arn:aws:kms:us-east-1:767397787392:key/8a784b81-b6bc-4158-9b68-df4e405b3ed1";

console.log("Loaded KMS Key ID:", AWS_KMS_KEY_ID);

const kms = new AWS.KMS({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

export async function encryptField(plaintext) {
    const params = {
    KeyId: AWS_KMS_KEY_ID,
    Plaintext: Buffer.from(plaintext, 'utf-8'),
    };
  const result = await kms.encrypt(params).promise();
  return result.CiphertextBlob.toString('base64');
}

export async function decryptField(ciphertext) {
  const params = {
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
  };
  const result = await kms.decrypt(params).promise();
  return result.Plaintext.toString('utf-8');
}
