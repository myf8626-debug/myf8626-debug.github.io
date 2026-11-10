import json
import os
import sqlite3
import unittest
from unittest.mock import patch, MagicMock
from engine import query, WEB
from model_query import generate, ModelError


class CleaningTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.addCleanup(self.db.close)
        self.db.executescript((WEB/'seed.sql').read_text(encoding='utf-8'))

    def test_all_reasons_survive(self):
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM order_issues WHERE row_id=16').fetchone()[0], 2)

    def test_identical_duplicates_keep_one(self):
        self.assertEqual(self.db.execute("SELECT row_id FROM clean_orders WHERE order_id='O004'").fetchall(), [(4,)])

    def test_conflicting_duplicates_quarantine_both(self):
        for field, value in [('amount', 40), ('status', 'refunded'), ('store_id', 'S02'),
                             ('product_id', 'P02'), ('order_date', '2026-11-02'), ('quantity', 2)]:
            with self.subTest(field=field):
                self.db.execute('SAVEPOINT mutation')
                self.db.execute(f'UPDATE orders SET {field}=? WHERE row_id=13', (value,))
                self.assertEqual(self.db.execute("SELECT COUNT(*) FROM clean_orders WHERE order_id='O004'").fetchone()[0], 0)
                self.assertEqual(self.db.execute("SELECT COUNT(*) FROM order_issues WHERE issue='同订单内容冲突（整组隔离）'").fetchone()[0], 2)
                self.db.execute('ROLLBACK TO mutation'); self.db.execute('RELEASE mutation')

    def test_null_difference_is_still_conflict(self):
        self.db.execute('UPDATE orders SET amount=NULL WHERE row_id=13')
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM clean_orders WHERE order_id='O004'").fetchone()[0], 0)

    def test_conflict_also_quarantines_attached_refunds(self):
        self.db.execute("INSERT INTO orders SELECT 21,order_id,store_id,product_id,order_date,quantity,amount,'paid' FROM orders WHERE row_id=5")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM clean_refunds WHERE order_id='O005'").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM refunds WHERE order_id='O005'").fetchone()[0], 2)

    def test_invalid_calendar_date(self):
        self.db.execute("UPDATE orders SET order_date='2026-02-30' WHERE row_id=1")
        self.assertIn(('日期不合法',), self.db.execute('SELECT issue FROM order_issues WHERE row_id=1').fetchall())

    def test_fractional_cent_rejected(self):
        self.db.execute('UPDATE orders SET amount=40.001 WHERE row_id=1')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM clean_orders WHERE row_id=1').fetchone()[0],0)

    def test_cents_sum_exact(self):
        self.db.execute("INSERT INTO products VALUES ('P04','小样','测试',0.1)")
        self.db.executemany("INSERT INTO orders VALUES (?,?,'S01','P04','2026-11-01',1,0.1,'paid')",[(21,'T1'),(22,'T2'),(23,'T3')])
        self.assertEqual(self.db.execute("SELECT SUM(amount_cents) FROM clean_orders WHERE product_id='P04'").fetchone()[0],30)

    def test_refund_overage_quarantines_whole_order(self):
        self.db.execute("INSERT INTO refunds VALUES ('R5','O005',40)")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM clean_refunds WHERE order_id='O005'").fetchone()[0],0)

    def test_negative_cannot_hide_over_refund(self):
        self.db.executemany('INSERT INTO refunds VALUES (?,?,?)',[('R5','O005',40),('R6','O005',-50)])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM clean_refunds WHERE order_id='O005'").fetchone()[0],0)

    def test_orphan_refund(self):
        self.db.execute("INSERT INTO refunds VALUES ('R5','missing',10)")
        self.assertEqual(self.db.execute("SELECT issue FROM refund_issues WHERE refund_id='R5'").fetchone()[0],'订单无有效匹配')

    def test_system_table_and_allocations_blocked(self):
        for sql in ['SELECT * FROM sqlite_master','SELECT randomblob(1000000000)','SELECT zeroblob(1000000000)']:
            with self.subTest(sql=sql), self.assertRaises(ValueError): query(sql)


class ModelTests(unittest.TestCase):
    def call(self, draft, finish='stop'):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({'choices':[{'finish_reason':finish,'message':{'content':json.dumps(draft)}}]}).encode()
        opener = MagicMock(); opener.open.return_value = response
        with patch.dict(os.environ, {'DEEPSEEK_API_KEY':'test-only'}), patch('urllib.request.build_opener',return_value=opener):
            return generate('有效订单数？')

    def test_valid_sql_runs(self):
        self.assertEqual(self.call({'sql':'SELECT COUNT(*) FROM clean_orders','explanation':'有效订单','assumptions':[]})['result']['rows'],[(12,)])

    def test_write_blocked(self):
        with self.assertRaises(ValueError): self.call({'sql':'DELETE FROM orders','explanation':'','assumptions':[]})

    def test_refusal_does_not_query(self):
        with patch('model_query.query') as run:
            self.assertTrue(self.call({'sql':None,'explanation':'没有预测依据','assumptions':[]})['refused'])
            run.assert_not_called()

    def test_no_key_no_network(self):
        with patch.dict(os.environ,{'DEEPSEEK_API_KEY':''}), patch('urllib.request.build_opener') as network:
            with self.assertRaises(ModelError): generate('问题')
            network.assert_not_called()

    def test_bad_shape(self):
        with self.assertRaises(ModelError): self.call({'sql':'SELECT 1'})

    def test_truncated_generation(self):
        with self.assertRaises(ModelError): self.call({},'length')

    def test_provider_error_sanitized(self):
        with patch.dict(os.environ,{'DEEPSEEK_API_KEY':'test-secret'}), patch('urllib.request.build_opener',side_effect=RuntimeError('test-secret')):
            with self.assertRaises(ModelError) as error: generate('问题')
            self.assertNotIn('test-secret',str(error.exception))
