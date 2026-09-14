import asyncio
import logging
import time
from typing import Any, Callable, Dict, Optional, Tuple

logger = logging.getLogger("post_processing.resilience")

class ResilienceManager:
    """
    Reusable Component Manager responsible for worker retries, exponential backoff scheduling,
    transient failure isolation, and safe fallback error handling.
    """
    def __init__(self, max_attempts: int = 2, backoff_base_ms: int = 500, max_backoff_ms: int = 5000):
        self.max_attempts = max_attempts
        self.backoff_base_ms = backoff_base_ms
        self.max_backoff_ms = max_backoff_ms

    async def execute_with_retry(
        self,
        func: Callable[..., Any],
        *args: Any,
        max_attempts: Optional[int] = None,
        backoff_base_ms: Optional[int] = None,
        is_retryable: Optional[Callable[[Exception], bool]] = None,
        **kwargs: Any
    ) -> Tuple[Any, int]:
        """
        Executes a function with async exponential backoff retries.
        Returns a tuple of (result, total_attempts_used).
        """
        attempts_limit = max_attempts or self.max_attempts
        base_ms = backoff_base_ms or self.backoff_base_ms
        
        last_exception = None
        for attempt in range(1, attempts_limit + 1):
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = await asyncio.to_thread(func, *args, **kwargs)
                return result, attempt
            except Exception as ex:
                last_exception = ex
                
                if is_retryable and not is_retryable(ex):
                    raise ex
                    
                if hasattr(ex, "status_code") and 400 <= getattr(ex, "status_code") < 500:
                    raise ex

                if attempt < attempts_limit:
                    delay_seconds = min(
                        self.max_backoff_ms / 1000.0,
                        (base_ms / 1000.0) * (2 ** (attempt - 1))
                    )
                    logger.warning(
                        f"Worker attempt {attempt}/{attempts_limit} failed ({str(ex)}). "
                        f"Retrying in {delay_seconds:.2f}s..."
                    )
                    await asyncio.sleep(delay_seconds)
                else:
                    logger.error(f"All {attempts_limit} worker retry attempts failed. Last error: {str(ex)}")
                    raise last_exception

        raise last_exception

resilience_manager = ResilienceManager()
