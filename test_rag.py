import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.services.rag_engine import analyze_repo, task_store

def test_index():
    repo_url = "https://github.com/Shubham06032003/breast-Cancer-Prediction-ai-model"
    import uuid
    task_id = str(uuid.uuid4())
    print(f"Starting indexing for {repo_url} with task {task_id}")
    
    # Initialize basic info
    task_store[task_id] = {
        "status": "queued",
        "progress": 0,
        "repo_url": repo_url,
    }
    
    # Run the background function synchronously
    analyze_repo(task_id, repo_url)
    
    # Print status updates
    print(f"Final Status: {task_store[task_id]['status']}")
    print(f"Message:     {task_store[task_id].get('message')}")
    print(f"Progress:    {task_store[task_id]['progress']}%")
    print(f"Files:       {task_store[task_id].get('file_count')}")
    print(f"Chunks:      {task_store[task_id].get('chunk_count')}")

if __name__ == "__main__":
    test_index()
