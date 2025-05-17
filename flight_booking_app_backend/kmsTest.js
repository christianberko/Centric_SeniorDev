import AWS from 'aws-sdk';
import { configDotenv } from 'dotenv';
configDotenv();
console.log("Loaded KMS Key ID");

const AWS_ACCESS_KEY_ID = "AKIA3FLDY64AOWCNLRVN";
const AWS_SECRET_ACCESS_KEY = "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";
const AWS_REGION = "us-east-1";
const AWS_KMS_KEY_ID = "arn:aws:kms:us-east-1:767397787392:key/8a784b81-b6bc-4158-9b68-df4e405b3ed1";

// environment variables
const kms = new AWS.KMS({
  region: AWS_REGION
});

const plaintext = '123456789';

// Encrypt
console.log(plaintext);
kms.encrypt({
  KeyId: AWS_KMS_KEY_ID,
  Plaintext: plaintext
}, (err, data) => {
  if (err) return console.error('Encryption error:', err);
  
  const ciphertext = data.CiphertextBlob.toString('base64');
  console.log('Encrypted:', ciphertext);

  // Decrypt
  kms.decrypt({
    CiphertextBlob: Buffer.from(ciphertext, 'base64')
  }, (err, decrypted) => {
    if (err) return console.error('Decryption error:', err);
    
    console.log('Decrypted:', decrypted.Plaintext.toString('utf-8'));
  });
});
