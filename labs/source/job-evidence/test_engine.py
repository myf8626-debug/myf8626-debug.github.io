import unittest, json, copy
from engine import analyze, SAMPLE, dispatch


class ProvenanceTests(unittest.TestCase):
    def test_explicit_empty_dataset_not_replaced(self):
        with self.assertRaises(ValueError):
            dispatch("/api/analyze", {"dataset": {}})

    def test_explicit_null_dataset_not_replaced(self):
        with self.assertRaises(ValueError):
            dispatch("/api/analyze", {"dataset": None})

    def setUp(self):
        self.data = json.loads(SAMPLE.read_text(encoding="utf-8"))

    def test_expected_statuses(self):
        self.assertEqual(
            [r["status"] for r in analyze(self.data)["claims"]],
            [
                "conflict",
                "traceable",
                "traceable",
                "traceable",
                "missing",
                "mismatch",
                "unsupported",
            ],
        )

    def test_missing_source_is_not_empty_success(self):
        self.data["claims"][1]["evidence"][0]["source_id"] = "unknown"
        self.assertEqual(analyze(self.data)["claims"][1]["status"], "missing")

    def test_exact_quote_wrong_offset(self):
        self.data["claims"][1]["evidence"][0]["start"] += 1
        self.assertEqual(analyze(self.data)["claims"][1]["status"], "mismatch")

    def test_negative_position_rejected(self):
        self.data["claims"][1]["evidence"][0]["start"] = -1
        self.assertEqual(analyze(self.data)["claims"][1]["status"], "mismatch")

    def test_empty_quote_not_proof(self):
        self.data["claims"][1]["evidence"][0].update(quote="", start=0, end=0)
        self.assertEqual(analyze(self.data)["claims"][1]["status"], "mismatch")

    def test_real_quote_wrong_claim(self):
        self.data["claims"][1]["value"] = "1天"
        self.assertEqual(analyze(self.data)["claims"][1]["status"], "unsupported")

    def test_duplicate_source_id(self):
        self.data["sources"].append(copy.deepcopy(self.data["sources"][0]))
        with self.assertRaises(ValueError):
            analyze(self.data)

    def test_duplicate_claim_id(self):
        self.data["claims"].append(copy.deepcopy(self.data["claims"][0]))
        with self.assertRaises(ValueError):
            analyze(self.data)

    def test_removed_conflicting_source(self):
        self.data["sources"] = self.data["sources"][:2]
        self.assertEqual(analyze(self.data)["claims"][0]["status"], "traceable")

    def test_all_citations_must_match(self):
        self.data["claims"][1]["evidence"].append(
            {"source_id": "S1", "quote": "不存在", "start": 0, "end": 3}
        )
        self.assertEqual(analyze(self.data)["claims"][1]["status"], "mismatch")

    def test_unicode_positions(self):
        self.data["sources"][0]["text"] = "😀" + self.data["sources"][0]["text"]
        for c in self.data["claims"]:
            for r in c["evidence"]:
                if r["source_id"] == "S1":
                    r["start"] += 1
                    r["end"] += 1
        self.assertEqual(analyze(self.data)["claims"][1]["status"], "traceable")

    def test_no_mutation(self):
        original = copy.deepcopy(self.data)
        analyze(self.data)
        self.assertEqual(self.data, original)

    def test_input_bounds(self):
        self.data["claims"] *= 20
        with self.assertRaises(ValueError):
            analyze(self.data)

    def test_invalid_source_type(self):
        self.data["sources"][0] = None
        with self.assertRaises(ValueError):
            analyze(self.data)


if __name__ == "__main__":
    unittest.main()
