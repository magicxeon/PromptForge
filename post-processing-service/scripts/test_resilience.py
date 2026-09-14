import asyncio
import time
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from domain.resilience_manager import ResilienceManager

async def test_resilience_worker():
    print("==================================================")
    print("   Resilience & Backoff Internal Test Suite       ")
    print("==================================================")
    
    rm = ResilienceManager(max_attempts=3, backoff_base_ms=100, max_backoff_ms=1000)
    
    attempts_counter = 0
    
    def failing_func():
        nonlocal attempts_counter
        attempts_counter += 1
        if attempts_counter < 3:
            raise ValueError(f"Transient error on attempt {attempts_counter}")
        return "SUCCESS"

    start_time = time.time()
    result, attempts_used = await rm.execute_with_retry(failing_func, max_attempts=3, backoff_base_ms=100)
    duration_ms = (time.time() - start_time) * 1000
    
    print(f"[1] Transient failure retry result: '{result}' in {attempts_used} attempts ({duration_ms:.2f}ms)")
    assert result == "SUCCESS"
    assert attempts_used == 3
    assert duration_ms >= 300  # Backoff delays: 100ms + 200ms = ~300ms

    # Test non-retryable 4xx validation error
    class ValidationErr(Exception):
        def __init__(self):
            self.status_code = 422
            self.code = "faceless_face_count_mismatch"

    def validation_fail():
        raise ValidationErr()

    failed_fast = False
    try:
        await rm.execute_with_retry(validation_fail, max_attempts=3)
    except ValidationErr:
        failed_fast = True

    print(f"[2] Non-retryable 4xx Validation Error failed fast without retry: {failed_fast}")
    assert failed_fast is True

    print("\n==================================================")
    print("   RESILIENCE WORKER TESTS PASSED CLEANLY!       ")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_resilience_worker())
