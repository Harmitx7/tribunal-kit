import argparse
import json
import logging
import os
import sys
import uuid
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

VALID_WORKER_TYPES = {
    "research", "generate_code", "review_code", "debug",
    "plan", "design_schema", "write_docs", "security_audit",
    "optimize", "test"
}

VALID_RESULT_STATUSES = {"success", "failure", "escalate"}

MAX_GOAL_LENGTH = 200
MAX_CONTEXT_LENGTH = 800
MAX_WORKERS_PER_SWARM = 5


def find_agent_dir(start_path: Path) -> Path:
    current = start_path.resolve()
    while current != current.parent:
        agent_dir = current / '.agent'
        if agent_dir.exists() and agent_dir.is_dir():
            return agent_dir
        current = current.parent
    return None


# ─── Legacy mode: validate orchestrator micro-worker payloads ──────────────────

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
    import subprocess
    prompts = []
    
    ast_context = ""
    try:
        res = subprocess.run(["python", "-m", "code_review_graph", "review-delta"], cwd=workspace_root, capture_output=True, text=True)
        if res.returncode == 0 and res.stdout.strip():
            ast_context = "\n\n[AST Blast Radius Context]:\n" + res.stdout.strip()
    except Exception as e:
        logging.warning(f"code-review-graph failed: {e}")

    workers = payload_data.get("dispatch_micro_workers", [])
    for worker in workers:
        agent = worker.get("target_agent")
        ctx = worker.get("context_summary", "")
        task = worker.get("task_description", "")
        files = worker.get("files_attached", [])

        prompt = f"--- MICRO-WORKER DISPATCH ---\n"
        prompt += f"Agent: {agent}\n"
        prompt += f"Context: {ctx}{ast_context}\n"
        prompt += f"Task: {task}\n"
        prompt += f"Attached Files: {', '.join(files) if files else 'None'}\n"
        prompt += "-----------------------------"
        prompts.append(prompt)
    return prompts


# ─── Swarm mode: validate WorkerRequest / WorkerResult payloads ───────────────

def validate_worker_request(req: dict, index: int, agents_dir: Path) -> list[str]:
    """Validate a single WorkerRequest object. Returns a list of error strings."""
    errors = []

    # task_id
    task_id = req.get("task_id", "")
    if not task_id or not isinstance(task_id, str):
        errors.append(f"WorkerRequest[{index}]: 'task_id' must be a non-empty string.")

    # type
    req_type = req.get("type", "")
    if req_type not in VALID_WORKER_TYPES:
        errors.append(
            f"WorkerRequest[{index}]: 'type' must be one of {sorted(VALID_WORKER_TYPES)}, got '{req_type}'."
        )

    # agent
    agent = req.get("agent", "")
    if not agent or not isinstance(agent, str):
        errors.append(f"WorkerRequest[{index}]: 'agent' must be a non-empty string.")
    else:
        agent_file = agents_dir / f"{agent}.md"
        if not agent_file.exists():
            errors.append(
                f"WorkerRequest[{index}]: agent '{agent}' not found at {agent_file}. "
                f"Only agents that exist in .agent/agents/ are valid."
            )

    # goal
    goal = req.get("goal", "")
    if not goal or not isinstance(goal, str):
        errors.append(f"WorkerRequest[{index}]: 'goal' must be a non-empty string.")
    elif len(goal) > MAX_GOAL_LENGTH:
        errors.append(
            f"WorkerRequest[{index}]: 'goal' exceeds {MAX_GOAL_LENGTH} characters ({len(goal)} chars). "
            f"Keep it to a single, focused sentence."
        )

    # context
    context = req.get("context", "")
    if not context or not isinstance(context, str):
        errors.append(f"WorkerRequest[{index}]: 'context' must be a non-empty string.")
    elif len(context) > MAX_CONTEXT_LENGTH:
        errors.append(
            f"WorkerRequest[{index}]: 'context' exceeds {MAX_CONTEXT_LENGTH} characters ({len(context)} chars). "
            f"Trim to minimal required context only."
        )

    # max_retries
    max_retries = req.get("max_retries")
    if not isinstance(max_retries, int) or not (1 <= max_retries <= 3):
        errors.append(
            f"WorkerRequest[{index}]: 'max_retries' must be an integer between 1 and 3, got '{max_retries}'."
        )

    return errors


