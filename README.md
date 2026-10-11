# Intelligent Applicant Screening Using NLP and Semantic Resume Matching

An intelligent recruitment screening web application built with **Node.js**, **Express.js**, **MongoDB**, **AngularJS 1.x**, and **Bootstrap 5**. The system parses PDF and Word DOCX resumes, extracts structured candidate qualifications, and computes an explainable multi-factor semantic match score (0–100) against customizable job requirements.

---

## 🌟 Key Features

1. **Recruiter Authentication & Authorization**
   - Secure registration and login using salted `bcryptjs` password hashing.
   - Stateless JWT authentication (`jsonwebtoken`) with route protection middleware on all job management and applicant screening endpoints.
   - Built-in one-click demo login (`recruiter@demo.com` / `password123`).

2. **Job Postings & Requirements Management**
   - Full CRUD operations for job requisitions: Title, Department, Location, Employment Type, Description.
   - Granular requirement specification: **Required Skills**, **Preferred Bonus Skills**, **Minimum Experience (Years)**, and **Education Level**.
   - **Configurable Scoring Weights**: Recruiters can customize the relative importance of Skills, Job Description Similarity, Experience, and Education on a per-job basis.
   - Automatic re-evaluation: Modifying requirements or weights automatically recalibrates match scores for existing applicants.

