import argparse
import json
import logging
import os
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def find_agent_dir(start_path: Path) -> Path:
    current = start_path.resolve()
    while current != current.parent:
        agent_dir = current / '.agent'
        if agent_dir.exists() and agent_dir.is_dir():
            return agent_dir
        current = current.parent
    return None

def validate_payload(payload_data: dict, workspace_root: Path, agents_dir: Path) -> bool:
    if "dispatch_micro_workers" not in payload_data:
        logging.error("Payload missing required 'dispatch_micro_workers' array.")
        return False
        
    workers = payload_data.get("dispatch_micro_workers", [])
    if not isinstance(workers, list):
        logging.error("'dispatch_micro_workers' must be a list.")
        return False
        
    all_valid = True
    for i, worker in enumerate(workers):
        agent_name = worker.get("target_agent")
        if not agent_name:
            logging.error(f"Worker {i}: missing 'target_agent'.")
            all_valid = False
            continue
            
        agent_file = agents_dir / f"{agent_name}.md"
        if not agent_file.exists():
            logging.error(f"Worker {i}: target_agent '{agent_name}' not found at {agent_file}.")
            all_valid = False
            
        files_attached = worker.get("files_attached", [])
        if not isinstance(files_attached, list):
            logging.error(f"Worker {i}: 'files_attached' must be a list.")
            all_valid = False
            continue
            
        for f in files_attached:
            file_path = workspace_root / f
            if not file_path.exists():
                logging.warning(f"Worker {i}: attached file '{f}' does not exist (might be a new file to create).")
                
    return all_valid

def build_worker_prompts(payload_data: dict, workspace_root: Path) -> list:
    prompts = []
    workers = payload_data.get("dispatch_micro_workers", [])
    for worker in workers:
        agent = worker.get("target_agent")
        ctx = worker.get("context_summary", "")
        task = worker.get("task_description", "")
        files = worker.get("files_attached", [])
        
        prompt = f"--- MICRO-WORKER DISPATCH ---\n"
        prompt += f"Agent: {agent}\n"
        prompt += f"Context: {ctx}\n"
        prompt += f"Task: {task}\n"
        prompt += f"Attached Files: {', '.join(files) if files else 'None'}\n"
        prompt += "-----------------------------"
        prompts.append(prompt)
    return prompts

def main():
    parser = argparse.ArgumentParser(description="Parse and validate Orchestrator JSON micro-worker payloads.")
    parser.add_argument("--payload", type=str, help="JSON string of the payload", required=False)
    parser.add_argument("--file", type=str, help="Path to a JSON file containing the payload", required=False)
    parser.add_argument("--workspace", type=str, default=".", help="Workspace root directory")
    
    args = parser.parse_args()
    
    if not args.payload and not args.file:
        logging.error("Must provide either --payload or --file")
        sys.exit(1)
        
    workspace_root = Path(args.workspace).resolve()
    agent_dir = find_agent_dir(workspace_root)
    
    if not agent_dir:
        logging.error(f"Could not find .agent directory starting from {workspace_root}")
        sys.exit(1)
        
    agents_dir = agent_dir / "agents"
    if not agents_dir.exists():
        logging.error(f"Could not find 'agents' directory inside {agent_dir}")
        sys.exit(1)
        
    try:
        if args.file:
            with open(args.file, 'r', encoding='utf-8') as f:
                payload_data = json.load(f)
        else:
            payload_data = json.loads(args.payload)
    except Exception as e:
        logging.error(f"Failed to parse payload as JSON: {e}")
        sys.exit(1)
        
    if not validate_payload(payload_data, workspace_root, agents_dir):
        logging.error("Payload validation failed.")
        sys.exit(1)
        
    logging.info("Payload validation successful.")
    prompts = build_worker_prompts(payload_data, workspace_root)
    
    for i, p in enumerate(prompts):
        print(f"\n[Worker {i+1} Ready]")
        print(p)
        
if __name__ == "__main__":
    main()
