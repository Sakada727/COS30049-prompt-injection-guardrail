"""
Denial-of-service guard around the model call.

The attack: FastAPI runs every async route on one event loop. If a route calls the model
directly, the loop is stuck until the model finishes, so a flood of large requests makes
every other user (and /api/health) wait, and nothing ever says no.

The defence has two parts:
  1. The model never runs on the event loop. It runs in a small pool of workers, so the
     server keeps answering other requests while predictions run. PIG_INFERENCE_MODE
     picks the kind of worker:
       "thread"   worker threads. Cheap, but the normaliser and TF-IDF are pure Python,
                  so while they run they hold Python's GIL (only one thread can run Python
                  code at a time) and the event loop only gets short turns in between.
       "process"  separate worker processes. Each has its own GIL, so the event loop is
                  never starved, but each process loads its own copy of the model.
  2. Admission control: at most `workers` predictions run and `queue` more may wait.
     Anything beyond that, or anything that waits longer than `queue_timeout_s`,
     gets an immediate 503 with Retry-After instead of piling up.

Use it in main.py (lifespan):
    guard = InferenceGuard(predictor.predict, get_settings(),
                           initializer=predictor.load, initargs=(MODEL_PATH,))
    await guard.warm_up()
    app.state.guard = guard
and in the route:  result = await request.app.state.guard.run(text)
For "process" mode, predict and load must be plain module-level functions, because each
worker process imports them by name. errors.py should turn ServerBusy into a 503 with a
Retry-After header.
"""
import asyncio
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import multiprocessing


class ServerBusy(Exception):
    status_code = 503
    retry_after = 1                                      # seconds, for the Retry-After header
    message = "The server is busy. Please try again in a moment."


def _ready():
    # Sent to each worker at start-up, so the model is loaded before the first real request
    return True


class InferenceGuard:
    def __init__(self, predict, settings, initializer=None, initargs=()):
        self.predict = predict
        self.workers = settings.inference_workers
        self.capacity = settings.inference_workers + settings.inference_queue
        self.queue_timeout = settings.queue_timeout_s
        self.enabled = not settings.demo_disable_dos_defence
        self.mode = settings.inference_mode
        if self.mode == "process":
            # "spawn" starts each worker as a fresh Python, the same on Windows and Linux.
            # The initializer runs once in every worker, so each loads the model once.
            self.pool = ProcessPoolExecutor(max_workers=self.workers, initializer=initializer,
                                            initargs=initargs, mp_context=multiprocessing.get_context("spawn"))
        else:
            self.pool = ThreadPoolExecutor(max_workers=self.workers, thread_name_prefix="inference")
        self.slots = asyncio.Semaphore(self.workers)
        self.in_flight = 0                               # running + waiting
        self.rejected = 0

    async def warm_up(self):
        # Start every worker now rather than on the first request: a new process needs about
        # a second to load the model, which would otherwise count against the queue timeout.
        if self.enabled:
            loop = asyncio.get_running_loop()
            await asyncio.gather(*(loop.run_in_executor(self.pool, _ready) for _ in range(self.workers)))

    async def run(self, *args):
        if not self.enabled:
            return self.predict(*args)                   # DEMO ONLY: blocks the event loop

        if self.in_flight >= self.capacity:              # queue full: say no straight away
            self.rejected += 1
            raise ServerBusy()
        self.in_flight += 1                              # safe without a lock: one event loop
        try:
            try:
                await asyncio.wait_for(self.slots.acquire(), self.queue_timeout)
            except TimeoutError:
                self.rejected += 1
                raise ServerBusy() from None
            try:
                loop = asyncio.get_running_loop()
                return await loop.run_in_executor(self.pool, self.predict, *args)
            finally:
                self.slots.release()
        finally:
            self.in_flight -= 1

    def close(self):
        # Wait for the workers to exit. Worker processes would otherwise outlive the server:
        # uvicorn ends the process straight after shutdown, before Python's own clean-up runs.
        self.pool.shutdown(wait=True, cancel_futures=True)