3. **Multi-Format Resume Upload & Parsing**
   - Drag-and-drop file upload with support for **PDF (`.pdf`)**, **Word (`.docx`, `.doc`)**, and plain text (`.txt`).
   - File type validation and size limits (up to 10MB).
   - High-performance text extraction using `pdf-parse` and `mammoth`.
   - Structured NLP extraction:
     - Candidate Name (header heuristics and document analysis)
     - Contact details (email and phone number extraction)
     - Experience duration estimation (explicit statements & employment timeline interval parsing)
     - Education level and degree detection (PhD, Master's, Bachelor's, Associate's, High School)
     - Skill detection mapped against a comprehensive taxonomy of 350+ technical competencies.

4. **Intelligent NLP & Semantic Resume Matching Engine**
   - **Vector Space Model (TF-IDF & Cosine Similarity)**: Computes overall semantic and textual alignment between the job description and candidate resume using Porter Stemming, stopword filtering, unigrams, and bigrams.
   - **Semantic Synonym & Tech Taxonomy Expansion**: Equivalence clustering maps interchangeable terms (e.g., `Node.js` ↔ `Express` ↔ `backend JavaScript`; `Docker` ↔ `containerization`; `MongoDB` ↔ `NoSQL document database`; `NLP` ↔ `Natural Language Processing`).
   - **Transparent Multi-Factor Scoring**:
     - **Skills Match Score (0–100%)**: Evaluates required skills (carrying primary weight) and preferred bonus skills.
     - **Job Description Semantic Similarity (0–100%)**: Cosine similarity across the TF-IDF vector space.
     - **Experience Score (0–100%)**: Proportional evaluation of candidate experience against the job's minimum threshold.
     - **Education Score (0–100%)**: Hierarchical academic qualification comparison.
     - **Composite Match Score (0–100%)**: Normalized weighted sum based on the recruiter's configured weights.
   - **Explainability & Gap Analysis**:
     - Highlights matched required skills (green tags), missing required competencies (red alert tags), and preferred bonus skills (purple tags).
     - Plain-English narrative explaining the score rationale.
   - **Ethical AI & Decision Support**: Scores act strictly as advisory heuristics for prioritization. Protected characteristics (gender, race, age, religion, disability) are never extracted or scored.

5. **Recruiter Intelligence Dashboard**
   - Key metrics: Active Jobs, Total Resumes Screened, Shortlisted Candidates, Average Match Score.
   - Candidate leaderboard: Top-ranked applicants across all postings.
   - Applicant directory: Filter by Job, Status (New, Reviewed, Shortlisted, Rejected), Minimum Match Score slider, and Keyword search.
   - Candidate detail modal/view: Full score dial, sub-score breakdown, raw resume text inspector, and recruiter internal notes notepad.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | AngularJS 1.8.2 (`angular.js`, `angular-route.js`), HTML5, CSS3, Bootstrap 5.3.3, Bootstrap Icons |
| **Backend** | Node.js (v18+ / v20+ / v24+), Express.js 5 |
| **Database** | MongoDB with Mongoose (Dual-mode: connects to live MongoDB or operates with in-memory fallback store) |
| **Security** | `bcryptjs` (password hashing), `jsonwebtoken` (JWT bearer tokens), `cors` |
| **Document Processing** | `multer` (multipart upload), `pdf-parse` (PDF extraction), `mammoth` (DOCX extraction) |
| **NLP Engine** | `natural` (Porter Stemmer, TF-IDF, Tokenizer), custom semantic synonym clusters & domain taxonomy |

---

## 📐 Project Structure

```text
├── server.js                      # Express server entry point & SPA fallback route
├── package.json                   # Dependencies & npm scripts
├── .env                           # Active environment variables
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules
├── config/
│   └── db.js                      # MongoDB connection & status monitoring
├── models/
│   ├── User.js                    # Recruiter Mongoose schema (bcrypt hashing, JWT)
│   ├── Job.js                     # Job requisition schema (skills, weights, requirements)
│   ├── Applicant.js               # Candidate schema (resume metadata, score breakdown, notes)
│   └── store.js                   # Dual-mode repository layer (Live Mongo & in-memory fallback)
├── middleware/
│   ├── auth.middleware.js         # JWT verification & Bearer token guard
│   ├── upload.middleware.js       # Multer file storage, size & MIME filter
│   └── errorHandler.middleware.js # Centralized error handling
├── controllers/
│   ├── auth.controller.js         # Register, login, me
│   ├── job.controller.js          # CRUD operations & applicant re-scoring
│   ├── applicant.controller.js    # Upload, parsing, ranking, status update
│   └── analytics.controller.js    # Dashboard KPI metrics & candidate leaderboards
├── routes/
│   ├── auth.routes.js             # /api/auth
│   ├── job.routes.js              # /api/jobs
│   ├── applicant.routes.js        # /api/applicants
│   └── analytics.routes.js        # /api/analytics
├── services/
│   ├── textExtraction.service.js  # PDF & DOCX text extraction
│   ├── nlpParser.service.js       # Contact, skills, experience & education entity extraction
│   └── matchingEngine.service.js  # Vector Space Model (TF-IDF + Cosine Sim) & scoring
├── sample_resumes/                # Real PDF and TXT test resumes for one-click testing
│   ├── Alex_Morgan_Senior_FullStack.pdf / .txt
│   ├── Priya_Sharma_Lead_NLP.pdf / .txt
│   ├── David_Kim_Frontend_Dev.pdf / .txt
│   └── Sophia_Taylor_Product_Manager.txt
├── scripts/
│   ├── seed.js                    # Demo recruiter and starter jobs seeder
│   └── generate_sample_pdf.js     # Helper to generate test PDF files
└── public/                        # Frontend Single Page Application
    ├── index.html                 # Master SPA entry point
    ├── css/
    │   └── style.css              # Custom design system (glassmorphism, score dials, dark mode)
    ├── vendor/                    # Local vendor assets (AngularJS 1.8.2, Bootstrap 5)
    └── app/
        ├── app.module.js          # AngularJS module definition & HTTP JWT interceptor
        ├── app.routes.js          # ngRoute route table
        ├── directives/
        │   └── file-model.directive.js # File model binding & drag-and-drop
        ├── services/
        │   ├── alert.service.js
        │   ├── auth.service.js
        │   ├── job.service.js
        │   └── applicant.service.js
        ├── controllers/
        │   ├── nav.controller.js
        │   ├── auth.controller.js
        │   ├── dashboard.controller.js
        │   ├── jobs.controller.js
        │   ├── job-detail.controller.js
        │   ├── applicants.controller.js
        │   └── applicant-detail.controller.js
        └── views/
            ├── login.html
            ├── register.html
            ├── dashboard.html
            ├── jobs.html
            ├── job-detail.html
            ├── applicants.html
            └── applicant-detail.html
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- *(Optional)* **MongoDB** (v5.0+ local server or MongoDB Atlas cluster)

### 1. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Default configuration values in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/applicant_screening
JWT_SECRET=super_secret_jwt_key_applicant_screening_2026_xyz
MAX_FILE_SIZE_MB=10
```

---

## 🗄️ MongoDB Setup Guide

The application incorporates a **resilient dual-mode data layer**:
- If a running MongoDB instance is detected at `MONGODB_URI`, it automatically connects via Mongoose and persists all data to MongoDB.
- If MongoDB is not yet running on your local machine, the server logs a connection notice and seamlessly initializes an **In-Memory Store** seeded with demo data so you can test the platform instantly without installation blocks!

### Option A: Local MongoDB (Recommended for production/local dev)
1. Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
2. Start the MongoDB service:
   - **Windows**:
     ```powershell
     net start MongoDB
     # Or run mongod directly:
     mongod --dbpath "C:\data\db"
     ```
   - **macOS / Linux**:
     ```bash
     brew services start mongodb-community
     # Or:
     sudo systemctl start mongod
     ```
3. Set your connection URI in `.env`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/applicant_screening
   ```

### Option B: MongoDB Atlas (Free Cloud Database)
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow your IP address in Network Access.
3. Copy your connection string into `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/applicant_screening?retryWrites=true&w=majority
   ```

### Option C: Instant In-Memory Mode
- Simply leave `MONGODB_URI` as-is and start the server. The application will run immediately in high-speed in-memory mode with pre-seeded demo recruiter accounts, positions, and sample candidates.

---

## 💻 Running the Application

Start the server:
```bash
npm start
```
Or with auto-reload (development mode):
```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:5000/
```

### Pre-Configured Demo Recruiter Account
- **Email**: `recruiter@demo.com`
- **Password**: `password123`
*(A 1-click login button is also provided directly on the login page for convenience!)*

---

## 📊 Synthetic Demo Dataset & Benchmark Reference

This application includes a reproducible demonstration dataset derived from Hugging Face:
- **Dataset**: [`michaelozon/candidate-matching-synthetic`](https://huggingface.co/datasets/michaelozon/candidate-matching-synthetic)
- **Citation**: *Michael Ozon, "Candidate Matching Synthetic Dataset", Hugging Face Datasets (2024).*
- **License**: MIT
- **Data Origin**: The source dataset is entirely **synthetic** (generated via Qwen 2.5) and consists of 10,000 candidate profiles, 100 job specifications, and match configurations.

### Sample Selection & Format Mapping
To keep the application lightweight, fast, and responsive without downloading or bundling all 10,000 records or large Parquet files into client bundles, ResumeIQ incorporates a curated sample:
- **5 Diverse Job Positions**:
  1. `J_000004`: Associate Product Manager (Senior, SaaS)
  2. `J_000016`: Financial Analyst (Mid, EdTech)
  3. `J_000029`: Data Analyst (Junior, Healthcare)
  4. `J_000033`: Software Engineer (Mid, Travel)
  5. `J_000114`: Marketing Manager (Senior, Healthcare)
- **50 Synthetic Candidate Resumes**: Spanning software engineering, product management, finance, data analytics, and growth marketing across varied seniorities and industries.
- **8-Field Resume Text Construction**: Each candidate's resume text is built from all 8 synthetic record attributes:
  1. `role`
  2. `seniority`
  3. `years_experience`
  4. `industry`
  5. `education`
  6. `skills`
  7. `summary`
  8. `experience_bullets`
- **Benchmark Matching Rule**: In the source synthetic dataset, candidate resumes are annotated as relevant matches based on a **$\ge$60% overlap in must-have skills** (`must_have_skills`).
- **Benchmark Reference Metadata**:
  - Relevant resume IDs from the synthetic dataset are stored as benchmark reference metadata (`benchmark.isBenchmarkMatch = true`).
  - Resumes unlisted in the benchmark ground truth are stored with `isBenchmarkMatch = false`, but are **not** treated as confirmed negative matches.
  - All candidate match scores, skills breakdowns, and explanations are computed in real time by ResumeIQ's local TF-IDF semantic engine (`services/matchingEngine.service.js`) without modifying or replacing existing matching logic.

---

## 🧠 NLP Semantic Matching Methodology & Limitations

### Methodology
1. **Document Tokenization & Normalization**:
   - Resumes and job descriptions are tokenized, stripped of non-informative punctuation, and filtered through an English stopword list.
   - Text is normalized to lower case; multi-word compound technical terms (e.g. `Node.js`, `REST API`, `Machine Learning`) are preserved as cohesive tokens and bigrams.
2. **Morphological Stemming**:
   - Applies Porter Stemming to collapse variations (e.g., `developed`, `developing`, `developer` $\to$ `develop`).
3. **Semantic Synonym Clustering**:
   - A curated ontology bridges conceptual terminology (e.g. candidate specifying `AWS EC2/S3` matches a role requiring `Cloud Computing` or `Amazon Web Services`).
4. **Vector Space Model (TF-IDF & Cosine Similarity)**:
   - Term Frequency ($tf$) uses sublinear logarithmic scaling ($1 + \ln(\text{count})$).
   - Inverse Document Frequency ($idf$) assigns higher mathematical weight to specialized technical terms than generic vocabulary.
   - The cosine of the angle between normalized document vectors represents semantic textual similarity ($\in [0, 100]$).
5. **Weighted Multi-Factor Composite Scoring**:
   $$\text{Final Score} = \frac{W_{\text{skills}} S_{\text{skills}} + W_{\text{sim}} S_{\text{sim}} + W_{\text{exp}} S_{\text{exp}} + W_{\text{edu}} S_{\text{edu}}}{W_{\text{skills}} + W_{\text{sim}} + W_{\text{exp}} + W_{\text{edu}}}$$

### Explicit Limitations of the Approach
While the TF-IDF Vector Space Model with synonym expansion is computationally efficient, fully offline, and free of external API fees, recruiters should recognize the following inherent limitations:
- **No Deep Contextual Negation**: Bag-of-words vector space models do not parse complex grammatical negation (e.g. *"Did not work with Kubernetes"* vs *"Extensive work with Kubernetes"*).
- **Out-of-Vocabulary Synonyms**: Novel abbreviations or unconventional job titles not present in the synonym ontology may receive standard token weighting rather than semantic linkage.
- **Decision Support Notice**: Match scores are heuristic algorithmic rankings to aid recruiter productivity and must **never** replace human judgment. Protected characteristics are strictly excluded from the algorithm.

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create a recruiter account (`name`, `email`, `password`, `company`).
- `POST /api/auth/login` - Authenticate recruiter and obtain JWT token.
- `GET /api/auth/me` - Retrieve current recruiter profile *(Protected)*.

### Job Postings (`/api/jobs`) *(Protected)*
- `GET /api/jobs` - List jobs with applicant counts, average score, and top score.
- `POST /api/jobs` - Create a new job requisition with required skills and custom weights.
- `GET /api/jobs/:id` - Fetch single job and its ranked candidates.
- `PUT /api/jobs/:id` - Update job parameters and re-score existing applicants.
- `DELETE /api/jobs/:id` - Delete job and associated candidates.

### Applicant Management (`/api/applicants`) *(Protected)*
- `POST /api/applicants/upload` - Upload a single PDF/DOCX resume for a job (`multipart/form-data`).
- `POST /api/applicants/upload-bulk` - Upload multiple resumes simultaneously.
- `GET /api/applicants` - Filter, search, and sort candidates across all positions.
- `GET /api/applicants/:id` - Retrieve full applicant details, raw text, and match breakdown.
- `PATCH /api/applicants/:id/status` - Update recruitment status (`New`, `Reviewed`, `Shortlisted`, `Rejected`) and recruiter notes.
- `POST /api/applicants/:id/re-evaluate` - Re-run semantic matching against updated job parameters.
- `DELETE /api/applicants/:id` - Delete candidate record and resume file.

### Analytics (`/api/analytics`) *(Protected)*
- `GET /api/analytics/dashboard` - Retrieve recruiter KPI metrics, candidate leaderboard, and skill demand frequencies.
