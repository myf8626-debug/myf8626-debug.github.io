import json
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from server import Handler
from model_query import ModelError


class APITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()

    def request(self, path, body, headers=None):
        req=urllib.request.Request(self.url+path,data=body,headers={'Content-Type':'application/json',**(headers or {})})
        try:
            with urllib.request.urlopen(req) as r: return r.status,json.load(r)
        except urllib.error.HTTPError as e: return e.code,json.load(e)

    def test_query(self):
        code,data=self.request('/api/query',b'{"sql":"SELECT COUNT(*) FROM clean_orders"}')
        self.assertEqual(code,200);self.assertEqual(data['rows'],[[12]])

    def test_invalid_json(self): self.assertEqual(self.request('/api/query',b'{')[0],400)
    def test_wrong_origin(self): self.assertEqual(self.request('/api/query',b'{}',{'Origin':'https://other.example'})[0],403)
    def test_wrong_host(self): self.assertEqual(self.request('/api/query',b'{}',{'Host':'other.example'})[0],403)
    def test_missing_route(self): self.assertEqual(self.request('/api/missing',b'{}')[0],404)
    def test_model_error_no_fallback(self):
        with patch('server.generate',side_effect=ModelError('provider unavailable')):
            code,data=self.request('/api/model',b'{"question":"count"}')
        self.assertEqual(code,502);self.assertNotIn('rows',data)
    def test_model_route(self):
        with patch('server.generate',return_value={'refused':True}) as model:
            code,data=self.request('/api/model',b'{"question":"forecast"}')
        self.assertEqual(code,200);self.assertTrue(data['refused']);model.assert_called_once_with('forecast')
    def test_health_is_configuration_not_connection(self):
        with urllib.request.urlopen(self.url+'/api/health') as r: data=json.load(r)
        self.assertIn('model_configured',data);self.assertNotIn('model_connected',data)
