import time
import sys

# Timing wrapper
def timed(name):
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            print(f"  {name}: {(time.time()-start)*1000:.0f}ms")
            return result
        return wrapper
    return decorator

print("Login adim adim analiz:\n")

# App import
start = time.time()
from app import create_app
print(f"1. App import: {(time.time()-start)*1000:.0f}ms")

# App create
start = time.time()
app = create_app()
print(f"2. App create: {(time.time()-start)*1000:.0f}ms")

with app.app_context():
    from app.models.user import User
    from app.core.jwt_service import JWTService
    from app.core.token_blacklist import TokenBlacklistService
    
    # DB Query
    start = time.time()
    user = User.query.filter_by(email='student@demo.com').first()
    print(f"3. DB Query: {(time.time()-start)*1000:.0f}ms")
    
    # Password check
    start = time.time()
    result = user.check_password('Demo123!')
    print(f"4. Password check: {(time.time()-start)*1000:.0f}ms")
    
    # Update last login
    start = time.time()
    user.update_last_login()
    print(f"5. Update last login: {(time.time()-start)*1000:.0f}ms")
    
    # Create tokens
    start = time.time()
    tokens = JWTService.create_tokens(user)
    print(f"6. Create tokens: {(time.time()-start)*1000:.0f}ms")
    
    # Add session (Redis)
    start = time.time()
    TokenBlacklistService.add_session(
        user_id=user.id,
        jti='test-jti-123',
        device_info={'test': True}
    )
    print(f"7. Add session (Redis): {(time.time()-start)*1000:.0f}ms")
    
    # to_dict
    start = time.time()
    user_dict = user.to_dict()
    print(f"8. User to_dict: {(time.time()-start)*1000:.0f}ms")

print("\nBitti!")
