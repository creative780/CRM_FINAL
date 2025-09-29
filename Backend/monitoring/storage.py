import os
import boto3
from abc import ABC, abstractmethod
from typing import Optional
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)


class StorageInterface(ABC):
    """Abstract storage interface for file operations"""
    
    @abstractmethod
    async def put(self, key: str, bytes_data: bytes, content_type: str) -> None:
        """Store file data"""
        pass
    
    @abstractmethod
    async def get_signed_url(self, key: str, ttl_sec: int) -> str:
        """Get signed URL for file access"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete file"""
        pass


class LocalStorage(StorageInterface):
    """Local filesystem storage implementation"""
    
    def __init__(self, base_path: str = None):
        self.base_path = base_path or getattr(settings, 'MONITORING_STORAGE_PATH', '/var/app/data')
        os.makedirs(self.base_path, exist_ok=True)
    
    async def put(self, key: str, bytes_data: bytes, content_type: str) -> None:
        """Store file locally"""
        file_path = os.path.join(self.base_path, key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'wb') as f:
            f.write(bytes_data)
        
        logger.info(f"Stored file locally: {file_path}")
    
    async def get_signed_url(self, key: str, ttl_sec: int) -> str:
        """Return local file URL"""
        file_path = os.path.join(self.base_path, key)
        if os.path.exists(file_path):
            # In development, return a direct file URL
            return f"/monitoring/files/{key}"
        raise FileNotFoundError(f"File not found: {key}")
    
    async def delete(self, key: str) -> None:
        """Delete local file"""
        file_path = os.path.join(self.base_path, key)
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted local file: {file_path}")


class S3Storage(StorageInterface):
    """AWS S3 storage implementation"""
    
    def __init__(self, bucket_name: str = None, region: str = None):
        self.bucket_name = bucket_name or getattr(settings, 'AWS_S3_BUCKET_NAME', None)
        self.region = region or getattr(settings, 'AWS_S3_REGION', 'us-east-1')
        
        if not self.bucket_name:
            raise ValueError("S3 bucket name must be provided")
        
        self.s3_client = boto3.client(
            's3',
            region_name=self.region,
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        )
    
    async def put(self, key: str, bytes_data: bytes, content_type: str) -> None:
        """Store file in S3"""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=bytes_data,
                ContentType=content_type
            )
            logger.info(f"Stored file in S3: {key}")
        except ClientError as e:
            logger.error(f"Failed to store file in S3: {e}")
            raise
    
    async def get_signed_url(self, key: str, ttl_sec: int) -> str:
        """Generate signed URL for S3 object"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=ttl_sec
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate signed URL: {e}")
            raise
    
    async def delete(self, key: str) -> None:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"Deleted file from S3: {key}")
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {e}")
            raise


def get_storage() -> StorageInterface:
    """Factory function to get storage implementation based on settings"""
    storage_driver = getattr(settings, 'STORAGE_DRIVER', 'local')
    
    if storage_driver == 's3':
        return S3Storage()
    else:
        return LocalStorage()


# Global storage instance
storage = get_storage()
