from pathlib import Path
from typing import List, Dict, Any, Optional
import os
import fnmatch as _fn
import re as _re


def _is_code_file(path: Path) -> bool:
    exts = {".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".md", ".toml", ".ini", ".cfg", ".go", ".rs", ".java", ".c", ".h", ".cpp", ".cs", ".txt"}
    return path.suffix.lower() in exts


def code_search(root: str, query: str, regex: bool = False, max_results: int = 50, glob: Optional[str] = None, context: int = 2) -> Dict[str, Any]:
    r = Path(root)
    if not r.exists() or not r.is_dir():
        return {"error": f"Root not a directory: {root}"}
    results: List[dict] = []
    pattern = None
    if regex:
        try:
            pattern = _re.compile(query)
        except Exception as e:
            return {"error": f"Invalid regex: {e}"}
    max_file_size = 500000
    for dirpath, dirnames, filenames in os.walk(r):
        for name in filenames:
            p = Path(dirpath) / name
            if not _is_code_file(p):
                continue
            if glob and not _fn.fnmatch(name, glob):
                continue
            try:
                size = p.stat().st_size
                if size > max_file_size:
                    continue
                lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
                matches = []
                for i, line in enumerate(lines):
                    hit = False
                    if pattern:
                        if pattern.search(line):
                            hit = True
                    else:
                        if query.lower() in line.lower():
                            hit = True
                    if hit:
                        start = max(i - context, 0)
                        end = min(i + context + 1, len(lines))
                        snippet = "\n".join(f"{j+1}: {lines[j]}" for j in range(start, end))
                        matches.append({"line": i + 1, "snippet": snippet})
                        if len(matches) >= 3:
                            break
                if matches:
                    results.append({"path": str(p), "size": size, "matches": matches})
                    if len(results) >= max_results:
                        break
            except Exception:
                continue
        if len(results) >= max_results:
            break
    return {"root": str(r), "query": query, "count": len(results), "results": results}


def code_grep(root: str, query: str, regex: bool = False, max_results: int = 50, glob: Optional[str] = None, exclude_globs: Optional[List[str]] = None, context: int = 2) -> Dict[str, Any]:
    r = Path(root)
    if not r.exists() or not r.is_dir():
        return {"error": f"Root not a directory: {root}"}
    pattern = None
    if regex:
        try:
            pattern = _re.compile(query)
        except Exception as e:
            return {"error": f"Invalid regex: {e}"}
    total_matches = 0
    results: List[dict] = []
    max_file_size = 500000
    for dirpath, dirnames, filenames in os.walk(r):
        for name in filenames:
            p = Path(dirpath) / name
            if not _is_code_file(p):
                continue
            if glob and not _fn.fnmatch(name, glob):
                continue
            if exclude_globs:
                excluded = False
                for eg in exclude_globs:
                    if _fn.fnmatch(name, eg):
                        excluded = True
                        break
                if excluded:
                    continue
            try:
                size = p.stat().st_size
                if size > max_file_size:
                    continue
                lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
                matches = []
                for i, line in enumerate(lines):
                    hit = False
                    if pattern:
                        if pattern.search(line):
                            hit = True
                    else:
                        if query.lower() in line.lower():
                            hit = True
                    if hit:
                        total_matches += 1
                        start = max(i - context, 0)
                        end = min(i + context + 1, len(lines))
                        snippet = "\n".join(f"{j+1}: {lines[j]}" for j in range(start, end))
                        matches.append({"line": i + 1, "snippet": snippet})
                        if len(matches) >= 5:
                            break
                if matches:
                    results.append({"path": str(p), "size": size, "match_count": len(matches), "matches": matches})
                    if len(results) >= max_results:
                        break
            except Exception:
                continue
        if len(results) >= max_results:
            break
    return {"root": str(r), "query": query, "files": len(results), "total_matches": total_matches, "results": results}
