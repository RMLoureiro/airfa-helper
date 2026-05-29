import secrets
import string

def gen(length=24):
    chars = string.ascii_letters + string.digits + "@#%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))

print("SECRET_KEY:            ", secrets.token_hex(32))
print("DB_PASSWORD:           ", gen())
print("SUPER_ADMIN_PASSWORD:  ", gen())
print("SEED_ADMIN_PASSWORD:   ", gen())
print("SEED_REGULAR_PASSWORD: ", gen())
