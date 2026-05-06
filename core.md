1. Authentication \& User Accounts (Login/Signup System — Spectra AI Backend)



User registration system → create account using FastAPI endpoints + store users in PostgreSQL via ORM (SQLAlchemy / Prisma alternative like SQLModel)



Login system → verify credentials and issue tokens using JSON Web Token



Password hashing → use passlib with bcrypt/argon2 schemes



Session management → JWT-based stateless auth (recommended for async FastAPI architecture)



Access tokens → short-lived JWT (sent in Authorization header: Bearer token)



Refresh tokens → long-lived tokens stored in DB (or Redis) + rotated securely



Logout system → invalidate refresh tokens (blacklist or delete from DB)



OAuth integration → use Authlib (Google, GitHub login support)



User database schema → define via SQLModel or SQLAlchemy (id, email, password\_hash, created\_at, etc.)



Email verification → send verification emails using FastAPI Mail or SMTP provider



Password reset flow → secure token-based reset (generate token → email link → verify → update password)



Rate limiting (auth) → integrate slowapi (protect login/signup endpoints)



Account lockout → track failed login attempts in DB (failed\_attempts + lock\_until fields)



Device/session tracking → optionally store sessions in Redis for scalability



Auth middleware → FastAPI dependency (Depends) to validate JWT and protect routes



Role system (basic) → add role field (user/pro/admin) in DB schema



Anonymous/guest mode → generate temporary session ID (UUID) without DB persistence OR limited DB entry



Auth state sync (frontend) → frontend stores access token (memory or HTTP-only cookie) and attaches to API calls



Secure cookie handling → if using cookies, configure HTTP-only, Secure, SameSite via FastAPI responses



CSRF protection → required if using cookies → implement CSRF tokens manually or via middleware



CORS configuration → use FastAPI built-in middleware (CORSMiddleware) for frontend-backend communication



Environment-based secrets → manage using python-dotenv + your existing pydantic-settings



2\. AI Request Pipeline (Prompt → Processing → Response Flow — Spectra AI Backend)



Step 1: Input Processing



User input parsing → extract:



prompt text

selected mode (chat / RAG / tool)

attached files (if any)

conversation\_id



Basic validation → reject empty prompts / invalid payloads



Step 2: Conversation Context Handling



Fetch conversation → query PostgreSQL using conversation\_id

Fetch messages → get last N messages (not full history)

Ordering → ensure chronological order (old → new)



Context trimming → keep only messages within token limit

Optional summarization → compress older messages if conversation is long



Step 3: Mode Routing (Critical Logic Layer)



Route request based on mode:



Standard Chat → go directly to LLM

RAG Mode → trigger retrieval pipeline

Tool Mode → trigger external processors (PDF, YouTube, etc.)



This becomes your central router function



Step 4: RAG Pipeline (if enabled)



Query embedding → convert user input into vector using Sentence-Transformers



Vector search → retrieve top-k relevant chunks from ChromaDB



Context ranking → optionally rerank chunks (basic cosine similarity is fine for v1)



Context injection → format retrieved chunks into structured prompt block



Step 5: Prompt Construction



System prompt → define behavior (assistant tone, rules, safety, etc.)



Final prompt assembly:



system instructions

conversation history

retrieved RAG context (if any)

current user query



Token control → trim prompt if exceeding model limits



Step 6: Model Invocation (Core AI Call)



Model selection → choose Flash / Pro via Google Generative AI



API call → send constructed prompt to Gemini



Streaming enabled → request streaming response (important for UX)



Timeout handling → define max response time to avoid hanging requests



Step 7: Streaming Response System



Streaming setup → return FastAPI StreamingResponse



Token streaming → receive partial tokens from Gemini and forward to frontend



Frontend rendering → UI shows typing effect in real-time



Interrupt support → allow user to cancel request mid-stream



Step 8: Message Persistence (Database Writes)



Save user message → insert into messages table before model call



Handle AI response:



buffer streamed tokens

reconstruct full response



Save AI message → insert final response into DB after completion



Update conversation → update updated\_at timestamp



Step 9: Tool Execution Layer (if triggered)



PDF parsing → extract structured text via pdfplumber



YouTube transcript → fetch using youtube-transcript-api



Tool output injection → add extracted content into prompt before model call



Step 10: Response Post-Processing



Formatting → clean markdown, code blocks, structure output



Metadata → attach:



model used

tokens used

latency



Safety filtering → optional rule-based filtering before sending response



Step 11: Final Response Delivery



Response type:



Streaming → real-time text chunks

Non-stream → JSON response



Frontend sync → message displayed in chat UI



Step 12: Error Handling \& Recovery



Model failure → fallback message or retry option



Timeout → return controlled error response



Invalid context → safely skip broken messages



Logging → log errors for debugging (important for production)



3\. File Upload + RAG Indexing Pipeline (PDF / Video → Knowledge Base Flow — Spectra AI Backend)



Step 1: File Intake \& Upload Layer



File upload endpoint → created in FastAPI (/upload or /ingest)



Request validation → handled using Pydantic (file type, size, user\_id, metadata)



