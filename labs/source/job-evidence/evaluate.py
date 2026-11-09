from pathlib import Path
import unittest, json, sys, hashlib, platform
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent


class Result(unittest.TextTestResult):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.cases = []

    def addSuccess(self, test):
        super().addSuccess(test)
        self.cases.append({"test": test.id(), "status": "passed"})

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.cases.append({"test": test.id(), "status": "failed"})

    def addError(self, test, err):
        super().addError(test, err)
        self.cases.append({"test": test.id(), "status": "error"})


suite = unittest.defaultTestLoader.discover(str(ROOT), pattern="test_*.py")
result = unittest.TextTestRunner(verbosity=2, resultclass=Result).run(suite)
inputs = {
    p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
    for p in sorted((ROOT / "web").glob("*"))
    if p.suffix in (".json", ".sql") and p.name != "evaluation.json"
}
report = {
    "kind": "deterministic_regression_tests",
    "dataset_type": "synthetic",
    "model_evaluated": False,
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "python": platform.python_version(),
    "tests_run": result.testsRun,
    "passed": sum(c["status"] == "passed" for c in result.cases),
    "failures": len(result.failures),
    "errors": len(result.errors),
    "input_sha256": inputs,
    "cases": result.cases,
    "limitations": [
        "人工构造的小样本回归检查，不代表真实业务效果。",
        "未接入或评测真实模型，不报告模型准确率、编造率或提升幅度。",
    ],
}
(ROOT / "web/evaluation.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
sys.exit(0 if result.wasSuccessful() else 1)