def validate_worker_result(res: dict, index: int) -> list[str]:
    """Validate a single WorkerResult object. Returns a list of error strings."""
    errors = []

    # task_id
    task_id = res.get("task_id", "")
    if not task_id or not isinstance(task_id, str):
        errors.append(f"WorkerResult[{index}]: 'task_id' must be a non-empty string.")

    # agent
    agent = res.get("agent", "")
    if not agent or not isinstance(agent, str):
        errors.append(f"WorkerResult[{index}]: 'agent' must be a non-empty string.")

    # status
    status = res.get("status", "")
    if status not in VALID_RESULT_STATUSES:
        errors.append(
            f"WorkerResult[{index}]: 'status' must be one of {sorted(VALID_RESULT_STATUSES)}, got '{status}'."
        )

    # output / error rules
    output = res.get("output", "")
    error = res.get("error", "")
    if status == "success" and not output:
        errors.append(f"WorkerResult[{index}]: 'output' is required when status is 'success'.")
    if status in ("failure", "escalate") and not error:
        errors.append(
            f"WorkerResult[{index}]: 'error' is required when status is '{status}'. "
            f"Be specific — 'Something went wrong' is not acceptable."
        )

    # attempts
    attempts = res.get("attempts")
    if not isinstance(attempts, int) or attempts < 1:
        errors.append(f"WorkerResult[{index}]: 'attempts' must be an integer >= 1, got '{attempts}'.")

    return errors


def validate_swarm_payload(payload_data, agents_dir: Path) -> bool:
    """
    Validate a Swarm payload. Accepts either:
    - A single WorkerRequest object (dict with 'task_id', 'type', 'agent', ...)
    - A single WorkerResult object (dict with 'task_id', 'agent', 'status', ...)
    - A list of WorkerRequests
    - A list of WorkerResults
    - An object with a top-level 'workers' array of WorkerRequests
    """
    # Normalise to a list
    if isinstance(payload_data, dict):
        if "workers" in payload_data:
            items = payload_data["workers"]
        else:
            items = [payload_data]
    elif isinstance(payload_data, list):
        items = payload_data
    else:
        logging.error("Swarm payload must be a JSON object or array.")
        return False

    if len(items) > MAX_WORKERS_PER_SWARM:
        logging.error(
            f"Swarm payload contains {len(items)} workers, "
            f"exceeding the maximum of {MAX_WORKERS_PER_SWARM}."
        )
        return False

    all_errors = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            all_errors.append(f"Item[{i}]: must be a JSON object.")
            continue

        # Detect whether this is a WorkerRequest or WorkerResult by key presence
        if "status" in item and "output" in item:
            # Looks like a WorkerResult
            errors = validate_worker_result(item, i)
        else:
            # Treat as WorkerRequest
            errors = validate_worker_request(item, i, agents_dir)

        all_errors.extend(errors)

    if all_errors:
        for err in all_errors:
            logging.error(err)
        return False

    return True


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Validate Orchestrator micro-worker payloads (legacy) "
            "and Swarm WorkerRequest/WorkerResult payloads (swarm mode)."
        )
    )
    parser.add_argument("--payload", type=str, help="JSON string of the payload", required=False)
    parser.add_argument("--file", type=str, help="Path to a JSON file containing the payload", required=False)
    parser.add_argument("--workspace", type=str, default=".", help="Workspace root directory")
    parser.add_argument(
        "--mode",
        type=str,
        choices=["legacy", "swarm"],
        default="legacy",
        help=(
            "Validation mode. "
            "'legacy': validate orchestrator dispatch_micro_workers payload (default). "
            "'swarm': validate WorkerRequest or WorkerResult JSON."
        )
    )

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

    if args.mode == "swarm":
        if not validate_swarm_payload(payload_data, agents_dir):
            logging.error("Swarm payload validation failed.")
            sys.exit(1)
        
        import subprocess
        ast_context = ""
        try:
            res = subprocess.run(["python", "-m", "code_review_graph", "review-delta"], cwd=workspace_root, capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                ast_context = "\n\n[AST Blast Radius Context]:\n" + res.stdout.strip()
        except Exception as e:
            logging.warning(f"code-review-graph hook failed: {e}")

        if ast_context:
            items = payload_data.get("workers", payload_data) if isinstance(payload_data, dict) else payload_data
            if isinstance(items, list):
                for item in items:
                    if "context" in item:
                        item["context"] += ast_context
            elif isinstance(items, dict) and "context" in items:
                items["context"] += ast_context

        logging.info("Swarm payload validation successful.")
        # Re-emit the enriched payload for downstream
        if ast_context:
            print("--- ENRICHED SWARM PAYLOAD ---")
            print(json.dumps(payload_data, indent=2))
    else:
        # Legacy mode
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
