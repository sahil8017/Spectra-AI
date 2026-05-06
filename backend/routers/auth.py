from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from ..database import get_session
from ..models.database_models import User
from ..services.auth_service import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..utils.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/signup", response_model=Token)
@limiter.limit("5/minute")
def signup(request: Request, user_data: UserCreate, session: Session = Depends(get_session)):
    # Check if user already exists
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        name=user_data.name
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Create token
    access_token = create_access_token(data={"sub": new_user.email, "user_id": new_user.id})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"id": new_user.id, "email": new_user.email, "name": new_user.name}
    }

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "name": user.name}
    }

from ..services.auth_service import get_current_user
from ..services.gdpr_service import export_user_data, delete_user_data

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role}

@router.get("/gdpr-export")
def gdpr_export(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return export_user_data(current_user.id, session)

@router.post("/gdpr-delete")
def gdpr_delete(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Note: requester_id is current_user.id for self-deletion
    return delete_user_data(current_user.id, requester_id=current_user.id)