File reception → frontend sends:



PDF / TXT / image / video link

multipart/form-data request

Step 2: Persistent File Storage (S3 Layer)



File upload → store raw file in Amazon S3



Why S3 here:



stores large binary files safely

scalable and cheap

avoids database overload



Output from S3:



file\_url (public or signed URL)

file\_key (unique identifier)



Database storage (PostgreSQL):



file\_id

user\_id

file\_url (S3 link)

status (uploaded/processing/indexed/failed)

Step 3: File Preprocessing Layer



Backend fetches file from S3 using file\_url



Then detects type:



PDF

text file

video (YouTube / transcript-based)



Temporary processing memory → file loaded into backend stream (not permanently stored locally)



Step 4: Text Extraction Layer



PDF extraction → using pdfplumber



extract text

extract tables

preserve structure



YouTube extraction → using youtube-transcript-api



fetch transcript

segment by timestamps



Cleanup → remove headers, noise, duplicates, formatting artifacts



Step 5: Chunking System (Critical for RAG)



Text splitting → break content into semantic chunks



Rules:



300–800 tokens per chunk

overlapping chunks for context continuity



Each chunk stores:



chunk\_text

file\_id

chunk\_index

source type (pdf/video/text)

optional timestamps

Step 6: Embedding Generation Layer



Embedding model → Sentence-Transformers



Process:



convert each chunk → vector representation

encode semantic meaning



Output:



vector embeddings for every chunk

Step 7: Vector Database Storage (RAG Core)



Store embeddings in ChromaDB



Stored data:



embeddings

chunk text

metadata (file\_id, source, timestamps)



This becomes your AI “memory brain”



Step 8: Indexing Process



Batch insertion → push all chunks into vector DB



Optimization:



indexing for fast similarity search

mapping file → chunks → embeddings

Step 9: Query-Time Retrieval (RAG Usage)



User query → convert into embedding



Similarity search → fetch top-k chunks from ChromaDB



Ranking → select most relevant context



Context assembly → combine chunks into structured prompt



Step 10: Injection into AI Pipeline



Retrieved context → injected into prompt BEFORE LLM call



Final prompt includes:



system instructions

chat history

retrieved file context

user query



Then sent to Google Generative AI



Step 11: File Status Management System



Track file lifecycle in DB:



uploaded → stored in S3

processing → extracting/chunking

indexed → stored in ChromaDB

failed → retry or error state

Step 12: Performance + Scaling Layer



Async processing → file ingestion runs in background (non-blocking)



Optional upgrade:



background workers (Celery / RQ)

queue-based processing for large files



Caching (optional):



Redis for repeated file queries or embeddings

Step 13: Error Handling



Invalid file → reject unsupported formats

Large file → chunk + warn or limit size

Extraction failure → fallback to raw text mode

Index failure → retry embedding generation



4\. Frontend ↔ Backend Integration Flow (Chat UI ↔ FastAPI Streaming System — Spectra AI)



Step 1: Authentication Handshake



Token attachment → frontend sends JWT in Authorization header

Backend verification → FastAPI dependency validates token

User extraction → backend identifies user\_id from token



Step 2: Request Lifecycle Start



Backend receives request → validates using Pydantic

Conversation fetch → load chat history from database

Context preparation → trim + format messages



Step 3: Streaming Connection Setup



Streaming response type → backend switches to StreamingResponse

Connection open → frontend prepares UI “typing state”



Transport layer → uses HTTP streaming (or SSE-style streaming)



Step 4: Real-Time Token Flow



Model call → request sent to Google Generative AI



Token streaming → backend receives partial tokens



Forwarding system:



backend → chunks

frontend → receives stream continuously



UI rendering → tokens appended live in chat bubble



Typing effect → simulated by progressive rendering



Step 5: Frontend Message Handling



Temporary message bubble → “AI is thinking…” placeholder



Streaming update → message grows in real-time



Finalization → once stream ends:



message marked complete

loading state removed

Step 6: State Synchronization



Conversation state update:



new user message added

assistant response appended

UI re-renders chat list



Optimistic UI → message appears instantly before backend response finishes



Step 7: Error \& Recovery Handling



Network failure → frontend shows retry button



Backend error → structured error response returned



Timeout handling → frontend stops loader + shows fallback



Abort controller → allows user to stop generation mid-stream



Step 8: RAG \& Tool Visibility (UI Layer)



RAG indicator → UI shows “Using knowledge base…”



Tool execution UI:



PDF processing

YouTube analysis

file reading status



Progress indicators → show backend processing state



Step 9: Performance Optimization



Debounced input → prevents spam requests



Streaming chunk buffering → reduces UI flicker



Memoized chat state → avoids full re-renders



Lazy loading chats → sidebar loads history in chunks



Step 10: Persistence Sync



Message save flow:



user message saved immediately

AI response saved after streaming ends



Database sync → ensures no data loss on refresh



Step 11: Real-Time UX Enhancements



Auto-scroll → chat scrolls to latest message



Typing indicator → animated loader when backend is thinking



Smooth transitions → message fade-in on arrival



