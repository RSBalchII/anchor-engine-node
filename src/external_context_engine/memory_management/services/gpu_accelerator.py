"""
GPU Accelerator Service

Provides GPU acceleration for embedding generation, similarity computation,
and matrix operations using PyTorch with CUDA support.
"""

import asyncio
import logging
import os
from typing import List, Optional, Any, Union
import numpy as np

logger = logging.getLogger(__name__)

# Conditional imports for GPU support
try:
    import torch
    import torch.nn.functional as F
    from torch.cuda.amp import autocast
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available. GPU acceleration disabled.")


class GPUAccelerator:
    """
    GPU Accelerator for memory management operations.
    
    Optimized for RTX 4090 with 16GB VRAM.
    """
    
    def __init__(self, config: Optional[dict] = None):
        """
        Initialize GPU Accelerator.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        self.device = None
        self.cuda_available = False
        self.mixed_precision = self.config.get("mixed_precision", True)
        self.batch_size = self.config.get("batch_size", 32)
        self.memory_fraction = self.config.get("memory_fraction", 0.8)
        
        # Initialize GPU if available
        self._initialize_gpu()
    
    def _initialize_gpu(self):
        """Initialize GPU and set optimal settings for RTX 4090."""
        if not TORCH_AVAILABLE:
            logger.error("PyTorch not installed. Install with: pip install torch==2.1.2+cu121")
            return
        
        try:
            # Check CUDA availability
            self.cuda_available = torch.cuda.is_available()
            
            if self.cuda_available:
                # Set device
                device_id = int(os.environ.get("CUDA_DEVICE", "0"))
                self.device = torch.device(f"cuda:{device_id}")
                torch.cuda.set_device(self.device)
                
                # Optimize for RTX 4090
                torch.backends.cudnn.benchmark = True
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
                
                # Set memory fraction
                if self.memory_fraction < 1.0:
                    torch.cuda.set_per_process_memory_fraction(self.memory_fraction)
                
                # Log GPU info
                gpu_name = torch.cuda.get_device_name(0)
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                logger.info(f"GPU initialized: {gpu_name} with {gpu_memory:.2f}GB memory")
                logger.info(f"CUDA version: {torch.version.cuda}")
                logger.info(f"Mixed precision: {self.mixed_precision}")
                
            else:
                self.device = torch.device("cpu")
                logger.warning("CUDA not available. Using CPU fallback.")
                
        except Exception as e:
            logger.error(f"GPU initialization failed: {e}")
            self.device = torch.device("cpu")
            self.cuda_available = False
    
    async def batch_embeddings(
        self,
        texts: List[str],
        model: Any,
        batch_size: Optional[int] = None
    ) -> np.ndarray:
        """
        Generate embeddings in batches on GPU.
        
        Args:
            texts: List of texts to embed
            model: Sentence transformer model
            batch_size: Batch size for processing
            
        Returns:
            Numpy array of embeddings
        """
        if not texts:
            return np.array([])
        
        batch_size = batch_size or self.batch_size
        embeddings = []
        
        try:
            # Process in batches to avoid OOM
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                # Generate embeddings with mixed precision if enabled
                if self.cuda_available and self.mixed_precision:
                    with autocast():
                        batch_embeddings = await asyncio.to_thread(
                            model.encode,
                            batch,
                            convert_to_tensor=True,
                            device=self.device
                        )
                else:
                    batch_embeddings = await asyncio.to_thread(
                        model.encode,
                        batch,
                        convert_to_tensor=True,
                        device=self.device if self.cuda_available else "cpu"
                    )
                
                # Convert to CPU numpy for compatibility
                if isinstance(batch_embeddings, torch.Tensor):
                    batch_embeddings = batch_embeddings.cpu().numpy()
                
                embeddings.append(batch_embeddings)
            
            # Concatenate all batches
            return np.vstack(embeddings)
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            # Fallback to CPU processing
            return await self._cpu_fallback_embeddings(texts, model)
    
    async def _cpu_fallback_embeddings(self, texts: List[str], model: Any) -> np.ndarray:
        """CPU fallback for embedding generation."""
        logger.warning("Using CPU fallback for embeddings")
        embeddings = await asyncio.to_thread(
            model.encode,
            texts,
            convert_to_numpy=True
        )
        return embeddings
    
    def similarity_matrix(
        self,
        embeddings_a: Union[np.ndarray, torch.Tensor],
        embeddings_b: Union[np.ndarray, torch.Tensor]
    ) -> np.ndarray:
        """
        Compute cosine similarity matrix on GPU.
        
        Args:
            embeddings_a: First set of embeddings
            embeddings_b: Second set of embeddings
            
        Returns:
            Similarity matrix
        """
        if not TORCH_AVAILABLE or not self.cuda_available:
            return self._cpu_similarity_matrix(embeddings_a, embeddings_b)
        
        try:
            # Convert to tensors if needed
            if isinstance(embeddings_a, np.ndarray):
                embeddings_a = torch.from_numpy(embeddings_a).to(self.device)
            if isinstance(embeddings_b, np.ndarray):
                embeddings_b = torch.from_numpy(embeddings_b).to(self.device)
            
            # Normalize embeddings
            embeddings_a = F.normalize(embeddings_a, p=2, dim=1)
            embeddings_b = F.normalize(embeddings_b, p=2, dim=1)
            
            # Compute cosine similarity
            if self.mixed_precision:
                with autocast():
                    similarity = torch.mm(embeddings_a, embeddings_b.t())
            else:
                similarity = torch.mm(embeddings_a, embeddings_b.t())
            
            # Convert back to numpy
            return similarity.cpu().numpy()
            
        except Exception as e:
            logger.error(f"GPU similarity computation failed: {e}")
            return self._cpu_similarity_matrix(embeddings_a, embeddings_b)
    
    def _cpu_similarity_matrix(
        self,
        embeddings_a: np.ndarray,
        embeddings_b: np.ndarray
    ) -> np.ndarray:
        """CPU fallback for similarity computation."""
        # Convert to numpy if needed
        if isinstance(embeddings_a, torch.Tensor):
            embeddings_a = embeddings_a.cpu().numpy()
        if isinstance(embeddings_b, torch.Tensor):
            embeddings_b = embeddings_b.cpu().numpy()
        
        # Normalize
        norm_a = embeddings_a / np.linalg.norm(embeddings_a, axis=1, keepdims=True)
        norm_b = embeddings_b / np.linalg.norm(embeddings_b, axis=1, keepdims=True)
        
        # Compute similarity
        return np.dot(norm_a, norm_b.T)
    
    async def matrix_operations(
        self,
        operation: str,
        *matrices: Union[np.ndarray, torch.Tensor],
        **kwargs
    ) -> np.ndarray:
        """
        Perform various matrix operations on GPU.
        
        Args:
            operation: Type of operation (matmul, svd, qr, etc.)
            matrices: Input matrices
            kwargs: Additional parameters
            
        Returns:
            Result matrix
        """
        if not TORCH_AVAILABLE or not self.cuda_available:
            return await self._cpu_matrix_operations(operation, *matrices, **kwargs)
        
        try:
            # Convert to tensors
            tensors = []
            for matrix in matrices:
                if isinstance(matrix, np.ndarray):
                    tensors.append(torch.from_numpy(matrix).to(self.device))
                else:
                    tensors.append(matrix.to(self.device))
            
            # Perform operation
            if operation == "matmul":
                result = torch.matmul(*tensors)
            elif operation == "svd":
                result = torch.linalg.svd(tensors[0], **kwargs)
            elif operation == "qr":
                result = torch.linalg.qr(tensors[0], **kwargs)
            elif operation == "inverse":
                result = torch.linalg.inv(tensors[0])
            elif operation == "eigenvalues":
                result = torch.linalg.eigvals(tensors[0])
            else:
                raise ValueError(f"Unknown operation: {operation}")
            
            # Convert back to numpy
            if isinstance(result, tuple):
                return tuple(r.cpu().numpy() for r in result)
            return result.cpu().numpy()
            
        except Exception as e:
            logger.error(f"GPU matrix operation failed: {e}")
            return await self._cpu_matrix_operations(operation, *matrices, **kwargs)
    
    async def _cpu_matrix_operations(
        self,
        operation: str,
        *matrices: np.ndarray,
        **kwargs
    ) -> np.ndarray:
        """CPU fallback for matrix operations."""
        # Convert to numpy if needed
        arrays = []
        for matrix in matrices:
            if isinstance(matrix, torch.Tensor):
                arrays.append(matrix.cpu().numpy())
            else:
                arrays.append(matrix)
        
        # Perform operation
        if operation == "matmul":
            return np.matmul(*arrays)
        elif operation == "svd":
            return np.linalg.svd(arrays[0], **kwargs)
        elif operation == "qr":
            return np.linalg.qr(arrays[0], **kwargs)
        elif operation == "inverse":
            return np.linalg.inv(arrays[0])
        elif operation == "eigenvalues":
            return np.linalg.eigvals(arrays[0])
        else:
            raise ValueError(f"Unknown operation: {operation}")
    
    def optimize_batch_size(self, input_size: int, embedding_dim: int = 384) -> int:
        """
        Dynamically optimize batch size based on available GPU memory.
        
        Args:
            input_size: Size of input data
            embedding_dim: Dimension of embeddings
            
        Returns:
            Optimal batch size
        """
        if not self.cuda_available:
            return min(32, input_size)
        
        try:
            # Get available memory
            free_memory = torch.cuda.mem_get_info()[0] / (1024**2)  # MB
            
            # Estimate memory per sample (rough estimate)
            memory_per_sample = embedding_dim * 4 * 2 / (1024**2)  # MB
            
            # Calculate optimal batch size (use 70% of free memory)
            optimal_batch = int(free_memory * 0.7 / memory_per_sample)
            
            # Clamp to reasonable range
            optimal_batch = max(1, min(optimal_batch, 256, input_size))
            
            logger.debug(f"Optimized batch size: {optimal_batch} (free memory: {free_memory:.2f}MB)")
            return optimal_batch
            
        except Exception as e:
            logger.warning(f"Could not optimize batch size: {e}")
            return self.batch_size
    
    def clear_cache(self):
        """Clear GPU cache to free memory."""
        if self.cuda_available:
            torch.cuda.empty_cache()
            logger.debug("GPU cache cleared")
    
    def get_memory_stats(self) -> dict:
        """Get GPU memory statistics."""
        if not self.cuda_available:
            return {
                "cuda_available": False,
                "allocated": 0,
                "reserved": 0,
                "free": 0
            }
        
        try:
            allocated = torch.cuda.memory_allocated() / (1024**3)
            reserved = torch.cuda.memory_reserved() / (1024**3)
            free = torch.cuda.mem_get_info()[0] / (1024**3)
            
            return {
                "cuda_available": True,
                "allocated_gb": allocated,
                "reserved_gb": reserved,
                "free_gb": free,
                "device": str(self.device),
                "gpu_name": torch.cuda.get_device_name(0)
            }
        except Exception as e:
            logger.error(f"Could not get memory stats: {e}")
            return {"cuda_available": False, "error": str(e)}
    
    def __del__(self):
        """Cleanup GPU resources."""
        if hasattr(self, 'cuda_available') and self.cuda_available:
            self.clear_cache()
