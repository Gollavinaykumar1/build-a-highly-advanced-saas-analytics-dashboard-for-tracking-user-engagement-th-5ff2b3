# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt

# Initialize the FastAPI application
app = FastAPI()

# Initialize the security scheme for authentication
security = HTTPBearer()

# Define the user model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)
    plan_type = Column(String)
    status = Column(Boolean)

# Define the login request model
class LoginRequest(BaseModel):
    email: str
    password: str

# Define the registration request model
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    plan_type: str

# Define the token model
class Token(BaseModel):
    access_token: str
    token_type: str

# Define the token data model
class TokenData(BaseModel):
    email: str | None = None

# Initialize the password context
pwd_context = CryptContext(schemes=["bcrypt"], default="bcrypt")

# Function to verify password
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Function to get password hash
def get_password_hash(password):
    return pwd_context.hash(password)

# Function to authenticate user
def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

# Function to create access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, "secret_key", algorithm="HS256")
    return encoded_jwt

# Function to get current active user
async def get_current_active_user(token: str = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token.credentials, "secret_key", algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    db = next(get_db())
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

# Login endpoint
@app.post("/api/v1/auth/login", response_model=Token)
async def login_for_access_token(login_request: LoginRequest):
    db = next(get_db())
    user = authenticate_user(db, login_request.email, login_request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Register endpoint
@app.post("/api/v1/auth/register")
async def register_user(register_request: RegisterRequest):
    db = next(get_db())
    hashed_password = get_password_hash(register_request.password)
    user = User(
        name=register_request.name,
        email=register_request.email,
        password=hashed_password,
        plan_type=register_request.plan_type,
        status=True,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )
    return JSONResponse(content={"message": "User created successfully"}, status_code=201)

# Dashboard endpoint
@app.get("/api/v1/dashboard")
async def dashboard(current_user: User = Depends(get_current_active_user)):
    db = next(get_db())
    total_users = db.query(User).count()
    active_sessions = db.query(User).filter(User.status == True).count()
    revenue = 0  # Replace with actual revenue calculation
    monthly_growth = 0  # Replace with actual monthly growth calculation
    recent_signups = db.query(User).order_by(User.id.desc()).limit(10).all()
    return {
        "total_users": total_users,
        "active_sessions": active_sessions,
        "revenue": revenue,
        "monthly_growth": monthly_growth,
        "recent_signups": [
            {
                "name": user.name,
                "email": user.email,
                "plan_type": user.plan_type,
                "status": user.status,
            }
            for user in recent_signups
        ],
    }

# Add user endpoint
@app.post("/api/v1/add-user")
async def add_user(
    name: str, email: str, plan_type: str, current_user: User = Depends(get_current_active_user)
):
    db = next(get_db())
    hashed_password = get_password_hash("default_password")
    user = User(
        name=name,
        email=email,
        password=hashed_password,
        plan_type=plan_type,
        status=True,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )
    return JSONResponse(content={"message": "User created successfully"}, status_code=201)