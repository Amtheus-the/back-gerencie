/**
 * AWS S3 Client — recibos Carnê Leão / Receita Saúde
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region:          process.env.AWS_REGION || 'us-east-2',
});

const S3_BUCKET = process.env.S3_BUCKET || 'gerencie-uploads-98765';
const S3_REGION = process.env.AWS_REGION  || 'us-east-2';

/**
 * Gera URL pré-assinada para download (válida por 15 minutos)
 */
const getPresignedUrl = (key, expiresSeconds = 900) =>
  s3.getSignedUrl('getObject', {
    Bucket:  S3_BUCKET,
    Key:     key,
    Expires: expiresSeconds,
  });

/**
 * Extrai a S3 key de uma URL completa do S3
 * Ex: https://gerencie-uploads-98765.s3.us-east-2.amazonaws.com/recibos/123/recibo.pdf
 *     → recibos/123/recibo.pdf
 */
const extractS3Key = (url) => {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch {
    return null;
  }
};

module.exports = { s3, S3_BUCKET, S3_REGION, getPresignedUrl, extractS3Key };
