from slowapi import Limiter
from slowapi.util import get_remote_address

# Global safety-net limits applied to every route (per client IP). Individual
# routes can still tighten this with their own @limiter.limit(...) decorator
# (e.g. the stricter limit on /auth/login).
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
