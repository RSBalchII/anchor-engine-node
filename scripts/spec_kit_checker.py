#!/usr/bin/env python3
"""
Spec-Kit Compliance Checker for Existing ECE Implementation

This script validates that the existing ECE implementation conforms to the 
specifications and tasks defined in the specs/ directory.
"""

import os
import sys
import re
import json
from pathlib import Path
from typing import Dict, List, Any
import argparse

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class ECEComplianceChecker:
    """Checks ECE implementation compliance with Spec-Kit specifications."""
    
    def __init__(self, specs_dir: str = "specs", src_dir: str = "ece"):
        self.specs_dir = Path(specs_dir)
        self.src_dir = Path(src_dir)
        self.compliance_issues = []
        self.compliance_warnings = []
        self.implemented_tasks = []
        
    def check_spec_files_exist(self) -> bool:
        """Check that required spec files exist."""
        print("🔍 Checking for required spec files...")
        
        required_specs = [
            "spec.md",
            "tasks.md"
        ]
        
        all_found = True
        for spec_file in required_specs:
            spec_path = self.specs_dir / spec_file
            if spec_path.exists():
                print(f"✅ Found spec file: {spec_file}")
            else:
                print(f"❌ Missing spec file: {spec_file}")
                self.compliance_issues.append(f"Missing required spec file: {spec_file}")
                all_found = False
                
        return all_found
    
    def check_implemented_tasks(self) -> List[Dict[str, Any]]:
        """Check which tasks from specs are implemented in code."""
        print("\n🔍 Checking implemented tasks...")
        
        tasks_file = self.specs_dir / "tasks.md"
        if not tasks_file.exists():
            self.compliance_issues.append("tasks.md not found for task checking")
            return []
            
        # Read tasks file
        with open(tasks_file, 'r') as f:
            tasks_content = f.read()
            
        # Extract completed tasks (marked with [x])
        completed_pattern = r'- \[x\]\s*\*\*Task ([\d\.\w]+):\s*(.*?)\*\*'
        completed_tasks = re.findall(completed_pattern, tasks_content)
        
        print(f"✅ Found {len(completed_tasks)} completed tasks in specification")
        
        # For each completed task, check if corresponding code exists
        implemented_tasks = []
        for task_id, description in completed_tasks:
            task_info = {
                "id": task_id,
                "description": description,
                "implemented": False,
                "files": [],
                "notes": []
            }
            
            # Map task to likely implementation files based on description
            files_to_check = self._map_task_to_files(task_id, description)
            
            # Check if files exist
            for file_path in files_to_check:
                full_path = self.src_dir / file_path
                if full_path.exists():
                    task_info["implemented"] = True
                    task_info["files"].append(str(file_path))
                else:
                    task_info["notes"].append(f"Expected file not found: {file_path}")
                    
            if task_info["implemented"]:
                implemented_tasks.append(task_info)
                print(f"   ✅ Task {task_id}: Implemented")
            else:
                self.compliance_warnings.append(f"Task {task_id} marked as completed but implementation not found")
                print(f"   ⚠️ Task {task_id}: Implementation files missing")
                
        return implemented_tasks
    
    def _map_task_to_files(self, task_id: str, description: str) -> List[str]:
        """Map a task description to likely implementation files."""
        # Common mappings based on task descriptions
        mappings = {
            "Archivist": ["agents/tier3/archivist/archivist_agent.py"],
            "Distiller": ["agents/tier3/distiller/"],
            "Injector": ["agents/tier3/injector/"],
            "QLearning": ["agents/tier3/qlearning/"],
            "Orchestrator": ["agents/tier1/"],
            "Context Cache": ["components/context_cache/"],
            "POML": ["poml/"],
            "Docker": ["docker-compose.yml", "Dockerfile"],
            "API": ["main.py", "app.py"],
            "Redis": ["components/context_cache/"],
            "Neo4j": ["agents/tier3/injector/", "agents/tier3/qlearning/"]
        }
        
        files = []
        description_lower = description.lower()
        
        for keyword, paths in mappings.items():
            if keyword.lower() in description_lower:
                files.extend(paths)
                
        # If no specific mapping, return common files
        if not files:
            files = ["README.md"]
            
        return files
    
    def check_architecture_compliance(self) -> bool:
        """Check if implementation follows specified architecture."""
        print("\n🔍 Checking architecture compliance...")
        
        # Check for required directory structure
        required_dirs = [
            "agents/tier1",
            "agents/tier2", 
            "agents/tier3",
            "components"
        ]
        
        all_compliant = True
        for dir_name in required_dirs:
            dir_path = self.src_dir / dir_name
            if dir_path.exists():
                print(f"✅ Found required directory: {dir_name}")
            else:
                print(f"❌ Missing required directory: {dir_name}")
                self.compliance_issues.append(f"Missing required directory: {dir_name}")
                all_compliant = False
                
        return all_compliant
    
    def check_core_components(self) -> Dict[str, Any]:
        """Check core components implementation."""
        print("\n🔍 Checking core components implementation...")
        
        components = {
            "Archivist Agent": {
                "path": "agents/tier3/archivist/archivist_agent.py",
                "required_features": [
                    "continuous_temporal_scanning",
                    "get_context", 
                    "receive_distiller_data"
                ]
            },
            "Distiller Agent": {
                "path": "agents/tier3/distiller/",
                "required_features": []
            },
            "Injector Agent": {
                "path": "agents/tier3/injector/",
                "required_features": []
            },
            "QLearning Agent": {
                "path": "agents/tier3/qlearning/",
                "required_features": []
            }
        }
        
        component_status = {}
        for component_name, component_info in components.items():
            path = self.src_dir / component_info["path"]
            if path.exists():
                print(f"✅ {component_name} implementation found")
                component_status[component_name] = {"implemented": True, "path": component_info["path"]}
                
                # Check for required features if path is a file
                if path.is_file() and component_info["required_features"]:
                    with open(path, 'r') as f:
                        content = f.read()
                        
                    features_found = 0
                    for feature in component_info["required_features"]:
                        if feature in content:
                            print(f"   ✅ Found feature: {feature}")
                            features_found += 1
                        else:
                            print(f"   ⚠️ Missing feature: {feature}")
                            
                    component_status[component_name]["features_found"] = features_found
                    component_status[component_name]["total_features"] = len(component_info["required_features"])
            else:
                print(f"❌ {component_name} implementation not found")
                self.compliance_issues.append(f"{component_name} implementation not found at {component_info['path']}")
                component_status[component_name] = {"implemented": False, "path": component_info["path"]}
                
        return component_status
    
    def generate_compliance_report(self) -> Dict[str, Any]:
        """Generate a comprehensive compliance report."""
        print("\n📋 Generating compliance report...")
        
        # Run all checks
        specs_exist = self.check_spec_files_exist()
        implemented_tasks = self.check_implemented_tasks()
        architecture_compliant = self.check_architecture_compliance()
        core_components = self.check_core_components()
        
        # Calculate compliance score
        total_checks = 4
        passed_checks = sum([
            specs_exist,
            len(implemented_tasks) > 0,
            architecture_compliant,
            all(comp["implemented"] for comp in core_components.values())
        ])
        
        compliance_percentage = round((passed_checks / total_checks) * 100, 2)
        
        report = {
            "project": "External Context Engine (ECE)",
            "compliance_check_timestamp": "2025-09-20T00:00:00Z",
            "spec_files_exist": specs_exist,
            "implemented_tasks_count": len(implemented_tasks),
            "architecture_compliant": architecture_compliant,
            "core_components_status": core_components,
            "compliance_percentage": compliance_percentage,
            "issues": self.compliance_issues,
            "warnings": self.compliance_warnings,
            "summary": {
                "total_issues": len(self.compliance_issues),
                "total_warnings": len(self.compliance_warnings),
                "passed_checks": passed_checks,
                "total_checks": total_checks
            }
        }
        
        return report
    
    def run_compliance_check(self) -> bool:
        """Run complete compliance check."""
        print("🚀 Running Spec-Kit Compliance Check for ECE")
        print("=" * 60)
        
        report = self.generate_compliance_report()
        
        print("\n" + "=" * 60)
        print("COMPLIANCE CHECK RESULTS")
        print("=" * 60)
        
        # Print summary
        print(f"Spec Files Exist: {'✅' if report['spec_files_exist'] else '❌'}")
        print(f"Tasks Implemented: {report['implemented_tasks_count']}")
        print(f"Architecture Compliant: {'✅' if report['architecture_compliant'] else '❌'}")
        print(f"Core Components: {'✅' if all(comp['implemented'] for comp in report['core_components_status'].values()) else '❌'}")
        print(f"Overall Compliance: {report['compliance_percentage']}%")
        
        # Print core components status
        print(f"\n📊 Core Components Status:")
        for component, status in report['core_components_status'].items():
            if status['implemented']:
                print(f"   ✅ {component}")
                if 'features_found' in status:
                    print(f"      Features: {status['features_found']}/{status['total_features']}")
            else:
                print(f"   ❌ {component}")
                
        # Print issues
        if report['issues']:
            print(f"\n❌ ISSUES ({len(report['issues'])}):")
            for issue in report['issues']:
                print(f"   • {issue}")
                
        # Print warnings
        if report['warnings']:
            print(f"\n⚠️ WARNINGS ({len(report['warnings'])}):")
            for warning in report['warnings']:
                print(f"   • {warning}")
                
        # Overall result
        is_compliant = (
            report['spec_files_exist'] and 
            report['architecture_compliant'] and 
            len(report['issues']) == 0 and
            all(comp['implemented'] for comp in report['core_components_status'].values())
        )
        
        print(f"\n{'🎉 COMPLIANCE CHECK PASSED' if is_compliant else '💥 COMPLIANCE CHECK FAILED'}")
        print(f"Issues: {len(report['issues'])}, Warnings: {len(report['warnings'])}")
        print(f"Compliance: {report['compliance_percentage']}%")
        
        return is_compliant

def main():
    parser = argparse.ArgumentParser(description="Spec-Kit Compliance Checker for ECE")
    parser.add_argument("--specs-dir", default="specs", help="Specifications directory")
    parser.add_argument("--src-dir", default="ece", help="Source code directory")
    parser.add_argument("--report", action="store_true", help="Generate detailed report")
    
    args = parser.parse_args()
    
    checker = ECEComplianceChecker(
        specs_dir=args.specs_dir,
        src_dir=args.src_dir
    )
    
    success = checker.run_compliance_check()
    
    if args.report:
        report = checker.generate_compliance_report()
        report_file = "spec_kit_compliance_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Detailed report saved to {report_file}")
        
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()