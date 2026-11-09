"""Local-only, dependency-free API and static server. No model credentials read."""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, json, sys
from urllib.parse import urlsplit
from engine import dispatch

ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "web"), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def reply(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/health":
            return self.reply(
                200, {"status": "ok", "mode": "sample", "model_connected": False}
            )
        if self.path.startswith("/api/"):
            return self.reply(404, {"error": "Unknown endpoint"})
        super().do_GET()

    def do_POST(self):
        # Reject cross-origin browser writes. This server is bound only to loopback.
        origin = self.headers.get("Origin")
        if origin and origin not in ("http://" + self.headers.get("Host", ""),):
            return self.reply(403, {"error": "Cross-origin requests are not allowed"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 200000:
                raise ValueError("Body must be 1..200000 bytes")
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                raise ValueError("Expected JSON object")
            route = urlsplit(self.path).path
            if route == "/api/model":
                return self.reply(
                    501,
                    {
                        "error": "真实模型尚未接入；当前为可复现样例模式",
                        "model_connected": False,
                    },
                )
            result = dispatch(route, body)
            self.reply(200, result)
        except KeyError:
            self.reply(404, {"error": "Unknown endpoint"})
        except (ValueError, TypeError) as e:
            self.reply(400, {"error": str(e)})
        except Exception:
            self.reply(500, {"error": "Internal error; request content was not logged"})

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8313)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
