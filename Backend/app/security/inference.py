
#Denial-of-service guard around the model call.


import asyncio
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import multiprocessing


class ServerBusy(Exception):
    status_code = 503
    retry_after = 1                                      
    message = "The server is busy. Please try again in a moment."


def _ready():
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
            #"spawn" starts each worker as a fresh Python, the same on Windows and Linux.
            #The initializer runs once in every worker, so each loads the model once.
            self.pool = ProcessPoolExecutor(max_workers=self.workers, initializer=initializer,
                                            initargs=initargs, mp_context=multiprocessing.get_context("spawn"))
        else:
            self.pool = ThreadPoolExecutor(max_workers=self.workers, thread_name_prefix="inference")
        self.slots = asyncio.Semaphore(self.workers)
        self.in_flight = 0                               # running + waiting
        self.rejected = 0

    async def warm_up(self):
        #Start every worker now rather than on the first request: a new process needs about
        #a second to load the model, which would otherwise count against the queue timeout.
        if self.enabled:
            loop = asyncio.get_running_loop()
            await asyncio.gather(*(loop.run_in_executor(self.pool, _ready) for _ in range(self.workers)))

    async def run(self, *args):
        if not self.enabled:
            return self.predict(*args)                   

        if self.in_flight >= self.capacity:              
            self.rejected += 1
            raise ServerBusy()
        self.in_flight += 1                              
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
        #Wait for the workers to exit. Worker processes would otherwise outlive the server:
        #uvicorn ends the process straight after shutdown, before Python's own clean-up runs.
        self.pool.shutdown(wait=True, cancel_futures=True)
