import http.server, json, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(os.getcwd(), "results.jsonl")
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n).decode()
        with open(LOG, "a") as f: f.write(body + "\n")
        self.send_response(204); self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", 3104), H).serve_forever()
