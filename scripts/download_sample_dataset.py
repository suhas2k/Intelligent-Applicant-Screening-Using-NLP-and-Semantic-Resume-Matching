import os
import json
import numpy as np
import pandas as pd
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'sample_data')
os.makedirs(DATA_DIR, exist_ok=True)

BASE_URL = "https://huggingface.co/datasets/michaelozon/candidate-matching-synthetic/resolve/main"

def clean_val(val):
    if isinstance(val, np.ndarray):
        return [clean_val(x) for x in val.tolist()]
    if isinstance(val, (list, tuple)):
        return [clean_val(x) for x in val]
    if isinstance(val, (np.integer, np.int64, np.int32)):
        return int(val)
    if isinstance(val, (np.floating, np.float64, np.float32)):
        return float(val)
    if pd.isna(val):
        return None
    return val

def download_file(url, local_path):
    print(f"Downloading {url} -> {local_path}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers, stream=True)
    resp.raise_for_status()
    with open(local_path, 'wb') as f:
        for chunk in resp.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
    print(f"Saved {local_path} ({os.path.getsize(local_path):,} bytes)")

def main():
    jobs_parquet = os.path.join(DATA_DIR, "jobs.parquet")
    matches_parquet = os.path.join(DATA_DIR, "matches.parquet")
    resumes_parquet = os.path.join(DATA_DIR, "resumes.parquet")

    if not os.path.exists(jobs_parquet):
        download_file(f"{BASE_URL}/jobs/train-00000-of-00001.parquet", jobs_parquet)
    if not os.path.exists(matches_parquet):
        download_file(f"{BASE_URL}/matches/train-00000-of-00001.parquet", matches_parquet)
    if not os.path.exists(resumes_parquet):
        download_file(f"{BASE_URL}/resumes/train-00000-of-00001.parquet", resumes_parquet)

    print("Reading parquet files...")
    df_jobs = pd.read_parquet(jobs_parquet)
    df_matches = pd.read_parquet(matches_parquet)
    df_resumes = pd.read_parquet(resumes_parquet)

    # Clean list columns in df_jobs
    for col in ['must_have_skills', 'nice_to_have_skills', 'responsibilities', 'requirements']:
        if col in df_jobs.columns:
            df_jobs[col] = df_jobs[col].apply(clean_val)

    # Clean list columns in df_matches
    df_matches['relevant_resume_ids'] = df_matches['relevant_resume_ids'].apply(clean_val)

    # Clean list columns in df_resumes
    for col in ['skills', 'experience_bullets']:
        if col in df_resumes.columns:
            df_resumes[col] = df_resumes[col].apply(clean_val)

    # Select exactly 5 representative jobs
    sample_job_ids = []
    preferred_titles = [
        "Software Engineer",
        "Data Analyst",
        "Product Manager",
        "Marketing Manager",
        "Financial Analyst"
    ]
    
    for title in preferred_titles:
        match = df_jobs[df_jobs['job_title'].str.contains(title, case=False, na=False)]
        for _, row in match.iterrows():
            if row['job_id'] not in sample_job_ids:
                sample_job_ids.append(row['job_id'])
                break
        if len(sample_job_ids) >= 5:
            break

    print(f"Selected 5 Job IDs: {sample_job_ids}")
    selected_jobs = df_jobs[df_jobs['job_id'].isin(sample_job_ids)].copy()

    # Matches for selected jobs
    matches_for_jobs = df_matches[df_matches['job_id'].isin(sample_job_ids)].copy()

    relevant_resume_map = {}
    all_relevant_resumes = set()
    for _, row in matches_for_jobs.iterrows():
        r_ids = list(row['relevant_resume_ids'])
        relevant_resume_map[row['job_id']] = r_ids
        all_relevant_resumes.update(r_ids)

    # Select ~32 relevant resumes (6-7 from each of the 5 jobs)
    selected_resume_ids = set()
    for j_id in sample_job_ids:
        r_ids = relevant_resume_map.get(j_id, [])
        for rid in r_ids[:7]:
            selected_resume_ids.add(rid)

    # Now add non-relevant resumes to reach exactly 50 total resumes
    non_relevant = df_resumes[~df_resumes['resume_id'].isin(all_relevant_resumes)]
    for rid in non_relevant['resume_id']:
        selected_resume_ids.add(rid)
        if len(selected_resume_ids) >= 50:
            break

    print(f"Total selected resumes: {len(selected_resume_ids)}")
    selected_resumes = df_resumes[df_resumes['resume_id'].isin(selected_resume_ids)].copy()

    # Convert to pure Python dictionaries with native types
    jobs_records = []
    for _, row in selected_jobs.iterrows():
        d = {k: clean_val(v) for k, v in row.items()}
        jobs_records.append(d)

    matches_records = []
    for _, row in matches_for_jobs.iterrows():
        d = {k: clean_val(v) for k, v in row.items()}
        matches_records.append(d)

    resumes_records = []
    for _, row in selected_resumes.iterrows():
        d = {k: clean_val(v) for k, v in row.items()}
        resumes_records.append(d)

    sample_data = {
        "metadata": {
            "source": "https://huggingface.co/datasets/michaelozon/candidate-matching-synthetic",
            "citation": "michaelozon/candidate-matching-synthetic (Qwen 2.5 generated)",
            "license": "MIT",
            "jobs_count": len(jobs_records),
            "resumes_count": len(resumes_records),
            "benchmark_rule": "Dataset considers >=60% overlap in must_have_skills as relevant; unlisted resumes are not confirmed negative matches."
        },
        "jobs": jobs_records,
        "matches": matches_records,
        "resumes": resumes_records
    }

    out_file = os.path.join(DATA_DIR, "synthetic_sample.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(sample_data, f, indent=2, default=str)

    print(f"Successfully generated clean {out_file} ({os.path.getsize(out_file):,} bytes)")

    # Clean up parquet files
    for p in [jobs_parquet, matches_parquet, resumes_parquet]:
        if os.path.exists(p):
            os.remove(p)

if __name__ == "__main__":
    main()
