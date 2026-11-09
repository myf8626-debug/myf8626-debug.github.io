import unittest, json, copy
from engine import answer, SAMPLE, dispatch


class PolicyTests(unittest.TestCase):
    def test_explicit_empty_dataset_not_replaced(self):
        with self.assertRaises(ValueError):
            dispatch(
                "/api/ask",
                {"dataset": {}, "query": "竞赛", "cohort": 2024, "as_of": "2026-11-09"},
            )

    def test_explicit_null_dataset_not_replaced(self):
        with self.assertRaises(ValueError):
            dispatch(
                "/api/ask",
                {
                    "dataset": None,
                    "query": "竞赛",
                    "cohort": 2024,
                    "as_of": "2026-11-09",
                },
            )

    def setUp(self):
        self.data = json.loads(SAMPLE.read_text(encoding="utf-8"))

    def ask(self, q="竞赛学分", year=2024, date="2026-11-09"):
        return answer(self.data, q, year, date)

    def test_current_cohort(self):
        self.assertEqual([c["id"] for c in self.ask()["clauses"]], ["P2"])

    def test_other_cohort(self):
        self.assertEqual([c["id"] for c in self.ask(year=2026)["clauses"]], ["P3"])

    def test_missing_cohort_abstains(self):
        self.assertEqual(self.ask(year=2023)["status"], "abstain")

    def test_historical_date(self):
        self.assertEqual(
            [c["id"] for c in self.ask(date="2026-08-31")["clauses"]], ["P1"]
        )

    def test_effective_boundary(self):
        self.assertEqual(
            [c["id"] for c in self.ask(date="2026-09-01")["clauses"]], ["P2"]
        )

    def test_expiry_exclusive(self):
        self.assertEqual(
            [c["id"] for c in self.ask(date="2028-09-01")["clauses"]], ["P8"]
        )

    def test_conflict_not_arbitrarily_resolved(self):
        r = self.ask(q="实习要几周")
        self.assertEqual(r["status"], "conflict")
        self.assertEqual(len(r["clauses"]), 2)

    def test_unknown_topic(self):
        self.assertEqual(self.ask(q="宿舍养宠物")["status"], "abstain")

    def test_multiple_topics(self):
        self.assertEqual(self.ask(q="奖学金和竞赛")["status"], "abstain")

    def test_scholarship_exact_quote(self):
        self.assertEqual(
            self.ask(q="奖学金")["answer"], self.data["clauses"][3]["text"]
        )

    def test_no_invented_graduation_credits(self):
        self.assertIn("没有提供总学分数", self.ask(q="毕业学分要求")["answer"])

    def test_invalid_date(self):
        with self.assertRaises(ValueError):
            self.ask(date="2026-02-30")

    def test_date_padding(self):
        with self.assertRaises(ValueError):
            self.ask(date="2026-2-3")

    def test_duplicate_id(self):
        self.data["clauses"].append(copy.deepcopy(self.data["clauses"][0]))
        with self.assertRaises(ValueError):
            self.ask()

    def test_reason_retained(self):
        r = self.ask()
        excluded = {c["id"]: c["reason"] for c in r["excluded"]}
        self.assertEqual(excluded["P1"], "已失效")
        self.assertEqual(excluded["P3"], "不适用该入学年级")
        self.assertEqual(excluded["P8"], "尚未生效")

    def test_invalid_range(self):
        self.data["clauses"][0]["effective_to"] = "2000-01-01"
        with self.assertRaises(ValueError):
            self.ask()

    def test_non_integer_cohort(self):
        with self.assertRaises(ValueError):
            self.ask(year="2024")

    def test_empty_question(self):
        with self.assertRaises(ValueError):
            self.ask(q="")


if __name__ == "__main__":
    unittest.main()
