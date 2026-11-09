import unittest, json
from engine import query, dispatch, WEB


class SQLTests(unittest.TestCase):
    def setUp(self):
        self.catalog = {
            q["id"]: q
            for q in json.loads((WEB / "queries.json").read_text(encoding="utf-8"))
        }

    def run_query(self, q):
        return query(self.catalog[q]["sql"])

    def test_cleaning_counts(self):
        self.assertEqual(
            self.run_query("refunds")["counts"], {"raw": 20, "clean": 12, "excluded": 8}
        )

    def test_refund_preaggregation_avoids_fanout(self):
        rows = {r[0]: r[1:] for r in self.run_query("refunds")["rows"]}
        self.assertEqual(rows["中原店"], (5, 1, 20.0, 220.0, 30.0))
        self.assertEqual(rows["金水店"], (4, 1, 25.0, 160.0, 60.0))
        self.assertEqual(rows["滨江店"], (3, 1, 33.33, 80.0, 30.0))

    def test_monthly_window(self):
        rows = {(r[0], r[1]): r[2:] for r in self.run_query("monthly")["rows"]}
        self.assertEqual(rows[("中原店", "2026-11")], (120.0, 100.0, 20.0))
        self.assertEqual(rows[("金水店", "2026-11")], (60.0, 100.0, -40.0))
        self.assertEqual(rows[("滨江店", "2026-11")], (60.0, 20.0, 200.0))

    def test_first_month_has_no_comparison(self):
        self.assertTrue(
            all(
                r[-1] is None
                for r in self.run_query("monthly")["rows"]
                if r[1] == "2026-10"
            )
        )

    def test_category_totals(self):
        rows = {r[0]: r for r in self.run_query("category")["rows"]}
        self.assertEqual(rows["饮品"][3], 250.0)
        self.assertEqual(rows["餐食"][3], 210.0)

    def test_issue_line_numbers(self):
        self.assertEqual(
            [r[0] for r in self.run_query("issues")["rows"]], list(range(13, 21))
        )

    def test_empty_statistical_signal_is_valid(self):
        self.assertEqual(self.run_query("outliers")["rows"], [])

    def test_aggregate_total(self):
        self.assertEqual(
            query("SELECT SUM(amount) FROM clean_orders")["rows"][0][0], 460
        )

    def test_raw_data_not_deleted(self):
        self.assertEqual(query("SELECT COUNT(*) FROM orders")["rows"][0][0], 20)

    def test_readonly_delete(self):
        with self.assertRaises(ValueError):
            query("DELETE FROM orders")

    def test_multi_statement_blocked(self):
        with self.assertRaises(ValueError):
            query("SELECT 1; DROP TABLE orders")

    def test_write_cte_blocked(self):
        with self.assertRaises(ValueError):
            query("WITH a AS (SELECT 1) DELETE FROM orders")

    def test_pragma_blocked(self):
        with self.assertRaises(ValueError):
            query("PRAGMA query_only=OFF")

    def test_extension_blocked(self):
        with self.assertRaises(ValueError):
            query("SELECT load_extension('x')")

    def test_missing_table_reports_error(self):
        with self.assertRaises(ValueError):
            query("SELECT * FROM missing")

    def test_result_cap(self):
        r = query("SELECT a.row_id FROM orders a CROSS JOIN orders b")
        self.assertEqual(len(r["rows"]), 200)
        self.assertTrue(r["truncated"])

    def test_fixed_question(self):
        self.assertEqual(
            dispatch("/api/query", {"question": self.catalog["refunds"]["question"]})[
                "counts"
            ]["clean"],
            12,
        )

    def test_unknown_natural_question_not_fabricated(self):
        with self.assertRaises(ValueError):
            dispatch("/api/query", {"question": "预测明年的销量"})

    def test_recursive_budget(self):
        with self.assertRaises(ValueError):
            query(
                "WITH RECURSIVE cnt(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM cnt) SELECT SUM(x) FROM cnt"
            )


if __name__ == "__main__":
    unittest.main()
