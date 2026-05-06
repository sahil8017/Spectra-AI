import boto3
import os
import hashlib
import logging
from botocore.exceptions import ClientError
from ..config import settings

logger = logging.getLogger("spectra-storage")


class StorageService:
    def __init__(self):
        self.s3_enabled = all([
            getattr(settings, "AWS_ACCESS_KEY_ID", None),
            getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
            getattr(settings, "AWS_BUCKET_NAME", None)
        ])

        if self.s3_enabled:
            self.s3 = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=getattr(settings, "AWS_REGION", "us-east-1")
            )
            self.bucket = settings.AWS_BUCKET_NAME
            logger.info("S3 Storage enabled.")
        else:
            self.local_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
            )
            os.makedirs(self.local_path, exist_ok=True)
            logger.info(f"S3 credentials missing. Using local storage at {self.local_path}")

    # ─── File Deduplication ──────────────────────────────────────
    def compute_hash(self, file_content: bytes) -> str:
        """SHA-256 hash for deduplication checks."""
        return hashlib.sha256(file_content).hexdigest()

    # ─── Upload ─────────────────────────────────────────────────
    def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        user_id: str = "anonymous",
        server_side_encryption: str = "AES256"
    ) -> dict:
        """
        Uploads a file and returns storage metadata including path and content hash.
        S3 uploads use SSE-S3 encryption at rest by default.
        """
        file_hash = self.compute_hash(file_content)
        # Namespace files by user to enforce isolation
        storage_key = f"users/{user_id}/{file_hash[:8]}_{filename}"

        if self.s3_enabled:
            try:
                self.s3.put_object(
                    Bucket=self.bucket,
                    Key=storage_key,
                    Body=file_content,
                    ContentType=content_type,
                    ServerSideEncryption=server_side_encryption,  # SSE-S3 encryption at rest
                    Metadata={
                        "user_id": user_id,
                        "original_filename": filename,
                        "content_hash": file_hash
                    }
                )
                url = f"https://{self.bucket}.s3.amazonaws.com/{storage_key}"
                logger.info(f"Uploaded to S3: {storage_key} ({len(file_content)} bytes, encrypted)")
                return {"storage_key": storage_key, "url": url, "hash": file_hash, "backend": "s3"}
            except ClientError as e:
                logger.error(f"S3 Upload failed: {e}")
                raise Exception("Storage failure")
        else:
            path = os.path.join(self.local_path, storage_key.replace("/", "_"))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                f.write(file_content)
            return {"storage_key": storage_key, "url": path, "hash": file_hash, "backend": "local"}

    # ─── Signed URLs ─────────────────────────────────────────────
    def get_signed_download_url(self, storage_key: str, expires_in: int = 3600) -> str:
        """Generates a temporary signed URL for secure, direct download from S3."""
        if self.s3_enabled:
            try:
                url = self.s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket, 'Key': storage_key},
                    ExpiresIn=expires_in
                )
                return url
            except ClientError as e:
                logger.error(f"Failed to generate signed download URL: {e}")
                return ""
        return f"file://{os.path.join(self.local_path, storage_key.replace('/', '_'))}"

    def get_signed_upload_url(self, storage_key: str, content_type: str, expires_in: int = 300) -> dict:
        """
        Generates a presigned POST URL for direct client → S3 upload.
        The API server never touches the file bytes, offloading bandwidth.
        """
        if not self.s3_enabled:
            return {"url": None, "fields": {}, "backend": "local"}
        try:
            response = self.s3.generate_presigned_post(
                Bucket=self.bucket,
                Key=storage_key,
                Fields={
                    "Content-Type": content_type,
                    "x-amz-server-side-encryption": "AES256"
                },
                Conditions=[
                    {"Content-Type": content_type},
                    {"x-amz-server-side-encryption": "AES256"},
                    ["content-length-range", 1, 52_428_800]  # 50MB max
                ],
                ExpiresIn=expires_in
            )
            return {"url": response["url"], "fields": response["fields"], "backend": "s3"}
        except ClientError as e:
            logger.error(f"Failed to generate presigned POST URL: {e}")
            raise Exception("Could not generate upload URL")

    # ─── Deletion ────────────────────────────────────────────────
    def delete_file(self, storage_key: str):
        if self.s3_enabled:
            try:
                self.s3.delete_object(Bucket=self.bucket, Key=storage_key)
                logger.info(f"Deleted from S3: {storage_key}")
            except ClientError:
                pass
        else:
            try:
                os.remove(os.path.join(self.local_path, storage_key.replace("/", "_")))
            except FileNotFoundError:
                pass


storage_service = StorageService()
