import pytest
from pathlib import Path

# Adjust the path so we can import swarm_dispatcher directly
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from swarm_dispatcher import find_agent_dir, validate_payload, build_worker_prompts


def test_find_agent_dir_found(tmp_path):
    # Setup: Create an .agent directory and a deep subdirectory
    agent_dir = tmp_path / ".agent"
    agent_dir.mkdir()
    sub_dir = tmp_path / "src" / "deep" / "folder"
    sub_dir.mkdir(parents=True)
    
    # Act & Assert
    result = find_agent_dir(sub_dir)
    assert result is not None
    assert result.resolve() == agent_dir.resolve()

def test_find_agent_dir_not_found(tmp_path):
    # Setup: Directory structure without '.agent'
    sub_dir = tmp_path / "src" / "deep"
    sub_dir.mkdir(parents=True)
    
    # Act & Assert
    assert find_agent_dir(sub_dir) is None

def test_validate_payload_valid(tmp_path):
    # Setup
    agents_dir = tmp_path / "agents"
    agents_dir.mkdir()
    agent_file = agents_dir / "test_agent.md"
    agent_file.touch()
    
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    file_attached = workspace / "file1.txt"
    file_attached.touch()

    payload = {
        "dispatch_micro_workers": [
            {
                "target_agent": "test_agent",
                "files_attached": ["file1.txt"]
            }
        ]
    }
    
    # Act & Assert
    assert validate_payload(payload, workspace, agents_dir) is True

def test_validate_payload_missing_workers(tmp_path):
    # Act & Assert
    assert validate_payload({}, tmp_path, tmp_path) is False

def test_validate_payload_not_list(tmp_path):
    # Act & Assert
    assert validate_payload({"dispatch_micro_workers": "str"}, tmp_path, tmp_path) is False

def test_validate_payload_missing_target_agent(tmp_path):
    # Setup
    payload = {
        "dispatch_micro_workers": [
            {
                "files_attached": []
            }
        ]
    }
    
    # Act & Assert
    assert validate_payload(payload, tmp_path, tmp_path) is False

def test_validate_payload_agent_not_found(tmp_path):
    # Setup
    agents_dir = tmp_path / "agents"
    agents_dir.mkdir()
    
    payload = {
        "dispatch_micro_workers": [
            {
                "target_agent": "missing_agent"
            }
        ]
    }
    
    # Act & Assert
    assert validate_payload(payload, tmp_path, agents_dir) is False

def test_validate_payload_files_not_a_list(tmp_path):
    agents_dir = tmp_path / "agents"
    agents_dir.mkdir()
    (agents_dir / "test_agent.md").touch()
    
    payload = {
        "dispatch_micro_workers": [
            {
                "target_agent": "test_agent",
                "files_attached": "a single file string"
            }
        ]
    }
    
    assert validate_payload(payload, tmp_path, agents_dir) is False

def test_validate_payload_files_missing_warning(tmp_path, caplog):
    # Tests that the validation still passes if files are missing,
    # but that a warning is logged.
    agents_dir = tmp_path / "agents"
    agents_dir.mkdir()
    (agents_dir / "test_agent.md").touch()
    
    workspace = tmp_path / "workspace"
    workspace.mkdir()

    payload = {
        "dispatch_micro_workers": [
            {
                "target_agent": "test_agent",
                "files_attached": ["nonexistent.txt"]
            }
        ]
    }
    
    assert validate_payload(payload, workspace, agents_dir) is True
    assert "attached file 'nonexistent.txt' does not exist" in caplog.text

def test_build_worker_prompts():
    payload = {
        "dispatch_micro_workers": [
            {
                "target_agent": "worker1",
                "context_summary": "Initial context value",
                "task_description": "First task to do",
                "files_attached": ["main.py", "utils.py"]
            },
            {
                "target_agent": "worker2",
                "context_summary": "Another context",
                "task_description": "Second task",
                "files_attached": []
            }
        ]
    }
    
    prompts = build_worker_prompts(payload, Path("."))
    
    assert len(prompts) == 2
    
    # Check first prompt
    assert "Agent: worker1" in prompts[0]
    assert "Context: Initial context value" in prompts[0]
    assert "Task: First task to do" in prompts[0]
    assert "Attached Files: main.py, utils.py" in prompts[0]
    
    # Check second prompt
    assert "Agent: worker2" in prompts[1]
    assert "Context: Another context" in prompts[1]
    assert "Task: Second task" in prompts[1]
    assert "Attached Files: None" in prompts[1]
